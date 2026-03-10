<?php

namespace App\Services\Payment;

use App\Interfaces\PaymentGatewayInterface;
use App\Models\Curso;
use App\Models\Matricula;
use App\Models\Client;
use Illuminate\Http\Request;
use Stripe\StripeClient;
use Stripe\Webhook;
use Illuminate\Support\Facades\Log;

class StripePaymentGateway implements PaymentGatewayInterface
{
    protected StripeClient $stripe;
    protected ?string $webhookSecret;

    public function __construct()
    {
        $credential = \App\Http\Controllers\api\ApiCredentialController::get('stripe');
        
        $secretKey = $credential ? ($credential->config['pass'] ?? $credential->config['secret_key'] ?? null) : null;
        $this->webhookSecret = $credential ? ($credential->config['webhook_secret'] ?? $credential->getMeta('webhook_secret')) : null;

        if (!$secretKey) {
            throw new \Exception("Credenciais do Stripe não configuradas. Verifique a integração 'stripe' no painel.");
        }

        $this->stripe = new StripeClient($secretKey);
    }

    public function createCheckoutSession(int $courseId, array $customerData): string
    {
        $course = Curso::findOrFail($courseId);
        
        $price = $course->valor;
        if (!$price || $price <= 0) {
            throw new \Exception("Curso não possui valor configurado para venda.");
        }

        // Create or find customer, if email is provided
        $stripeCustomerId = null;
        if (!empty($customerData['email'])) {
            $customers = $this->stripe->customers->search([
                'query' => "email:'{$customerData['email']}'",
            ]);

            if (count($customers->data) > 0) {
                $stripeCustomerId = $customers->data[0]->id;
            } else {
                $customerPayload = [
                    'email' => $customerData['email'],
                    'name' => $customerData['name'] ?? null,
                ];
                if (!empty($customerData['phone'])) {
                    $customerPayload['phone'] = $customerData['phone'];
                }
                $stripeCustomer = $this->stripe->customers->create($customerPayload);
                $stripeCustomerId = $stripeCustomer->id;
            }
        }

        $frontendUrl = env('FRONTEND_URL', 'http://localhost:4000');

        $sessionData = [
            'payment_method_types' => ['card'],
            'line_items' => [[
                'price_data' => [
                    'currency' => 'brl',
                    'product_data' => [
                        'name' => $course->titulo ?? $course->nome,
                    ],
                    'unit_amount' => (int) ($price * 100), // Stripe uses cents
                ],
                'quantity' => 1,
            ]],
            'metadata' => [
                'course_id' => $course->id,
            ],
            'mode' => 'payment',
            'success_url' => $frontendUrl . '/aluno/painel?payment=success&session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $frontendUrl . '/cursos/' . ($course->slug ?? $course->id) . '?payment=cancelled',
        ];

        // Se houver imagem, adicionar
        $imageUrl = url($course->config['cover']['url'] ?? '');
        if (!empty($course->config['cover']['url'])) {
            $sessionData['line_items'][0]['price_data']['product_data']['images'] = [$imageUrl];
        }

        // Se o cliente foi identificado, anexar
        if ($stripeCustomerId) {
            $sessionData['customer'] = $stripeCustomerId;
            $sessionData['metadata']['customer_email'] = $customerData['email'] ?? '';
            $sessionData['metadata']['customer_name'] = $customerData['name'] ?? '';
            $sessionData['metadata']['customer_phone'] = $customerData['phone'] ?? '';
        }

        $session = $this->stripe->checkout->sessions->create($sessionData);

        return $session->url;
    }

    public function handleWebhook(Request $request)
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');
        $endpointSecret = $this->webhookSecret;

        if (!$endpointSecret) {
            Log::error('Stripe Webhook Error: Webhook secret not configured in env or ApiCredential');
            return response()->json(['error' => 'Webhook secret not configured'], 500);
        }

        try {
            $event = Webhook::constructEvent($payload, $sigHeader, $endpointSecret);
        } catch (\UnexpectedValueException $e) {
            // Invalid payload
            Log::error('Stripe Webhook Error: Invalid payload', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Invalid payload'], 400);
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            // Invalid signature
            Log::error('Stripe Webhook Error: Invalid signature', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Invalid signature'], 400);
        }

        // Handle the event
        switch ($event->type) {
            case 'checkout.session.completed':
                $session = $event->data->object;
                
                $courseId = $session->metadata->course_id;
                
                // Extrai do metadata se passamos auth, senão extrai do Stripe Collector
                $customerEmail = $session->metadata->customer_email ?? null;
                $customerName = $session->metadata->customer_name ?? null;
                $customerPhone = $session->metadata->customer_phone ?? null;

                if (empty($customerEmail) && isset($session->customer_details)) {
                    $customerEmail = $session->customer_details->email;
                    $customerName = $session->customer_details->name ?? 'Aluno ' . explode('@', $customerEmail)[0];
                    $customerPhone = $session->customer_details->phone ?? '';
                }

                if ($customerEmail) {
                    $this->processEnrollment($courseId, $customerEmail, $customerName, $customerPhone);
                    Log::info("Stripe Checkout Completed for Course ID: {$courseId}, Email: {$customerEmail}");
                } else {
                    Log::error("Stripe Checkout Completed but NO EMAIL available for Course ID: {$courseId}");
                }
                break;
                
            // ... handle other event types if needed
            default:
                Log::info('Received unknown event type ' . $event->type);
        }

        return response()->json(['status' => 'success']);
    }

    public function processPayment(\App\Models\Matricula $matricula, array $paymentData): array
    {
        // For direct payments (Credit Card/PIX) via Stripe, implementation would be here.
        // For now, mirroring Asaas change for signature compatibility.
        throw new \Exception("Stripe direct payment not implemented yet.");
    }

    protected function processEnrollment($courseId, $email, $name, $phone)
    {
        // Encontrar o Client
        $client = Client::where('email', $email)->first();

        if (!$client) {
            Log::warning("Stripe Webhook received payment for unknown client email: {$email}");
            return;
        }

        // Checar se já matriculado com 'int' ou 'mat'
        $existingEnrollment = Matricula::where('id_cliente', $client->id)
            ->where('id_curso', $courseId)
            ->first();

        if ($existingEnrollment) {
            // Update to active if it was interested/cancelled
            if ($existingEnrollment->situacao != 'mat') {
                $existingEnrollment->situacao = 'mat';
                $existingEnrollment->data_matricula = now()->toDateString();
                $existingEnrollment->save();
                Log::info("Stripe: Enrollment updated to 'mat' for client {$client->id} and course {$courseId}");
            } else {
                Log::info("Stripe: Client {$client->id} is already enrolled in course {$courseId} with 'mat' status.");
            }
            return;
        }

        // Create new enrollment (fallback)
        Matricula::create([
            'id_cliente' => $client->id,
            'id_curso' => $courseId,
            'situacao' => 'mat',
            'data_matricula' => now()->toDateString(),
            'turma' => 0,
            'tipo' => 'curso', // or according to your defaults
        ]);
        Log::info("Stripe Fallback: New 'mat' enrollment created for client {$client->id} and course {$courseId}");
        
        // Optional: send welcome email, logic can be dispatched as a Job or Event.
        // event(new \App\Events\CoursePurchased($client, $courseId));
    }
}
