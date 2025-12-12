<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\FileStorage;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class ActivityController extends Controller
{
    protected PermissionService $permissionService;
    protected string $post_type = 'activities';

    /**
     * Construtor: inicializa serviço de permissão.
     * EN: Constructor: initialize permission service.
     */
    public function __construct()
    {
        $this->permissionService = new PermissionService();
    }

    /**
     * Constrói uma URL pública tenant-aware para arquivos armazenados.
     * EN: Build a tenant-aware public URL for stored files.
     *
     * Usa `tenant_asset('storage/<path>')` quando tenancy estiver ativa, caindo
     * para `asset()` e, por fim, para um path relativo, garantindo funcionamento
     * consistente em ambientes de desenvolvimento e produção.
     */
    /**
     * buildTenantAssetUrl
     * pt-BR: Gera URL pública tenant-aware para arquivos no disk `public`.
     *        Quando a tenancy está ativa, usa `tenant_asset(<path>)` sem o
     *        prefixo `storage/`, pois a rota `/tenancy/assets/{path}` já aponta
     *        para `storage_path('app/public')` do tenant. Quando a tenancy NÃO
     *        está ativa, usa `asset('storage/<path>')`, que depende do symlink
     *        `public/storage` no app central.
     * en-US: Generates a tenant-aware public URL for files on `public` disk.
     *        If tenancy is initialized, use `tenant_asset(<path>)` WITHOUT a
     *        `storage/` prefix because `/tenancy/assets/{path}` maps directly to
     *        `storage_path('app/public')` for the active tenant. If tenancy is
     *        NOT initialized, use `asset('storage/<path>')`, relying on the
     *        central app's `public/storage` symlink.
     */
    private function buildTenantAssetUrl(string $path): string
    {
        $cleanPath = ltrim($path, '/');
        $publicStoragePrefixed = 'storage/' . $cleanPath; // usado apenas para asset()
        try {
            if (\function_exists('tenant_asset')) {
                try {
                    $initialized = false;
                    try { $initialized = (bool) (tenancy()->initialized ?? (tenancy()->tenant ? true : false)); } catch (\Throwable $e) { $initialized = false; }
                    if ($initialized) {
                        // Não prefixar com 'storage/' aqui; rota aponta para storage/app/public
                        return tenant_asset($cleanPath);
                    }
                } catch (\Throwable $e) { /* ignore */ }
            }
            return asset($publicStoragePrefixed);
        } catch (\Throwable $e) {
            return '/' . $publicStoragePrefixed;
        }
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
     * Regras de validação do payload de atividades.
     * EN: Validation rules for activities payload.
     */
    private function rules(bool $isUpdate = false): array
    {
        /**
         * Validações para upload de apostilas/documentos.
         * EN: Validations for booklet/document uploads.
         * - mimes: pdf, doc, docx, odt, txt
         * - max: 10240 KB (10 MB)
         */
        return [
            'title' => ($isUpdate ? 'sometimes|required' : 'required') . '|string|max:255',
            'name' => 'nullable|string|max:200',
            'type_duration' => 'nullable|string|max:50',
            'type_activities' => 'required|string|in:video,document,quiz',
            'duration' => 'nullable|string|max:100',
            'content' => 'nullable', // pode ser URL, texto longo ou JSON
            'description' => 'nullable|string',
            'active' => 'nullable|boolean',
            'file' => 'nullable|file|mimes:pdf,doc,docx,odt,txt|max:10240',
            // Referência opcional a um arquivo previamente salvo em file_storage
            // EN: Optional reference to a previously saved file in file_storage
            'file_storage_id' => 'nullable|integer',
        ];
    }

    /**
     * Mapeia um registro Activity (post) para o formato esperado.
     * EN: Map an Activity record to frontend payload shape.
     */
    private function map_activity(Activity $item): array
    {
        $config = $item->config ?? [];
        // Determina URL pública quando tipo é documento
        $publicUrl = null;
        if (isset($config['type_activities']) && $config['type_activities'] === 'document') {
            $publicUrl = $config['document']['url'] ?? null;
        }
        return [
            'id' => $item->ID,
            'title' => $item->post_title,
            'name' => $item->post_name,
            'type_duration' => $config['type_duration'] ?? null,
            'type_activities' => $config['type_activities'] ?? null,
            'duration' => $config['duration'] ?? null,
            'content' => $item->post_content,
            'description' => $item->post_excerpt,
            'active' => $this->decode_status($item->post_status),
            'document' => $config['document'] ?? null,
            'url' => $publicUrl,
            'video_urls' => $config['video_urls'] ?? null,
            'created_at' => $item->created_at,
            'updated_at' => $item->updated_at,
        ];
    }

    /**
     * Lista atividades.
     * EN: List activities.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('view')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $perPage = $request->input('per_page', 10);
        $order_by = $request->input('order_by', 'created_at');
        $order = $request->input('order', 'desc');

        $query = Activity::query()->orderBy($order_by, $order);
        if ($search = $request->get('search')) {
            $query->where(function($q) use ($search){
                $q->where('post_title', 'like', "%{$search}%")
                  ->orWhere('post_content', 'like', "%{$search}%")
                  ->orWhere('post_excerpt', 'like', "%{$search}%")
                  ->orWhere('post_name', 'like', "%{$search}%");
            });
        }
        $items = $query->paginate($perPage);
        $items->getCollection()->transform(fn ($item) => $this->map_activity($item));
        return response()->json($items);
    }

    /**
     * Cria uma nova atividade.
     * EN: Create a new activity.
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
        $validated = $validator->validated();

        // Impedir duplicidade na lixeira
        $existingDeleted = Activity::withoutGlobalScope('notDeleted')
            ->where('post_title', $validated['title'])
            ->where(function($q){ $q->where('excluido','s')->orWhere('deletado','s'); })
            ->first();
        if ($existingDeleted) {
            return response()->json(['message' => 'Já existe uma atividade excluída com este título.', 'error' => 'duplicate_title'], 409);
        }

        // Mapear campos principais
        $mapped = [
            'post_title' => $validated['title'],
            'post_content' => is_string($validated['content'] ?? '') ? ($validated['content'] ?? '') : json_encode($validated['content'] ?? ''),
            'post_excerpt' => $validated['description'] ?? '',
            'post_status' => $this->get_status($validated['active'] ?? true),
        ];
        // slug
        $mapped['post_name'] = (new Activity())->generateSlug($validated['name'] ?? $validated['title']);

        // Config comum
        $config = [
            'type_duration' => $validated['type_duration'] ?? null,
            'type_activities' => $validated['type_activities'],
            'duration' => $validated['duration'] ?? null,
        ];

        // Tipo de atividade específico
        if ($validated['type_activities'] === 'video') {
            // content pode ser URL única ou array de URLs
            $content = $validated['content'] ?? null;
            if (is_array($content)) {
                $config['video_urls'] = $content;
            } elseif (is_string($content) && !empty($content)) {
                $config['video_urls'] = [$content];
            }
            $mapped['post_mime_type'] = 'video';
        } elseif ($validated['type_activities'] === 'document') {
            /**
             * Documento: permite
             * 1) Upload direto (file)
             * 2) Referência a um arquivo existente (file_storage_id)
             */
            if ($request->hasFile('file')) {
                // Upload direto
                $file = $request->file('file');
                $path = $file->store('activities/documents', 'public');
                $config['document'] = [
                    'path' => $path,
                    'url' => $this->buildTenantAssetUrl($path),
                    'original' => $file->getClientOriginalName(),
                    'mime' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                ];
                $mapped['post_mime_type'] = $file->getClientMimeType();
            } elseif (!empty($validated['file_storage_id'])) {
                // Referência a file_storage
                $ref = FileStorage::find($validated['file_storage_id']);
                if (!$ref) {
                    return response()->json([
                        'message' => 'Arquivo de referência não encontrado',
                        'errors' => ['file_storage_id' => ['invalid reference']]
                    ], 422);
                }
                $refFile = $ref->config['file'] ?? null;
                if (!$refFile || empty($refFile['url'])) {
                    return response()->json([
                        'message' => 'Arquivo de referência sem metadados válidos',
                        'errors' => ['file_storage_id' => ['missing metadata']]
                    ], 422);
                }
                $config['document'] = [
                    'path' => $refFile['path'] ?? null,
                    'url' => $refFile['url'],
                    'original' => $refFile['original'] ?? null,
                    'mime' => $refFile['mime'] ?? null,
                    'size' => $refFile['size'] ?? null,
                    'ext' => $refFile['ext'] ?? null,
                    'source_id' => $ref->ID,
                ];
                $mapped['post_mime_type'] = $ref->post_mime_type ?? ($refFile['mime'] ?? 'document');
            } else {
                $mapped['post_mime_type'] = 'document';
            }
        } elseif ($validated['type_activities'] === 'quiz') {
            // conteúdo pode ser JSON com questões
            $mapped['post_mime_type'] = 'application/json';
        }

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
        $item = Activity::create($mapped);
        return response()->json([
            'data' => $this->map_activity($item),
            'message' => 'Atividade criada com sucesso',
            'status' => 201,
        ], 201);
    }

    /**
     * Exibe uma atividade específica.
     * EN: Show a specific activity.
     */
    public function show(string $id)
    {
        $user = request()->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('view')) { return response()->json(['error' => 'Acesso negado'], 403); }
        $item = Activity::findOrFail($id);
        return response()->json($this->map_activity($item));
    }

    /**
     * Atualiza uma atividade existente.
     * EN: Update an existing activity.
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('edit')) { return response()->json(['error' => 'Acesso negado'], 403); }
        $item = Activity::findOrFail($id);

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
            $mapped['post_name'] = (new Activity())->generateSlug($v['name']);
        }
        if (array_key_exists('content', $v)) {
            $mapped['post_content'] = is_string($v['content'] ?? '') ? ($v['content'] ?? '') : json_encode($v['content'] ?? '');
        }

        $config = $item->config ?? [];
        if (array_key_exists('type_duration', $v)) $config['type_duration'] = $v['type_duration'];
        if (array_key_exists('type_activities', $v)) $config['type_activities'] = $v['type_activities'];
        if (array_key_exists('duration', $v)) $config['duration'] = $v['duration'];

        // Atualizações específicas por tipo
        $type = $config['type_activities'] ?? null;
        if ($type === 'video' && array_key_exists('content', $v)) {
            $content = $v['content'];
            if (is_array($content)) { $config['video_urls'] = $content; }
            elseif (is_string($content) && !empty($content)) { $config['video_urls'] = [$content]; }
            $mapped['post_mime_type'] = 'video';
        }
        if ($type === 'document') {
            /**
             * Documento: permite substituir por upload ou apontar para file_storage.
             */
            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $path = $file->store('activities/documents', 'public');
                $config['document'] = [
                    'path' => $path,
                    'url' => $this->buildTenantAssetUrl($path),
                    'original' => $file->getClientOriginalName(),
                    'mime' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                ];
                $mapped['post_mime_type'] = $file->getClientMimeType();
            } elseif (array_key_exists('file_storage_id', $v) && !empty($v['file_storage_id'])) {
                $ref = FileStorage::find($v['file_storage_id']);
                if (!$ref) {
                    return response()->json([
                        'message' => 'Arquivo de referência não encontrado',
                        'errors' => ['file_storage_id' => ['invalid reference']]
                    ], 422);
                }
                $refFile = $ref->config['file'] ?? null;
                if (!$refFile || empty($refFile['url'])) {
                    return response()->json([
                        'message' => 'Arquivo de referência sem metadados válidos',
                        'errors' => ['file_storage_id' => ['missing metadata']]
                    ], 422);
                }
                $config['document'] = [
                    'path' => $refFile['path'] ?? null,
                    'url' => $refFile['url'],
                    'original' => $refFile['original'] ?? null,
                    'mime' => $refFile['mime'] ?? null,
                    'size' => $refFile['size'] ?? null,
                    'ext' => $refFile['ext'] ?? null,
                    'source_id' => $ref->ID,
                ];
                $mapped['post_mime_type'] = $ref->post_mime_type ?? ($refFile['mime'] ?? 'document');
            }
        }
        if ($type === 'quiz') {
            $mapped['post_mime_type'] = 'application/json';
        }

        $mapped['config'] = $config;
        $mapped['post_type'] = $this->post_type;
        $mapped = $this->sanitizeInput($mapped);
        $item->update($mapped);

        return response()->json([
            'exec' => true,
            'data' => $this->map_activity($item->fresh()),
            'message' => 'Atividade atualizada com sucesso',
            'status' => 200,
        ]);
    }

    /**
     * Remove (soft delete) uma atividade.
     * EN: Soft-delete an activity.
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('delete')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $item = Activity::find($id);
        if (!$item) { return response()->json(['message' => 'Atividade não encontrada', 'status' => 404], 404); }
        if ($item->excluido === 's') { return response()->json(['message' => 'Atividade já excluída', 'status' => 400], 400); }
        $item->update([
            'excluido' => 's',
            'reg_excluido' => json_encode([
                'excluido_por' => $user->id,
                'excluido_em' => now()->toDateTimeString(),
                'motivo' => 'Exclusão via API',
            ]),
        ]);
        return response()->json(['exec' => true, 'message' => 'Atividade excluída com sucesso', 'status' => 200]);
    }

    /**
     * Lista atividades na lixeira.
     * EN: List trashed activities.
     */
    public function trash(Request $request)
    {
        $user = request()->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('view')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $perPage = $request->input('per_page', 10);
        $order_by = $request->input('order_by', 'updated_at');
        $order = $request->input('order', 'desc');

        $items = Activity::withoutGlobalScope('notDeleted')
            ->where(function($q){ $q->where('excluido','s')->orWhere('deletado','s'); })
            ->orderBy($order_by, $order)
            ->paginate($perPage);
        $items->getCollection()->transform(fn ($item) => $this->map_activity($item));
        return response()->json($items);
    }

    /**
     * Restaura atividade da lixeira.
     * EN: Restore activity from trash.
     */
    public function restore(string $id)
    {
        $user = request()->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('edit')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $item = Activity::withoutGlobalScope('notDeleted')
            ->where('ID', $id)
            ->where(function($q){ $q->where('excluido','s')->orWhere('deletado','s'); })
            ->first();
        if (!$item) { return response()->json(['message' => 'Atividade não encontrada na lixeira', 'status' => 404], 404); }
        $item->update([
            'excluido' => 'n',
            'deletado' => 'n',
            'reg_excluido' => null,
            'reg_deletado' => null,
        ]);
        return response()->json(['exec' => true, 'message' => 'Atividade restaurada com sucesso', 'status' => 200]);
    }

    /**
     * Exclui definitivamente uma atividade.
     * EN: Permanently delete an activity.
     */
    public function forceDelete(string $id)
    {
        $user = request()->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('delete')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $item = Activity::withoutGlobalScope('notDeleted')
            ->where('ID', $id)
            ->where(function($q){ $q->where('excluido','s')->orWhere('deletado','s'); })
            ->first();
        if (!$item) { return response()->json(['message' => 'Atividade não encontrada na lixeira', 'status' => 404], 404); }
        $item->forceDelete();
        return response()->json(['exec' => true, 'message' => 'Atividade excluída permanentemente', 'status' => 200]);
    }
}