<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Jobs\MigrateVimeoVideoJob;
use App\Models\Activity;
use App\Models\Curso;
use App\Models\Module;
use App\Services\Media\VimeoMigrationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * VimeoMigrationController
 * pt-BR: Migração em lote de vídeos legados do Vimeo para o Cloudflare R2
 *        (com HLS) a partir das atividades de um curso.
 */
class VimeoMigrationController extends Controller
{
    /**
     * Coleta as atividades de vídeo do curso com seus IDs do Vimeo.
     *
     * @return array<int, array{activity: Activity, vimeo_id: string, has_hls: bool}>
     */
    private function collectCourseVideos(Curso $curso): array
    {
        $moduleIds = Module::where('post_parent', (int) $curso->id)->pluck('ID')->all();
        if (empty($moduleIds)) {
            return [];
        }

        $service = new VimeoMigrationService();
        $result = [];

        $activities = Activity::whereIn('post_parent', $moduleIds)->get();
        foreach ($activities as $activity) {
            $config = is_array($activity->config) ? $activity->config : [];
            $type = strtolower((string) ($config['type_activities'] ?? ''));
            $url = (string) ($config['video_url'] ?? $activity->post_content ?? '');
            if ($type !== '' && $type !== 'video') {
                continue;
            }
            $vimeoId = $service->extractVimeoId($url);
            if (!$vimeoId) {
                continue;
            }
            $result[] = [
                'activity' => $activity,
                'vimeo_id' => $vimeoId,
                'has_hls' => !empty($config['hls_master_url']) || str_contains($url, '.m3u8'),
            ];
        }

        return $result;
    }

    private function migrationCache()
    {
        try {
            return Cache::store('redis');
        } catch (\Throwable) {
            return Cache::store();
        }
    }

    /**
     * POST /api/v1/activities/{id}/migrate-vimeo
     * Testa e migra UMA atividade de vídeo do Vimeo (útil para validar
     * vídeo por vídeo antes da migração em lote do curso).
     */
    public function migrateActivity(Request $request, string $id)
    {
        $activity = Activity::find($id);
        if (!$activity) {
            return response()->json(['message' => 'Atividade não encontrada.'], 404);
        }

        $tenantId = tenancy()->tenant ? tenancy()->tenant->id : null;
        $force = $request->boolean('force', false);
        $service = new VimeoMigrationService();

        $token = $service->getAccessToken();
        if (!$token) {
            return response()->json([
                'message' => 'Integração do Vimeo não configurada ou inativa. Cadastre o Personal Access Token em Configurações > Integrações > Vimeo.',
            ], 422);
        }

        $check = $service->testToken($token);
        if (empty($check['ok'])) {
            return response()->json([
                'message' => 'Token do Vimeo inválido (' . ($check['error'] ?? '401') . '). Gere um novo Personal Access Token com os escopos public, private e video_files.',
            ], 422);
        }

        $config = is_array($activity->config) ? $activity->config : [];
        $url = (string) ($config['video_url'] ?? $activity->post_content ?? '');
        $vimeoId = $service->extractVimeoId($url);
        if (!$vimeoId) {
            return response()->json([
                'message' => 'Esta atividade não possui URL de vídeo do Vimeo.',
            ], 422);
        }

        if ((!empty($config['hls_master_url']) || str_contains($url, '.m3u8')) && !$force) {
            return response()->json([
                'success' => true,
                'status' => 'skipped_ready',
                'message' => 'Esta atividade já possui HLS. Use force=1 para migrar novamente.',
            ]);
        }

        // Testa este vídeo específico antes de enfileirar
        $file = $service->getDownloadableFile($vimeoId, $token);
        if (isset($file['error'])) {
            return response()->json([
                'message' => 'Este vídeo não pode ser baixado: ' . $file['error'],
                'vimeo_id' => $vimeoId,
                'vimeo_raw' => $file['raw'] ?? null,
            ], 422);
        }

        try {
            $this->migrationCache()->put(
                MigrateVimeoVideoJob::statusKey($tenantId, (int) $activity->ID),
                [
                    'status' => 'queued',
                    'activity_id' => (int) $activity->ID,
                    'vimeo_id' => $vimeoId,
                    'updated_at' => now()->toIso8601String(),
                ],
                86400
            );
        } catch (\Throwable) {}

        MigrateVimeoVideoJob::dispatch($tenantId, (int) $activity->ID, $vimeoId, null);

        return response()->json([
            'success' => true,
            'status' => 'queued',
            'activity_id' => (int) $activity->ID,
            'vimeo_id' => $vimeoId,
            'quality' => ($file['width'] ?? 0) . 'p',
            'message' => "Vídeo \"{$activity->post_title}\" enfileirado: baixa do Vimeo, envia ao R2 e gera HLS em segundo plano.",
        ]);
    }

