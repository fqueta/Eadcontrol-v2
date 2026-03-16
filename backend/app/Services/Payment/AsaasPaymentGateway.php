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

        // 1. Criar ou buscar o cliente
        $client = Client::getOrCreate($customerData);
        $customerId = $this->ensureAsaasCustomer($client);

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
            
            if ($externalReference && is_numeric($externalReference)) {
                // O externalReference agora é o ID da matrícula
                $matricula = Matricula::find($externalReference);
                
                if ($matricula) {
                    $situacao_id_mat = \App\Services\Qlib::buscaValorDb('posts', 'post_name', 'mat', 'ID');
                    if ($matricula->situacao_id != $situacao_id_mat) {
                        $matricula->situacao_id = $situacao_id_mat;
                        $matricula->save();
                        Log::info("Asaas Webhook: Matricula {$matricula->id} updated to 'mat' (enrolled).");
                        
                        \App\Services\Qlib::logMatriculaEvent($matricula->id, 'webhook_confirmation', "Pagamento confirmado via Webhook: {$event}", [
                            'event' => $event,
                            'payment_data' => $payment
                        ]);

                        // Enviar e-mail de boas-vindas (Sucesso de Compra)
                        try {
                            $client = $matricula->student;
                            $course = $matricula->course;
                            $client->notify(new \App\Notifications\WelcomeEmailNotification(
                                $client->name,
                                $course->titulo,
                                $course->id,
                                $course->slug
                            ));
                            Log::info("Welcome email (Success) sent to {$client->email} via Webhook confirmation.");
                        } catch (\Exception $e) {
                            Log::error("Failed to send welcome email via Webhook: " . $e->getMessage());
                        }

                        // Notificar administradores da nova venda
                        try {
                            $admins = \App\Models\User::where('permission_id', '<', 3)->get();
                            if ($admins->isNotEmpty()) {
                                \Illuminate\Support\Facades\Notification::send($admins, new \App\Notifications\NewSaleAdminNotification($matricula));
                                Log::info("Admin sale notification sent for Matricula {$matricula->id} via Webhook.");
                            }
                        } catch (\Exception $e) {
                            Log::error("Failed to send admin sale notification via Webhook: " . $e->getMessage());
                        }
                    }
                } else {
                    Log::warning("Asaas Webhook: Matricula ID {$externalReference} not found.");
                }
            } elseif ($externalReference && str_starts_with($externalReference, 'course_')) {
                // Legado: Formato course_{courseId}_{email}
                $parts = explode('_', $externalReference);
                if (count($parts) >= 3) {
                    $courseId = $parts[1];
                    $email = implode('_', array_slice($parts, 2));
                    $this->processEnrollment($courseId, $email, 'Aluno', '');
                }
            } else {
                Log::warning("Asaas Payment Confirmed with unknown reference: {$externalReference}");
            }
        }

        return response()->json(['status' => 'success']);
    }

    public function processPayment(Matricula $matricula, array $paymentData): array
    {
        $client = $matricula->student;
        $course = $matricula->course;
        $courseTitle = $course->titulo;
        $price = $matricula->total;

        // 1. Garantir que o cliente existe no Asaas e obter o ID
        $customerId = $this->ensureAsaasCustomer($client);

        // 2. Preparar payload de cobrança
        $billingType = strtoupper($paymentData['billingType'] ?? 'UNDEFINED');
        $dueDate = now()->addDays(1)->format('Y-m-d');

        $payload = [
            'customer' => $customerId,
            'billingType' => $billingType,
            'value' => $price,
            'dueDate' => $dueDate,
            'description' => "Pagamento do curso {$courseTitle}",
            'externalReference' => (string) $matricula->id,
        ];

        // 3. Adicionar dados específicos por tipo de pagamento
        if ($billingType === 'CREDIT_CARD') {
            $payload['creditCard'] = $paymentData['creditCard'];
            $payload['creditCardHolderInfo'] = $paymentData['creditCardHolderInfo'];
            $payload['remoteIp'] = request()->ip();
        }

        // Gravar requisição nos logs
        \App\Services\Qlib::update_matriculameta($matricula->id, 'requisicao_asaas', json_encode($payload));
        \App\Services\Qlib::logMatriculaEvent($matricula->id, 'payment_request', "Iniciando requisição de pagamento via {$billingType}", [
            'payload' => $payload,
            'billing_type' => $billingType
        ]);

        // 4. Realizar a chamada para a API do Asaas
        $response = Http::withHeaders([
            'access_token' => $this->apiKey,
        ])->post("{$this->apiUrl}/payments", $payload);

        $payment = $response->json();
        
        // Gravar resposta nos logs
        \App\Services\Qlib::update_matriculameta($matricula->id, 'resposta_asaas', json_encode($payment));
        \App\Services\Qlib::logMatriculaEvent($matricula->id, 'payment_response', "Resposta da API do Asaas recebida", [
            'status_code' => $response->status(),
            'response' => $payment,
            'success' => $response->successful()
        ]);

        if ($response->failed()) {
            Log::error('Asaas Direct Payment Failed', $payment);
            throw new \Exception("Falha ao processar pagamento no Asaas. " . ($payment['errors'][0]['description'] ?? ''));
        }

        // 5. Se a resposta foi sucesso e o pagamento for cartão, mudar status para matriculado (mat)
        $authResponse = null;
        if ($billingType === 'CREDIT_CARD' && isset($payment['status']) && ($payment['status'] === 'CONFIRMED' || $payment['status'] === 'RECEIVED')) {
            $situacao_id_mat = \App\Services\Qlib::buscaValorDb('posts', 'post_name', 'mat', 'ID');
            $matricula->situacao_id = $situacao_id_mat;
            $matricula->save();

            // Gerar token para auto-login
            $token = $client->createToken('checkout-auto-login')->plainTextToken;
            $pid = $client->permission_id;
            $menu = (new \App\Http\Controllers\MenuController)->getMenus($pid);
            
            $authResponse = [
                'user' => $client,
                'token' => $token,
                'menu' => $menu,
                'permissions' => [], 
            ];

            // Enviar e-mail de boas-vindas (Sucesso de Compra)
            try {
                $client->notify(new \App\Notifications\WelcomeEmailNotification(
                    $client->name,
                    $courseTitle,
                    $course->id,
                    $course->slug
                ));
                Log::info("Welcome email (Success) sent to {$client->email} after CC approval.");
            } catch (\Exception $e) {
                Log::error("Failed to send welcome email after CC approval: " . $e->getMessage());
            }

            // Notificar administradores da nova venda
            try {
                $admins = \App\Models\User::where('permission_id', '<', 3)->get();
                if ($admins->isNotEmpty()) {
                    \Illuminate\Support\Facades\Notification::send($admins, new \App\Notifications\NewSaleAdminNotification($matricula));
                    Log::info("Admin sale notification sent for Matricula {$matricula->id} after CC approval.");
                }
            } catch (\Exception $e) {
                Log::error("Failed to send admin sale notification after CC approval: " . $e->getMessage());
            }
        }

        // 6. Se for PIX, buscar o QR Code se não estiver na resposta principal
        if ($billingType === 'PIX' && !isset($payment['pix'])) {
            $pixResponse = Http::withHeaders([
                'access_token' => $this->apiKey,
            ])->get("{$this->apiUrl}/payments/{$payment['id']}/pixQrCode");

            if ($pixResponse->successful()) {
                $payment['pix'] = $pixResponse->json();
            }
        }

        // 7. Enviar e-mail de pagamento pendente para PIX e BOLETO
        if (in_array($billingType, ['PIX', 'BOLETO'])) {
            $pixCode = $payment['pix']['payload'] ?? $payment['pixQrCode'] ?? null;
            $boletoUrl = $payment['bankSlipUrl'] ?? null;

            try {
                $client->notify(new \App\Notifications\PendingPaymentNotification(
                    $client->name,
                    $courseTitle,
                    $billingType,
                    $pixCode,
                    $boletoUrl
                ));
                Log::info("Pending payment email sent to {$client->email} for {$billingType}");
            } catch (\Exception $e) {
                Log::error("Failed to send pending payment email: " . $e->getMessage());
            }
        }

        return [
            'success' => true,
            'payment' => $payment,
            'matricula_id' => $matricula->id,
            'auth_response' => $authResponse,
            'course_slug' => $course ? $course->slug : null,
        ];
    }

    /**
     * Garante que o cliente existe no Asaas e retorna seu ID do Asaas.
     */
    protected function ensureAsaasCustomer(\App\Models\User $client): string
    {
        $email = $client->email;
        $customerId = \App\Services\Qlib::get_usermeta($client->id, 'id_asaas', true);

        if ($customerId) {
            return $customerId;
        }

        // Buscar por email no Asaas
        $response = Http::withHeaders([
            'access_token' => $this->apiKey,
        ])->get("{$this->apiUrl}/customers", [
            'email' => $email
        ]);

        $customers = $response->json('data') ?? [];

        if (count($customers) > 0) {
            $customerId = $customers[0]['id'];
        } else {
            // Criar no Asaas
            $payload = [
                'name' => $client->name,
                'email' => $email,
                'cpfCnpj' => $client->cpf ?? $client->cnpj ?? null,
                'phone' => $client->celular ?? null,
                'mobilePhone' => $client->celular ?? null,
            ];

            $createResponse = Http::withHeaders([
                'access_token' => $this->apiKey,
            ])->post("{$this->apiUrl}/customers", $payload);

            if ($createResponse->failed()) {
                throw new \Exception("Falha ao criar cliente no Asaas. " . ($createResponse->json('errors')[0]['description'] ?? ''));
            }

            $customerId = $createResponse->json('id');
        }

        // Atualizar meta local
        \App\Services\Qlib::update_usermeta($client->id, 'id_asaas', $customerId);

        return $customerId;
    }


    protected function processEnrollment($courseId, $email, $name, $phone)
    {
        // Encontrar o Client
        $client = Client::where('email', $email)->first();

        if (!$client) {
            Log::warning("Asaas Webhook received payment for unknown client email: {$email}");
            return;
        }

        // Checar se já matriculado
        $existingEnrollment = Matricula::where('id_cliente', $client->id)
            ->where('id_curso', $courseId)
            ->first();

        $situacao_id_mat = \App\Services\Qlib::buscaValorDb('posts', 'post_name', 'mat', 'ID');

        if ($existingEnrollment) {
            if ($existingEnrollment->situacao_id != $situacao_id_mat) {
                $existingEnrollment->situacao_id = $situacao_id_mat;
                $existingEnrollment->data_matricula = now()->toDateString();
                $existingEnrollment->save();
                Log::info("Enrollment updated to 'mat' for client {$client->id} and course {$courseId}");
            }
            return;
        }

        // Caso excepcional onde a matrícula não foi gerada antes
        Matricula::create([
            'id_cliente' => $client->id,
            'id_curso' => $courseId,
            'id_turma' => 0,
            'situacao_id' => $situacao_id_mat,
            'data_matricula' => now()->toDateString(),
            'tipo' => 'curso', 
        ]);
        Log::info("Fallback: New 'mat' enrollment created for client {$client->id} and course {$courseId}");
    }
}
