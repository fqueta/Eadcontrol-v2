<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\SaasInvoice;
use App\Models\SaasSubscription;
use App\Services\SaasPayment\SaasPaymentFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class SaasInvoiceController extends Controller
{
    /**
     * Lista faturas com filtros.
     */
    public function index(Request $request)
    {
        $query = SaasInvoice::with(['subscription.plan', 'tenant']);

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('tenant_id')) {
            $query->where('tenant_id', $request->input('tenant_id'));
        }

        if ($request->has('subscription_id')) {
            $query->where('subscription_id', $request->input('subscription_id'));
        }

        if ($request->has('due_from') && $request->has('due_to')) {
            $query->dueBetween($request->input('due_from'), $request->input('due_to'));
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhere('tenant_id', 'like', "%{$search}%");
            });
        }

        $query->orderBy('due_date', 'desc');
        $perPage = $request->input('per_page', 15);

        return response()->json($query->paginate($perPage));
    }

    /**
     * Cria uma fatura manualmente.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'subscription_id' => 'required|integer|exists:mysql.saas_subscriptions,id',
            'amount' => 'nullable|numeric|min:0',
            'usage_amount' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'due_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $subscription = SaasSubscription::with('plan')->findOrFail($request->input('subscription_id'));

        // Calcular valores
        $amount = $request->input('amount', $subscription->plan->getPriceForCycle($subscription->billing_cycle));
        $usageAmount = $request->input('usage_amount', $subscription->calculateUsageCharges());
        $discount = $request->input('discount', 0);
        $total = max(0, $amount + $usageAmount - $discount);

        $invoice = SaasInvoice::create([
            'subscription_id' => $subscription->id,
            'tenant_id' => $subscription->tenant_id,
            'invoice_number' => SaasInvoice::generateInvoiceNumber($subscription->tenant_id),
            'amount' => $amount,
            'usage_amount' => $usageAmount,
            'discount' => $discount,
            'total' => $total,
            'due_date' => $request->input('due_date'),
            'status' => 'pending',
            'usage_details' => $subscription->usage_data,
            'notes' => $request->input('notes'),
        ]);

        return response()->json([
            'message' => 'Fatura criada com sucesso.',
            'data' => $invoice->load(['subscription.plan', 'tenant']),
        ], 201);
    }

    /**
     * Exibe uma fatura.
     */
    public function show($id)
    {
        $invoice = SaasInvoice::with(['subscription.plan', 'tenant'])->find($id);

        if (!$invoice) {
            return response()->json(['message' => 'Fatura não encontrada.'], 404);
        }

        return response()->json($invoice);
    }

    /**
     * Atualiza uma fatura (notas, desconto, etc).
     */
    public function update(Request $request, $id)
    {
        $invoice = SaasInvoice::find($id);

        if (!$invoice) {
            return response()->json(['message' => 'Fatura não encontrada.'], 404);
        }

        if ($invoice->isPaid()) {
            return response()->json(['message' => 'Não é possível editar uma fatura paga.'], 422);
        }

        $validator = Validator::make($request->all(), [
            'amount' => 'nullable|numeric|min:0',
            'usage_amount' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($request->has('amount')) $invoice->amount = $request->input('amount');
        if ($request->has('usage_amount')) $invoice->usage_amount = $request->input('usage_amount');
        if ($request->has('discount')) $invoice->discount = $request->input('discount');
        if ($request->has('due_date')) $invoice->due_date = $request->input('due_date');
        if ($request->has('notes')) $invoice->notes = $request->input('notes');

        // Recalcular total
        $invoice->total = max(0, $invoice->amount + $invoice->usage_amount - $invoice->discount);
        $invoice->save();

        return response()->json([
            'message' => 'Fatura atualizada com sucesso.',
            'data' => $invoice->load(['subscription.plan', 'tenant']),
        ]);
    }

    /**
     * Envia cobrança da fatura pelo gateway (Asaas).
     */
    public function charge(Request $request, $id)
    {
        $invoice = SaasInvoice::with('subscription')->find($id);

        if (!$invoice) {
            return response()->json(['message' => 'Fatura não encontrada.'], 404);
        }

        if ($invoice->isPaid()) {
            return response()->json(['message' => 'Fatura já está paga.'], 422);
        }

        $billingType = $request->input('billing_type', 'UNDEFINED');

        try {
            $gateway = SaasPaymentFactory::create();
            $result = $gateway->createCharge($invoice, $billingType);

            return response()->json([
                'message' => 'Cobrança enviada com sucesso.',
                'data' => $invoice->fresh()->load(['subscription.plan', 'tenant']),
                'gateway_response' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('SaaS: Erro ao enviar cobrança: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erro ao enviar cobrança: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Marca fatura como paga manualmente.
     */
    public function markAsPaid(Request $request, $id)
    {
        $invoice = SaasInvoice::find($id);

        if (!$invoice) {
            return response()->json(['message' => 'Fatura não encontrada.'], 404);
        }

        if ($invoice->isPaid()) {
            return response()->json(['message' => 'Fatura já está paga.'], 422);
        }

        $paymentMethod = $request->input('payment_method', 'manual');
        $paidAmount = $request->input('paid_amount', $invoice->total);

        $invoice->markAsPaid($paymentMethod, (float) $paidAmount);

        return response()->json([
            'message' => 'Fatura marcada como paga.',
            'data' => $invoice->load(['subscription.plan', 'tenant']),
        ]);
    }

    /**
     * Gera faturas em lote para todas as assinaturas com next_billing_date atingida.
     */
    public function generateBatch(Request $request)
    {
        $referenceDate = $request->input('reference_date', now()->toDateString());

        $subscriptions = SaasSubscription::with('plan')
            ->whereIn('status', ['active'])
            ->where('next_billing_date', '<=', $referenceDate)
            ->get();

        $generated = 0;
        $errors = [];

        foreach ($subscriptions as $subscription) {
            try {
                $plan = $subscription->plan;
                $amount = $plan->getPriceForCycle($subscription->billing_cycle);
                $usageAmount = $subscription->calculateUsageCharges();
                $total = max(0, $amount + $usageAmount);

                SaasInvoice::create([
                    'subscription_id' => $subscription->id,
                    'tenant_id' => $subscription->tenant_id,
                    'invoice_number' => SaasInvoice::generateInvoiceNumber($subscription->tenant_id),
                    'amount' => $amount,
                    'usage_amount' => $usageAmount,
                    'discount' => 0,
                    'total' => $total,
                    'due_date' => $subscription->next_billing_date,
                    'status' => 'pending',
                    'usage_details' => $subscription->usage_data,
                ]);

                // Avançar próxima cobrança
                $subscription->next_billing_date = $subscription->billing_cycle === 'yearly'
                    ? $subscription->next_billing_date->addYear()
                    : $subscription->next_billing_date->addMonth();
                $subscription->save();

                $generated++;
            } catch (\Exception $e) {
                $errors[] = [
                    'tenant_id' => $subscription->tenant_id,
                    'error' => $e->getMessage(),
                ];
                Log::error("SaaS: Falha ao gerar fatura para tenant {$subscription->tenant_id}: " . $e->getMessage());
            }
        }

        return response()->json([
            'message' => "Faturas geradas: {$generated}. Erros: " . count($errors),
            'generated' => $generated,
            'errors' => $errors,
        ]);
    }

    /**
     * Cancela uma fatura.
     */
    public function destroy($id)
    {
        $invoice = SaasInvoice::find($id);

        if (!$invoice) {
            return response()->json(['message' => 'Fatura não encontrada.'], 404);
        }

        if ($invoice->isPaid()) {
            return response()->json(['message' => 'Não é possível excluir uma fatura paga.'], 422);
        }

        $invoice->cancelInvoice();

        return response()->json(['message' => 'Fatura cancelada com sucesso.']);
    }
}