    /**
     * POST /api/v1/courses/{id}/migrate-vimeo
     * Dispara um job de migração por atividade de vídeo do Vimeo.
     */
    public function migrateCourse(Request $request, string $id)
    {
        $curso = Curso::find($id);
        if (!$curso) {
            return response()->json(['message' => 'Curso não encontrado.'], 404);
        }

        $tenantId = tenancy()->tenant ? tenancy()->tenant->id : null;
        $force = $request->boolean('force', false);
        $service = new VimeoMigrationService();

        $token = $service->getAccessToken();
        if (!$token) {
            return response()->json([
                'message' => 'Integração do Vimeo não configurada ou inativa. Cadastre o Personal Access Token em Configurações > Integrações > Vimeo.',
            ], 422);
        }

        $check = $service->testToken($token);
        if (empty($check['ok'])) {
            return response()->json([
                'message' => 'Token do Vimeo inválido (' . ($check['error'] ?? '401') . '). Gere um novo Personal Access Token em developer.vimeo.com/apps com os escopos public, private e video_files e salve na integração.',
            ], 422);
        }

        $videos = $this->collectCourseVideos($curso);
        if (empty($videos)) {
            return response()->json([
                'message' => 'Nenhuma atividade de vídeo do Vimeo encontrada neste curso.',
            ], 422);
        }

        // Pré-voo: garante que a conta tem download liberado antes de enfileirar tudo.
        // Testa até 3 vídeos (um vídeo isolado sem download não deve travar os demais).
        $probeOk = false;
        $probeError = null;
        $probeRaw = null;
        foreach (array_slice($videos, 0, 3) as $candidate) {
            $probe = $service->getDownloadableFile($candidate['vimeo_id'], $token);
            if (!isset($probe['error'])) {
                $probeOk = true;
                break;
            }
            $probeError = $probe['error'];
            $probeRaw = $probe['raw'] ?? null;
        }
        if (!$probeOk) {
            return response()->json([
                'message' => 'A conta do Vimeo não liberou os arquivos para download: ' . ($probeError ?? 'sem arquivos retornados pela API. Confira o plano e o escopo video_files do token.'),
                'vimeo_raw' => $probeRaw ?? null,
            ], 422);
        }

        $dispatched = 0;
        $skippedReady = 0;
        $items = [];

        foreach ($videos as $item) {
            /** @var Activity $activity */
            $activity = $item['activity'];
            $activityId = (int) $activity->ID;

            if ($item['has_hls'] && !$force) {
                $skippedReady++;
                $items[] = [
                    'activity_id' => $activityId,
                    'title' => $activity->post_title,
                    'vimeo_id' => $item['vimeo_id'],
                    'status' => 'skipped_ready',
                ];
                continue;
            }

            try {
                $this->migrationCache()->put(
                    MigrateVimeoVideoJob::statusKey($tenantId, $activityId),
                    [
                        'status' => 'queued',
                        'activity_id' => $activityId,
                        'vimeo_id' => $item['vimeo_id'],
                        'updated_at' => now()->toIso8601String(),
                    ],
                    86400
                );
            } catch (\Throwable) {}

            MigrateVimeoVideoJob::dispatch($tenantId, $activityId, $item['vimeo_id'], (int) $curso->id);

            $dispatched++;
            $items[] = [
                'activity_id' => $activityId,
                'title' => $activity->post_title,
                'vimeo_id' => $item['vimeo_id'],
                'status' => 'queued',
            ];
        }

        return response()->json([
            'success' => true,
            'course_id' => (int) $curso->id,
            'dispatched' => $dispatched,
            'skipped_ready' => $skippedReady,
            'total_vimeo' => count($videos),
            'message' => $dispatched > 0
                ? "Migração iniciada para {$dispatched} vídeo(s). Acompanhe o progresso nesta tela; cada vídeo é baixado, enviado ao R2 e otimizado em HLS."
                : 'Todos os vídeos do Vimeo deste curso já possuem HLS. Use force=1 para migrar novamente.',
            'items' => $items,
        ]);
    }

    /**
     * GET /api/v1/courses/{id}/migrate-vimeo/status
     * Retorna o progresso da migração por atividade.
     */
    public function migrationStatus(string $id)
    {
        $curso = Curso::find($id);
        if (!$curso) {
            return response()->json(['message' => 'Curso não encontrado.'], 404);
        }

        $tenantId = tenancy()->tenant ? tenancy()->tenant->id : null;
        $videos = $this->collectCourseVideos($curso);

        // Releitura fresca das configs (o job de HLS atualiza em segundo plano)
        $activityIds = array_map(fn($v) => (int) $v['activity']->ID, $videos);
        $fresh = Activity::whereIn('ID', $activityIds)->get()->keyBy('ID');

        $items = [];
        $summary = ['queued' => 0, 'downloading' => 0, 'uploading' => 0, 'transcoding' => 0, 'ready' => 0, 'failed' => 0, 'pending' => 0];

        foreach ($videos as $item) {
            /** @var Activity $activity */
            $activity = $item['activity'];
            $activityId = (int) $activity->ID;
            $model = $fresh->get($activityId);
            $config = ($model && is_array($model->config)) ? $model->config : [];

            $state = 'pending';
            $detail = null;
            try {
                $cached = $this->migrationCache()->get(MigrateVimeoVideoJob::statusKey($tenantId, $activityId));
                if (!empty($cached['status'])) {
                    $state = (string) $cached['status'];
                    $detail = $cached['error'] ?? ($cached['message'] ?? null);
                }
            } catch (\Throwable) {}

            if (!empty($config['hls_master_url'])) {
                $state = 'ready';
                $detail = null;
            }

            if (!isset($summary[$state])) {
                $summary[$state] = 0;
            }
            $summary[$state]++;

            $items[] = [
                'activity_id' => $activityId,
                'title' => $activity->post_title,
                'vimeo_id' => $item['vimeo_id'],
                'status' => $state,
                'detail' => $detail,
            ];
        }

        return response()->json([
            'course_id' => (int) $curso->id,
            'total_vimeo' => count($videos),
            'summary' => $summary,
            'items' => $items,
        ]);
    }
}
