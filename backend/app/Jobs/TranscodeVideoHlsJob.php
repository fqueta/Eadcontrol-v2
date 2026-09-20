<?php

namespace App\Jobs;

use App\Models\Activity;
use App\Models\MediaFile;
use App\Services\Media\HlsTranscoderService;
use App\Services\Media\R2StorageService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class TranscodeVideoHlsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 1800; // 30 minutos
    public int $tries = 2;

    public string $sourcePath = '';
    public ?string $tenantId = null;
    public ?int $activityId = null;
    public ?int $mediaFileId = null;
    public array $options = [];

    public function __construct(
        string $sourcePath,
        ?string $tenantId = null,
        ?int $activityId = null,
        array $options = [],
        ?int $mediaFileId = null
    ) {
        $this->sourcePath  = $sourcePath;
        $this->tenantId    = $tenantId ?: (tenancy()->tenant ? tenancy()->tenant->id : null);
        $this->activityId  = $activityId;
        $this->mediaFileId = $mediaFileId;
        $this->options     = $options;
        $this->onQueue('videos');
    }

    public function handle(): void
    {
        // 1. Garantir inicialização correta do Tenant na fila
        if ($this->tenantId && (!tenancy()->tenant || tenancy()->tenant->id !== $this->tenantId)) {
            try {
                tenancy()->initialize($this->tenantId);
            } catch (\Throwable $e) {
                Log::warning("Não foi possível inicializar tenant {$this->tenantId} no Job: " . $e->getMessage());
            }
        }

        $r2Service = new R2StorageService();
        $sourceKey = $r2Service->extractObjectKey($this->sourcePath);
        $cacheKey = "video_hls_status:" . md5($sourceKey);

        try {
            $this->getHlsCache()->put($cacheKey, [
                'status' => 'processing',
                'source_path' => $this->sourcePath,
                'started_at' => now()->toIso8601String(),
            ], 86400);
        } catch (\Throwable $e) {}

        Log::info("Iniciando TranscodeVideoHlsJob para {$this->sourcePath} (Tenant: {$this->tenantId})");

        try {
            $transcoder = new HlsTranscoderService();
            $result = $transcoder->processToHls($this->sourcePath, $this->options);

            if (!$result['success']) {
                try {
                    $this->getHlsCache()->put($cacheKey, [
                        'status' => 'failed',
                        'error'  => $result['error'] ?? 'Falha na transcodificação',
                        'updated_at' => now()->toIso8601String(),
                    ], 86400);
                } catch (\Throwable $e) {}

                // Atualizar Mediateca com falha
                if ($this->mediaFileId) {
                    try {
                        MediaFile::where('id', $this->mediaFileId)->update(['status' => 'failed']);
                    } catch (\Throwable $e) {}
                }

                Log::error("TranscodeVideoHlsJob falhou para {$this->sourcePath}: " . ($result['error'] ?? ''));
                return;
            }

            // 2. Se houver atividade vinculada, atualiza com a URL .m3u8 e metadados
            if ($this->activityId) {
                try {
                    $activity = Activity::find($this->activityId);
                    if ($activity) {
                        $config = is_array($activity->config) ? $activity->config : [];
                        $config['video_url']    = $result['master_url'];
                        $config['video_urls']   = [$result['master_url']];
                        $config['hls_master_url'] = $result['master_url'];
                        $config['video_source'] = 'eadcontrol';

                        if (!empty($result['thumbnail_url']) && empty($activity->post_thumbnail)) {
                            $config['thumbnail_url'] = $result['thumbnail_url'];
                        }

                        if (!empty($result['duration']) && empty($config['duration'])) {
                            $config['duration']      = (string) $result['duration'];
                            $config['type_duration'] = 'seg';
                        }

                        $activity->post_content = $result['master_url'];
                        $activity->config = $config;
                        $activity->save();
                        Log::info("Atividade #{$this->activityId} atualizada com a nova URL HLS.");

                        // Atualiza também na árvore modulos do Curso pai para consistência imediata
                        try {
                            $moduleId = $activity->post_parent;
                            $module = $moduleId ? Activity::find($moduleId) : null;
                            $cursoId = $module ? $module->post_parent : null;
                            if ($cursoId) {
                                $curso = \App\Models\Curso::find($cursoId);
                                if ($curso && is_array($curso->modulos)) {
                                    $modulos = $curso->modulos;
                                    $changed = false;
                                    foreach ($modulos as &$mod) {
                                        $acts = isset($mod['atividades']) ? $mod['atividades'] : (isset($mod['activities']) ? $mod['activities'] : []);
                                        foreach ($acts as &$a) {
                                            $aid = $a['id'] ?? $a['activity_id'] ?? null;
                                            if ($aid && (int)$aid === (int)$this->activityId) {
                                                $a['content'] = $result['master_url'];
                                                $a['video_url'] = $result['master_url'];
                                                $a['hls_master_url'] = $result['master_url'];
                                                if (!empty($result['thumbnail_url'])) {
                                                    $a['thumbnail_url'] = $result['thumbnail_url'];
                                                }
                                                $changed = true;
                                            }
                                        }
                                        if (isset($mod['atividades'])) $mod['atividades'] = $acts;
                                        if (isset($mod['activities'])) $mod['activities'] = $acts;
                                    }
                                    if ($changed) {
                                        $curso->modulos = $modulos;
                                        $curso->save();
                                        Log::info("Curso #{$cursoId} atualizado com a nova URL HLS na atividade #{$this->activityId}.");
                                    }
                                }
                            }
                        } catch (\Throwable $cursoErr) {
                            Log::warning("Erro ao sincronizar HLS no Curso: " . $cursoErr->getMessage());
                        }

                        // Vincular na Mediateca
                        if ($this->mediaFileId) {
                            try {
                                MediaFile::where('id', $this->mediaFileId)->update([
                                    'linked_activity_id' => $this->activityId,
                                ]);
                            } catch (\Throwable $e) {}
                        }
                    }
                } catch (\Throwable $e) {
                    Log::warning("Erro ao atualizar atividade #{$this->activityId}: " . $e->getMessage());
                }
            }

            // 3. Atualizar Mediateca com status final e metadados HLS
            try {
                $r2Key  = (new R2StorageService())->extractObjectKey($this->sourcePath);
                $dirName  = dirname($r2Key);
                $baseName = pathinfo($r2Key, PATHINFO_FILENAME);
                $hlsKey   = "{$dirName}/hls/{$baseName}/master.m3u8";

                $mfQuery = MediaFile::query();
                if ($this->mediaFileId) {
                    $mfQuery->where('id', $this->mediaFileId);
                } else {
                    $mfQuery->where(function($q) use ($r2Key) {
                        $q->where('storage_path', $r2Key)
                          ->orWhere('storage_path', 'like', "%{$r2Key}%");
                    });
                }
                $mfQuery->update([
                    'status'           => 'ready',
                    'hls_path'         => $hlsKey,
                    'hls_url'          => $result['master_url'],
                    'thumbnail_url'    => $result['thumbnail_url'] ?? null,
                    'duration_seconds' => (int) ($result['duration'] ?? 0),
                ]);
            } catch (\Throwable $e) {
                Log::warning("Erro ao atualizar MediaFile: " . $e->getMessage());
            }

            // 3. Salvar status final no cache para consulta do frontend
            try {
                $this->getHlsCache()->put($cacheKey, [
                    'status' => 'ready',
                    'master_url' => $result['master_url'],
                    'thumbnail_url' => $result['thumbnail_url'] ?? null,
                    'duration' => $result['duration'] ?? 0,
                    'strategy' => $result['strategy'] ?? 'fast_remux_hls',
                    'completed_at' => now()->toIso8601String(),
                ], 86400);
            } catch (\Throwable $e) {}

            Log::info("TranscodeVideoHlsJob finalizado com sucesso para {$this->sourcePath}");
        } catch (\Throwable $e) {
            Log::error("Exceção não tratada em TranscodeVideoHlsJob: " . $e->getMessage());
            try {
                $this->getHlsCache()->put($cacheKey, [
                    'status' => 'failed',
                    'error' => $e->getMessage(),
                    'updated_at' => now()->toIso8601String(),
                ], 86400);
            } catch (\Throwable $e2) {}
        }
    }

    protected function getHlsCache()
    {
        try {
            return Cache::store('redis');
        } catch (\Throwable) {
            return Cache::store();
        }
    }
}
