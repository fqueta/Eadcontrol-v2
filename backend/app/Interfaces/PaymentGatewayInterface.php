<?php

namespace App\Interfaces;

use Illuminate\Http\Request;

interface PaymentGatewayInterface
{
    /**
     * Creates a checkout session for a specific course and customer.
     *
     * @param int $courseId
     * @param array $customerData {name, email, phone...}
     * @return string The URL or ID of the created checkout session.
     */
    public function createCheckoutSession(int $courseId, array $customerData): string;

    /**
     * Handles incoming webhooks from the payment gateway.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse|null
     */
    public function handleWebhook(Request $request);
}
