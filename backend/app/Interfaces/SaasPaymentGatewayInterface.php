<?php

namespace App\Interfaces;

use App\Models\SaasInvoice;
use App\Models\SaasSubscription;
use App\Models\Tenant;
use Illuminate\Http\Request;

interface SaasPaymentGatewayInterface
{
    /**
     * Cria ou atualiza um cliente no gateway de pagamento para o tenant.
     *
     * @param Tenant $tenant
     * @param array $customerData {name, email, cpfCnpj, phone, ...}
     * @return string O ID do cliente no gateway
     */
    public function ensureCustomer(Tenant $tenant, array $customerData): string;

    /**
     * Cria uma cobrança (fatura) no gateway de pagamento.
     *
     * @param SaasInvoice $invoice
     * @param string $billingType BOLETO, PIX, CREDIT_CARD ou UNDEFINED
     * @return array Dados da cobrança criada no gateway
     */
    public function createCharge(SaasInvoice $invoice, string $billingType = 'UNDEFINED'): array;

    /**
     * Cria uma assinatura recorrente no gateway.
     *
     * @param SaasSubscription $subscription
     * @param array $customerData
     * @return array Dados da assinatura criada no gateway
     */
    public function createRecurringSubscription(SaasSubscription $subscription, array $customerData): array;

    /**
     * Cancela uma assinatura recorrente no gateway.
     *
     * @param string $gatewaySubscriptionId
     * @return bool
     */
    public function cancelRecurringSubscription(string $gatewaySubscriptionId): bool;

    /**
     * Processa webhook do gateway SaaS.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function handleWebhook(Request $request);
}
