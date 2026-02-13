<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Matricula;
use App\Models\Post;
use App\Models\InviteUsage;
use App\Notifications\WelcomeNotification;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

/**
 * Controlador para cadastro público de cliente e matrícula automática.
 * EN: Public controller to register a client and auto-enroll in a course.
 */
class PublicEnrollmentController extends Controller
{
    /**
     * verifyMathChallenge
     * pt-BR: Valida o desafio matemático simples (soma de dois números).
     * en-US: Validates simple math challenge (sum of two numbers).
     */
    private function verifyMathChallenge(Request $request): bool
    {
        $a = (int) $request->input('challenge_a', 0);
        $b = (int) $request->input('challenge_b', 0);
        $ans = $request->input('challenge_answer');

        // Skip challenge for authenticated users (Sanctum)
        if (auth('sanctum')->check()) {
            return true;
        }

        // Allow creating leads/enrollments in local/testing without challenge if 'skip_captcha' is present
        // or just rely on the frontend sending valid numbers.
        if (config('app.env') === 'local' && $request->has('skip_captcha')) {
            return true;
        }

        // Must have values
        if ($a <= 0 || $b <= 0 || is_null($ans)) {
            return false;
        }

        return ($a + $b) === (int)$ans;
    }

    /**
     * isBotLike
     * pt-BR: Verifica honeypot e time-trap; rejeita se campo oculto estiver preenchido
     *        ou se o envio ocorrer rápido demais após render (ex.: < 3s).
     * en-US: Checks honeypot and time-trap; rejects if hidden field is filled
     *        or submission happens too fast after render (e.g., < 3s).
     */
    private function isBotLike(Request $request, int $minMillis = 3000): bool
    {
        // Authenticated users are trusted (no bot check needed)
        if (auth('sanctum')->check()) {
            return false;
        }

        $honeypot = (string) $request->input('hp_field', '');
        if ($honeypot !== '') return true;
        $renderedAt = (int) $request->input('form_rendered_at', 0);
        if ($renderedAt > 0) {
            $elapsed = (int) (microtime(true) * 1000) - $renderedAt;
            if ($elapsed < $minMillis) return true;
        }
        return false;
    }

