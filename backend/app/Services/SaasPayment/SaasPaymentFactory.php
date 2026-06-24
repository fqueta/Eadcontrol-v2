<?php

namespace App\Services\SaasPayment;

use App\Interfaces\SaasPaymentGatewayInterface;

class SaasPaymentFactory
{
    /**
     * Cria instância do gateway SaaS.
     * Por enquanto, apenas Asaas é suportado.
     */
    public static function create(?string $provider = null): SaasPaymentGatewayInterface
    {
        $provider = $provider ?? env('SAAS_PAYMENT_PROVIDER', 'asaas');

        return match (strtolower($provider)) {
            'asaas' => new SaasAsaasGateway(),
            default => throw new \InvalidArgumentException("SaaS Payment provider [{$provider}] is not supported."),
        };
    }
}
