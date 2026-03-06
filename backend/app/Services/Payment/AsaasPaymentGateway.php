<?php

namespace App\Services\Payment;

use App\Interfaces\PaymentGatewayInterface;
use App\Models\Curso;
use App\Models\Matricula;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AsaasPaymentGateway implements PaymentGatewayInterface
{
    protected string $apiKey;
    protected string $apiUrl;
    protected ?string $webhookSecret;

    public function __construct()
    {
        $credential = \App\Http\Controllers\api\ApiCredentialController::get('asaas');
        
        $this->apiKey = $credential ? ($credential->config['pass'] ?? $credential->config['api_key'] ?? null) : env('ASAAS_API_KEY');
        $this->webhookSecret = $credential ? ($credential->config['webhook_secret'] ?? $credential->getMeta('webhook_secret')) : env('ASAAS_WEBHOOK_SECRET');
        
        // Sandbox ou Produção
        $environment = $credential->config['environment'] ?? 'sandbox';
        $this->apiUrl = $environment === 'production' 
            ? 'https://api.asaas.com/v3' 
            : 'https://sandbox.asaas.com/api/v3';

        if (!$this->apiKey) {
            throw new \Exception("Credenciais do Asaas não configuradas. Verifique a integração 'asaas' no painel.");
        }
    }

    public function createCheckoutSession(int $courseId, array $customerData): string
    {
        $course = Curso::findOrFail($courseId);
        
        $price = $course->valor;
        if (!$price || $price <= 0) {
            throw new \Exception("Curso não possui valor configurado para venda.");
        }

        // 1. Criar ou buscar o cliente no Asaas
        $customerId = $this->getOrCreateCustomer($customerData);

        // 2. Criar uma cobrança (Payment) no Asaas
        $dueDate = now()->addDays(3)->format('Y-m-d');
        
        $response = Http::withHeaders([
            'access_token' => $this->apiKey,
        ])->post("{$this->apiUrl}/payments", [
            'customer' => $customerId,
            'billingType' => 'UNDEFINED', // Deixa o usuário escolher (Boleto, Pix, Cartão)
            'value' => $price,
            'dueDate' => $dueDate,
            'description' => "Pagamento do curso {$course->titulo}",
            'externalReference' => "course_{$courseId}_{$customerData['email']}",
        ]);

        if ($response->failed()) {
            Log::error('Asaas Create Payment Failed', $response->json());
            throw new \Exception("Falha ao criar cobrança no Asaas. " . ($response->json('errors')[0]['description'] ?? ''));
        }

        $payment = $response->json();
        
        // Retornar a URL da fatura (Checkout do Asaas)
        return $payment['invoiceUrl'];
    }

    public function handleWebhook(Request $request)
    {
        // No Asaas, a verificação costuma ser através de um header de authorization
        // configurado na hora de criar o Webhook, ou no payload.
        // Simulando uma validação básica pelo header 'asaas-access-token'
        $token = $request->header('asaas-access-token');

        if ($this->webhookSecret && $token !== $this->webhookSecret) {
            Log::error('Asaas Webhook Error: Token inválido', ['token' => $token]);
            return response()->json(['error' => 'Invalid webhook token'], 401);
        }

        $event = $request->input('event');
        $payment = $request->input('payment');

        if ($event === 'PAYMENT_RECEIVED' || $event === 'PAYMENT_CONFIRMED') {
            $externalReference = $payment['externalReference'] ?? null;
            
            if ($externalReference && str_starts_with($externalReference, 'course_')) {
                // Formato esperado: course_{courseId}_{email}
                $parts = explode('_', $externalReference);
                if (count($parts) >= 3) {
                    $courseId = $parts[1];
                    // Reagrupar o email caso tenha underlines adicionais
                    $email = implode('_', array_slice($parts, 2));

                    // O Asaas não costuma mandar name e phone via webhook solto sem ir buscar.
                    // Para simplificar, usamos default se o cliente não existe
                    $this->processEnrollment($courseId, $email, 'Aluno', '');
                    Log::info("Asaas Payment Confirmed for Course ID: {$courseId}, Email: {$email}");
                }
            } else {
                Log::warning("Asaas Payment Confirmed with unknown reference: {$externalReference}");
            }
        }

        return response()->json(['status' => 'success']);
    }

    protected function getOrCreateCustomer(array $customerData): string
    {
        $email = $customerData['email'] ?? null;
        if (empty($email)) {
            throw new \Exception("E-mail não fornecido para criação do cliente no Asaas.");
        }

        // Buscar cliente por email
        $response = Http::withHeaders([
            'access_token' => $this->apiKey,
        ])->get("{$this->apiUrl}/customers", [
            'email' => $email
        ]);

        $customers = $response->json('data') ?? [];

        if (count($customers) > 0) {
            return $customers[0]['id'];
        }

        // Se não encontrou, vamos criar. Asaas requer nome, vamos garantir um.
        $name = $customerData['name'] ?? explode('@', $email)[0];
        
        $payload = [
            'name' => $name,
            'email' => $email,
        ];

        if (!empty($customerData['phone'])) {
            $payload['phone'] = $customerData['phone'];
            $payload['mobilePhone'] = $customerData['phone'];
        }

        $createResponse = Http::withHeaders([
            'access_token' => $this->apiKey,
        ])->post("{$this->apiUrl}/customers", $payload);

        if ($createResponse->failed()) {
            throw new \Exception("Falha ao criar cliente no Asaas. " . ($createResponse->json('errors')[0]['description'] ?? ''));
        }

        return $createResponse->json('id');
    }

    protected function processEnrollment($courseId, $email, $name, $phone)
    {
        // Encontrar o Client
        $client = Client::where('email', $email)->first();

        if (!$client) {
            Log::warning("Webhook received payment for unknown client email: {$email}");
            return;
        }

        // Checar se já matriculado com 'int' ou 'mat'
        $existingEnrollment = Matricula::where('id_cliente', $client->id)
            ->where('id_curso', $courseId)
            ->first();

        if ($existingEnrollment) {
            if ($existingEnrollment->situacao != 'mat') {
                $existingEnrollment->situacao = 'mat';
                $existingEnrollment->data_matricula = now()->toDateString();
                $existingEnrollment->save();
                Log::info("Enrollment updated to 'mat' for client {$client->id} and course {$courseId}");
            } else {
                Log::info("Client {$client->id} is already enrolled in course {$courseId} with 'mat' status.");
            }
            return;
        }

        // Caso excepcional onde a matrícula 'int' não foi gerada antes (fallback de segurança)
        Matricula::create([
            'id_cliente' => $client->id,
            'id_curso' => $courseId,
            'situacao' => 'mat',
            'data_matricula' => now()->toDateString(),
            'turma' => 0,
            'tipo' => 'curso', 
        ]);
        Log::info("Fallback: New 'mat' enrollment created for client {$client->id} and course {$courseId}");
    }
}