    /**
     * Registra um cliente e cria uma matrícula no curso informado (padrão: id 2).
     * EN: Register a client and create an enrollment in the given course (default: id 2).
     */
    public function registerAndEnroll(Request $request)
    {
        // Per-email limiter (soft) to reduce abuse beyond IP throttle
        $emailForKey = (string) $request->input('email', '');
        if ($emailForKey && config('app.env') !== 'local') {
            $key = 'public-enroll:email:' . strtolower($emailForKey);
            if (RateLimiter::tooManyAttempts($key, 10)) {
                return response()->json([
                    'message' => 'Muitas tentativas para este e-mail. Tente novamente mais tarde.',
                ], 429);
            }
            RateLimiter::hit($key, 15 * 60);
        }

        // Basic anti-bot checks: honeypot + time-trap + reCAPTCHA
        if ($this->isBotLike($request)) {
            return response()->json([
                'message' => 'Envio suspeito detectado.',
                'errors' => ['bot' => ['Submission flagged by anti-bot checks']],
            ], 422);
        }
        if (!$this->verifyMathChallenge($request)) {
            return response()->json([
                'message' => 'Falha na verificação de segurança (Desafio Matemático incorreto).',
                'errors' => ['challenge_answer' => ['Resposta incorreta']],
            ], 422);
        }

        // Mapear possíveis nomes de campos do payload
        $email = $request->input('email');
        $name = $request->input('name');
        $password = $request->input('password');
        $phone = $request->input('phone', $request->input('celular'));
        $privacyAccepted = $request->boolean('privacyAccepted');
        $termsAccepted = $request->boolean('termsAccepted');
        $institution = $request->input('institution');
        $situacao_id = Qlib::buscaValorDb('posts', 'post_name', 'mat','ID');
        
        /**
         * authUser
         * pt-BR: Tenta obter usuário logado (opcional). Se presente, não exige senha.
         * en-US: Tries to get logged-in user (optional). If present, doesn't require password.
         */
        $authUser = auth('sanctum')->user();

        // Sanitização simples antes da validação
        $email = trim($email);
        $name = trim($name);
        $phone = is_string($phone) ? preg_replace('/\D/', '', $phone) : null;

        // Validação básica do payload público
        //personalizar mensagens de erro de email
        $rules = [
            'email' => ['required','email', $authUser ? Rule::unique('users', 'email')->ignore($authUser->id) : 'unique:users,email'],
            'name' => ['required','string','max:255'],
            'password' => [$authUser ? 'nullable' : 'required','string','min:6'],
            'phone' => ['nullable','string','max:32', $authUser ? Rule::unique('users', 'celular')->ignore($authUser->id) : 'unique:users,celular'],
            'privacyAccepted' => ['required','boolean', Rule::in([true])],
            'termsAccepted' => ['required','boolean', Rule::in([true])],
            'institution' => ['required','string','max:255'],
        ];

        $validator = Validator::make([
            'email' => $email,
            'name' => $name,
            'password' => $password,
            'phone' => $phone,
            'privacyAccepted' => $privacyAccepted,
            'termsAccepted' => $termsAccepted,
            'institution' => $institution,
        ], $rules, [
            'email.unique' => 'Este e-mail já está em uso. Por favor, use outro. ou faça login.',
            'phone.unique' => 'Este número de celular já está em uso.',
            'privacyAccepted.in' => 'É necessário aceitar a política de privacidade.',
            'termsAccepted.in' => 'É necessário aceitar os termos de uso.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Sanitização simples
        $email = trim($email);
        $name = trim($name);
        $phone = is_string($phone) ? preg_replace('/\D/', '', $phone) : null;

        /**
         * Transação robusta para validar e consumir convites.
         * pt-BR: Usa transação e lock de linha para evitar ultrapassar limite em concorrência.
         * en-US: Uses transaction and row-level lock to prevent exceeding invite limits under concurrency.
         */
        $client = null;
        $matricula = null;
        $invite = null;
        $valor = 0;
        $inviteToken = (string) $request->input('invite_token', $request->input('token_valido', ''));
        $courseId = (int) ($request->input('id_curso', 2));
        $ip = (string) $request->ip();
        $ua = (string) $request->header('User-Agent');

        DB::beginTransaction();
        try {
            // Valida e bloqueia o convite antes de criar o cliente
            if ($inviteToken !== '') {
                $invite = Post::query()
                    ->ofType('convites')
                    ->where('token', $inviteToken)
                    ->lockForUpdate()
                    ->first();
                if (!$invite) {
                    DB::rollBack();
                    // Audit: convite não encontrado
                    InviteUsage::create([
                        'invite_post_id' => null,
                        'client_id' => null,
                        'invite_token' => $inviteToken,
                        'status' => 'failed',
                        'reason' => 'not_found',
                        'ip' => $ip,
                        'user_agent' => $ua,
                        'meta' => ['phase' => 'validate_invite'],
                    ]);
                    return response()->json([
                        'message' => 'Convite inválido ou não encontrado',
                        'errors' => ['invite_token' => ['Invite token not found']],
                    ], 422);
                }
                $cfg = (array) ($invite->config ?? []);
                $total = (int) ($cfg['total_convites'] ?? 0);
                $usados = (int) ($cfg['convites_usados'] ?? 0);
                $validade = isset($cfg['validade']) && $cfg['validade'] ? strtotime((string) $cfg['validade']) : null;
                if ($total > 0 && $usados >= $total) {
                    DB::rollBack();
                    // Audit: limite atingido
                    InviteUsage::create([
                        'invite_post_id' => $invite->ID,
                        'client_id' => null,
                        'invite_token' => $inviteToken,
                        'status' => 'failed',
                        'reason' => 'limit_reached',
                        'ip' => $ip,
                        'user_agent' => $ua,
                        'meta' => ['total' => $total, 'used' => $usados],
                    ]);
                    return response()->json([
                        'message' => 'Limite de convites atingido para este link',
                'errors' => ['invite_token' => ['Limite de uso do convite atingido']],
                    ], 422);
                }
                if ($validade && time() > $validade) {
                    DB::rollBack();
                    // Audit: convite expirado
                    InviteUsage::create([
                        'invite_post_id' => $invite->ID,
                        'client_id' => null,
                        'invite_token' => $inviteToken,
                        'status' => 'failed',
                        'reason' => 'expired',
                        'ip' => $ip,
                        'user_agent' => $ua,
                        'meta' => ['validade' => $cfg['validade'] ?? null],
                    ]);
                    return response()->json([
                        'message' => 'Este link de convite expirou',
                        'errors' => ['invite_token' => ['Invite token expired']],
                    ], 422);
                }
                // Se o convite possui curso associado, usar como fonte da matrícula
                $courseId = (int) ($invite->post_parent ?? $courseId);

                /**
                 * pt-BR: Verifica se o usuário logado já utilizou ESTE link de convite específico.
                 * en-US: Checks if the logged-in user has already used THIS specific invite link.
                 */
                if ($authUser) {
                    $alreadyUsed = InviteUsage::where('invite_post_id', $invite->ID)
                        ->where('client_id', $authUser->id)
                        ->where('status', 'success')
                        ->exists();

                    if ($alreadyUsed) {
                        DB::rollBack();
                        return response()->json([
                            'message' => 'Você já utilizou este link de convite.',
                            'code' => 'INVITE_ALREADY_USED',
                        ], 422);
                    }
                }
            }

            /**
             * pt-BR: Verifica se o usuário (logado ou recém-identificado por e-mail) já possui matrícula válida.
             * en-US: Checks if the user (logged-in or identified by email) already has a valid enrollment.
             */
            $targetUserId = $authUser ? $authUser->id : null;
            if (!$targetUserId && $email) {
                $targetUserId = DB::table('users')->where('email', $email)->value('id');
            }

            if ($targetUserId) {
                $existingEnrollment = Matricula::where('id_cliente', $targetUserId)
                    ->where('id_curso', $courseId)
                    ->where(function ($q) {
                        $q->whereNull('status')->orWhere('status', '!=', 'c'); // 'c' costuma ser cancelado no sistema
                    })
                    ->first();

                if ($existingEnrollment) {
                    DB::rollBack();
                    return response()->json([
                        'message' => 'Você já possui uma matrícula válida para este curso.',
                        'code' => 'ALREADY_ENROLLED',
                        'course_id' => $courseId,
                    ], 422);
                }
            }

            // Se o usuário já está logado, usamos ele em vez de criar novo.
            if ($authUser) {
                $client = $authUser;
                // Atualizar dados se necessário
                $client->name = $name;
                if ($phone) {
                    $client->setAttribute('celular', $phone);
                }
                $client->save();
            } else {
                // Criar cliente somente após validação do convite
                $client = new Client();
                $client->tipo_pessoa = 'pf';
                $client->name = $name;
                $client->email = $email;
                $client->password = Hash::make($password);
                $client->status = 'actived';
                $client->genero = 'ni';
                $client->ativo = 's';
                $client->config = [
                    'privacyAccepted' => true,
                    'termsAccepted' => true,
                ];
                if ($phone) {
                    // Campo é 'celular' na tabela users; não está em fillable, atribuir direto
                    $client->setAttribute('celular', $phone);
                }
                $client->save();
            }
            Qlib::update_usermeta($client->id, 'institution', $institution);

            // Add id_turma com padrão 0 para atender ao schema que exige valor (sem default)
            $turmaId = (int) ($request->input('id_turma', 0));
            //valor do curso pelo id (com lock)
            $course = DB::table('cursos')->where('id', $courseId)->lockForUpdate()->first();
            if (!$course) {
                DB::rollBack();
                // Audit: curso não encontrado
                if ($inviteToken !== '' && isset($invite)) {
                    InviteUsage::create([
                        'invite_post_id' => $invite->ID,
                        'client_id' => null,
                        'invite_token' => $inviteToken,
                        'status' => 'failed',
                        'reason' => 'course_not_found',
                        'ip' => $ip,
                        'user_agent' => $ua,
                        'meta' => ['course_id' => $courseId],
                    ]);
                }
                return response()->json([
                    'message' => 'Curso não encontrado',
                ], 404);
            }
            $valor = (float) $course->valor;
            $matricula = new Matricula();
            $matricula->id_cliente = $client->id;
            $matricula->id_curso = $courseId;
            $matricula->id_turma = $turmaId;
            $matricula->subtotal = $valor;
            $matricula->total = $valor;
            /**
             * Define a origem da matrícula na coluna JSON `tag`.
             * pt-BR: Usamos um array para garantir JSON válido e evitar falha de constraint.
             * en-US: Use an array to ensure valid JSON and avoid constraint failure.
             */
            $tags = ['formulario-inscricao'];
            if ($inviteToken !== '') {
                $tags[] = 'invite-token:' . $inviteToken;
            }
            $matricula->tag = $tags;
            $matricula->situacao_id = $situacao_id;
            // 0 indica sem turma associada
            // Não definir 'status' explicitamente para usar o default da tabela ('a')
            $matricula->save();

            // Atualiza uso do convite, se aplicável (com lock ativo)
            if (isset($invite) && $inviteToken !== '') {
                $inviteCfg = (array) ($invite->config ?? []);
                $inviteCfg['convites_usados'] = (int) ($inviteCfg['convites_usados'] ?? 0) + 1;
                $invite->config = $inviteCfg;
                $invite->save();

                // Audit: sucesso de utilização do convite
                InviteUsage::create([
                    'invite_post_id' => $invite->ID,
                    'client_id' => $client->id,
                    'invite_token' => $inviteToken,
                    'status' => 'success',
                    'reason' => null,
                    'ip' => $ip,
                    'user_agent' => $ua,
                    'meta' => [
                        'course_id' => $courseId,
                        'matricula_id' => $matricula->id,
                    ],
                ]);
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            // Audit: erro interno ao processar
            if ($inviteToken !== '') {
                InviteUsage::create([
                    'invite_post_id' => isset($invite) ? $invite->ID : null,
                    'client_id' => isset($client) ? $client->id : null,
                    'invite_token' => $inviteToken,
                    'status' => 'failed',
                    'reason' => 'server_error',
                    'ip' => $ip,
                    'user_agent' => $ua,
                    'meta' => ['message' => $e->getMessage()],
                ]);
            }
            return response()->json([
                'message' => 'Erro ao processar cadastro',
            ], 500);
        }

        // Disparar e-mail de boas vindas (após commit da transação)
        $client->notify(new WelcomeNotification($courseId, $course->slug, $course->nome, $matricula->id));

        return response()->json([
            'message' => 'Cliente cadastrado e matrícula criada com sucesso',
            'client' => [
                'id' => $client->id,
                'name' => $client->name,
                'email' => $client->email,
                'celular' => $client->getAttribute('celular'),
            ],
            'matricula' => [
                'id' => $matricula->id,
                'id_curso' => $matricula->id_curso,
                'id_cliente' => $matricula->id_cliente,
            ],
        ], 201);
    }

    /**
     * registerInterest
     * pt-BR: Registra interesse público com dados mínimos, criando cliente (se não existir)
     *        e uma matrícula com situação "Interessado" (código 'int'). Não requer login.
     * en-US: Registers public interest with minimal data, creating client (if missing)
     *        and an enrollment set to "Interested" situation ('int'). No authentication required.
     */
    public function registerInterest(Request $request)
    {
        // Per-email limiter for interest registrations
        $emailForKey = (string) $request->input('email', '');
        if ($emailForKey && config('app.env') !== 'local') {
            $key = 'public-interest:email:' . strtolower($emailForKey);
            if (RateLimiter::tooManyAttempts($key, 10)) {
                return response()->json([
                    'message' => 'Muitas tentativas para este e-mail. Tente novamente mais tarde.',
                ], 429);
            }
            RateLimiter::hit($key, 15 * 60);
        }

        // Anti-bot checks for interest route as well
        if ($this->isBotLike($request)) {
            return response()->json([
                'message' => 'Envio suspeito detectado.',
                'errors' => ['bot' => ['Submission flagged by anti-bot checks']],
            ], 422);
        }
        if (!$this->verifyMathChallenge($request)) {
            return response()->json([
                'message' => 'Falha na verificação de segurança (Desafio Matemático incorreto).',
                'errors' => ['challenge_answer' => ['Resposta incorreta']],
            ], 422);
        }

        // Map fields from payload
        $email = trim((string) $request->input('email'));
        $name = trim((string) $request->input('name', $request->input('fullName')));
        $phone = $request->input('phone', $request->input('celular'));
        $courseId = (int) ($request->input('id_curso', $request->input('course_id', 0)));
        $turmaId = (int) ($request->input('id_turma', 0));

        // Normalize phone (digits only) before validation
        $phone = is_string($phone) ? preg_replace('/\D/', '', $phone) : null;

        // Find existing client to ignore in unique validation if email matches
        $existingClient = Client::where('email', $email)->first();

        // Basic validation (email required, name required). Allow existing email.
        $validator = Validator::make([
            'email' => $email,
            'name' => $name,
            'phone' => $phone,
            'id_curso' => $courseId,
            'institution' => $request->input('institution'),
        ], [
            'email' => ['required','email'],
            'name' => ['required','string','max:255'],
            'phone' => [
                'nullable',
                'string',
                'max:32',
                $existingClient ? Rule::unique('users', 'celular')->ignore($existingClient->id) : 'unique:users,celular'
            ],
            'id_curso' => ['nullable','integer','min:0'],
            'institution' => ['required','string','max:255'],
        ], [
            'phone.unique' => 'Este número de celular já está em uso.',
        ]);
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Find existing client or create a minimal record
        $client = Client::where('email', $email)->first();
        if (!$client) {
            $client = new Client();
            $client->tipo_pessoa = 'pf';
            $client->name = $name;
            $client->email = $email;
            // Random password for lead; user can reset later
            $client->password = Hash::make(bin2hex(random_bytes(6)));
            $client->status = 'actived';
            $client->genero = 'ni';
            $client->ativo = 's';
            $client->config = [
                'isLead' => true,
                'source' => 'public_interest',
            ];
            if ($phone) {
                $client->setAttribute('celular', $phone);
            }
            $client->save();
        } else {
            // Update phone if not set
            if ($phone && !$client->getAttribute('celular')) {
                $client->setAttribute('celular', $phone);
                $client->save();
            }
        }

        // Resolve situation id for 'Interessado' (post_name='int')
        $situacaoId = DB::table('posts')
            ->where('post_type', 'situacao_matricula')
            ->where('post_name', 'int')
            ->value('ID');

        // Create enrollment with minimal fields
        $matricula = new Matricula();
        $matricula->id_cliente = $client->id;
        if ($courseId > 0) {
            $matricula->id_curso = $courseId;
        }
        $matricula->id_turma = $turmaId; // 0 indicates no class associated
        if ($situacaoId) {
            $matricula->situacao_id = (int) $situacaoId;
        }
        $matricula->save();

        // Optionally send Welcome email if course id provided
        if ($courseId > 0) {
            $client->notify(new WelcomeNotification($courseId));
        }

        // Avaliar envio de notificação via EvolutionAPI para o administrador
        try {
            $courseName = 'N/A';
            if ($courseId > 0) {
                $cObj = DB::table('cursos')->where('id', $courseId)->first();
                if ($cObj) $courseName = $cObj->titulo ?? $cObj->nome ?? 'Curso #' . $courseId;
            }
            $companyName = \App\Services\Qlib::qoption('company_name');
            $msgObj = "📢 *Novo Interessado {$companyName}*\n\n";
            $msgObj .= "👤 *Nome:* {$client->name}\n";
            $msgObj .= "📧 *Email:* {$client->email}\n";
            $msgObj .= "📱 *Telefone:* " . ($client->getAttribute('celular') ?: 'N/D') . "\n";
            $msgObj .= "🎓 *Curso:* {$courseName}\n";
            $msgObj .= "📅 *Data:* " . date('d/m/Y H:i');

            \App\Services\EvolutionApiService::sendAdminNotification($msgObj, $courseId);

        } catch (\Throwable $evt) {
            // Falha silenciosa na notificação admin para não travar o retorno ao user
            \Illuminate\Support\Facades\Log::error('EvolutionAPI Notification Error: ' . $evt->getMessage());
        }

        return response()->json([
            'message' => 'Interesse registrado com sucesso',
            'client' => [
                'id' => $client->id,
                'name' => $client->name,
                'email' => $client->email,
                'celular' => $client->getAttribute('celular'),
            ],
            'matricula' => [
                'id' => $matricula->id,
                'id_curso' => $matricula->id_curso,
                'id_cliente' => $matricula->id_cliente,
                'situacao_id' => $matricula->situacao_id,
            ],
        ], 201);
    }
    /**
     * checkEmail
     * pt-BR: Verifica se o e-mail já existe na base de dados (users).
     * en-US: Checks if the email already exists in the database (users).
     */
    public function checkEmail(Request $request)
    {
        $email = $request->input('email');
        $check = Qlib::checkEmail($email);

        if (isset($check['valid']) && !$check['valid']) {
             return response()->json($check, 422);
        }

        return response()->json($check);
    }
}
