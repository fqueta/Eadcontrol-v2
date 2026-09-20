<?php

namespace App\Services\Media;

use App\Http\Controllers\api\ApiCredentialController;
use Aws\S3\S3Client;
use Illuminate\Support\Str;

class R2StorageService
{
    protected ?S3Client $client = null;
    protected string $bucket = '';
    protected string $publicUrl = '';
    protected string $accountId = '';

    public function __construct()
    {
        $this->bootstrap();
    }

    /**
     * Inicializa o cliente S3 apontando para o Cloudflare R2 com base nas credenciais do tenant ou .env.
     */
    protected function bootstrap(): void
    {
        $cred = ApiCredentialController::get('cloudflare-r2')
             ?? ApiCredentialController::get('r2');

        $config = $cred ? ($cred->config ?? []) : [];

        $this->accountId = trim($config['account_id'] ?? env('R2_ACCOUNT_ID', ''));
        $accessKey = trim($config['access_key_id'] ?? env('R2_ACCESS_KEY_ID', ''));
        $secretKey = trim($config['secret_access_key'] ?? ($config['pass'] ?? env('R2_SECRET_ACCESS_KEY', '')));
        $this->bucket = trim($config['bucket'] ?? env('R2_BUCKET', ''));
        $this->publicUrl = rtrim($config['public_url'] ?? env('R2_PUBLIC_URL', ''), '/');

        if ($this->accountId && $accessKey && $secretKey && $this->bucket) {
            $endpoint = "https://{$this->accountId}.r2.cloudflarestorage.com";
            $this->client = new S3Client([
                'version' => 'latest',
                'region' => 'auto',
                'endpoint' => $endpoint,
                'credentials' => [
                    'key' => $accessKey,
                    'secret' => $secretKey,
                ],
                'use_path_style_endpoint' => true,
            ]);
        }
    }

    /**
     * Verifica se o R2 está devidamente configurado e pronto para uso.
     */
    public function isConfigured(): bool
    {
        return $this->client !== null && !empty($this->bucket);
    }

    /**
     * Configura automaticamente as regras de CORS no bucket do R2 para permitir upload direto via navegador.
     */
    public function ensureCors(): bool
    {
        if (!$this->isConfigured()) {
            return false;
        }

        try {
            $this->client->putBucketCors([
                'Bucket' => $this->bucket,
                'CORSConfiguration' => [
                    'CORSRules' => [
                        [
                            'AllowedHeaders' => ['*'],
                            'AllowedMethods' => ['GET', 'PUT', 'POST', 'HEAD', 'DELETE'],
                            'AllowedOrigins' => ['*'],
                            'MaxAgeSeconds' => 3600,
                        ],
                    ],
                ],
            ]);
            return true;
        } catch (\Throwable $e) {
            \Log::warning("R2StorageService: erro ao configurar CORS no bucket {$this->bucket}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Gera uma URL pré-assinada (Presigned URL) para o navegador fazer upload direto para o R2.
     *
     * @param string $path Caminho relativo no bucket (ex: "tenant-hair/videos/uuid.mp4")
     * @param string $mimeType Ex: "video/mp4"
     * @param int $expiresMinutes Tempo de expiração da assinatura em minutos
     * @return array ['upload_url' => string, 'public_url' => string, 'path' => string]
     */
    public function createPresignedUploadUrl(string $path, string $mimeType = 'video/mp4', int $expiresMinutes = 30): array
    {
        if (!$this->isConfigured()) {
            throw new \RuntimeException("Cloudflare R2 não está configurado neste tenant.");
        }

        $cmd = $this->client->getCommand('PutObject', [
            'Bucket' => $this->bucket,
            'Key' => $path,
            'ContentType' => $mimeType,
        ]);

        $request = $this->client->createPresignedRequest($cmd, "+{$expiresMinutes} minutes");
        $uploadUrl = (string) $request->getUri();

        $publicUrl = $this->getPublicUrl($path);

        return [
            'upload_url' => $uploadUrl,
            'public_url' => $publicUrl,
            'path' => $path,
            'expires_in_minutes' => $expiresMinutes,
        ];
    }

    /**
     * Retorna o cliente S3 configurado.
     */
    public function getClient(): ?S3Client
    {
        return $this->client;
    }

    /**
     * Retorna o bucket configurado.
     */
    public function getBucket(): string
    {
        return $this->bucket;
    }

    /**
     * Retorna a URL pública configurada.
     */
    public function getPublicUrlConfig(): string
    {
        return $this->publicUrl;
    }

    /**
     * Extrai a chave relativa do objeto (Key no bucket) a partir de uma URL completa ou caminho.
     * Suporta URLs de streaming, URLs S3 diretas ou caminhos parciais.
     */
    public function extractObjectKey(string $pathOrUrl): string
    {
        $decoded = urldecode(trim($pathOrUrl));
        if (str_contains($decoded, 'path=')) {
            $parts = parse_url($decoded);
            parse_str($parts['query'] ?? '', $query);
            if (!empty($query['path'])) {
                $decoded = $query['path'];
            }
        }
        if (str_contains($decoded, '://')) {
            $parsed = parse_url($decoded);
            $decoded = ltrim($parsed['path'] ?? '', '/');
        }
        $decoded = ltrim($decoded, '/');
        // Se começar com o nome do bucket no caminho, remove
        if (!empty($this->bucket) && str_starts_with($decoded, "{$this->bucket}/")) {
            $decoded = substr($decoded, strlen("{$this->bucket}/"));
        }
        return ltrim($decoded, '/');
    }

    /**
     * Retorna a URL de streaming/CDN do vídeo.
     * Se houver um domínio CDN público real configurado (ex: media.site.com ou pub-xxx.r2.dev), usa-o diretamente.
     * Se for o endpoint S3 (*.r2.cloudflarestorage.com) ou não houver domínio CDN, usa a rota de streaming da API
     * com suporte a HTTP 206 Partial Content (Range), permitindo que o navegador toque o vídeo imediatamente.
     */
    public function getPublicUrl(string $path): string
    {
        $cleanPath = ltrim($path, '/');
        if (!empty($this->publicUrl) && !str_contains($this->publicUrl, 'r2.cloudflarestorage.com')) {
            return rtrim($this->publicUrl, '/') . "/{$cleanPath}";
        }

        // Rota de streaming otimizada da API
        return url("/api/v1/integrations/media/stream?path=" . urlencode($cleanPath));
    }

    /**
     * Deleta um arquivo no Cloudflare R2.
     */
    public function deleteObject(string $pathOrUrl): bool
    {
        if (!$this->isConfigured()) {
            return false;
        }

        $key = $this->extractObjectKey($pathOrUrl);
        if (empty($key)) {
            return false;
        }

        try {
            $this->client->deleteObject([
                'Bucket' => $this->bucket,
                'Key' => $key,
            ]);
            return true;
        } catch (\Throwable $e) {
            \Log::error("R2StorageService: erro ao deletar {$key}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Verifica se um objeto existe no bucket do R2.
     */
    public function hasObject(string $pathOrUrl): bool
    {
        if (!$this->isConfigured()) {
            return false;
        }

        $key = $this->extractObjectKey($pathOrUrl);
        if (empty($key)) {
            return false;
        }

        try {
            return $this->client->doesObjectExist($this->bucket, $key);
        } catch (\Throwable $e) {
            return false;
        }
    }
}

