<?php

namespace App\Services\Media;

use App\Services\Media\Storage\MediaStorageAdapterInterface;
use App\Services\Media\Storage\R2MediaStorageAdapter;
use App\Services\Media\Strategies\TranscoderStrategyFactory;
use App\Services\Media\Strategies\AdaptiveMultiBitrateStrategy;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class HlsTranscoderService
{
    protected MediaStorageAdapterInterface $storage;

    public function __construct(?MediaStorageAdapterInterface $storage = null)
    {
        $this->storage = $storage ?? new R2MediaStorageAdapter();
    }

    /**
     * Processa um vídeo do Cloudflare R2 gerando a estrutura HLS e subindo os chunks de volta para o R2.
     *
     * @param string $sourcePath Caminho ou URL do vídeo original no R2 (ex: "default/videos/uuid.mp4")
     * @param array $options Opções adicionais
     * @return array [
     *   'success' => bool,
     *   'master_url' => string,
     *   'thumbnail_url' => ?string,
     *   'duration' => int,
     *   'segments_count' => int,
     *   'strategy' => string,
     *   'error' => ?string
     * ]
     */
    public function processToHls(string $sourcePath, array $options = []): array
    {
        $processId = Str::uuid()->toString();
        $tempDir = storage_path("app/temp/transcode_{$processId}");
        $tempInputFile = "{$tempDir}/source_video.mp4";
        $tempOutputDir = "{$tempDir}/hls";

        try {
            if (!is_dir($tempOutputDir)) {
                mkdir($tempOutputDir, 0775, true);
            }

            // 1. Download do MP4 original armazenado no Cloudflare R2
            Log::info("Iniciando download do vídeo original do R2: {$sourcePath}");
            $downloadOk = $this->storage->downloadFile($sourcePath, $tempInputFile);
            if (!$downloadOk || !file_exists($tempInputFile) || filesize($tempInputFile) === 0) {
                throw new \RuntimeException("Falha ao baixar o arquivo fonte do Cloudflare R2 para processamento local.");
            }

            // 2. Selecionar e executar a estratégia de transcodificação via Factory
            $strategy = TranscoderStrategyFactory::createForFile($tempInputFile, $options);
            Log::info("Executando estratégia de transcodificação: " . $strategy->getName());

            $result = $strategy->transcode($tempInputFile, $tempOutputDir, $options);

            // Se a estratégia rápida falhar (ex: por incompatibilidade de stream), tenta fallback para reencode
            if (!$result->success && $strategy->getName() !== 'adaptive_reencode_hls') {
                Log::warning("Estratégia rápida falhou. Tentando fallback para AdaptiveMultiBitrateStrategy...");
                $fallbackStrategy = new AdaptiveMultiBitrateStrategy();
                $result = $fallbackStrategy->transcode($tempInputFile, $tempOutputDir, $options);
            }

            if (!$result->success) {
                throw new \RuntimeException("Falha na transcodificação HLS: " . ($result->error ?? 'Erro desconhecido'));
            }

            // 3. Determinar pasta remota HLS de destino no Cloudflare R2
            // Ex: "default/videos/hls/uuid"
            $r2Key = (new R2StorageService())->extractObjectKey($sourcePath);
            $dirName = dirname($r2Key);
            $baseName = pathinfo($r2Key, PATHINFO_FILENAME);
            $remoteHlsDir = "{$dirName}/hls/{$baseName}";

            // 4. Upload de todos os arquivos HLS (.m3u8, .ts, .jpg) para o Cloudflare R2
            Log::info("Fazendo upload da estrutura HLS para o Cloudflare R2 em: {$remoteHlsDir}");
            $uploadedFiles = $this->storage->uploadDirectory($tempOutputDir, $remoteHlsDir);

            $masterUrl = $uploadedFiles['master.m3u8'] ?? $this->storage->getUrl("{$remoteHlsDir}/master.m3u8");
            $thumbnailUrl = isset($uploadedFiles['thumbnail.jpg'])
                ? $uploadedFiles['thumbnail.jpg']
                : (file_exists("{$tempOutputDir}/thumbnail.jpg") ? $this->storage->getUrl("{$remoteHlsDir}/thumbnail.jpg") : null);

            Log::info("Transcodificação HLS concluída com sucesso! URL mestre: {$masterUrl}");

            return [
                'success' => true,
                'master_url' => $masterUrl,
                'master_path' => "{$remoteHlsDir}/master.m3u8",
                'thumbnail_url' => $thumbnailUrl,
                'thumbnail_path' => $thumbnailUrl ? "{$remoteHlsDir}/thumbnail.jpg" : null,
                'duration' => $result->durationSeconds,
                'segments_count' => count($result->segmentFiles),
                'strategy' => $strategy->getName(),
            ];
        } catch (\Throwable $e) {
            Log::error("Erro no processamento HLS do vídeo ({$sourcePath}): " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        } finally {
            // 5. Limpeza obrigatória do diretório temporário local
            try {
                if (is_dir($tempDir)) {
                    File::deleteDirectory($tempDir);
                }
            } catch (\Throwable $e) {
                Log::warning("Não foi possível apagar diretório temporário {$tempDir}: " . $e->getMessage());
            }
        }
    }
}
