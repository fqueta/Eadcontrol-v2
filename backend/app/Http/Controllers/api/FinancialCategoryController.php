<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

/**
 * Controller para gerenciar categorias financeiras
 * Trabalha especificamente com categorias onde entidade='financeiro'
 */
class FinancialCategoryController extends Controller
{
    protected PermissionService $permissionService;
    public $routeName;
    public $sec;

    public function __construct()
    {
        $this->routeName = request()->route()->getName();
        $this->permissionService = new PermissionService();
        $this->sec = request()->segment(3);
    }

    /**
     * Listar todas as categorias financeiras
     */
    public function index(Request $request)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $perPage = $request->input('per_page', 10);
        $order_by = $request->input('order_by', 'created_at');
        $order = $request->input('order', 'desc');

        $query = Category::query()
            ->where('entidade', 'financeiro')
            ->orderBy($order_by, $order);

        // Não exibir registros marcados como deletados ou excluídos
        $query->where(function($q) {
            $q->whereNull('deletado')->orWhere('deletado', '!=', 's');
        });
        $query->where(function($q) {
            $q->whereNull('excluido')->orWhere('excluido', '!=', 's');
        });
        // Filtros opcionais
        if ($request->filled('name')) {
            $query->where('name', 'like', '%' . $request->input('name') . '%');
        }
        if ($request->filled('description')) {
            $query->where('description', 'like', '%' . $request->input('description') . '%');
        }
        if ($request->filled('active')) {
            $query->where('active', $request->boolean('active'));
        }
        if ($request->filled('parent_id')) {
            $query->where('parent_id', $request->input('parent_id'));
        }
        //debug SQL: string crua, bindings e SQL com bindings interpolados
        // dd([
        //     'sql' => $query->toSql(),
        //     'bindings' => $query->getBindings(),
        //     'sql_with_bindings' => \Illuminate\Support\Str::replaceArray(
        //         '?',
        //         array_map(function($b){ return is_numeric($b) ? $b : "'".addslashes((string)$b)."'"; }, $query->getBindings()),
        //         $query->toSql()
        //     ),
        // ]);

        $categories = $query->paginate($perPage);

