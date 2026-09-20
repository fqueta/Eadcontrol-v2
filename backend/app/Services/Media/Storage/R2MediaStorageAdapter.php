<?php

namespace App\Services\Media\Storage;

use App\Services\Media\R2StorageService;
use Aws\S3\S3Client;
use Illuminate\Support\Facades\Log;

class R2MediaStorageAdapter implements MediaStorageAdapterInterface
{
    protected R2StorageService $r2Service;
    protected ?S3Client $client;
    protected string $bucket;

    public function __construct(?R2StorageService $r2Service = null)
    {
        $this->r2Service = $r2Service ?? new R2StorageService();
        $this->client = $this->r2Service->getClient();
        $this->bucket = $this->r2Service->getBucket();
    }

    /**
     * Faz upload em lote de todos os arquivos do diretório HLS (.m3u8, .ts, .jpg) para o Cloudflare R2.
     */
    public function uploadDirectory(string $localDir, string $remotePrefix): array
    {
        if (!$this->client || empty($this->bucket)) {
            throw new \RuntimeException("Cloudflare R2 não está configurado para envio de mídia.");
        }

        $remotePrefix = trim($remotePrefix, '/');
        $uploaded = [];

        $files = glob(rtrim($localDir, '/') . '/*');
        if (empty($files)) {
            return $uploaded;
        }

        $commands = [];
        foreach ($files as $filePath) {
            if (is_dir($filePath)) {
                continue;
            }

            $fileName = basename($filePath);
            $remoteKey = "{$remotePrefix}/{$fileName}";
            $mimeType = $this->detectMimeType($fileName);

            $commands[] = $this->client->getCommand('PutObject', [
                'Bucket' => $this->bucket,
                'Key' => $remoteKey,
                'SourceFile' => $filePath,
                'ContentType' => $mimeType,
                'CacheControl' => str_ends_with($fileName, '.m3u8')
                    ? 'public, max-age=60' // Playlists podem ter cache curto
                    : 'public, max-age=31536000, immutable', // Chunks .ts e imagens são estáticos e imutáveis
            ]);

            $uploaded[$fileName] = $this->getUrl($remoteKey);
        }

        try {
            $pool = new \Aws\CommandPool($this->client, $commands, [
                'concurrency' => 25,
                'rejected' => function ($reason) {
                    Log::error("Falha no envio de arquivo HLS no lote: " . $reason);
                },
            ]);
            $promise = $pool->promise();
            $promise->wait();
        } catch (\Throwable $e) {
            Log::warning("CommandPool falhou, executando fallback sequencial: " . $e->getMessage());
            foreach ($commands as $cmd) {
                try {
                    $this->client->execute($cmd);
                } catch (\Throwable $err) {
                    Log::error("Erro no envio do arquivo: " . $err->getMessage());
                }
            }
        }

        return $uploaded;
    }

    /**
     * Faz download de um arquivo do R2 para o disco local.
     */
    public function downloadFile(string $remotePath, string $localDestination): bool
    {
        if (!$this->client || empty($this->bucket)) {
            return false;
        }

        $key = $this->r2Service->extractObjectKey($remotePath);
        $dir = dirname($localDestination);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        try {
            $this->client->getObject([
                'Bucket' => $this->bucket,
                'Key' => $key,
                'SaveAs' => $localDestination,
            ]);
            return file_exists($localDestination) && filesize($localDestination) > 0;
        } catch (\Throwable $e) {
            Log::error("Falha ao baixar vídeo do R2 ({$key}): " . $e->getMessage());
            return false;
        }
    }

    /**
     * Exclui pasta e todos os seus objetos no R2.
     */
    public function deleteDirectory(string $remotePrefix): bool
    {
        if (!$this->client || empty($this->bucket)) {
            return false;
        }

        $prefix = trim($this->r2Service->extractObjectKey($remotePrefix), '/');
        if (empty($prefix)) {
            return false;
        }

        try {
            $objects = $this->client->listObjectsV2([
                'Bucket' => $this->bucket,
                'Prefix' => $prefix,
            ]);

            if (!empty($objects['Contents'])) {
                $deleteKeys = array_map(function ($item) {
                    return ['Key' => $item['Key']];
                }, $objects['Contents']);

                $this->client->deleteObjects([
                    'Bucket' => $this->bucket,
                    'Delete' => ['Objects' => $deleteKeys],
                ]);
            }
            return true;
        } catch (\Throwable $e) {
            Log::error("Falha ao excluir diretório HLS no R2 ({$prefix}): " . $e->getMessage());
            return false;
        }
    }

    /**
     * Retorna a URL pública ou de streaming da API para o arquivo.
     */
    public function getUrl(string $remotePath): string
    {
        return $this->r2Service->getPublicUrl($remotePath);
    }

    /**
     * Mapeia Content-Type correto para streaming HLS.
     */
    protected function detectMimeType(string $fileName): string
    {
        if (str_ends_with($fileName, '.m3u8')) {
            return 'application/vnd.apple.mpegurl';
        }
        if (str_ends_with($fileName, '.ts')) {
            return 'video/mp2t';
        }
        if (str_ends_with($fileName, '.jpg') || str_ends_with($fileName, '.jpeg')) {
            return 'image/jpeg';
        }
        if (str_ends_with($fileName, '.png')) {
            return 'image/png';
        }
        if (str_ends_with($fileName, '.mp4')) {
            return 'video/mp4';
        }
        return 'application/octet-stream';
    }
}
