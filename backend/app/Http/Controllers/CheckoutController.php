<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\Payment\PaymentGatewayFactory;
use App\Models\Client;
use App\Models\Matricula;

class CheckoutController extends Controller
{
    /**
     * Create a checkout session and return its URL.
     */
    public function createSession(Request $request, string $provider)
    {
        $request->validate([
            'course_id' => 'required|integer|exists:cursos,id',
        ]);

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Criar ou atualizar cliente baseado no usuário logado
        $client = Client::firstOrCreate(
            ['email' => $user->email],
            [
                'nome' => $user->name,
                'celular' => $user->celular ?? $user->telefone ?? '',
                'tipo' => 'pf',
                'ativo' => 's'
            ]
        );

        // Criar matrícula com status de interesse se não existir
        $matricula = Matricula::firstOrCreate(
            [
                'id_cliente' => $client->id,
                'id_curso' => $request->course_id,
            ],
            [
                'situacao' => 'int', 
                'data_matricula' => now()->toDateString(),
                'turma' => 0,
                'tipo' => 'curso',
            ]
        );

        // O usuário já está autenticado, podemos passar os dados dele para o provedor
        $customerData = [
            'name' => $client->nome,
            'email' => $client->email,
            'phone' => $client->celular,
        ];

        try {
            $gateway = PaymentGatewayFactory::create($provider);
            $sessionUrl = $gateway->createCheckoutSession(
                $request->course_id,
                $customerData
            );

            return response()->json(['url' => $sessionUrl]);
            
        } catch (\Exception $e) {
            \Log::error('Checkout Session Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Unable to create checkout session. ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle incoming webhooks from the payment provider.
     */
    public function handleWebhook(Request $request, $provider)
    {
        try {
            $gateway = PaymentGatewayFactory::create($provider);
            return $gateway->handleWebhook($request);
        } catch (\Exception $e) {
            \Log::error("Webhook routing error for provider [{$provider}]: " . $e->getMessage());
            return response()->json(['error' => 'Webhook routing failed'], 400);
        }
    }
}
