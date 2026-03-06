<?php

namespace App\Services\Payment;

use App\Interfaces\PaymentGatewayInterface;

class PaymentGatewayFactory
{
    /**
     * Creates an instance of a PaymentGatewayInterface.
     * Currently always returns StripePaymentGateway, 
     * but designed to allow passing a 'provider' argument in the future.
     */
    public static function create(?string $provider = 'stripe'): PaymentGatewayInterface
    {
        switch (strtolower($provider)) {
            case 'stripe':
                return new StripePaymentGateway();
            case 'asaas':
                return new AsaasPaymentGateway();
            default:
                throw new \InvalidArgumentException("Payment provider [{$provider}] is not supported.");
        }
    }
}
