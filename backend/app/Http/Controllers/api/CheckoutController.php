<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Curso;
use App\Models\Client;
use App\Models\Cupom;
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

        return response()->json([
            'id' => $course->id,
            'titulo' => $course->titulo,
            'valor' => $course->valor,
            'inscricao' => $course->inscricao,
            'parcelas' => $course->parcelas,
            'valor_parcela' => $course->valor_parcela,
            'imagem_url' => $course->config['cover']['url'] ?? null,
            'descricao' => $course->descricao,
            'config' => $course->config,
        ]);
    }

    /**
     * Validate and preview a coupon code.
     */
    public function applyCoupon(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'codigo' => 'required|string|max:50',
            'course_id' => 'required|integer|exists:cursos,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $courseId = (int) $request->input('course_id');
        $course = Curso::findOrFail($courseId);

        $cupom = Cupom::where('codigo', $request->input('codigo'))->first();

        if (!$cupom) {
            return response()->json(['message' => 'Cupom inválido.'], 400);
        }

        $courseValor = (float) $course->valor;
        $courseInscricao = (float) ($course->inscricao ?? 0);
        $totalBase = $courseValor + $courseInscricao;
        $validacao = $cupom->validar($totalBase, $courseId);

        if (!$validacao['valido']) {
            return response()->json(['message' => $validacao['mensagem']], 400);
        }

        $desconto = $cupom->calcularDesconto($totalBase);
        $totalComDesconto = max(0, $totalBase - $desconto);

        return response()->json([
            'valido' => true,
            'codigo' => $cupom->codigo,
            'tipo' => $cupom->tipo,
            'valor_desconto' => (float) $cupom->valor_desconto,
            'desconto_aplicado' => round($desconto, 2),
            'valor_original' => $totalBase,
            'valor_final' => round($totalComDesconto, 2),
            'mensagem' => $cupom->tipo === 'percentual'
                ? "Cupom de {$cupom->valor_desconto}% aplicado!"
                : "Desconto de R\$ {$cupom->valor_desconto} aplicado!",
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
            'cpfCnpj' => 'required|string|max:18',
            'phone' => 'nullable|string|max:20',
            'payment_method' => 'required|in:credit_card,pix,boleto',
            'credit_card' => 'required_if:payment_method,credit_card|array',
            'credit_card_holder' => 'required_if:payment_method,credit_card|array',
            'coupon_code' => 'nullable|string|max:50',
            'installmentCount' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $courseId = (int) $request->input('course_id');
            $course = Curso::findOrFail($courseId);

            $courseValor = (float) $course->valor;
            $courseInscricao = (float) ($course->inscricao ?? 0);
            
            $cobrarSeparado = false;
            $courseConfig = $course->config;
            if (is_string($courseConfig)) {
                $courseConfig = json_decode($courseConfig, true);
            }
            if (is_array($courseConfig) && ($courseConfig['cobrar_matricula_separada'] ?? 'n') === 's') {
                $cobrarSeparado = true;
            }

            $totalBase = $courseValor + $courseInscricao;
            $discountValue = 0;
            $cupom = null;

            if ($request->filled('coupon_code')) {
                $cupom = Cupom::where('codigo', $request->input('coupon_code'))->first();

                if (!$cupom) {
                    return response()->json(['message' => 'Cupom inválido.'], 400);
                }

                $validacao = $cupom->validar($totalBase, $courseId);

                if (!$validacao['valido']) {
                    return response()->json(['message' => $validacao['mensagem']], 400);
                }

                $discountValue = $cupom->calcularDesconto($totalBase);
            }

            $totalComDesconto = max(0, $totalBase - $discountValue);

            $client = Client::getOrCreate([
                'name' => $request->input('name'),
                'email' => $request->input('email'),
                'cpfCnpj' => $request->input('cpfCnpj'),
                'phone' => $request->input('phone'),
            ]);

            $situacao_id_int = \App\Services\Qlib::buscaValorDb('posts', 'post_name', 'int', 'ID');
            $matricula = \App\Models\Matricula::create([
                'id_cliente' => $client->id,
                'id_curso' => $courseId,
                'id_turma' => 0,
                'situacao_id' => $situacao_id_int,
                'data_matricula' => now()->toDateString(),
                'tipo' => 'curso',
                'subtotal' => $totalBase,
                'desconto' => $discountValue,
                'total' => $totalComDesconto,
                'config' => ['inscricao' => $courseInscricao],
            ]);

            \App\Services\Qlib::logMatriculaEvent($matricula->id, 'enrollment_intent', "Interesse em curso registrado (Matrícula criada)", [
                'course_id' => $courseId,
                'client_id' => $client->id,
                'price' => $courseValor,
                'discount' => $discountValue,
                'total' => $totalComDesconto,
                'coupon' => $cupom?->codigo,
            ]);

            if ($cupom) {
                $cupom->incrementarUso();
                // Persistir o cupom na matrícula para relatórios
                \App\Services\Qlib::update_matriculameta($matricula->id, 'cupom_codigo', $cupom->codigo);
                \App\Services\Qlib::update_matriculameta($matricula->id, 'cupom_id', $cupom->id);
            }

            if ($totalComDesconto <= 0) {
                $situacao_id_mat = \App\Services\Qlib::buscaValorDb('posts', 'post_name', 'mat', 'ID');
                $matricula->situacao_id = $situacao_id_mat;
                $matricula->save();

                \App\Services\Qlib::logMatriculaEvent($matricula->id, 'payment_approved', "Pagamento aprovado (Desconto 100%)", []);

                $authResponse = null;
                $user = \App\Models\User::where('email', $client->email)->first();
                if ($user) {
                    $token = $user->createToken('auth_token')->plainTextToken;
                    $authResponse = [
                        'user' => $user,
                        'token' => $token,
                    ];
                }

                return response()->json([
                    'success' => true,
                    'payment' => [
                        'payment' => [
                            'billingType' => 'FREE',
                            'status' => 'RECEIVED',
                        ]
                    ],
                    'auth_response' => $authResponse
                ]);
            }

            $provider = $request->input('provider', 'asaas');
            $gateway = PaymentGatewayFactory::create($provider);

            $paymentData = [
                'billingType' => $this->mapPaymentMethod($request->input('payment_method')),
            ];

            if ($request->input('payment_method') === 'credit_card') {
                $paymentData['creditCard'] = $request->input('credit_card');
                $paymentData['creditCardHolderInfo'] = $request->input('credit_card_holder');
                if ($request->has('installmentCount')) {
                    $paymentData['installmentCount'] = (int) $request->input('installmentCount');
                }
            }

            $paymentData['splitEnrollment'] = $cobrarSeparado;
            $paymentData['courseInscricao'] = $courseInscricao;
            $paymentData['courseValor'] = $courseValor;
            $paymentData['discountValue'] = $discountValue;


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

    /**
     * Check if a user with the given email or CPF/CNPJ already exists.
     */
    public function checkUser(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'nullable|email',
            'cpfCnpj' => 'nullable|string',
        ]);

        if ($validator->fails() || (!$request->filled('email') && !$request->filled('cpfCnpj'))) {
            return response()->json(['error' => 'Email ou CPF/CNPJ inválido.'], 422);
        }

        $exists = \App\Models\User::where(function ($q) use ($request) {
            if ($request->filled('email')) {
                $q->orWhere('email', $request->email);
            }
            if ($request->filled('cpfCnpj')) {
                $cpfOriginal = $request->cpfCnpj;
                $cpfClean = preg_replace('/\D/', '', $cpfOriginal);

                $q->orWhere('cpf', $cpfOriginal)
                  ->orWhere('cpf', $cpfClean)
                  ->orWhere('cnpj', $cpfOriginal)
                  ->orWhere('cnpj', $cpfClean);
            }
        })->exists();

        return response()->json(['exists' => $exists]);
    }
}
