<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Str;

/**
 * Controller para emissão e validação de tokens de formulários públicos.
 * Controller for issuing and validating public form tokens.
 */
class PublicFormTokenController extends Controller
{
    /**
     * Gera um token assinado para um formulário público.
     * Generate a signed token for a public form.
     *
     * Regras:
     * - O token é HMAC-SHA256 com a app key e expira em `ttl` minutos.
     * - Inclui `tenant_id` para escopo multi-tenant e `form` para identificar o formulário.
     *
     * Formas de enviar parâmetros (suporta POST sem body):
     * - Body JSON: `form` (string, obrigatório), `ttl` (int, opcional)
     * - Query string: `?form=...&ttl=...`
     * - Parâmetro de rota: `/api/v1/public/form-token/{form}`
     *
     * Sem qualquer fornecimento de `form`, a requisição será rejeitada (422).
     */
    public function generate(Request $request)
    {
        // PT: Suporta obter `form` do parâmetro de rota, query string ou body
        // EN: Supports reading `form` from route param, query string or body
        $form = $request->route('form') ?? $request->input('form');
        $ttlInput = $request->input('ttl');

        // Validação manual para permitir múltiplas origens de dados
        $data = [
            'form' => $form,
            'ttl'  => $ttlInput,
        ];
        $rules = [
            // `form` agora é opcional; se ausente, usa default de config/services.php
            // `form` is now optional; if missing, uses default from config/services.php
            'form' => ['nullable', 'string', 'max:100'],
            'ttl'  => ['nullable', 'integer', 'min:1', 'max:1440'],
        ];
        $validator = \Illuminate\Support\Facades\Validator::make($data, $rules);
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        // Resolve `form`: usa valor fornecido ou padrão configurável
        // Resolve `form`: use provided value or configurable default
        $resolvedForm = $validated['form'] ?? Config::get('services.public_form.default', 'generic');

        $ttl = (int) ($validated['ttl'] ?? 30);
        $now = Carbon::now();
        $exp = (clone $now)->addMinutes($ttl);

        $payload = [
            'form'       => $resolvedForm,
            'tenant_id'  => $this->currentTenantId(),
            'iat'        => $now->timestamp,
            'exp'        => $exp->timestamp,
            'nonce'      => Str::uuid()->toString(),
        ];

        $token = $this->encodeToken($payload);

        return response()->json([
            'token'       => $token,
            'expires_at'  => $exp->toIso8601String(),
            'ttl_minutes' => $ttl,
        ]);
    }

    /**
     * Valida um token de formulário público.
     * Validate a public form token.
     *
     * Body esperado:
     * - token (string, obrigatório): token emitido por `generate`.
     * - form (string, opcional): deve coincidir com o valor do payload.
     */
    public function validate(Request $request)
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'form'  => ['nullable', 'string', 'max:100'],
        ]);

        $payload = $this->decodeToken($validated['token']);
        if (!$payload) {
            return response()->json([
                'valid'   => false,
                'message' => 'Token inválido ou assinatura incorreta.',
            ], 422);
        }

        // Verifica expiração
        if (($payload['exp'] ?? 0) < Carbon::now()->timestamp) {
            return response()->json([
                'valid'   => false,
                'message' => 'Token expirado.',
            ], 422);
        }

        // Verifica tenant
        $currentTenantId = $this->currentTenantId();
        if (($payload['tenant_id'] ?? null) !== $currentTenantId) {
            return response()->json([
                'valid'   => false,
                'message' => 'Token não pertence ao tenant atual.',
            ], 422);
        }

        // Verifica formulário, se fornecido
        if (isset($validated['form']) && ($payload['form'] ?? null) !== $validated['form']) {
            return response()->json([
                'valid'   => false,
                'message' => 'Formulário não corresponde ao token.',
            ], 422);
        }

        return response()->json([
            'valid'   => true,
            'payload' => $payload,
        ]);
    }

    /**
     * Retorna o ID do tenant atual se disponível.
     * Return current tenant ID if available.
     */
    private function currentTenantId(): ?string
    {
        if (function_exists('tenant')) {
            // stancl/tenancy helper
            return tenant('id');
        }
        return null;
    }

    /**
     * Codifica o payload em um token compacto: base64url(payload).base64url(HMAC).
     * Encode payload into compact token: base64url(payload).base64url(HMAC).
     */
    private function encodeToken(array $payload): string
    {
        $secret = Config::get('app.key');
        if (is_string($secret) && str_starts_with($secret, 'base64:')) {
            $secret = base64_decode(substr($secret, 7));
        }

        $json = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $payloadB64 = rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
        $sig = hash_hmac('sha256', $payloadB64, (string) $secret, true);
        $sigB64 = rtrim(strtr(base64_encode($sig), '+/', '-_'), '=');
        return $payloadB64 . '.' . $sigB64;
    }

    /**
     * Decodifica e valida um token. Retorna o payload quando válido, ou null.
     * Decode and validate token. Returns payload when valid, or null.
     */
    private function decodeToken(string $token): ?array
    {
        $parts = explode('.', $token, 2);
        if (count($parts) !== 2) {
            return null;
        }

        [$payloadB64, $sigB64] = $parts;

        $secret = Config::get('app.key');
        if (is_string($secret) && str_starts_with($secret, 'base64:')) {
            $secret = base64_decode(substr($secret, 7));
        }

        $expectedSig = hash_hmac('sha256', $payloadB64, (string) $secret, true);
        $expectedSigB64 = rtrim(strtr(base64_encode($expectedSig), '+/', '-_'), '=');

        if (!hash_equals($expectedSigB64, $sigB64)) {
            return null;
        }

        $json = base64_decode(strtr($payloadB64, '-_', '+/'));
        $payload = json_decode($json, true);
        return is_array($payload) ? $payload : null;
    }
}