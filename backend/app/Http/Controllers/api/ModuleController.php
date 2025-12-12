<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Module;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ModuleController extends Controller
{
    protected PermissionService $permissionService;
    protected string $post_type = 'modules';

    /**
     * Construtor: inicializa serviço de permissão.
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
     * Regras de validação do payload de módulos.
     * EN: Validation rules for modules payload.
     */
    private function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'name' => 'nullable|string|max:200',
            'tipo_duracao' => 'nullable|string|max:50',
            'duration' => 'nullable|string|max:100',
            'content' => 'nullable|string',
            'description' => 'nullable|string',
            'active' => 'nullable|boolean',
        ];
    }

    /**
     * Mapeia um registro Module (post) para o formato esperado.
     * EN: Map a Module record to frontend payload shape.
     */
    private function map_module(Module $item): array
    {
        $config = $item->config ?? [];
        return [
            'id' => $item->ID,
            'title' => $item->post_title,
            'name' => $item->post_name,
            'tipo_duracao' => $config['tipo_duracao'] ?? null,
            'duration' => $config['duration'] ?? null,
            'content' => $item->post_content,
            'description' => $item->post_excerpt,
            'active' => $this->decode_status($item->post_status),
            'created_at' => $item->created_at,
            'updated_at' => $item->updated_at,
        ];
    }

    /**
     * Lista módulos com filtros e paginação.
     * EN: List modules with filters and pagination.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $perPage = $request->input('per_page', 10);
        $order_by = $request->input('order_by', 'created_at');
        $order = $request->input('order', 'desc');

        $query = Module::query()->orderBy($order_by, $order);

        if ($search = $request->get('search')) {
            $query->where(function($q) use ($search){
                $q->where('post_title', 'like', "%{$search}%")
                  ->orWhere('post_content', 'like', "%{$search}%")
                  ->orWhere('post_excerpt', 'like', "%{$search}%")
                  ->orWhere('post_name', 'like', "%{$search}%");
            });
        }

        $items = $query->paginate($perPage);
        $items->getCollection()->transform(fn ($item) => $this->map_module($item));
        return response()->json($items);
    }

    /**
     * Cria um novo módulo.
     * EN: Create a new module.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), $this->rules());
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        // Impedir duplicidade baseada no título na lixeira
        $existingDeleted = Module::withoutGlobalScope('notDeleted')
            ->where('post_title', $validated['title'])
            ->where(function($q){
                $q->where('excluido','s')->orWhere('deletado','s');
            })->first();
        if ($existingDeleted) {
            return response()->json([
                'message' => 'Já existe um módulo excluído com este título. Restaure-o ou use outro título.',
                'error' => 'duplicate_title'
            ], 409);
        }

        // Mapear payload -> posts
        $mapped = [
            'post_title' => $validated['title'],
            'post_content' => $validated['content'] ?? '',
            'post_excerpt' => $validated['description'] ?? '',
            'post_status' => $this->get_status($validated['active'] ?? true),
            'config' => [
                'tipo_duracao' => $validated['tipo_duracao'] ?? null,
                'duration' => $validated['duration'] ?? null,
            ],
        ];
        // slug
        $mapped['post_name'] = (new Module())->generateSlug($validated['name'] ?? $validated['title']);

        // padrão
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

        $item = Module::create($mapped);
        return response()->json([
            'data' => $this->map_module($item),
            'message' => 'Módulo criado com sucesso',
            'status' => 201,
        ], 201);
    }

    /**
     * Exibe um módulo específico.
     * EN: Show a specific module.
     */
    public function show(string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $item = Module::findOrFail($id);
        return response()->json($this->map_module($item));
    }

    /**
     * Atualiza um módulo.
     * EN: Update a module.
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $item = Module::findOrFail($id);
        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'name' => 'nullable|string|max:200',
            'tipo_duracao' => 'nullable|string|max:50',
            'duration' => 'nullable|string|max:100',
            'content' => 'nullable|string',
            'description' => 'nullable|string',
            'active' => 'nullable|boolean',
        ]);
        if ($validator->fails()) {
            return response()->json([
                'exec' => false,
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }
        $v = $validator->validated();

        $mapped = [];
        if (array_key_exists('title', $v)) $mapped['post_title'] = $v['title'];
        if (array_key_exists('content', $v)) $mapped['post_content'] = $v['content'] ?? '';
        if (array_key_exists('description', $v)) $mapped['post_excerpt'] = $v['description'] ?? '';
        if (array_key_exists('active', $v)) $mapped['post_status'] = $this->get_status($v['active']);
        if (array_key_exists('name', $v) && !empty($v['name'])) {
            $mapped['post_name'] = (new Module())->generateSlug($v['name']);
        }

        $config = $item->config ?? [];
        if (array_key_exists('tipo_duracao', $v)) $config['tipo_duracao'] = $v['tipo_duracao'];
        if (array_key_exists('duration', $v)) $config['duration'] = $v['duration'];
        $mapped['config'] = $config;

        $mapped['post_type'] = $this->post_type;
        $mapped = $this->sanitizeInput($mapped);
        $item->update($mapped);

        return response()->json([
            'exec' => true,
            'data' => $this->map_module($item->fresh()),
            'message' => 'Módulo atualizado com sucesso',
            'status' => 200,
        ]);
    }

    /**
     * Remove (soft delete) um módulo.
     * EN: Soft-delete a module.
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $item = Module::find($id);
        if (!$item) {
            return response()->json(['message' => 'Módulo não encontrado', 'status' => 404], 404);
        }
        if ($item->excluido === 's') {
            return response()->json(['message' => 'Módulo já excluído', 'status' => 400], 400);
        }
        $item->update([
            'excluido' => 's',
            'reg_excluido' => json_encode([
                'excluido_por' => $user->id,
                'excluido_em' => now()->toDateTimeString(),
                'motivo' => 'Exclusão via API',
            ]),
        ]);
        return response()->json(['exec' => true, 'message' => 'Módulo excluído com sucesso', 'status' => 200]);
    }

    /**
     * Lista módulos na lixeira.
     * EN: List trashed modules.
     */
    public function trash(Request $request)
    {
        $user = request()->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('view')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $perPage = $request->input('per_page', 10);
        $order_by = $request->input('order_by', 'updated_at');
        $order = $request->input('order', 'desc');

        $items = Module::withoutGlobalScope('notDeleted')
            ->where(function($q){ $q->where('excluido','s')->orWhere('deletado','s'); })
            ->orderBy($order_by, $order)
            ->paginate($perPage);
        $items->getCollection()->transform(fn ($item) => $this->map_module($item));
        return response()->json($items);
    }

    /**
     * Restaura um módulo da lixeira.
     * EN: Restore a trashed module.
     */
    public function restore(string $id)
    {
        $user = request()->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('edit')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $item = Module::withoutGlobalScope('notDeleted')
            ->where('ID', $id)
            ->where(function($q){ $q->where('excluido','s')->orWhere('deletado','s'); })
            ->first();
        if (!$item) {
            return response()->json(['message' => 'Módulo não encontrado na lixeira', 'status' => 404], 404);
        }
        $item->update([
            'excluido' => 'n',
            'deletado' => 'n',
            'reg_excluido' => null,
            'reg_deletado' => null,
        ]);
        return response()->json(['exec' => true, 'message' => 'Módulo restaurado com sucesso', 'status' => 200]);
    }

    /**
     * Exclui permanentemente um módulo.
     * EN: Permanently delete a module.
     */
    public function forceDelete(string $id)
    {
        $user = request()->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('delete')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $item = Module::withoutGlobalScope('notDeleted')
            ->where('ID', $id)
            ->where(function($q){ $q->where('excluido','s')->orWhere('deletado','s'); })
            ->first();
        if (!$item) {
            return response()->json(['message' => 'Módulo não encontrado na lixeira', 'status' => 404], 404);
        }
        $item->forceDelete();
        return response()->json(['exec' => true, 'message' => 'Módulo excluído permanentemente', 'status' => 200]);
    }
}