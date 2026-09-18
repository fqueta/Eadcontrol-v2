<?php

namespace App\Services\Integrations\Providers;

use App\Services\Integrations\IntegrationProviderInterface;
use Aws\S3\S3Client;
use Aws\Exception\AwsException;

class CloudflareR2Provider implements IntegrationProviderInterface
{
    public function getSlug(): string
    {
        return 'cloudflare-r2';
    }

    public function getName(): string
    {
        return 'Cloudflare R2 Storage';
    }

    public function validateConfig(array $config): array
    {
        $errors = [];
        if (empty($config['account_id'])) {
            $errors['account_id'] = 'Account ID do Cloudflare é obrigatório.';
        }
        if (empty($config['access_key_id'])) {
            $errors['access_key_id'] = 'Access Key ID do R2 é obrigatório.';
        }
        if (empty($config['secret_access_key'])) {
            $errors['secret_access_key'] = 'Secret Access Key do R2 é obrigatório.';
        }
        if (empty($config['bucket'])) {
            $errors['bucket'] = 'Nome do bucket é obrigatório.';
        }

        return $errors;
    }

    public function testConnection(array $config): array
    {
        $validationErrors = $this->validateConfig($config);
        if (!empty($validationErrors)) {
            return [
                'success' => false,
                'message' => 'Parâmetros incompletos.',
                'errors' => $validationErrors,
            ];
        }

        $accountId = trim($config['account_id']);
        $accessKeyId = trim($config['access_key_id']);
        $secretAccessKey = trim($config['secret_access_key']);
        $bucket = trim($config['bucket']);
        $endpoint = "https://{$accountId}.r2.cloudflarestorage.com";

        try {
            $s3Client = new S3Client([
                'version' => 'latest',
                'region' => 'auto',
                'endpoint' => $endpoint,
                'credentials' => [
                    'key' => $accessKeyId,
                    'secret' => $secretAccessKey,
                ],
                'use_path_style_endpoint' => true,
                'http' => [
                    'timeout' => 10,
                    'connect_timeout' => 5,
                ],
            ]);

            // Valida existência e acesso ao bucket
            $s3Client->headBucket([
                'Bucket' => $bucket,
            ]);

            return [
                'success' => true,
                'message' => "Conexão com o Cloudflare R2 estabelecida com sucesso! Bucket '{$bucket}' acessível.",
                'data' => [
                    'bucket' => $bucket,
                    'endpoint' => $endpoint,
                ],
            ];
        } catch (AwsException $e) {
            $errorCode = $e->getAwsErrorCode() ?: 'Unknown';
            $message = $e->getAwsErrorMessage() ?: $e->getMessage();

            return [
                'success' => false,
                'message' => "Falha ao conectar no Cloudflare R2 [{$errorCode}]: {$message}",
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => "Erro na conexão: " . $e->getMessage(),
            ];
        }
    }
}
