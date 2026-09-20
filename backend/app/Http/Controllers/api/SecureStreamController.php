<?php

namespace App\Http\Controllers\api;

use App\Models\MediaFile;
use App\Services\Media\R2StorageService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;

/**
 * Controlador de streaming seguro e compartilhamento de vídeos.
 *
 * Implementa tokens HMAC-SHA256 com expiração para proteger o acesso
 * a vídeos no estilo Vimeo — sem expor URLs diretas do Cloudflare R2.
 */
class SecureStreamController extends Controller
{
    /**
     * Gera um token de compartilhamento assinado HMAC-SHA256 para o vídeo.
     *
     * POST /api/v1/media-files/{id}/share
     */
    public function generateShareToken(Request $request, int $id)
    {
        $mediaFile = MediaFile::findOrFail($id);

        $request->validate([
            'expires_hours'    => 'nullable|integer|min:1|max:8760', // max 1 ano
            'allowed_domains'  => 'nullable|array',
            'allowed_domains.*' => 'nullable|string',
        ]);

        $expiresHours   = (int) $request->input('expires_hours', 4);
        $allowedDomains = $request->input('allowed_domains', []);
        $expiresAt      = now()->addHours($expiresHours)->timestamp;

        $payload = [
            'mid'      => $mediaFile->id,
            'exp'      => $expiresAt,
            'domains'  => $allowedDomains,
            'created'  => now()->timestamp,
        ];

        $token = $this->signPayload($payload);

        $watchUrl = url('/watch/' . $token);

        return response()->json([
            'success'       => true,
            'token'         => $token,
            'watch_url'     => $watchUrl,
            'expires_at'    => date('Y-m-d H:i:s', $expiresAt),
            'expires_hours' => $expiresHours,
        ]);
    }

    /**
     * Exibe a página de player público protegido.
     *
     * GET /watch/{token}
     */
    public function watch(Request $request, string $token)
    {
        $payload = $this->verifyToken($token);

        if (!$payload) {
            return response()->view('errors.video_expired', [], 403)
                ->header('X-Frame-Options', 'SAMEORIGIN');
        }

        $mediaFile = MediaFile::find($payload['mid']);

        if (!$mediaFile || !$mediaFile->is_ready) {
            abort(404, 'Vídeo não encontrado ou ainda em processamento.');
        }

        // Verificar domínios permitidos (se configurado)
        if (!empty($payload['domains'])) {
            $referer = $request->header('Referer') ?? '';
            $origin  = $request->header('Origin') ?? '';
            $allowed = false;
            foreach ($payload['domains'] as $domain) {
                if (str_contains($referer, $domain) || str_contains($origin, $domain)) {
                    $allowed = true;
                    break;
                }
            }
            if (!$allowed && !empty($payload['domains'])) {
                abort(403, 'Domínio não autorizado.');
            }
        }

        // Gerar stream token de curta duração para os segmentos HLS (válido 2h)
        $streamToken = $this->generateStreamToken($mediaFile->id, now()->addHours(2)->timestamp);

        // URL base para os segmentos HLS via rota segura
        $streamBase = url("/watch/{$token}/stream");

        return response()->view('video.public_player', [
            'mediaFile'   => $mediaFile,
            'token'       => $token,
            'streamToken' => $streamToken,
            'streamBase'  => $streamBase,
            'title'       => $mediaFile->original_name ?? 'Vídeo',
        ])->withHeaders([
            'X-Frame-Options'           => 'ALLOWALL',
            'Content-Security-Policy'   => "frame-ancestors *",
            'X-Content-Type-Options'    => 'nosniff',
        ]);
    }

    /**
     * Serve os segmentos HLS (.m3u8 e .ts) com validação de token.
     *
     * GET /watch/{token}/stream/{file}
     */
    public function secureStream(Request $request, string $token, string $file)
    {
        // Validar o token principal
        $payload = $this->verifyToken($token);
        if (!$payload) {
            abort(403, 'Token expirado ou inválido.');
        }

        // Validar stream token nos headers ou query
        $streamToken = $request->query('st') ?? $request->header('X-Stream-Token');
        if ($streamToken && !$this->verifyStreamToken($streamToken)) {
            abort(403, 'Stream token inválido.');
        }

        // Verificar Referer/Origin para anti-hotlink
        $this->validateReferer($request);

        $mediaFile = MediaFile::find($payload['mid']);
        if (!$mediaFile) {
            abort(404);
        }

        $r2 = new R2StorageService();
        if (!$r2->isConfigured()) {
            abort(503, 'Armazenamento não configurado.');
        }

        // Construir o caminho do arquivo HLS no R2
        $hlsDir = $mediaFile->hls_path
            ? dirname($mediaFile->hls_path)
            : null;

        if (!$hlsDir) {
            abort(404, 'HLS não disponível para este vídeo.');
        }

        // Sanitizar o nome do arquivo para evitar path traversal
        $safeFile = basename($file);
        if (!preg_match('/^[\w\-]+\.(m3u8|ts|jpg|jpeg|png)$/', $safeFile)) {
            abort(400, 'Arquivo inválido.');
        }

        $remoteKey = "{$hlsDir}/{$safeFile}";
        $client    = $r2->getClient();
        $bucket    = $r2->getBucket();

        try {
            $result  = $client->getObject(['Bucket' => $bucket, 'Key' => $remoteKey]);
            $content = (string) $result['Body'];
            $contentType = $this->detectContentType($safeFile);

            // Se for o manifesto, reescrever URLs relativas para apontar para esta rota
            if (str_ends_with($safeFile, '.m3u8')) {
                $content = $this->rewriteM3u8Urls($content, url("/watch/{$token}/stream"), $streamToken ?? '');
                $cacheControl = 'no-store, no-cache, must-revalidate';
            } else {
                $cacheControl = 'public, max-age=31536000, immutable';
            }

            return response($content, 200, [
                'Content-Type'              => $contentType,
                'Cache-Control'             => $cacheControl,
                'Access-Control-Allow-Origin' => '*',
                'X-Content-Type-Options'    => 'nosniff',
                // Nunca expor Content-Disposition attachment para evitar download nativo
                'Content-Disposition'       => 'inline',
            ]);
        } catch (\Throwable $e) {
            Log::error("SecureStream: erro ao servir {$remoteKey}: " . $e->getMessage());
            abort(404, 'Segmento não encontrado.');
        }
    }

