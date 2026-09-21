<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Jobs\TranscodeVideoHlsJob;
use App\Models\MediaFile;
use App\Services\Integrations\IntegrationStrategyFactory;
use App\Services\Media\R2StorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class IntegrationTestController extends Controller
{
    /**
     * Valida se o usuário pertence ao Grupo 1 (Master / Superadmin).
     */
    protected function checkGroup1Access(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        $permissionId = (int) ($user->permission_id ?? 0);
        if ($permissionId !== 1) {
            return response()->json([
                'message' => 'Acesso negado. Apenas administradores do Grupo 1 podem gerenciar ou testar integrações.',
                'permission_id' => $permissionId,
            ], 403);
        }

        return null;
    }

    /**
     * Testa a conexão de um provedor usando o Strategy Pattern.
     */
    public function testConnection(Request $request, string $slug)
    {
        if ($deny = $this->checkGroup1Access($request)) {
            return $deny;
        }

        try {
            $provider = IntegrationStrategyFactory::make($slug);
            $config = $request->input('config', []);

            // Se config não veio completa, tenta mesclar com o que já está salvo no banco
            $saved = ApiCredentialController::get($slug);
            if ($saved && is_array($saved->config)) {
                $config = array_merge($saved->config, array_filter($config, fn($v) => !empty($v)));
            }

            $result = $provider->testConnection($config);

            $status = $result['success'] ? 200 : 422;
            return response()->json($result, $status);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro interno ao testar integração: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Gera uma Presigned URL para upload direto de arquivo de vídeo no R2.
     */
    public function presignR2Upload(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        $validator = Validator::make($request->all(), [
            'filename' => 'required|string|max:255',
            'mime_type' => 'nullable|string|max:100',
            'content_type' => 'nullable|string|max:100',
            'folder' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $mimeType = $request->input('mime_type') ?: $request->input('content_type') ?: 'video/mp4';

        $tenantId = tenancy()->tenant ? tenancy()->tenant->id : 'default';
        $ext = pathinfo($request->input('filename'), PATHINFO_EXTENSION) ?: 'mp4';
        $safeName = Str::uuid()->toString() . '.' . $ext;
        $folder = trim($request->input('folder', 'videos'), '/');
        $path = "{$tenantId}/{$folder}/{$safeName}";

        try {
            $r2Service = new R2StorageService();
            if (!$r2Service->isConfigured()) {
                return response()->json([
                    'message' => 'A integração com o Cloudflare R2 não está configurada neste tenant.',
                ], 422);
            }

            $presignedData = $r2Service->createPresignedUploadUrl(
                $path,
                $mimeType,
                60 // 60 minutos para upload de vídeos maiores
            );

            // Registrar na Mediateca imediatamente (antes do upload)
            // Isso garante que mesmo que o professor saia sem salvar, o vídeo é rastreveíl
            $mediaFile = null;
            try {
                $mediaFile = MediaFile::create([
                    'user_id'       => (string) ($user->id ?? null),
                    'original_name' => $request->input('filename'),
                    'storage_path'  => $path,
                    'public_url'    => $presignedData['public_url'],
                    'mime_type'     => $mimeType,
                    'status'        => 'uploaded',
                    'config'        => ['uploaded_by' => $user->name ?? null],
                ]);
            } catch (\Throwable $e) {
                Log::warning('Não foi possível criar registro na Mediateca: ' . $e->getMessage());
            }

            return response()->json([
                'success'       => true,
                'data'          => $presignedData,
                'media_file_id' => $mediaFile?->id,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Falha ao gerar URL assinada de upload: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Faz streaming direto de vídeo/mídia armazenado no Cloudflare R2 com suporte a HTTP 206 Partial Content (Range).
     */
    public function streamR2Media(Request $request)
    {
        $rawPath = $request->query('path') ?: $request->query('url') ?: '';
        if (empty($rawPath)) {
            return response()->json(['message' => 'Caminho do arquivo não fornecido'], 400);
        }

        try {
            $r2Service = new R2StorageService();
            if (!$r2Service->isConfigured()) {
                return response()->json(['message' => 'Armazenamento de mídia não configurado'], 503);
            }

            $key = $r2Service->extractObjectKey($rawPath);
            if (empty($key) || str_contains($key, '..')) {
                return response()->json(['message' => 'Caminho de arquivo inválido'], 400);
            }

            $s3 = $r2Service->getClient();
            $bucket = $r2Service->getBucket();

            try {
                $head = $s3->headObject([
                    'Bucket' => $bucket,
                    'Key' => $key,
                ]);
            } catch (\Aws\S3\Exception\S3Exception $e) {
                if ($e->getStatusCode() === 404 || str_contains($e->getAwsErrorCode() ?? '', 'NoSuchKey')) {
                    return response()->json(['message' => 'Vídeo não encontrado no armazenamento'], 404);
                }
                throw $e;
            }

            $fileSize = (int) ($head['ContentLength'] ?? 0);
            $mimeType = $head['ContentType'] ?? 'video/mp4';
            $etag = $head['ETag'] ?? '"' . md5($key) . '"';
            $cacheControl = 'public, max-age=86400';

            // Ajuste específico de MIME type e Cache-Control para streaming HLS
            if (str_ends_with($key, '.m3u8')) {
                $mimeType = 'application/vnd.apple.mpegurl';
                $cacheControl = 'public, max-age=60';
            } elseif (str_ends_with($key, '.ts')) {
                $mimeType = 'video/mp2t';
                $cacheControl = 'public, max-age=31536000, immutable';
            } elseif (str_ends_with($key, '.jpg') || str_ends_with($key, '.jpeg')) {
                $mimeType = 'image/jpeg';
            } elseif (str_ends_with($key, '.png')) {
                $mimeType = 'image/png';
            }

            $rangeHeader = $request->header('Range');

            if ($rangeHeader && preg_match('/bytes=(\d+)-(\d*)/i', $rangeHeader, $matches)) {
                $start = (int) $matches[1];
                $end = ($matches[2] !== '') ? (int) $matches[2] : ($fileSize - 1);
                if ($end >= $fileSize) {
                    $end = $fileSize - 1;
                }
                if ($start > $end || $start >= $fileSize) {
                    return response('', 416, [
                        'Content-Range' => "bytes */{$fileSize}",
                    ]);
                }
                $length = ($end - $start) + 1;

                $object = $s3->getObject([
                    'Bucket' => $bucket,
                    'Key' => $key,
                    'Range' => "bytes={$start}-{$end}",
                ]);

                $body = $object['Body'];

                return response()->stream(function () use ($body) {
                    while (!$body->eof()) {
                        echo $body->read(1024 * 64);
                        if (connection_aborted()) break;
                    }
                }, 206, [
                    'Content-Type' => $mimeType,
                    'Content-Range' => "bytes {$start}-{$end}/{$fileSize}",
                    'Content-Length' => $length,
                    'Accept-Ranges' => 'bytes',
                    'ETag' => $etag,
                    'Cache-Control' => $cacheControl,
                    'Access-Control-Allow-Origin' => '*',
                    'Access-Control-Allow-Headers' => 'Range, Origin, X-Requested-With, Content-Type, Accept',
                    'Access-Control-Expose-Headers' => 'Content-Range, Content-Length, Accept-Ranges',
                ]);
            }

            // Se for arquivo m3u8 (manifesto HLS), reescreve as URIs relativas dos segmentos
            // para passarem pelo endpoint de streaming com o path completo
            if (str_ends_with($key, '.m3u8')) {
                try {
                    $tenantKey = tenancy()->tenant ? tenancy()->tenant->id : 'default';
                    Cache::put("last_hls_dir:{$tenantKey}:" . $request->ip(), dirname($key), 7200);
                } catch (\Throwable) {}

                $object = $s3->getObject([
                    'Bucket' => $bucket,
                    'Key' => $key,
                ]);
                $content = (string) $object['Body']->getContents();
                $dir = dirname($key);
                $lines = explode("\n", $content);
                $rewritten = [];
                foreach ($lines as $line) {
                    $trimmed = trim($line);
                    if ($trimmed !== '' && !str_starts_with($trimmed, '#')) {
                        // Linha de segmento ou sub-playlist relativa (ex: segment_000.ts)
                        if (!str_starts_with($trimmed, 'http://') && !str_starts_with($trimmed, 'https://') && !str_starts_with($trimmed, 'stream?')) {
                            $segmentPath = ($dir === '.' || $dir === '') ? $trimmed : "{$dir}/{$trimmed}";
                            $line = "stream?path=" . urlencode($segmentPath);
                        }
                    } elseif (str_starts_with($trimmed, '#EXT-X-KEY:') || str_starts_with($trimmed, '#EXT-X-MAP:')) {
                        // URI dentro de atributos (se houver)
                        if (preg_match('/URI="([^"]+)"/', $line, $m)) {
                            $uri = $m[1];
                            if (!str_starts_with($uri, 'http') && !str_starts_with($uri, 'stream?')) {
                                $fullUri = ($dir === '.' || $dir === '') ? $uri : "{$dir}/{$uri}";
                                $line = str_replace("URI=\"{$uri}\"", "URI=\"stream?path=" . urlencode($fullUri) . "\"", $line);
                            }
                        }
                    }
                    $rewritten[] = $line;
                }
                $finalContent = implode("\n", $rewritten);

                return response($finalContent, 200, [
                    'Content-Type' => 'application/vnd.apple.mpegurl',
                    'Content-Length' => strlen($finalContent),
                    'Cache-Control' => 'public, max-age=60',
                    'Access-Control-Allow-Origin' => '*',
                    'Access-Control-Allow-Headers' => 'Range, Origin, X-Requested-With, Content-Type, Accept',
                    'Access-Control-Expose-Headers' => 'Content-Range, Content-Length, Accept-Ranges',
                ]);
            }

            $object = $s3->getObject([
                'Bucket' => $bucket,
                'Key' => $key,
            ]);
            $body = $object['Body'];

            return response()->stream(function () use ($body) {
                while (!$body->eof()) {
                    echo $body->read(1024 * 64);
                    if (connection_aborted()) break;
                }
            }, 200, [
                'Content-Type' => $mimeType,
                'Content-Length' => $fileSize,
                'Accept-Ranges' => 'bytes',
                'ETag' => $etag,
                'Cache-Control' => $cacheControl,
                'Access-Control-Allow-Origin' => '*',
                'Access-Control-Allow-Headers' => 'Range, Origin, X-Requested-With, Content-Type, Accept',
                'Access-Control-Expose-Headers' => 'Content-Range, Content-Length, Accept-Ranges',
            ]);
        } catch (\Throwable $e) {
            \Log::error("Erro no streaming de mídia R2 ({$rawPath}): " . $e->getMessage());
            return response()->json(['message' => 'Erro ao reproduzir mídia: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Fallback para requisições de segmentos TS que chegam com caminho relativo (/integrations/media/segment_xxx.ts).
     */
    public function streamR2Segment(Request $request, string $segment)
    {
        $tenantKey = tenancy()->tenant ? tenancy()->tenant->id : 'default';
        $hlsDir = Cache::get("last_hls_dir:{$tenantKey}:" . $request->ip());

        if (!$hlsDir) {
            $recentHls = \App\Models\MediaFile::whereNotNull('hls_path')->latest('updated_at')->first();
            if ($recentHls && !empty($recentHls->hls_path)) {
                $hlsDir = dirname($recentHls->hls_path);
            }
        }

        if ($hlsDir) {
            $segmentPath = "{$hlsDir}/{$segment}";
            $request->merge(['path' => $segmentPath]);
            return $this->streamR2Media($request);
        }

        return response()->json(['message' => 'Segmento não localizado'], 404);
    }

    /**
     * Dispara a transcodificação do vídeo MP4 enviado para HLS adaptativo (.m3u8 + .ts).
     */
    public function transcodeMedia(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'path' => 'required|string',
            'activity_id' => 'nullable|integer',
            'sync' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $sourcePath  = $request->input('path');
        $activityId  = $request->input('activity_id');
        $mediaFileId = $request->input('media_file_id');
        $sync        = (bool) $request->input('sync', false);

        $r2Service = new R2StorageService();
        $sourceKey = $r2Service->extractObjectKey($sourcePath);

        if (empty($sourceKey)) {
            return response()->json(['message' => 'Caminho do vídeo inválido.'], 422);
        }

        $cacheKey = "video_hls_status:" . md5($sourceKey);
        try {
            $this->getHlsCache()->put($cacheKey, [
                'status' => 'processing',
                'source_path' => $sourcePath,
                'started_at' => now()->toIso8601String(),
            ], 86400);
        } catch (\Throwable $e) {
            \Log::warning("Aviso de cache ao iniciar transcode: " . $e->getMessage());
        }

        // Atualizar status na Mediateca
        if ($mediaFileId) {
            try {
                MediaFile::where('id', $mediaFileId)->update(['status' => 'processing']);
            } catch (\Throwable $e) {
                Log::warning("Não foi possível atualizar MediaFile #{$mediaFileId} para processing: " . $e->getMessage());
            }
        }

        $tenantId = tenancy()->tenant ? tenancy()->tenant->id : null;

        // Se solicitado síncrono (ex: ambiente de teste ou vídeos curtos)
        if ($sync) {
            $job = new \App\Jobs\TranscodeVideoHlsJob($sourcePath, $tenantId, $activityId);
            $job->handle();
            $status = $this->getHlsCache()->get($cacheKey, ['status' => 'completed']);
            return response()->json([
                'success' => true,
                'sync' => true,
                'status' => $status['status'] ?? 'ready',
                'data' => $status,
            ]);
        }

        // Execução em background na fila Redis
        \App\Jobs\TranscodeVideoHlsJob::dispatch($sourcePath, $tenantId, $activityId, [], $mediaFileId);

        $dirName = dirname($sourceKey);
        $baseName = pathinfo($sourceKey, PATHINFO_FILENAME);
        $expectedHlsPath = "{$dirName}/hls/{$baseName}/master.m3u8";

        return response()->json([
            'success' => true,
            'status' => 'processing',
            'source_path' => $sourcePath,
            'expected_master_url' => $r2Service->getPublicUrl($expectedHlsPath),
            'cache_key' => md5($sourceKey),
            'message' => 'Transcodificação HLS iniciada em segundo plano.',
        ]);
    }

    /**
     * Retorna a store de cache para status de vídeo (preferência para Redis com suporte a tags).
     */
    protected function getHlsCache()
    {
        try {
            return Cache::store('redis');
        } catch (\Throwable) {
            return Cache::store();
        }
    }

    /**
     * Consulta o status atual da transcodificação HLS de um vídeo.
     */
    public function transcodeStatus(Request $request)
    {
        $rawPath = $request->query('path') ?: $request->query('url') ?: '';
        if (empty($rawPath)) {
            return response()->json(['message' => 'Caminho do vídeo não informado.'], 422);
        }

        $r2Service = new R2StorageService();
        $sourceKey = $r2Service->extractObjectKey($rawPath);
        $cacheKey = "video_hls_status:" . md5($sourceKey);

        $data = null;
        try {
            $data = $this->getHlsCache()->get($cacheKey);
        } catch (\Throwable $e) {
            \Log::warning("Aviso ao ler cache de transcode: " . $e->getMessage());
        }

        if (!$data) {
            // Se o próprio caminho já for .m3u8, já está pronto
            if (str_contains($sourceKey, '.m3u8')) {
                return response()->json([
                    'status' => 'ready',
                    'master_url' => $r2Service->getPublicUrl($sourceKey),
                ]);
            }

            return response()->json([
                'status' => 'unknown',
                'message' => 'Nenhum processamento registrado para este arquivo.',
            ]);
        }

        return response()->json($data);
    }

    /**
     * Retorna a duração em segundos de um vídeo do Ead Control / Cloudflare R2.
     * Busca na Mediateca (media_files), no cache de transcode, ou calcula via manifesto HLS (.m3u8).
     */
    public function mediaDuration(Request $request)
    {
        $rawPath = $request->query('path') ?: $request->query('url') ?: '';
        if (empty($rawPath)) {
            return response()->json(['message' => 'Caminho do vídeo não informado.'], 422);
        }

        $r2Service = new R2StorageService();
        $sourceKey = $r2Service->extractObjectKey($rawPath);

        // Identificador único do vídeo (se for master.m3u8, pega a pasta pai onde fica o nome/UUID do vídeo)
        $fileIdentifier = pathinfo($sourceKey, PATHINFO_FILENAME);
        if (str_contains($sourceKey, '.m3u8')) {
            $parent = basename(dirname($sourceKey));
            if (!empty($parent) && !in_array(strtolower($parent), ['.', 'hls', 'videos', 'video'])) {
                $fileIdentifier = $parent;
            }
        }
        $isGeneric = in_array(strtolower($fileIdentifier), ['master', 'index', 'playlist', 'video', 'videos', 'hls', 'default', '']);

        // 1. Verificar cache de transcodificação recente
        $cacheKey = "video_hls_status:" . md5($sourceKey);
        try {
            $cached = $this->getHlsCache()->get($cacheKey);
            if (!empty($cached['duration']) && (int)$cached['duration'] > 0) {
                return response()->json([
                    'success'  => true,
                    'duration' => (int) $cached['duration'],
                    'source'   => 'cache',
                ]);
            }
        } catch (\Throwable $e) {}

        // 2. Buscar no banco de dados (tabela media_files)
        $mf = MediaFile::where(function($q) use ($sourceKey, $rawPath, $fileIdentifier, $isGeneric) {
            $q->where('storage_path', $sourceKey)
              ->orWhere('hls_path', $sourceKey)
              ->orWhere('public_url', $rawPath)
              ->orWhere('hls_url', $rawPath);
            if (!$isGeneric && strlen($fileIdentifier) > 5) {
                $q->orWhere('storage_path', 'like', "%{$fileIdentifier}%")
                  ->orWhere('hls_path', 'like', "%{$fileIdentifier}%");
            }
        })->first();

        if ($mf && !empty($mf->duration_seconds) && (int)$mf->duration_seconds > 0) {
            return response()->json([
                'success'  => true,
                'duration' => (int) $mf->duration_seconds,
                'source'   => 'media_file',
            ]);
        }

        // 3. Se for ou possuir HLS (.m3u8), calcular instantaneamente a partir do manifesto R2
        $client = $r2Service->getClient();
        $bucket = $r2Service->getBucket();

        if ($client && $bucket) {
            $candidateHlsKeys = [];
            if ($mf && !empty($mf->hls_path)) {
                $candidateHlsKeys[] = $mf->hls_path;
            }
            if (str_contains($sourceKey, '.m3u8')) {
                $candidateHlsKeys[] = $sourceKey;
            }
            if (!$isGeneric) {
                $dir = dirname($sourceKey);
                $candidateHlsKeys[] = "{$dir}/hls/{$fileIdentifier}/master.m3u8";
                $candidateHlsKeys[] = "{$dir}/{$fileIdentifier}/master.m3u8";
            }

            foreach (array_unique($candidateHlsKeys) as $hlsKey) {
                try {
                    $object = $client->getObject([
                        'Bucket' => $bucket,
                        'Key'    => $hlsKey,
                    ]);
                    $content = (string) $object['Body']->getContents();
                    if (str_contains($content, '#EXTINF:')) {
                        preg_match_all('/#EXTINF:([0-9.]+)/', $content, $matches);
                        if (!empty($matches[1])) {
                            $total = array_sum(array_map('floatval', $matches[1]));
                            $sec = (int) round($total);
                            if ($sec > 0) {
                                // Salvar de forma persistente no media_file se existir
                                if ($mf) {
                                    $mf->update(['duration_seconds' => $sec]);
                                }
                                return response()->json([
                                    'success'  => true,
                                    'duration' => $sec,
                                    'source'   => 'hls_manifest',
                                ]);
                            }
                        }
                    }
                } catch (\Throwable $e) {}
            }
        }

        return response()->json([
            'success'  => false,
            'duration' => 0,
            'message'  => 'Duração não encontrada para este arquivo.',
        ]);
    }

    /**
     * Exclui um arquivo de mídia do Cloudflare R2.
     */
    public function deleteR2Media(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        $rawPath = $request->input('path') ?: $request->input('url') ?: '';
        if (empty($rawPath)) {
            return response()->json(['message' => 'Caminho ou URL do arquivo não fornecido'], 422);
        }

        try {
            $r2Service = new R2StorageService();
            if (!$r2Service->isConfigured()) {
                return response()->json(['message' => 'Cloudflare R2 não configurado'], 422);
            }

            $key = $r2Service->extractObjectKey($rawPath);
            if (empty($key) || str_contains($key, '..')) {
                return response()->json(['message' => 'Caminho de arquivo inválido'], 400);
            }

            $success = $r2Service->deleteObject($key);

            return response()->json([
                'success' => $success,
                'message' => $success ? 'Vídeo excluído com sucesso do armazenamento.' : 'Falha ao excluir o vídeo.',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao excluir arquivo: ' . $e->getMessage(),
            ], 500);
        }
    }
}

