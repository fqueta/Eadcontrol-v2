<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Services\SaasPayment\SaasPaymentFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SaasWebhookController extends Controller
{
    /**
     * Handle incoming SaaS webhook from payment gateway.
     * Rota: POST /api/v1/saas/webhook/{provider}
     */
    public function handle(Request $request, string $provider = 'asaas')
    {
        Log::info("SaaS Webhook received from provider: {$provider}", [
            'headers' => $request->headers->all(),
            'body_preview' => array_slice($request->all(), 0, 5),
        ]);

        try {
            $gateway = SaasPaymentFactory::create($provider);
            return $gateway->handleWebhook($request);
        } catch (\Exception $e) {
            Log::error("SaaS Webhook error: " . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
