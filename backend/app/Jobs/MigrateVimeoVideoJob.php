<?php

namespace App\Jobs;

use App\Models\Activity;
use App\Models\MediaFile;
use App\Services\Media\R2StorageService;
use App\Services\Media\VimeoMigrationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * MigrateVimeoVideoJob
 * pt-BR: Baixa um vídeo legado do Vimeo (link progressivo da API), envia ao
 *        Cloudflare R2 e dispara a transcodificação HLS existente, que atualiza
 *        a atividade, o curso e a mediateca automaticamente.
 */
class MigrateVimeoVideoJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 1800; // 30 minutos (downloads grandes)
    public int $tries = 2;

    public ?string $tenantId = null;
    public ?int $activityId = null;
    public ?string $vimeoId = null;
    public ?int $courseId = null;

    public function __construct(?string $tenantId, ?int $activityId, ?string $vimeoId, ?int $courseId = null)
    {
        $this->tenantId = $tenantId ?: (tenancy()->tenant ? tenancy()->tenant->id : null);
        $this->activityId = $activityId;
        $this->vimeoId = $vimeoId;
        $this->courseId = $courseId;
        $this->onQueue('videos');
    }

    public static function statusKey(?string $tenantId, ?int $activityId): string
    {
        return "vimeo_migrate:{$tenantId}:{$activityId}";
    }

    protected function setStatus(string $status, array $extra = []): void
    {
        try {
            $this->getCache()->put(
                self::statusKey($this->tenantId, $this->activityId),
                array_merge([
                    'status' => $status,
                    'activity_id' => $this->activityId,
                    'vimeo_id' => $this->vimeoId,
                    'updated_at' => now()->toIso8601String(),
                ], $extra),
                86400
            );
        } catch (\Throwable) {}
    }

    public function handle(): void
    {
        if ($this->tenantId && (!tenancy()->tenant || tenancy()->tenant->id !== $this->tenantId)) {
            try {
                tenancy()->initialize($this->tenantId);
            } catch (\Throwable $e) {
                Log::warning("MigrateVimeoVideoJob: tenant {$this->tenantId} inválido: " . $e->getMessage());
                $this->setStatus('failed', ['error' => 'Tenant inválido.']);
                return;
            }
        }

        $this->setStatus('downloading');
        Log::info("MigrateVimeoVideoJob: atividade #{$this->activityId} <- vimeo {$this->vimeoId} (tenant {$this->tenantId})");

        $service = new VimeoMigrationService();
        $token = $service->getAccessToken();
        if (!$token) {
            $this->setStatus('failed', ['error' => 'Credencial do Vimeo ausente ou inativa.']);
            return;
        }

        $file = $service->getDownloadableFile((string) $this->vimeoId, $token);
        if (isset($file['error'])) {
            $this->setStatus('failed', ['error' => $file['error']]);
            Log::warning("MigrateVimeoVideoJob atividade #{$this->activityId}: " . $file['error']);
            return;
        }

        $r2 = new R2StorageService();
        if (!$r2->isConfigured()) {
            $this->setStatus('failed', ['error' => 'Cloudflare R2 não configurado neste tenant.']);
            return;
        }

        $tmpDir = storage_path('app/temp/vimeo_migrate');
        if (!is_dir($tmpDir)) {
            mkdir($tmpDir, 0775, true);
        }
        $tmpFile = "{$tmpDir}/vimeo_{$this->vimeoId}_" . Str::uuid()->toString() . '.mp4';

        try {
            // 1. Download direto do Vimeo para o disco (stream, sem estourar memória)
            $this->setStatus('downloading', ['quality' => ($file['width'] ?? 0) . 'p']);
            $ctx = stream_context_create([
                'http' => ['timeout' => 1500, 'follow_location' => 1, 'max_redirects' => 5],
                'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
            ]);
            $in = @fopen($file['url'], 'rb', false, $ctx);
            if (!$in) {
                throw new \RuntimeException('Não foi possível abrir o link de download do Vimeo.');
            }
            $out = @fopen($tmpFile, 'wb');
            if (!$out) {
                fclose($in);
                throw new \RuntimeException('Não foi possível criar arquivo temporário local.');
            }
            $bytes = stream_copy_to_stream($in, $out);
            fclose($in);
            fclose($out);

            if (!$bytes || !file_exists($tmpFile) || filesize($tmpFile) === 0) {
                throw new \RuntimeException('Download do Vimeo retornou arquivo vazio.');
            }

            // 2. Upload ao R2
            $this->setStatus('uploading', ['bytes' => $bytes]);
            $r2Key = trim((string) $this->tenantId, '/') . '/videos/migrated/' . Str::uuid()->toString() . '.mp4';
            $r2->getClient()->putObject([
                'Bucket' => $r2->getBucket(),
                'Key' => $r2Key,
                'SourceFile' => $tmpFile,
                'ContentType' => 'video/mp4',
            ]);

            // 3. Registrar na mediateca
            $activity = $this->activityId ? Activity::find($this->activityId) : null;
            $mediaFile = MediaFile::create([
                'user_id' => null,
                'original_name' => ($file['name'] !== '' ? $file['name'] : ($activity?->post_title ?? "vimeo_{$this->vimeoId}.mp4")),
                'storage_path' => $r2Key,
                'public_url' => $r2->getPublicUrl($r2Key),
                'mime_type' => 'video/mp4',
                'size_bytes' => (int) $bytes,
                'duration_seconds' => (int) ($file['duration'] ?? 0),
                'status' => 'uploaded',
                'linked_activity_id' => $this->activityId,
                'config' => ['migrated_from' => "vimeo:{$this->vimeoId}"],
            ]);

            // 4. Disparar transcodificação HLS (atualiza atividade + curso + mediateca)
            $this->setStatus('transcoding', ['media_file_id' => $mediaFile->id]);
            TranscodeVideoHlsJob::dispatch($r2Key, $this->tenantId, $this->activityId, [], $mediaFile->id);

            $this->setStatus('transcoding', [
                'media_file_id' => $mediaFile->id,
                'message' => 'Upload concluído. Otimização HLS em andamento.',
            ]);
            Log::info("MigrateVimeoVideoJob: atividade #{$this->activityId} enviada ao R2 ({$r2Key}), HLS disparado.");
        } catch (\Throwable $e) {
            Log::error("MigrateVimeoVideoJob atividade #{$this->activityId} falhou: " . $e->getMessage());
            $this->setStatus('failed', ['error' => $e->getMessage()]);
        } finally {
            try {
                if (isset($tmpFile) && file_exists($tmpFile)) {
                    unlink($tmpFile);
                }
            } catch (\Throwable) {}
        }
    }

    protected function getCache()
    {
        try {
            return Cache::store('redis');
        } catch (\Throwable) {
            return Cache::store();
        }
    }
}
