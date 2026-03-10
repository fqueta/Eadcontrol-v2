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
     * Processes a direct payment (Credit Card, PIX, Boleto).
     *
     * @param \App\Models\Matricula $matricula
     * @param array $paymentData {billingType, creditCard, creditCardHolderInfo...}
     * @return array Response with payment status and necessary data (PIX code, invoice URL, etc.)
     */
    public function processPayment(\App\Models\Matricula $matricula, array $paymentData): array;

    /**
     * Handles incoming webhooks from the payment gateway.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse|null
     */
    public function handleWebhook(Request $request);
}
