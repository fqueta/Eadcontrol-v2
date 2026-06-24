<?php

namespace App\Services\SaasPayment;

use App\Interfaces\SaasPaymentGatewayInterface;
use App\Models\SaasGatewayConfig;
use App\Models\SaasInvoice;
use App\Models\SaasSubscription;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Gateway Asaas para cobrança SaaS.
 *
 * Usa credenciais DIFERENTES das configuradas pelos tenants.
 * As credenciais são lidas de variáveis de ambiente (SAAS_ASAAS_*).
 */
class SaasAsaasGateway implements SaasPaymentGatewayInterface
{
    protected string $apiKey;
    protected string $apiUrl;
    protected ?string $webhookSecret;

    public function __construct(?string $provider = 'asaas')
    {
        // Tenta ler do banco de dados primeiro, com fallback para .env
        $dbConfig = SaasGatewayConfig::getActiveConfig($provider);

        if ($dbConfig && $dbConfig->api_key) {
            $this->apiKey = $dbConfig->api_key;
            $this->webhookSecret = $dbConfig->webhook_secret;
            $environment = $dbConfig->environment;
        } else {
            $this->apiKey = (string) env('SAAS_ASAAS_API_KEY', '');
            $this->webhookSecret = env('SAAS_ASAAS_WEBHOOK_SECRET');
            $environment = env('SAAS_ASAAS_ENVIRONMENT', 'sandbox');
        }

        $this->apiUrl = $environment === 'production'
            ? 'https://api.asaas.com/v3'
            : 'https://sandbox.asaas.com/api/v3';

        if (!$this->apiKey) {
            Log::warning('SaasAsaasGateway: API Key não configurada. Configure pelo painel SaaS ou defina SAAS_ASAAS_API_KEY no .env');
        }
    }

    /**
     * Garante que o tenant existe como cliente no Asaas SaaS.
     */
    public function ensureCustomer(Tenant $tenant, array $customerData): string
    {
        // Verificar se já tem ID do Asaas salvo na config do tenant
        $config = $tenant->config ?? [];
        $customerId = $config['saas_asaas_customer_id'] ?? null;

        $payload = [
            'name' => $customerData['name'] ?? $tenant->name ?? $tenant->id,
            'email' => $customerData['email'] ?? null,
            'cpfCnpj' => $customerData['cpfCnpj'] ?? null,
            'phone' => $customerData['phone'] ?? null,
            'mobilePhone' => $customerData['phone'] ?? null,
            'externalReference' => 'tenant_' . $tenant->id,
        ];

        if ($customerId) {
            // Atualizar cliente existente
            $response = Http::withHeaders([
                'access_token' => $this->apiKey,
            ])->put("{$this->apiUrl}/customers/{$customerId}", $payload);

            if ($response->failed()) {
                Log::warning("SaaS Asaas: Falha ao atualizar cliente {$customerId}: " . ($response->json('errors')[0]['description'] ?? ''));
            }
        } else {
            // Buscar por referência externa
            $searchResponse = Http::withHeaders([
                'access_token' => $this->apiKey,
            ])->get("{$this->apiUrl}/customers", [
                'externalReference' => 'tenant_' . $tenant->id,
            ]);

            $customers = $searchResponse->json('data') ?? [];

            if (count($customers) > 0) {
                $customerId = $customers[0]['id'];
            } else {
                // Criar novo cliente
                $createResponse = Http::withHeaders([
                    'access_token' => $this->apiKey,
                ])->post("{$this->apiUrl}/customers", $payload);

                if ($createResponse->failed()) {
                    throw new \Exception("SaaS Asaas: Falha ao criar cliente. " . ($createResponse->json('errors')[0]['description'] ?? ''));
                }

                $customerId = $createResponse->json('id');
                Log::info("SaaS Asaas: Novo cliente criado com ID {$customerId} para tenant {$tenant->id}.");
            }
        }

        // Salvar ID do Asaas na config do tenant
        $config['saas_asaas_customer_id'] = $customerId;
        $tenant->config = $config;
        $tenant->save();

        return $customerId;
    }

