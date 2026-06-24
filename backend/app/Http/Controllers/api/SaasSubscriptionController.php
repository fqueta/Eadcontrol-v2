<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\SaasSubscription;
use App\Models\SaasPlan;
use App\Models\Tenant;
use App\Services\SaasPayment\SaasPaymentFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class SaasSubscriptionController extends Controller
{
    /**
     * Lista todas as assinaturas com filtros.
     */
    public function index(Request $request)
    {
        $query = SaasSubscription::with(['plan', 'tenant']);

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('tenant_id')) {
            $query->where('tenant_id', $request->input('tenant_id'));
        }

        if ($request->has('plan_id')) {
            $query->where('plan_id', $request->input('plan_id'));
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('tenant_id', 'like', "%{$search}%")
                  ->orWhereHas('tenant', function ($tq) use ($search) {
                      $tq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $query->orderBy('created_at', 'desc');
        $perPage = $request->input('per_page', 15);

        return response()->json($query->paginate($perPage));
    }

    /**
     * Cria uma nova assinatura para um tenant.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'tenant_id' => 'required|string|exists:mysql.tenants,id',
            'plan_id' => 'required|integer|exists:mysql.saas_plans,id',
            'billing_cycle' => 'required|in:monthly,yearly',
            'starts_at' => 'nullable|date',
            'trial_days' => 'nullable|integer|min:0',
            'customer_name' => 'nullable|string',
            'customer_email' => 'nullable|email',
            'customer_cpf_cnpj' => 'nullable|string',
            'customer_phone' => 'nullable|string',
            'create_gateway_subscription' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Verificar se o tenant já tem assinatura ativa
        $existing = SaasSubscription::where('tenant_id', $request->input('tenant_id'))
            ->whereIn('status', ['active', 'trial', 'past_due'])
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Este tenant já possui uma assinatura ativa (ID: ' . $existing->id . '). Cancele ou altere a existente.',
            ], 422);
        }

        $plan = SaasPlan::findOrFail($request->input('plan_id'));
        $startsAt = $request->input('starts_at', now()->toDateString());

        // Determinar trial
        $trialDays = $request->input('trial_days', $plan->trial_days);
        $trialEndsAt = $trialDays > 0 ? now()->addDays($trialDays)->toDateString() : null;
        $status = $trialDays > 0 ? 'trial' : 'active';

        // Calcular próxima cobrança
        $nextBillingDate = $trialDays > 0
            ? now()->addDays($trialDays)->toDateString()
            : ($request->input('billing_cycle') === 'yearly'
                ? now()->addYear()->toDateString()
                : now()->addMonth()->toDateString());

        DB::beginTransaction();
        try {
            $subscription = SaasSubscription::create([
                'tenant_id' => $request->input('tenant_id'),
                'plan_id' => $request->input('plan_id'),
                'billing_cycle' => $request->input('billing_cycle'),
                'status' => $status,
                'starts_at' => $startsAt,
                'trial_ends_at' => $trialEndsAt,
                'next_billing_date' => $nextBillingDate,
            ]);

            // Registrar no gateway se solicitado
            if ($request->boolean('create_gateway_subscription')) {
                try {
                    $gateway = SaasPaymentFactory::create();
                    $gatewayData = $gateway->createRecurringSubscription($subscription, [
                        'name' => $request->input('customer_name', $subscription->tenant->name ?? $subscription->tenant_id),
                        'email' => $request->input('customer_email'),
                        'cpfCnpj' => $request->input('customer_cpf_cnpj'),
                        'phone' => $request->input('customer_phone'),
                    ]);

                    $subscription->gateway_subscription_id = $gatewayData['id'] ?? null;
                    $subscription->save();
                } catch (\Exception $e) {
                    Log::error('SaaS: Falha ao criar assinatura no gateway: ' . $e->getMessage());
                    // Não faz rollback — a assinatura local foi criada, o gateway pode ser configurado depois
                }
            }

            // Ativar o tenant
            $tenant = Tenant::find($request->input('tenant_id'));
            if ($tenant && $tenant->ativo !== 's') {
                $tenant->ativo = 's';
                $tenant->save();
            }

            DB::commit();

            return response()->json([
                'message' => 'Assinatura criada com sucesso.',
                'data' => $subscription->load(['plan', 'tenant']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Erro ao criar assinatura: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Exibe detalhes de uma assinatura.
     */
    public function show($id)
    {
        $subscription = SaasSubscription::with(['plan', 'tenant', 'invoices' => function ($q) {
            $q->orderBy('due_date', 'desc')->limit(12);
        }])->find($id);

        if (!$subscription) {
            return response()->json(['message' => 'Assinatura não encontrada.'], 404);
        }

        return response()->json($subscription);
    }

    /**
     * Atualiza uma assinatura (plano, ciclo, etc).
     */
    public function update(Request $request, $id)
    {
        $subscription = SaasSubscription::find($id);

        if (!$subscription) {
            return response()->json(['message' => 'Assinatura não encontrada.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'plan_id' => 'nullable|integer|exists:mysql.saas_plans,id',
            'billing_cycle' => 'nullable|in:monthly,yearly',
            'status' => 'nullable|in:active,suspended,cancelled,trial,past_due',
            'next_billing_date' => 'nullable|date',
            'config' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($request->has('plan_id')) {
            $subscription->plan_id = $request->input('plan_id');
        }

        if ($request->has('billing_cycle')) {
            $subscription->billing_cycle = $request->input('billing_cycle');
        }

        if ($request->has('next_billing_date')) {
            $subscription->next_billing_date = $request->input('next_billing_date');
        }

        if ($request->has('config')) {
            $subscription->config = array_merge($subscription->config ?? [], $request->input('config'));
        }

        // Mudança de status manual
        if ($request->has('status')) {
            $newStatus = $request->input('status');
            match ($newStatus) {
                'active' => $subscription->activate(),
                'suspended' => $subscription->suspend($request->input('reason', 'Suspensão manual')),
                'cancelled' => $subscription->cancel($request->input('reason', 'Cancelamento manual')),
                default => $subscription->status = $newStatus,
            };
        }

        $subscription->save();

        return response()->json([
            'message' => 'Assinatura atualizada com sucesso.',
            'data' => $subscription->load(['plan', 'tenant']),
        ]);
    }

    /**
     * Suspende uma assinatura.
     */
    public function suspend(Request $request, $id)
    {
        $subscription = SaasSubscription::find($id);

        if (!$subscription) {
            return response()->json(['message' => 'Assinatura não encontrada.'], 404);
        }

        $reason = $request->input('reason', 'Suspensão manual pelo administrador');
        $subscription->suspend($reason);

        return response()->json([
            'message' => 'Assinatura suspensa com sucesso. O tenant foi desativado.',
            'data' => $subscription->load(['plan', 'tenant']),
        ]);
    }

    /**
     * Reativa uma assinatura suspensa.
     */
    public function reactivate($id)
    {
        $subscription = SaasSubscription::find($id);

        if (!$subscription) {
            return response()->json(['message' => 'Assinatura não encontrada.'], 404);
        }

        if (!in_array($subscription->status, ['suspended', 'past_due'])) {
            return response()->json(['message' => 'Apenas assinaturas suspensas ou em atraso podem ser reativadas.'], 422);
        }

        $subscription->activate();

        return response()->json([
            'message' => 'Assinatura reativada com sucesso. O tenant foi ativado.',
            'data' => $subscription->load(['plan', 'tenant']),
        ]);
    }

    /**
     * Remove uma assinatura (soft).
     */
    public function destroy($id)
    {
        $subscription = SaasSubscription::find($id);

        if (!$subscription) {
            return response()->json(['message' => 'Assinatura não encontrada.'], 404);
        }

        // Cancelar no gateway se existir
        if ($subscription->gateway_subscription_id) {
            try {
                $gateway = SaasPaymentFactory::create();
                $gateway->cancelRecurringSubscription($subscription->gateway_subscription_id);
            } catch (\Exception $e) {
                Log::error('SaaS: Falha ao cancelar assinatura no gateway: ' . $e->getMessage());
            }
        }

        $subscription->cancel('Excluída pelo administrador');

        return response()->json(['message' => 'Assinatura cancelada com sucesso.']);
    }
}