        // Transformar dados para o formato esperado pelo frontend
        $categories->getCollection()->transform(function ($category) {
            return $this->transformCategory($category);
        });
        return response()->json($categories);
    }

    /**
     * Criar uma nova categoria financeira
     */
    public function store(Request $request)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        // Verificar se o nome já existe na lixeira
        if ($request->filled('name')) {
            $existingCategory = Category::withoutGlobalScope('active')
                ->where('name', $request->name)
                ->where('entidade', 'financeiro')
                ->where(function($q) {
                    $q->where('deletado', 's')->orWhere('excluido', 's');
                })
                ->first();

            if ($existingCategory) {
                return response()->json([
                    'message' => 'Esta categoria já está em nossa base de dados, verifique na lixeira.',
                    'errors'  => ['name' => ['Categoria com este nome está na lixeira']],
                ], 422);
            }
        }

        $validator = Validator::make($request->all(), [
            'name'        => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
            'parent_id'   => 'nullable|exists:categories,id',
            'isActive'    => 'nullable|boolean',
            'color'       => 'nullable|string|max:7', // Para códigos de cor hex
            'type'        => 'nullable|string|in:income,expense', // Receita ou despesa
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        // Mapear campos usando o método centralizado
        $categoryData = $this->mapRequestToModel($validated);

        // Adicionar campos específicos para criação
        $categoryData['entidade'] = 'financeiro'; // Sempre financeiro
        $categoryData['token'] = Qlib::token();

        $category = Category::create($categoryData);

        return response()->json([
            'data'    => $this->transformCategory($category),
            'message' => 'Categoria financeira criada com sucesso',
            'status'  => 201,
        ], 201);
    }

    /**
     * Exibir uma categoria financeira específica
     */
    public function show(Request $request, string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $category = Category::where('entidade', 'financeiro')
            ->where('id', $id)
            ->firstOrFail();

        return response()->json($this->transformCategory($category));
    }

    /**
     * Atualizar uma categoria financeira específica
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

        $category = Category::where('entidade', 'financeiro')
            ->where('id', $id)
            ->firstOrFail();

        $validator = Validator::make($request->all(), [
            'name'        => ['sometimes', 'required', 'string', 'max:100'],
            'description' => 'nullable|string|max:500',
            'parent_id'   => 'nullable|exists:categories,id',
            'isActive'    => 'nullable|boolean',
            'color'       => 'nullable|string|max:7',
            'type'        => 'nullable|string|in:income,expense',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'exec'    => false,
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        // Mapear campos usando o método centralizado
        $updateData = $this->mapRequestToModel($validated, $category);
        $category->update($updateData);
        $category->refresh();
        return response()->json([
            'data'    => $this->transformCategory($category),
            'message' => 'Categoria financeira atualizada com sucesso',
            'status'  => 200,
        ]);
    }

    /**
     * Mover categoria financeira para a lixeira
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $category = Category::where('entidade', 'financeiro')
            ->where('id', $id)
            ->firstOrFail();

        // Verificar se tem categorias filhas ativas
        $hasActiveChildren = $category->children()
            ->where('active', true)
            ->where(function($q) {
                $q->whereNull('deletado')->orWhere('deletado', '!=', 's');
            })
            ->exists();

        if ($hasActiveChildren) {
            return response()->json([
                'message' => 'Não é possível excluir uma categoria que possui subcategorias ativas.',
                'errors'  => ['category' => ['Esta categoria possui subcategorias ativas']],
            ], 422);
        }

        // Mover para lixeira em vez de excluir permanentemente
        $category->update([
            'deletado' => 's',
            'reg_deletado' => json_encode([
                'usuario' => $user->id,
                'nome' => $user->name,
                'created_at' => now(),
            ])
        ]);

        return response()->json([
            'message' => 'Categoria financeira movida para a lixeira com sucesso',
            'status' => 200
        ]);
    }

    /**
     * Listar categorias financeiras na lixeira
     */
    public function trash(Request $request)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $perPage = $request->input('per_page', 10);
        $order_by = $request->input('order_by', 'created_at');
        $order = $request->input('order', 'desc');

        $query = Category::withoutGlobalScope('active')
            ->where('entidade', 'financeiro')
            ->where('deletado', 's')
            ->orderBy($order_by, $order);

        if ($request->filled('name')) {
            $query->where('name', 'like', '%' . $request->input('name') . '%');
        }

        $categories = $query->paginate($perPage);

        $categories->getCollection()->transform(function ($category) {
            return $this->transformCategory($category);
        });

        return response()->json($categories);
    }

    /**
     * Restaurar categoria financeira da lixeira
     */
    public function restore(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $category = Category::withoutGlobalScope('active')
            ->where('entidade', 'financeiro')
            ->where('id', $id)
            ->where('deletado', 's')
            ->firstOrFail();

        $category->update([
            'deletado' => 'n',
            'reg_deletado' => null
        ]);

        return response()->json([
            'message' => 'Categoria financeira restaurada com sucesso',
            'status' => 200
        ]);
    }

    /**
     * Excluir permanentemente uma categoria financeira
     */
    public function forceDelete(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $category = Category::withoutGlobalScope('active')
            ->where('entidade', 'financeiro')
            ->where('id', $id)
            ->where('deletado', 's')
            ->firstOrFail();

        $category->forceDelete();

        return response()->json([
            'message' => 'Categoria financeira excluída permanentemente',
            'status' => 200
        ]);
    }

    /**
     * Mapear campos da requisição para campos do modelo
     * Converte: name=name, description=description, isActive=active,
     * color=config[color], type=config[type], parent_id=parent_id
     */
    private function mapRequestToModel(array $requestData, $existingCategory = null)
    {
        $mappedData = [];

        // Mapeamento direto de campos
        if (isset($requestData['name'])) {
            $mappedData['name'] = $requestData['name'];
        }

        if (isset($requestData['description'])) {
            $mappedData['description'] = $requestData['description'];
        }

        if (isset($requestData['isActive'])) {
            $mappedData['active'] = $requestData['isActive'];
        }

        if (isset($requestData['parent_id'])) {
            $mappedData['parent_id'] = $requestData['parent_id'];
        }

        // Mapeamento para config (JSON)
        $configUpdated = false;
        $currentConfig = [];

        if ($existingCategory) {
            $currentConfig = json_decode($existingCategory->config ?? '{}', true);
        }

        if (isset($requestData['color'])) {
            $currentConfig['color'] = $requestData['color'];
            $configUpdated = true;
        }

        if (isset($requestData['type'])) {
            $currentConfig['type'] = $requestData['type'];
            $configUpdated = true;
        }

        if ($configUpdated || !$existingCategory) {
            // Para novos registros, definir valores padrão se não fornecidos
            if (!$existingCategory) {
                $currentConfig['color'] = $currentConfig['color'] ?? '#3B82F6';
                $currentConfig['type'] = $currentConfig['type'] ?? 'expense';
            }
            $mappedData['config'] = json_encode($currentConfig);
        }

        return $mappedData;
    }

    /**
     * Transformar categoria para o formato esperado pelo frontend
     * Mapeia: color=config.color, type=config.type, isActive=active
     */
    private function transformCategory($category)
    {
        $config = json_decode($category->config ?? '{}', true);

        return [
            'id'          => $category->id,
            'name'        => $category->name,
            'description' => $category->description,
            'parent_id'   => $category->parent_id,
            'isActive'    => (bool) $category->active,
            'color'       => $config['color'] ?? '#3B82F6',
            'type'        => $config['type'] ?? 'expense',
            'entidade'    => $category->entidade,
            'token'       => $category->token,
            'created_at'  => $category->created_at,
            'updated_at'  => $category->updated_at,
            // Relacionamentos opcionais
            'parent'      => $category->parent ? [
                'id'   => $category->parent->id,
                'name' => $category->parent->name
            ] : null,
            'children_count' => $category->children()->count(),
        ];
    }

    /**
     * Sanitizar dados de entrada
     */
    private function sanitizeInput($data)
    {
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                $data[$key] = trim($value);
            }
        }
        return $data;
    }
}