    /**
     * Cria uma cobrança (fatura avulsa) no Asaas.
     */
    public function createCharge(SaasInvoice $invoice, string $billingType = 'UNDEFINED'): array
    {
        $subscription = $invoice->subscription;
        $tenant = $invoice->tenant;

        // Garantir customer ID — cria automaticamente se não existir
        $customerId = $subscription->gateway_customer_id
            ?? $tenant->config['saas_asaas_customer_id']
            ?? null;

        if (!$customerId) {
            $customerData = array_filter([
                'name' => $tenant->data['name'] ?? $tenant->name ?? $tenant->id,
                'email' => $tenant->data['email'] ?? null,
                'cpfCnpj' => $tenant->data['cpf_cnpj'] ?? $tenant->data['document'] ?? $subscription->config['customer_cpf_cnpj'] ?? null,
                'phone' => $tenant->data['phone'] ?? $tenant->data['telephone'] ?? $subscription->config['customer_phone'] ?? null,
            ]);

            if (!$customerData['cpfCnpj']) {
                throw new \Exception(
                    "SaaS Asaas: Tenant {$tenant->id} não possui CPF/CNPJ. " .
                    "Edite os dados do tenant no painel SaaS para adicionar o CPF ou CNPJ."
                );
            }

            $customerId = $this->ensureCustomer($tenant, $customerData);

            $subscription->gateway_customer_id = $customerId;
            $subscription->save();
        }

        $payload = [
            'customer' => $customerId,
            'billingType' => $billingType,
            'value' => (float) $invoice->total,
            'dueDate' => $invoice->due_date->format('Y-m-d'),
            'description' => "Assinatura SaaS - Plano: {$subscription->plan->name} - Fatura: {$invoice->invoice_number}",
            'externalReference' => 'saas_invoice_' . $invoice->id,
        ];

        $response = Http::withHeaders([
            'access_token' => $this->apiKey,
        ])->post("{$this->apiUrl}/payments", $payload);

        if ($response->failed()) {
            Log::error('SaaS Asaas: Falha ao criar cobrança', $response->json());
            throw new \Exception("Falha ao criar cobrança no Asaas. " . ($response->json('errors')[0]['description'] ?? ''));
        }

        $payment = $response->json();

        // Atualizar fatura com dados do gateway
        $invoice->gateway_payment_id = $payment['id'] ?? null;
        $invoice->gateway_invoice_url = $payment['invoiceUrl'] ?? null;
        $invoice->gateway_boleto_url = $payment['bankSlipUrl'] ?? null;

        // Se for PIX, buscar QR Code
        if ($billingType === 'PIX' && isset($payment['id'])) {
            $pixResponse = Http::withHeaders([
                'access_token' => $this->apiKey,
            ])->get("{$this->apiUrl}/payments/{$payment['id']}/pixQrCode");

            if ($pixResponse->successful()) {
                $pixData = $pixResponse->json();
                $invoice->gateway_pix_code = $pixData['payload'] ?? null;
                $invoice->gateway_pix_qrcode_url = $pixData['encodedImage'] ?? null;
            }
        }

        $invoice->save();

        return $payment;
    }

    /**
     * Cria assinatura recorrente no Asaas.
     */
    public function createRecurringSubscription(SaasSubscription $subscription, array $customerData): array
    {
        $tenant = $subscription->tenant;
        $plan = $subscription->plan;

        // Garantir que o cliente existe
        $customerId = $this->ensureCustomer($tenant, $customerData);
        $subscription->gateway_customer_id = $customerId;
        $subscription->save();

        $price = $plan->getPriceForCycle($subscription->billing_cycle);
        $cycle = $subscription->billing_cycle === 'yearly' ? 'YEARLY' : 'MONTHLY';

        $payload = [
            'customer' => $customerId,
            'billingType' => 'UNDEFINED',
            'value' => $price,
            'cycle' => $cycle,
            'description' => "Assinatura SaaS - Plano: {$plan->name} ({$subscription->billing_cycle_label})",
            'nextDueDate' => $subscription->next_billing_date
                ? $subscription->next_billing_date->format('Y-m-d')
                : now()->addDays(1)->format('Y-m-d'),
            'externalReference' => 'saas_subscription_' . $subscription->id,
        ];

        $response = Http::withHeaders([
            'access_token' => $this->apiKey,
        ])->post("{$this->apiUrl}/subscriptions", $payload);

        if ($response->failed()) {
            Log::error('SaaS Asaas: Falha ao criar assinatura recorrente', $response->json());
            throw new \Exception("Falha ao criar assinatura recorrente. " . ($response->json('errors')[0]['description'] ?? ''));
        }

        $data = $response->json();

        $subscription->gateway_subscription_id = $data['id'] ?? null;
        $subscription->save();

        Log::info("SaaS Asaas: Assinatura recorrente criada com ID {$data['id']} para tenant {$tenant->id}.");

        return $data;
    }

