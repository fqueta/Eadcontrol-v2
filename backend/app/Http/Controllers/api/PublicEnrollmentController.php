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
     * verifyCaptcha
     * pt-BR: Verifica o token do reCAPTCHA v3 junto ao Google, validando ação e score.
     * en-US: Verifies reCAPTCHA v3 token with Google, checking action and score.
     */
    private function verifyCaptcha(Request $request, string $expectedAction = 'invite_enroll'): bool
    {
        $token = (string) $request->input('captcha_token', '');
        $action = (string) $request->input('captcha_action', $expectedAction);
        $secret = config('services.recaptcha.secret');
        $verifyUrl = config('services.recaptcha.verify_url');
        $minScore = (float) config('services.recaptcha.min_score', 0.5);

        if (!$secret || !$token) {
            return false;
        }

        $resp = Http::asForm()->post($verifyUrl, [
            'secret' => $secret,
            'response' => $token,
            'remoteip' => $request->ip(),
        ]);
        if (!$resp->ok()) {
            return false;
        }
        $data = $resp->json();
        $success = (bool) ($data['success'] ?? false);
        $score = (float) ($data['score'] ?? 0.0);
        $actionResp = (string) ($data['action'] ?? '');
        if (!$success) return false;
        if ($actionResp && $actionResp !== $expectedAction) return false;
        return $score >= $minScore;
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
        if ($emailForKey) {
            $key = 'public-enroll:email:' . strtolower($emailForKey);
            if (RateLimiter::tooManyAttempts($key, 3)) {
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
        if (!$this->verifyCaptcha($request, 'invite_enroll')) {
            return response()->json([
                'message' => 'Falha na verificação de segurança (CAPTCHA).',
                'errors' => ['captcha_token' => ['Invalid or low-score CAPTCHA token']],
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
        // Validação básica do payload público
        //personalizar mensagens de erro de email
        $validator = Validator::make([
            'email' => $email,
            'name' => $name,
            'password' => $password,
            'phone' => $phone,
            'privacyAccepted' => $privacyAccepted,
            'termsAccepted' => $termsAccepted,
            'institution' => $institution,
        ], [
            'email' => ['required','email', 'unique:users,email'],
            'name' => ['required','string','max:255'],
            'password' => ['required','string','min:6'],
            'phone' => ['nullable','string','max:32', 'unique:users,celular'],
            'privacyAccepted' => ['required','boolean', Rule::in([true])],
            'termsAccepted' => ['required','boolean', Rule::in([true])],
            'institution' => ['required','string','max:255'],
        ], [
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
            }

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
        $client->notify(new WelcomeNotification($courseId, $course->slug, $course->nome));

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
        if ($emailForKey) {
            $key = 'public-interest:email:' . strtolower($emailForKey);
            if (RateLimiter::tooManyAttempts($key, 5)) {
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
        if (!$this->verifyCaptcha($request, 'register_interest')) {
            return response()->json([
                'message' => 'Falha na verificação de segurança (CAPTCHA).',
                'errors' => ['captcha_token' => ['Invalid or low-score CAPTCHA token']],
            ], 422);
        }

        // Map fields from payload
        $email = trim((string) $request->input('email'));
        $name = trim((string) $request->input('name', $request->input('fullName')));
        $phone = $request->input('phone', $request->input('celular'));
        $courseId = (int) ($request->input('id_curso', $request->input('course_id', 0)));
        $turmaId = (int) ($request->input('id_turma', 0));

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
            'phone' => ['nullable','string','max:32'],
            'id_curso' => ['nullable','integer','min:0'],
            'institution' => ['required','string','max:255'],
        ]);
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Normalize phone (digits only)
        $phone = is_string($phone) ? preg_replace('/\D/', '', $phone) : null;

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
}
