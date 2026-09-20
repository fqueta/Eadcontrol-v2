<?php

namespace App\Http\Controllers\api;

use App\Models\MediaFile;
use App\Services\Media\R2StorageService;
use App\Services\Media\Storage\R2MediaStorageAdapter;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class MediaFileController extends Controller
{
    /**
     * Lista os vídeos do tenant com paginação, filtros e busca.
     */
    public function index(Request $request)
    {
        $query = MediaFile::query()->orderBy('created_at', 'desc');

        // Filtro por status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Apenas órfãos
        if ($request->boolean('orphans')) {
            $query->orphans();
        }

        // Busca por nome
        if ($request->filled('search')) {
            $query->where('original_name', 'like', '%' . $request->search . '%');
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        $items = $query->paginate($perPage);

        return response()->json([
            'data' => $items->map(fn($f) => $this->formatMediaFile($f)),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page'    => $items->lastPage(),
                'per_page'     => $items->perPage(),
                'total'        => $items->total(),
            ],
        ]);
    }

    /**
     * Retorna detalhes de um vídeo específico.
     */
    public function show(int $id)
    {
        $mediaFile = MediaFile::findOrFail($id);
        return response()->json($this->formatMediaFile($mediaFile));
    }

    /**
     * Exclui o vídeo do banco e do Cloudflare R2 (arquivo original + pasta HLS).
     */
    public function destroy(int $id)
    {
        $mediaFile = MediaFile::findOrFail($id);
        $r2 = new R2StorageService();
        $adapter = new R2MediaStorageAdapter($r2);

        // Remover arquivo original
        if ($mediaFile->storage_path) {
            $r2->deleteObject($mediaFile->storage_path);
        }

        // Remover pasta HLS (master.m3u8 + segmentos .ts + thumbnail.jpg)
        if ($mediaFile->hls_path) {
            $hlsDir = dirname($mediaFile->hls_path);
            $adapter->deleteDirectory($hlsDir);
        }

        $mediaFile->delete();

        return response()->json(['success' => true, 'message' => 'Vídeo excluído do armazenamento e do registro.']);
    }

    /**
     * Vincula um vídeo existente a uma atividade (reutilização na Mediateca).
     */
    public function link(Request $request, int $id)
    {
        $request->validate([
            'activity_id' => 'nullable|integer',
        ]);

        $mediaFile = MediaFile::findOrFail($id);
        $mediaFile->linked_activity_id = $request->input('activity_id');
        $mediaFile->save();

        return response()->json([
            'success'    => true,
            'media_file' => $this->formatMediaFile($mediaFile),
        ]);
    }

    /**
     * Atualiza configurações do vídeo (ex: allow_download).
     */
    public function update(Request $request, int $id)
    {
        $request->validate([
            'allow_download' => 'sometimes|boolean',
            'original_name'  => 'sometimes|string|max:255',
        ]);

        $mediaFile = MediaFile::findOrFail($id);

        if ($request->has('allow_download')) {
            $mediaFile->allow_download = $request->boolean('allow_download');
        }
        if ($request->filled('original_name')) {
            $mediaFile->original_name = $request->input('original_name');
        }

        $mediaFile->save();

        return response()->json([
            'success'    => true,
            'media_file' => $this->formatMediaFile($mediaFile),
        ]);
    }

    /**
     * Estatísticas gerais da mediateca do tenant.
     */
    public function stats()
    {
        $total       = MediaFile::count();
        $orphans     = MediaFile::orphans()->count();
        $linked      = $total - $orphans;
        $ready       = MediaFile::where('status', 'ready')->count();
        $processing  = MediaFile::where('status', 'processing')->count();
        $failed      = MediaFile::where('status', 'failed')->count();
        $totalBytes  = MediaFile::sum('size_bytes');
        $orphanBytes = MediaFile::orphans()->sum('size_bytes');

        return response()->json([
            'total'        => $total,
            'orphans'      => $orphans,
            'linked'       => $linked,
            'ready'        => $ready,
            'processing'   => $processing,
            'failed'       => $failed,
            'total_bytes'  => $totalBytes,
            'orphan_bytes' => $orphanBytes,
            'total_size'   => $this->formatBytes($totalBytes),
            'orphan_size'  => $this->formatBytes($orphanBytes),
        ]);
    }

    /**
     * Varre o Cloudflare R2 em busca de vídeos não registrados e os importa.
     */
    public function scan(Request $request)
    {
        $r2 = new R2StorageService();

        if (!$r2->isConfigured()) {
            return response()->json([
                'success' => false,
                'message' => 'Cloudflare R2 não está configurado neste tenant.',
            ], 422);
        }

        $client      = $r2->getClient();
        $bucket      = $r2->getBucket();
        $tenantId    = tenancy()->tenant?->id ?? 'default';
        $prefix      = "{$tenantId}/videos/";

        $imported   = 0;
        $skipped    = 0;
        $discovered = [];

        try {
            // Listar todos os objetos no prefixo de vídeos do tenant
            $paginator = $client->getPaginator('ListObjectsV2', [
                'Bucket' => $bucket,
                'Prefix' => $prefix,
            ]);

            // Coletar todos os arquivos MP4 e pastas HLS
            $mp4Files = [];
            $hlsFolders = [];

            foreach ($paginator as $page) {
                foreach ($page['Contents'] ?? [] as $object) {
                    $key = $object['Key'];
                    $size = $object['Size'];

                    // Coletar MP4s originais (excluindo pastas HLS)
                    if (preg_match('/\.mp4$/i', $key) && !str_contains($key, '/hls/')) {
                        $mp4Files[$key] = $size;
                    }

                    // Detectar pastas HLS (master.m3u8)
                    if (preg_match('/\/hls\/([^\/]+)\/master\.m3u8$/i', $key, $m)) {
                        // key: tenant/videos/hls/uuid/master.m3u8
                        $hlsFolders[$key] = $r2->getPublicUrl($key);
                    }
                }
            }

            // Para cada MP4 encontrado, verificar se já está registrado
            foreach ($mp4Files as $key => $sizeBytes) {
                $exists = MediaFile::where('storage_path', $key)->orWhere('storage_path', 'LIKE', "%{$key}")->exists();

                if ($exists) {
                    $skipped++;
                    continue;
                }

                // Extrair nome original do caminho (último segmento)
                $filename = basename($key);

                // Verificar se existe pasta HLS correspondente
                $baseName    = pathinfo($key, PATHINFO_FILENAME);
                $dirName     = dirname($key);
                $hlsKey      = "{$dirName}/hls/{$baseName}/master.m3u8";
                $hasHls      = array_key_exists($hlsKey, $hlsFolders);
                $hlsUrl      = $hasHls ? $hlsFolders[$hlsKey] : null;

                $mediaFile = MediaFile::create([
                    'user_id'         => null,
                    'original_name'   => $filename,
                    'storage_path'    => $key,
                    'hls_path'        => $hasHls ? $hlsKey : null,
                    'public_url'      => $r2->getPublicUrl($key),
                    'hls_url'         => $hlsUrl,
                    'size_bytes'      => $sizeBytes,
                    'status'          => $hasHls ? 'ready' : 'uploaded',
                    'config'          => ['source' => 'r2_scan'],
                ]);

                $imported++;
                $discovered[] = $this->formatMediaFile($mediaFile);
            }

            Log::info("MediaFile Scan: {$imported} importados, {$skipped} já registrados.");

            return response()->json([
                'success'    => true,
                'imported'   => $imported,
                'skipped'    => $skipped,
                'discovered' => $discovered,
                'message'    => "{$imported} vídeo(s) importado(s) do armazenamento Ead Control.",
            ]);
        } catch (\Throwable $e) {
            Log::error('MediaFile Scan error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erro ao varrer o armazenamento: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Gera uma URL de download temporária (5 min) para o aluno/admin baixar o vídeo.
     */
    public function download(int $id)
    {
        $mediaFile = MediaFile::findOrFail($id);

        if (!$mediaFile->allow_download) {
            return response()->json(['message' => 'Download não habilitado para este vídeo.'], 403);
        }

        $r2     = new R2StorageService();
        $client = $r2->getClient();
        $bucket = $r2->getBucket();

        if (!$client || !$bucket || !$mediaFile->storage_path) {
            return response()->json(['message' => 'Não foi possível gerar o link de download.'], 500);
        }

        try {
            $key = $r2->extractObjectKey($mediaFile->storage_path);
            $cmd = $client->getCommand('GetObject', [
                'Bucket'                     => $bucket,
                'Key'                        => $key,
                'ResponseContentDisposition' => 'attachment; filename="' . ($mediaFile->original_name ?? 'video.mp4') . '"',
            ]);

            $presignedRequest = $client->createPresignedRequest($cmd, '+5 minutes');
            $downloadUrl      = (string) $presignedRequest->getUri();

            // Registrar o download
            $mediaFile->increment('download_count');

            Log::info("Download autorizado para MediaFile #{$id} por usuário " . (Auth::id() ?? 'anônimo'));

            return response()->json([
                'success'      => true,
                'download_url' => $downloadUrl,
                'filename'     => $mediaFile->original_name ?? 'video.mp4',
                'expires_in'   => 300, // 5 minutos
            ]);
        } catch (\Throwable $e) {
            Log::error("Erro ao gerar link de download para MediaFile #{$id}: " . $e->getMessage());
            return response()->json(['message' => 'Erro ao gerar link de download.'], 500);
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    protected function formatMediaFile(MediaFile $f): array
    {
        return [
            'id'                  => $f->id,
            'user_id'             => $f->user_id,
            'original_name'       => $f->original_name,
            'storage_path'        => $f->storage_path,
            'hls_path'            => $f->hls_path,
            'public_url'          => $f->public_url,
            'hls_url'             => $f->hls_url,
            'thumbnail_url'       => $f->thumbnail_url,
            'effective_stream_url' => $f->effective_stream_url,
            'mime_type'           => $f->mime_type,
            'size_bytes'          => $f->size_bytes,
            'formatted_size'      => $f->formatted_size,
            'duration_seconds'    => $f->duration_seconds,
            'formatted_duration'  => $f->formatted_duration,
            'status'              => $f->status,
            'is_ready'            => $f->is_ready,
            'is_orphan'           => $f->is_orphan,
            'linked_activity_id'  => $f->linked_activity_id,
            'allow_download'      => $f->allow_download,
            'download_count'      => $f->download_count,
            'config'              => $f->config,
            'created_at'          => $f->created_at?->toIso8601String(),
            'updated_at'          => $f->updated_at?->toIso8601String(),
        ];
    }

    protected function formatBytes(int $bytes): string
    {
        if ($bytes === 0) return '0 B';
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $i = (int) floor(log($bytes, 1024));
        return round($bytes / pow(1024, $i), 2) . ' ' . ($units[$i] ?? 'B');
    }
}
