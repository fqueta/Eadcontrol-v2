<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Curso;
use App\Models\Client;
use App\Services\Payment\PaymentGatewayFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class CheckoutController extends Controller
{
    /**
     * Get course details for public checkout page.
     */
    public function getCourse(string $id)
    {
        $course = Curso::where('id', $id)
            ->orWhere('slug', $id)
            ->where('ativo', 's')
            ->first();

        if (!$course) {
            return response()->json(['error' => 'Curso não encontrado ou inativo.'], 404);
        }

        // Return only necessary data for checkout
        return response()->json([
            'id' => $course->id,
            'titulo' => $course->titulo,
            'valor' => $course->valor,
            'parcelas' => $course->parcelas,
            'valor_parcela' => $course->valor_parcela,
            'imagem_url' => $course->config['cover']['url'] ?? null,
            'descricao' => $course->descricao,
        ]);
    }

    /**
     * Process checkout payment.
     */
    public function process(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'course_id' => 'required|integer|exists:cursos,id',
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'cpfCnpj' => 'required|string|max:18', // Generic validation, specific in gateway if needed
            'phone' => 'nullable|string|max:20',
            'payment_method' => 'required|in:credit_card,pix,boleto',
            'credit_card' => 'required_if:payment_method,credit_card|array',
            'credit_card_holder' => 'required_if:payment_method,credit_card|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $courseId = (int) $request->input('course_id');
            $course = Curso::findOrFail($courseId);

            // 1. Resolve or create Client
            $client = Client::getOrCreate([
                'name' => $request->input('name'),
                'email' => $request->input('email'),
                'cpfCnpj' => $request->input('cpfCnpj'),
                'phone' => $request->input('phone'),
            ]);

            // 2. Create Matricula with initial status 'interessado' (int)
            $situacao_id_int = \App\Services\Qlib::buscaValorDb('posts', 'post_name', 'int', 'ID');
            $matricula = \App\Models\Matricula::create([
                'id_cliente' => $client->id,
                'id_curso' => $courseId,
                'id_turma' => 0,
                'situacao_id' => $situacao_id_int,
                'data_matricula' => now()->toDateString(),
                'tipo' => 'curso',
                'subtotal' => $course->valor,
                'total' => $course->valor,
            ]);

            \App\Services\Qlib::logMatriculaEvent($matricula->id, 'enrollment_intent', "Interesse em curso registrado (Matrícula criada)", [
                'course_id' => $courseId,
                'client_id' => $client->id,
                'price' => $course->valor
            ]);

            // 3. Determine provider and gateway
            $provider = $request->input('provider', 'asaas');
            $gateway = PaymentGatewayFactory::create($provider);

            $paymentData = [
                'billingType' => $this->mapPaymentMethod($request->input('payment_method')),
            ];

            if ($request->input('payment_method') === 'credit_card') {
                $paymentData['creditCard'] = $request->input('credit_card');
                $paymentData['creditCardHolderInfo'] = $request->input('credit_card_holder');
            }

            // 4. Process payment passing the Matricula object
            $response = $gateway->processPayment($matricula, $paymentData);

            return response()->json([
                'success' => true,
                'payment' => $response,
            ]);

        } catch (\Exception $e) {
            Log::error('Checkout Processing Error: ' . $e->getMessage(), [
                'request' => $request->except(['credit_card', 'credit_card_holder']),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Map frontend payment method to Gateway billing type.
     */
    private function mapPaymentMethod(string $method): string
    {
        return match ($method) {
            'credit_card' => 'CREDIT_CARD',
            'pix' => 'PIX',
            'boleto' => 'BOLETO',
            default => 'UNDEFINED',
        };
    }
}
