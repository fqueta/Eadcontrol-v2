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
     * Retorna a URL pública de streaming/CDN do vídeo.
     */
    public function getPublicUrl(string $path): string
    {
        $cleanPath = ltrim($path, '/');
        if (!empty($this->publicUrl)) {
            return "{$this->publicUrl}/{$cleanPath}";
        }

        // Fallback para URL do R2 público (se habilitado r2.dev)
        return "https://{$this->bucket}.r2.cloudflarestorage.com/{$cleanPath}";
    }

    /**
     * Deleta um arquivo no Cloudflare R2.
     */
    public function deleteObject(string $path): bool
    {
        if (!$this->isConfigured()) {
            return false;
        }

        try {
            $this->client->deleteObject([
                'Bucket' => $this->bucket,
                'Key' => ltrim($path, '/'),
            ]);
            return true;
        } catch (\Throwable $e) {
            \Log::error("R2StorageService: erro ao deletar {$path}: " . $e->getMessage());
            return false;
        }
    }
}
