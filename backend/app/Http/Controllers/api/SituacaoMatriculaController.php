<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\EnrollmentSituation;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class SituacaoMatriculaController extends Controller
{
    protected PermissionService $permissionService;

    /**
     * Controlador para situações de matrícula (posts: situacao_matricula).
     * EN: Controller for enrollment situations (posts with post_type situacao_matricula).
     */
    public function __construct()
    {
        $this->permissionService = new PermissionService();
    }

    /**
     * Listar situações de matrícula com paginação e filtros simples.
     * EN: List enrollment situations with pagination and simple filters.
     *
     * Filtros suportados:
     * - name: busca em post_title (nome amigável)
     * - slug: busca em post_name (identificador curto)
     * - description: busca em post_content
     * - ativo: filtra por post_status ('s' ou 'n')
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

        $perPage = (int)($request->input('per_page', 10));
        $orderBy = $request->input('order_by', 'created_at');
        $order = $request->input('order', 'desc');

        $query = EnrollmentSituation::query()->orderBy($orderBy, $order);

        // Filtros
        if ($request->filled('name')) {
            $query->where('post_title', 'like', '%' . $request->input('name') . '%');
        }
        if ($request->filled('slug')) {
            $query->where('post_name', 'like', '%' . $request->input('slug') . '%');
        }
        if ($request->filled('description')) {
            $query->where('post_content', 'like', '%' . $request->input('description') . '%');
        }
        if ($request->filled('ativo')) {
            $query->where('post_status', $request->input('ativo'));
        }
        // PT: Opcionalmente excluir o primeiro registro conforme ordenação e filtros aplicados
        // EN: Optionally exclude the first record according to current sorting and filters
        if ($request->boolean('skip_first')) {
            // Clona a query já com filtros/ordenação e captura o primeiro ID
            $first = (clone $query)->select('ID')->first();
            if ($first && isset($first->ID)) {
                $query->where('ID', '!=', $first->ID);
            }
        }

        $items = $query->paginate($perPage);
        $items->getCollection()->transform(function ($item) {
            return $this->map_situacao($item);
        });
        return response()->json($items);
    }

    /**
     * Mapeia um registro de post (situacao_matricula) para o payload esperado.
     * EN: Map a post record (situacao_matricula) to the expected payload.
     */
    private function map_situacao(EnrollmentSituation $item): array
    {
        return [
            'id' => $item->ID,
            // Nome amigável
            // EN: Friendly display name
            'name' => $item->post_title,
            // Label amigável para exibição (post_title)
            // EN: Friendly label for display (post_title)
            'label' => $item->post_title,
            // Slug/identificador curto
            // EN: Slug/short identifier
            'slug' => $item->post_name,
            'description' => $item->post_content,
            'ativo' => $item->post_status, // 's' ou 'n'
            'created_at' => $item->created_at,
            'updated_at' => $item->updated_at,
        ];
    }

    /**
     * Cria uma nova situação de matrícula.
     * EN: Create a new enrollment situation.
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

        $validator = Validator::make($request->all(), [
            // name -> post_title
            'name' => ['required', 'string', 'max:200'],
            // slug -> post_name
            'slug' => ['required', 'string', 'max:200', 'alpha_dash', Rule::unique('posts', 'post_name')],
            'description' => ['nullable', 'string'],
            'ativo' => ['required', Rule::in(['s','n'])],
        ]);
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }
        $validated = $validator->validated();

        // Construir payload para posts
        $payload = [
            'post_author' => $user->id,
            // Map name -> post_title
            'post_title' => $validated['name'],
            // Map slug -> post_name
            'post_name' => $validated['slug'],
            'post_content' => $validated['description'] ?? null,
            'post_status' => $validated['ativo'], // 's' ou 'n'
            'comment_status' => 'closed',
            'ping_status' => 'closed',
            'post_type' => 'situacao_matricula',
            'menu_order' => 0,
            'to_ping' => 's',
            'excluido' => 'n',
            'deletado' => 'n',
            'token' => Qlib::token(),
        ];

        $created = EnrollmentSituation::create($payload);
        return response()->json([
            'data' => $this->map_situacao($created),
            'message' => 'Situação de matrícula criada com sucesso',
            'status' => 201,
        ], 201);
    }

    /**
     * Retorna uma situação de matrícula.
     * EN: Return a single enrollment situation.
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

        $item = EnrollmentSituation::findOrFail($id);
        return response()->json($this->map_situacao($item));
    }

    /**
     * Atualiza uma situação de matrícula existente.
     * EN: Update an existing enrollment situation.
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

        $item = EnrollmentSituation::findOrFail($id);
        $validator = Validator::make($request->all(), [
            // name -> post_title
            'name' => ['nullable', 'string', 'max:200'],
            // slug -> post_name
            'slug' => ['nullable', 'string', 'max:200', 'alpha_dash', Rule::unique('posts', 'post_name')->ignore($item->ID, 'ID')],
            'description' => ['nullable', 'string'],
            'ativo' => ['nullable', Rule::in(['s','n'])],
        ]);
        if ($validator->fails()) {
            return response()->json([
                'exec' => false,
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }
        $validated = $validator->validated();

        $mapped = [];
        if (array_key_exists('name', $validated)) {
            $mapped['post_title'] = $validated['name'];
        }
        if (array_key_exists('slug', $validated)) {
            $mapped['post_name'] = $validated['slug'];
        }
        if (array_key_exists('description', $validated)) {
            $mapped['post_content'] = $validated['description'];
        }
        if (array_key_exists('ativo', $validated)) {
            $mapped['post_status'] = $validated['ativo'];
        }
        if (!empty($mapped)) {
            $item->update($mapped);
        }
        return response()->json([
            'exec' => true,
            'data' => $this->map_situacao($item->fresh()),
            'message' => 'Situação de matrícula atualizada com sucesso',
            'status' => 200,
        ]);
    }

    /**
     * Move para lixeira (soft delete via flags excluido/deletado).
     * EN: Soft delete via flags to trash.
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

        $item = EnrollmentSituation::find($id);
        if (!$item) {
            return response()->json(['error' => 'Registro não encontrado'], 404);
        }
        $item->update([
            'excluido' => 's',
            'deletado' => 's',
            'reg_deletado' => json_encode([
                'data' => now()->toDateTimeString(),
                'user_id' => $user->id,
            ]),
        ]);
        return response()->json(['message' => 'Registro movido para lixeira com sucesso'], 200);
    }
}