    /**
     * Cancela assinatura recorrente no Asaas.
     */
    public function cancelRecurringSubscription(string $gatewaySubscriptionId): bool
    {
        $response = Http::withHeaders([
            'access_token' => $this->apiKey,
        ])->delete("{$this->apiUrl}/subscriptions/{$gatewaySubscriptionId}");

        if ($response->failed()) {
            Log::error("SaaS Asaas: Falha ao cancelar assinatura {$gatewaySubscriptionId}", $response->json());
            return false;
        }

        Log::info("SaaS Asaas: Assinatura {$gatewaySubscriptionId} cancelada com sucesso.");
        return true;
    }

    /**
     * Processa webhook do Asaas SaaS.
     */
    public function handleWebhook(Request $request)
    {
        $token = $request->header('asaas-access-token');

        if ($this->webhookSecret && $token !== $this->webhookSecret) {
            Log::error('SaaS Asaas Webhook: Token inválido', ['token' => $token]);
            return response()->json(['error' => 'Invalid webhook token'], 401);
        }

        $event = $request->input('event');
        $payment = $request->input('payment');

        Log::info("SaaS Asaas Webhook: Evento recebido: {$event}", ['payment' => $payment]);

        if (in_array($event, ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'])) {
            $this->handlePaymentConfirmed($payment);
        } elseif ($event === 'PAYMENT_OVERDUE') {
            $this->handlePaymentOverdue($payment);
        } elseif (in_array($event, ['PAYMENT_DELETED', 'PAYMENT_REFUNDED'])) {
            $this->handlePaymentCancelled($payment);
        }

        return response()->json(['status' => 'success']);
    }

    /**
     * Trata pagamento confirmado.
     */
    protected function handlePaymentConfirmed(array $payment): void
    {
        $externalReference = $payment['externalReference'] ?? '';

        if (str_starts_with($externalReference, 'saas_invoice_')) {
            $invoiceId = (int) str_replace('saas_invoice_', '', $externalReference);
            $invoice = SaasInvoice::find($invoiceId);

            if ($invoice && !$invoice->isPaid()) {
                $paymentMethod = match ($payment['billingType'] ?? '') {
                    'CREDIT_CARD' => 'credit_card',
                    'PIX' => 'pix',
                    'BOLETO' => 'boleto',
                    default => 'other',
                };

                $invoice->markAsPaid($paymentMethod, (float) ($payment['value'] ?? $invoice->total));
                Log::info("SaaS Webhook: Fatura {$invoice->invoice_number} marcada como paga via {$paymentMethod}.");
            }
        }
    }

    /**
     * Trata pagamento vencido.
     */
    protected function handlePaymentOverdue(array $payment): void
    {
        $externalReference = $payment['externalReference'] ?? '';

        if (str_starts_with($externalReference, 'saas_invoice_')) {
            $invoiceId = (int) str_replace('saas_invoice_', '', $externalReference);
            $invoice = SaasInvoice::find($invoiceId);

            if ($invoice && $invoice->isPending()) {
                $invoice->markAsOverdue();
                Log::info("SaaS Webhook: Fatura {$invoice->invoice_number} marcada como vencida. Assinatura pode ser suspensa.");
            }
        }
    }

    /**
     * Trata pagamento cancelado/reembolsado.
     */
    protected function handlePaymentCancelled(array $payment): void
    {
        $externalReference = $payment['externalReference'] ?? '';

        if (str_starts_with($externalReference, 'saas_invoice_')) {
            $invoiceId = (int) str_replace('saas_invoice_', '', $externalReference);
            $invoice = SaasInvoice::find($invoiceId);

            if ($invoice) {
                $invoice->cancelInvoice();
                Log::info("SaaS Webhook: Fatura {$invoice->invoice_number} cancelada via webhook.");
            }
        }
    }
}
