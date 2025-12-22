<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\FileStorage;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

/**
 * Controlador FileStorage
 *
 * CRUD para gerenciar uploads de arquivos, persistindo metadados na
 * tabela `posts` com `post_type = 'file_storage'`.
 */
class FileStorageController extends Controller
{
    protected PermissionService $permissionService;
    protected string $post_type = 'file_storage';

    /**
     * Construtor: inicializa o serviço de permissões.
     * EN: Constructor: initialize permission service.
     */
    public function __construct()
    {
        $this->permissionService = new PermissionService();
    }

    /**
     * Converte boolean para post_status.
     * EN: Convert boolean to post_status.
     */
    private function get_status($active)
    {
        return $active ? 'publish' : 'draft';
    }

    /**
     * Converte post_status para boolean.
     * EN: Convert post_status to boolean.
     */
    private function decode_status($post_status)
    {
        return $post_status === 'publish';
    }

    /**
     * Sanitiza strings do payload.
     * EN: Sanitize string inputs.
     */
    private function sanitizeInput(array $data): array
    {
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                $data[$key] = strip_tags($value);
            }
        }
        return $data;
    }

    /**
     * Regras de validação para criação/atualização de arquivo.
     * EN: Validation rules for file metadata and upload.
     *
     * Alterações:
     * - Permite `title` nulo e títulos duplicados.
     * - Se `title` for omitido na criação, será definido a partir do nome
     *   original do arquivo (sem extensão).
     */
    private function rules(bool $isUpdate = false): array
    {
        return [
            'title' => ($isUpdate ? 'sometimes|nullable' : 'nullable') . '|string|max:255',
            'name' => 'nullable|string|max:200',
            'description' => 'nullable|string',
            'active' => 'nullable|boolean',
            // Upload: obrigatório na criação, opcional na atualização
            'file' => ($isUpdate ? 'nullable' : 'required') . '|file|max:20480', // 20MB
        ];
    }

    /**
     * Constrói um caminho público relativo para o arquivo salvo.
     * EN: Build a host-agnostic public relative URL for the stored file.
     *
     * Em ambientes multi-tenant, tenta gerar uma URL pública tenant-aware
     * usando o helper `tenant_asset` quando a tenancy estiver inicializada.
     * Caso contrário, usa `asset()` e, por fim, cai para um path relativo.
     *
     * Retorna preferencialmente uma URL absoluta (tenant-aware) para evitar
     * inconsistências com o symlink de `public/storage` quando o Filesystem
     * é sufixado por tenant. Mantém fallback relativo para robustez.
     * EN: Prefer tenant-aware absolute URL; fallback to asset() or relative
     * path to ensure robustness when tenancy is not initialized.
     */
    /**
     * buildRelativeUrl
     * pt-BR: Gera URL pública tenant-aware para arquivos da disk `public`.
     *        Em ambientes com multi-tenancy ativo (Stancl Tenancy), prioriza
     *        `tenant_asset('storage/<path>')`, que serve arquivos do diretório
     *        `storage_path()` sufixado pelo tenant. Quando a tenancy não está
     *        inicializada, cai para `asset('storage/<path>')` e, por fim, para
     *        um path relativo.
     * en-US: Generates a tenant-aware public URL for files on the `public` disk.
     *        If tenancy is initialized, prefer `tenant_asset('storage/<path>')` so
     *        assets are served from the tenant-suffixed storage. Otherwise fall back
     *        to `asset('storage/<path>')`, and finally to relative path.
     */
    /**
     * buildRelativeUrl
     * pt-BR: Gera URL pública tenant-aware para arquivos no disk `public`.
     *        Quando a tenancy está ativa, usa `tenant_asset(<path>)` sem o
     *        prefixo `storage/`, pois a rota `/tenancy/assets/{path}` já aponta
     *        diretamente para `storage_path('app/public')` do tenant. Quando a
     *        tenancy NÃO está ativa, usa `asset('storage/<path>')`, que depende
     *        do symlink `public/storage` do app central.
     * en-US: Generates a tenant-aware public URL for files on `public` disk.
     *        If tenancy is initialized, use `tenant_asset(<path>)` WITHOUT a
     *        `storage/` prefix because `/tenancy/assets/{path}` maps directly to
     *        `storage_path('app/public')` for the active tenant. If tenancy is
     *        NOT initialized, use `asset('storage/<path>')`, relying on the
     *        central app's `public/storage` symlink.
     */
    private function buildRelativeUrl(string $path): string
    {
        $cleanPath = ltrim($path, '/');
        $publicStoragePrefixed = 'storage/' . $cleanPath; // usado apenas para asset()
        try {
            // Preferir tenant_asset quando tenancy estiver ativa
            if (\function_exists('tenant_asset')) {
                try {
                    $initialized = false;
                    try {
                        $initialized = (bool) (tenancy()->initialized ?? (tenancy()->tenant ? true : false));
                    } catch (\Throwable $e) {
                        $initialized = false;
                    }
                    if ($initialized) {
                        // Importante: NUNCA prefixe com 'storage/' aqui
                        // A rota '/tenancy/assets/{path}' já aponta para storage/app/public
                        return tenant_asset($cleanPath);
                    }
                } catch (\Throwable $e) {
                    // Ignorar e seguir para fallback
                }
            }
            // Fallback: asset() absoluto baseado no host atual
            return asset($publicStoragePrefixed);
        } catch (\Throwable $e) {
            // Último fallback: path relativo
            return '/' . $publicStoragePrefixed;
        }
    }

    /**
     * Mapeia um registro FileStorage (post) para formato frontend.
     * EN: Map a FileStorage record to frontend payload shape.
     */
    private function map_file(FileStorage $item): array
    {
        $config = $item->config ?? [];
        // Resolve a URL pública de forma independente de host.
        // Preferimos gerar a URL a partir do `config.file.path` via `buildRelativeUrl()`
        // para evitar persistir/retornar domínios absolutos.
        $resolvedUrl = null;
        if (!empty($config['file']['path'])) {
            $resolvedUrl = $this->buildRelativeUrl($config['file']['path']);
        } else {
            $resolvedUrl = $item->guid ?: ($config['file']['url'] ?? null);
        }
        return [
            'id' => $item->ID,
            'title' => $item->post_title,
            'name' => $item->post_name,
            'description' => $item->post_excerpt,
            'active' => $this->decode_status($item->post_status),
            'mime' => $item->post_mime_type,
            'url' => $resolvedUrl,
            'file' => $config['file'] ?? null,
            'created_at' => $item->created_at,
            'updated_at' => $item->updated_at,
        ];
    }

    /**
     * Lista arquivos armazenados com filtros.
     * EN: List stored files with filters.
     *
     * Query params:
     * - q/search: full-text on title, excerpt, name
     * - title: filter by exact/partial title
     * - mime: filter by post_mime_type
     * - ext: filter by file extension (from config.file.ext)
     * - active: boolean; true=publish, false=draft
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('view')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $perPage = $request->input('per_page', 10);
        $order_by = $request->input('order_by', 'created_at');
        $order = $request->input('order', 'desc');

        $query = FileStorage::query()->orderBy($order_by, $order);
        // Full-text search (q/search)
        $qText = $request->get('q') ?? $request->get('search');
        if ($qText) {
            $query->where(function($q) use ($qText){
                $q->where('post_title', 'like', "%{$qText}%")
                  ->orWhere('post_excerpt', 'like', "%{$qText}%")
                  ->orWhere('post_name', 'like', "%{$qText}%");
            });
        }
        // Filter by title
        if ($title = $request->get('title')) {
            $query->where('post_title', 'like', "%{$title}%");
        }
        // Filter by mime type
        if ($mime = $request->get('mime')) {
            $query->where('post_mime_type', 'like', "%{$mime}%");
        }
        // Filter by extension via JSON in config
        if ($ext = $request->get('ext')) {
            $query->where('config', 'like', '%"ext":"' . addslashes($ext) . '"%');
        }
        // Filter by active status
        if (!is_null($request->get('active'))) {
            $active = filter_var($request->get('active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if (!is_null($active)) {
                $query->where('post_status', $active ? 'publish' : 'draft');
            }
        }
        /**
         * pt-BR: Inclui domínio tenant-aware na resposta (campo `url`) e também
         *        um campo auxiliar `relative_url` sem host. Assim, clientes
         *        podem usar a URL absoluta quando necessário e ainda ter o
         *        caminho relativo disponível para cenários específicos.
         * en-US: Include tenant-aware absolute domain in `url` and also provide
         *        `relative_url` (host-agnostic). Clients can use absolute URL
         *        when needed while retaining a relative path for specific cases.
         */
        $items = $query->paginate($perPage);
        $items->getCollection()->transform(function ($item) {
            $payload = $this->map_file($item);
            // Preferir derivar ambos (absolute + relative) via file path quando disponível
            $path = $payload['file']['path'] ?? null;
            if ($path) {
                // URL absoluta, tenant-aware
                $payload['url'] = $this->buildRelativeUrl($path);
                // URL relativa (sem host)
                $payload['relative_url'] = '/' . ltrim('storage/' . ltrim($path, '/'), '/');
                // Normaliza também o campo de arquivo
                $payload['file']['url'] = $this->buildRelativeUrl($path);
                $payload['file']['relative_url'] = '/' . ltrim('storage/' . ltrim($path, '/'), '/');
                return $payload;
            }
            // Fallback: extrai apenas o path da URL existente
            $u = $payload['url'] ?? null;
            if ($u) {
                $p = parse_url($u, PHP_URL_PATH) ?: $u;
                // Mantém `url` como está (pode já ser absoluta) e inclui relativa
                $payload['relative_url'] = '/' . ltrim($p, '/');
            }
            // Fallback para normalização de file.url quando não há path
            $fu = $payload['file']['url'] ?? null;
            if ($fu) {
                $fp = parse_url($fu, PHP_URL_PATH) ?: $fu;
                $payload['file']['relative_url'] = '/' . ltrim($fp, '/');
                // Se houver file.path, monta absoluta tenant-aware
                $fpath = $payload['file']['path'] ?? null;
                if ($fpath) {
                    $payload['file']['url'] = $this->buildRelativeUrl($fpath);
                }
            }
            return $payload;
        });
        return response()->json($items);
    }

    /**
     * Cria um novo registro de arquivo com upload.
     * EN: Create a new file record with upload.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('create')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $validator = Validator::make($request->all(), $this->rules());
        if ($validator->fails()) {
            return response()->json(['message' => 'Erro de validação', 'errors' => $validator->errors()], 422);
        }
        $v = $validator->validated();

        // Upload de arquivo obrigatório
        $file = $request->file('file');
        $path = $file->store('file-storage', 'public');
        /**
         * Persistência sem host
         * pt-BR: Armazena apenas a URL relativa (sem domínio) para evitar
         *        problemas ao mudar o host. A leitura usa buildRelativeUrl($path)
         *        para gerar a URL pública correta, incluindo tenant quando ativo.
         * en-US: Persist only host-agnostic relative URL; reading uses
         *        buildRelativeUrl($path) to produce the correct public URL,
         *        tenant-aware when active.
         */
        $relativeUrl = '/' . ltrim('storage/' . ltrim($path, '/'), '/');

        // Definir título automaticamente quando omitido
        $derivedTitle = $v['title'] ?? pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        // Base para slug: name informado, senão título derivado
        $slugBase = $v['name'] ?? $derivedTitle;

        // Mapear campos principais
        $mapped = [
            'post_title' => $derivedTitle,
            'post_excerpt' => $v['description'] ?? '',
            'post_status' => $this->get_status($v['active'] ?? true),
            'post_content' => json_encode([
                'notes' => $v['description'] ?? null,
            ]),
            'post_mime_type' => $file->getClientMimeType(),
            // Grava somente URL relativa (sem host)
            // EN: Store relative URL only (host-agnostic)
            'guid' => $relativeUrl,
        ];
        // slug
        $mapped['post_name'] = (new FileStorage())->generateSlug($slugBase);

        // Config com metadados do arquivo
        $config = [
            'file' => [
                'path' => $path,
                // Armazena a URL relativa (sem host)
                // EN: Store relative URL (no host)
                'url' => $relativeUrl,
                'original' => $file->getClientOriginalName(),
                'mime' => $file->getClientMimeType(),
                'size' => $file->getSize(),
                'ext' => $file->getClientOriginalExtension(),
            ],
        ];

        $mapped['config'] = $config;
        $mapped['post_type'] = $this->post_type;
        $mapped['token'] = Qlib::token();
        $mapped['post_author'] = $user->id;
        $mapped['comment_status'] = 'closed';
        $mapped['ping_status'] = 'closed';
        $mapped['menu_order'] = 0;
        $mapped['to_ping'] = 's';
        $mapped['excluido'] = 'n';
        $mapped['deletado'] = 'n';

        $mapped = $this->sanitizeInput($mapped);
        $item = FileStorage::create($mapped);
        return response()->json([
            'data' => $this->map_file($item),
            'message' => 'Arquivo enviado e registrado com sucesso',
            'status' => 201,
        ], 201);
    }

    /**
     * Exibe um arquivo específico.
     * EN: Show a specific file record.
     */
    public function show(string $id)
    {
        $user = request()->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('view')) { return response()->json(['error' => 'Acesso negado'], 403); }
        $item = FileStorage::findOrFail($id);
        return response()->json($this->map_file($item));
    }

    /**
     * Atualiza metadados e, opcionalmente, substitui o arquivo.
     * EN: Update metadata and optionally replace file.
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('edit')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $item = FileStorage::findOrFail($id);

        $validator = Validator::make($request->all(), $this->rules(true));
        if ($validator->fails()) {
            return response()->json(['exec' => false, 'message' => 'Erro de validação', 'errors' => $validator->errors()], 422);
        }
        $v = $validator->validated();

        $mapped = [];
        if (array_key_exists('title', $v)) $mapped['post_title'] = $v['title'];
        if (array_key_exists('description', $v)) $mapped['post_excerpt'] = $v['description'] ?? '';
        if (array_key_exists('active', $v)) $mapped['post_status'] = $this->get_status($v['active']);
        if (array_key_exists('name', $v) && !empty($v['name'])) {
            $mapped['post_name'] = (new FileStorage())->generateSlug($v['name']);
        }

        $config = $item->config ?? [];

        // Se substituir o arquivo, atualiza metadados e GUID
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store('file-storage', 'public');
            /**
             * Persistência sem host
             * pt-BR: Armazena somente URL relativa; leitura gera URL pública
             *        via buildRelativeUrl($path) (tenant-aware quando ativo).
             * en-US: Store only relative URL; reading builds public URL via
             *        buildRelativeUrl($path) (tenant-aware when active).
             */
            $relativeUrl = '/' . ltrim('storage/' . ltrim($path, '/'), '/');
            $config['file'] = [
                'path' => $path,
                'url' => $relativeUrl,
                'original' => $file->getClientOriginalName(),
                'mime' => $file->getClientMimeType(),
                'size' => $file->getSize(),
                'ext' => $file->getClientOriginalExtension(),
            ];
            $mapped['guid'] = $relativeUrl;
            $mapped['post_mime_type'] = $file->getClientMimeType();
        }

        $mapped['config'] = $config;
        $mapped['post_type'] = $this->post_type;
        $mapped = $this->sanitizeInput($mapped);
        $item->update($mapped);

        return response()->json([
            'exec' => true,
            'data' => $this->map_file($item->fresh()),
            'message' => 'Arquivo atualizado com sucesso',
            'status' => 200,
        ]);
    }

    /**
     * Remove (soft delete) um arquivo.
     * EN: Soft-delete a file record.
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('delete')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $item = FileStorage::find($id);
        if (!$item) { return response()->json(['message' => 'Arquivo não encontrado', 'status' => 404], 404); }
        if ($item->excluido === 's') { return response()->json(['message' => 'Arquivo já excluído', 'status' => 400], 400); }
        $item->update([
            'excluido' => 's',
            'reg_excluido' => json_encode([
                'excluido_por' => $user->id,
                'excluido_em' => now()->toDateTimeString(),
                'motivo' => 'Exclusão via API',
            ]),
        ]);
        return response()->json(['exec' => true, 'message' => 'Arquivo excluído com sucesso', 'status' => 200]);
    }

    /**
     * Lista registros na lixeira.
     * EN: List trashed file records.
     */
    public function trash(Request $request)
    {
        $user = request()->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('view')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $perPage = $request->input('per_page', 10);
        $order_by = $request->input('order_by', 'updated_at');
        $order = $request->input('order', 'desc');

        $items = FileStorage::withoutGlobalScope('notDeleted')
            ->where(function($q){ $q->where('excluido','s')->orWhere('deletado','s'); })
            ->orderBy($order_by, $order)
            ->paginate($perPage);
        $items->getCollection()->transform(fn ($item) => $this->map_file($item));
        return response()->json($items);
    }

    /**
     * Restaura registro da lixeira.
     * EN: Restore file record from trash.
     */
    public function restore(string $id)
    {
        $user = request()->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('edit')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $item = FileStorage::withoutGlobalScope('notDeleted')
            ->where('ID', $id)
            ->where(function($q){ $q->where('excluido','s')->orWhere('deletado','s'); })
            ->first();
        if (!$item) { return response()->json(['message' => 'Arquivo não encontrado na lixeira', 'status' => 404], 404); }
        $item->update([
            'excluido' => 'n',
            'deletado' => 'n',
            'reg_excluido' => null,
            'reg_deletado' => null,
        ]);
        return response()->json(['exec' => true, 'message' => 'Arquivo restaurado com sucesso', 'status' => 200]);
    }

    /**
     * Exclui definitivamente um registro.
     * EN: Permanently delete a file record.
     */
    public function forceDelete(string $id)
    {
        $user = request()->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('delete')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $item = FileStorage::withoutGlobalScope('notDeleted')
            ->where('ID', $id)
            ->where(function($q){ $q->where('excluido','s')->orWhere('deletado','s'); })
            ->first();
        if (!$item) { return response()->json(['message' => 'Arquivo não encontrado na lixeira', 'status' => 404], 404); }
        $item->forceDelete();
        return response()->json(['exec' => true, 'message' => 'Arquivo excluído permanentemente', 'status' => 200]);
    }

    /**
     * Download de arquivo com nome original.
     * EN: Download file using original filename.
     */
    public function download(string $id)
    {
        $user = request()->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('view')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $item = FileStorage::find($id);
        if (!$item) { return response()->json(['message' => 'Arquivo não encontrado', 'status' => 404], 404); }
        $file = $item->config['file'] ?? null;
        $path = $file['path'] ?? null;
        $original = $file['original'] ?? ($item->post_name ?: 'download');
        if (!$path || !Storage::disk('public')->exists($path)) {
            return response()->json(['message' => 'Arquivo físico não encontrado', 'status' => 404], 404);
        }
        // Forçar download com nome original
        return Storage::disk('public')->download($path, $original);
    }
}