<?php

namespace App\Services\Financial;

use App\Models\FinancialAccount;
use App\Services\Payment\PaymentGatewayFactory;

class BillingService
{
    /**
     * Generate a charge for a specific financial account.
     *
     * @param FinancialAccount $account
     * @param string $billingType (e.g., 'BOLETO', 'PIX')
     * @return FinancialAccount
     * @throws \Exception
     */
    public function generateCharge(FinancialAccount $account, string $billingType = 'BOLETO'): FinancialAccount
    {
        if (!$account->isReceivable()) {
            throw new \Exception("Apenas contas a receber podem gerar cobranças.");
        }

        if ($account->isPaid() || $account->status === 'cancelled') {
            throw new \Exception("A conta já está paga ou cancelada.");
        }

        $client = $account->client;
        if (!$client) {
            throw new \Exception("A conta precisa ter um cliente vinculado para gerar uma cobrança.");
        }

        // Initialize Asaas gateway via factory
        $gateway = PaymentGatewayFactory::create('asaas');

        if (!method_exists($gateway, 'createSingleCharge')) {
            throw new \Exception("O gateway de pagamento configurado não suporta a geração de cobranças avulsas.");
        }

        // Call createSingleCharge
        $paymentData = $gateway->createSingleCharge($account, $client, $billingType);

        // Update the account config
        $config = is_array($account->config) ? $account->config : json_decode($account->config ?? '{}', true) ?? [];
        $config['asaas_payment_id'] = $paymentData['id'] ?? null;
        
        if (isset($paymentData['bankSlipUrl'])) {
            $config['invoice_url'] = $paymentData['bankSlipUrl'];
        } elseif (isset($paymentData['invoiceUrl'])) {
            $config['invoice_url'] = $paymentData['invoiceUrl'];
        }

        $account->config = $config;
        $account->save();

        return $account;
    }

    /**
     * Updates a charge in the payment gateway if it exists.
     *
     * @param FinancialAccount $account
     * @return FinancialAccount
     * @throws \Exception
     */
    public function updateCharge(FinancialAccount $account): FinancialAccount
    {
        if ($account->status !== 'pending') {
            throw new \Exception("Apenas contas pendentes podem ser atualizadas no gateway.");
        }

        $config = is_array($account->config) ? $account->config : json_decode($account->config ?? '{}', true) ?? [];
        $asaasPaymentId = $config['asaas_payment_id'] ?? null;

        if (!$asaasPaymentId) {
            // No gateway charge to update
            return $account;
        }

        $gateway = PaymentGatewayFactory::create('asaas');

        if (method_exists($gateway, 'updateSingleCharge')) {
            $gateway->updateSingleCharge($account, $asaasPaymentId);
        }

        return $account;
    }

    /**
     * Synchronizes customer data with the payment gateway.
     *
     * @param \App\Models\User $client
     * @return void
     * @throws \Exception
     */
    public function syncCustomer(\App\Models\User $client): void
    {
        // Only sync if the customer has an Asaas ID
        $asaasId = \App\Services\Qlib::get_usermeta($client->id, 'id_asaas', true);
        if (!$asaasId) {
            return;
        }

        $gateway = PaymentGatewayFactory::create('asaas');

        if (method_exists($gateway, 'ensureAsaasCustomer')) {
            $gateway->ensureAsaasCustomer($client);
        }
    }
}