    // ── Helpers de Token ────────────────────────────────────────────────────

    /**
     * Assina um payload e retorna o token base64url.signed.
     */
    protected function signPayload(array $payload): string
    {
        $encoded   = base64_encode(json_encode($payload));
        $signature = hash_hmac('sha256', $encoded, $this->getSecret());
        return $encoded . '.' . $signature;
    }

    /**
     * Verifica e decodifica um token assinado. Retorna payload ou null.
     */
    protected function verifyToken(string $token): ?array
    {
        $parts = explode('.', $token, 2);
        if (count($parts) !== 2) return null;

        [$encoded, $signature] = $parts;
        $expected = hash_hmac('sha256', $encoded, $this->getSecret());

        if (!hash_equals($expected, $signature)) {
            return null;
        }

        $payload = json_decode(base64_decode($encoded), true);
        if (!is_array($payload)) return null;

        // Verificar expiração
        if (isset($payload['exp']) && $payload['exp'] > 0 && time() > $payload['exp']) {
            return null;
        }

        return $payload;
    }

    /**
     * Gera um token de curta duração para os segmentos HLS.
     */
    protected function generateStreamToken(int $mediaFileId, int $expiresAt): string
    {
        $data = "{$mediaFileId}:{$expiresAt}";
        $sig  = hash_hmac('sha256', $data, $this->getSecret() . '_stream');
        return base64_encode("{$data}:{$sig}");
    }

    /**
     * Verifica o stream token dos segmentos.
     */
    protected function verifyStreamToken(string $token): bool
    {
        try {
            $decoded = base64_decode($token);
            $parts   = explode(':', $decoded, 3);
            if (count($parts) !== 3) return true; // token opcional, não bloquear

            [$mid, $exp, $sig] = $parts;
            $data     = "{$mid}:{$exp}";
            $expected = hash_hmac('sha256', $data, $this->getSecret() . '_stream');

            if (!hash_equals($expected, $sig)) return false;
            if (time() > (int) $exp) return false;

            return true;
        } catch (\Throwable) {
            return true; // stream token é opcional
        }
    }

    /**
     * Verifica o Referer para bloquear hotlink externo não autorizado.
     */
    protected function validateReferer(Request $request): void
    {
        // Apenas log de aviso, não bloqueia (hotlink check é best-effort)
        $referer = $request->header('Referer') ?? '';
        $host    = parse_url($referer, PHP_URL_HOST) ?? '';
        $appHost = parse_url(config('app.url'), PHP_URL_HOST) ?? '';

        if ($host && $host !== $appHost && !str_contains($host, '.localhost')) {
            Log::info("SecureStream: acesso de origem externa: {$referer}");
        }
    }

    /**
     * Reescreve as URLs relativas do manifest .m3u8 para apontar para a rota segura.
     */
    protected function rewriteM3u8Urls(string $content, string $baseUrl, string $streamToken): string
    {
        $st = $streamToken ? "?st={$streamToken}" : '';
        $lines = explode("\n", $content);
        $rewritten = [];

        foreach ($lines as $line) {
            $line = rtrim($line);
            // Ignorar comentários e linhas vazias
            if (str_starts_with($line, '#') || empty($line)) {
                $rewritten[] = $line;
                continue;
            }
            // Reescrever URLs de segmentos e playlists aninhadas
            if (str_ends_with($line, '.ts') || str_ends_with($line, '.m3u8')) {
                $filename = basename($line);
                $rewritten[] = "{$baseUrl}/{$filename}{$st}";
            } else {
                $rewritten[] = $line;
            }
        }

        return implode("\n", $rewritten);
    }

    /**
     * Detecta o Content-Type correto para streaming HLS.
     */
    protected function detectContentType(string $file): string
    {
        if (str_ends_with($file, '.m3u8')) return 'application/vnd.apple.mpegurl';
        if (str_ends_with($file, '.ts'))   return 'video/mp2t';
        if (str_ends_with($file, '.jpg') || str_ends_with($file, '.jpeg')) return 'image/jpeg';
        if (str_ends_with($file, '.png')) return 'image/png';
        return 'application/octet-stream';
    }

    /**
     * Chave secreta para assinatura dos tokens.
     */
    protected function getSecret(): string
    {
        return config('app.key', 'ead-control-secure-stream-default-key');
    }
}
