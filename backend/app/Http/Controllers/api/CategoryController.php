<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Services\PermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
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
     * Lista categorias de produtos
     */
    public function indexProductCategories(Request $request){
        $request->merge([
            'entidade' => 'produtos',
        ]);
        return $this->index($request);
    }
    /**
     * Lista categorias de serviços
     */
    public function indexServiceCategories(Request $request){
        $request->merge([
            'entidade' => 'servicos',
        ]);
        return $this->index($request);
    }

    /**
     * Listar todas as categorias
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
        $query = Category::query()->orderBy($order_by, $order);
        // Filtros opcionais
        if ($request->filled('name')) {
            $query->where('name', 'like', '%' . $request->input('name') . '%');
        }
        if ($request->filled('active')) {
            $query->where('active', $request->boolean('active'));
        }
        if ($request->filled('entidade')) {
            $query->byEntidade($request->input('entidade'));
        }
        if ($request->filled('parent_id')) {
            if ($request->input('parent_id') === 'null') {
                $query->whereNull('parent_id');
            } else {
                $query->where('parent_id', $request->input('parent_id'));
            }
        }

        // Incluir relacionamentos se solicitado
        if ($request->boolean('with_parent')) {
            $query->with('parent');
        }
        if ($request->boolean('with_children')) {
            $query->with('children');
        }
        if ($request->boolean('with_children_recursive')) {
            $query->with('childrenRecursive');
        }
        // dd($query->get());
        $categories = $query->paginate($perPage);
        return response()->json($categories);
    }

    /**
     * Sanitiza os dados de entrada
     */
    private function sanitizeInput($data)
    {
        if (is_array($data)) {
            foreach ($data as $key => $value) {
                if (is_array($value)) {
                    $data[$key] = $this->sanitizeInput($value);
                } elseif (is_string($value)) {
                    $data[$key] = trim($value);
                }
            }
        } elseif (is_string($data)) {
            $data = trim($data);
        }
        return $data;
    }
    /**
     * Criar uma nova categoria
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

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:1|max:100',
            'description' => 'nullable|string|max:500',
            'parentId' => 'nullable|string|exists:categories,id',
            'entidade' => 'required|string|in:servicos,produtos,financeiro,outros',
            'active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        // Mapear campos do frontend para o banco
        $mappedData = [
            'name' => $this->sanitizeInput($validated['name']),
            'description' => isset($validated['description']) ? $this->sanitizeInput($validated['description']) : null,
            'parent_id' => $validated['parentId'] ?? null,
            'entidade' => $validated['entidade'],
            'active' => $validated['active'] ?? true,
        ];

        // Verificar se a categoria pai existe e está ativa (se fornecida)
        if ($mappedData['parent_id']) {
            $parentCategory = Category::find($mappedData['parent_id']);
            if (!$parentCategory || !$parentCategory->active) {
                return response()->json([
                    'message' => 'Erro de validação',
                    'errors' => ['parentId' => ['Categoria pai não encontrada ou inativa']],
                ], 422);
            }
        }

        $category = Category::create($mappedData);

        // Carregar relacionamentos para a resposta
        $category->load('parent', 'children');

        // Formatar resposta no formato do frontend
        $response = [
            'id' => $category->id,
            'name' => $category->name,
            'description' => $category->description,
            'parentId' => $category->parent_id,
            'active' => $category->active,
            'created_at' => $category->created_at,
            'updated_at' => $category->updated_at,
            'parent' => $category->parent,
            'children' => $category->children,
        ];

        return response()->json([
            'data' => $response,
            'message' => 'Categoria criada com sucesso',
            'status' => 201
        ], 201);
    }

    /**
     * Exibir uma categoria específica
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

        $query = Category::where('id', $id);

        // Incluir relacionamentos se solicitado
        if ($request->boolean('with_parent')) {
            $query->with('parent');
        }
        if ($request->boolean('with_children')) {
            $query->with('children');
        }
        if ($request->boolean('with_children_recursive')) {
            $query->with('childrenRecursive');
        }

        $category = $query->firstOrFail();

        // Formatar resposta no formato do frontend
        $response = [
            'id' => $category->id,
            'name' => $category->name,
            'description' => $category->description,
            'parentId' => $category->parent_id,
            'active' => $category->active,
            'created_at' => $category->created_at,
            'updated_at' => $category->updated_at,
        ];

        // Adicionar relacionamentos se carregados
        if ($category->relationLoaded('parent')) {
            $response['parent'] = $category->parent;
        }
        if ($category->relationLoaded('children')) {
            $response['children'] = $category->children;
        }
        if ($category->relationLoaded('childrenRecursive')) {
            $response['childrenRecursive'] = $category->childrenRecursive;
        }

        return response()->json($response);
    }

    /**
     * Atualizar uma categoria específica
     */
    public function update(Request $request, string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $category = Category::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|min:1|max:100',
            'description' => 'nullable|string|max:500',
            'parentId' => 'nullable|string|exists:categories,id',
            'entidade' => 'sometimes|required|string|in:servicos,produtos,financeiro,outros',
            'active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        // Mapear campos do frontend para o banco
        $mappedData = [];
        if (isset($validated['name'])) {
            $mappedData['name'] = $this->sanitizeInput($validated['name']);
        }
        if (array_key_exists('description', $validated)) {
            $mappedData['description'] = $validated['description'] ? $this->sanitizeInput($validated['description']) : null;
        }
        if (array_key_exists('parentId', $validated)) {
            $mappedData['parent_id'] = $validated['parentId'];
        }
        if (isset($validated['entidade'])) {
            $mappedData['entidade'] = $validated['entidade'];
        }
        if (isset($validated['active'])) {
            $mappedData['active'] = $validated['active'];
        }

        // Verificar se a categoria pai existe e está ativa (se fornecida)
        if (isset($mappedData['parent_id']) && $mappedData['parent_id']) {
            // Não permitir que uma categoria seja pai de si mesma
            if ($mappedData['parent_id'] == $id) {
                return response()->json([
                    'message' => 'Erro de validação',
                    'errors' => ['parentId' => ['Uma categoria não pode ser pai de si mesma']],
                ], 422);
            }

            $parentCategory = Category::find($mappedData['parent_id']);
            if (!$parentCategory || !$parentCategory->active) {
                return response()->json([
                    'message' => 'Erro de validação',
                    'errors' => ['parentId' => ['Categoria pai não encontrada ou inativa']],
                ], 422);
            }

            // Verificar se não criaria um loop (categoria pai não pode ser descendente da categoria atual)
            $descendants = $category->getDescendants();
            if ($descendants->contains('id', $mappedData['parent_id'])) {
                return response()->json([
                    'message' => 'Erro de validação',
                    'errors' => ['parentId' => ['Não é possível definir uma categoria descendente como pai']],
                ], 422);
            }
        }

        $category->update($mappedData);

        // Carregar relacionamentos para a resposta
        $category->load('parent', 'children');

        // Formatar resposta no formato do frontend
        $response = [
            'id' => $category->id,
            'name' => $category->name,
            'description' => $category->description,
            'parentId' => $category->parent_id,
            'active' => $category->active,
            'created_at' => $category->created_at,
            'updated_at' => $category->updated_at,
            'parent' => $category->parent,
            'children' => $category->children,
        ];

        return response()->json([
            'data' => $response,
            'message' => 'Categoria atualizada com sucesso',
            'status' => 200
        ]);
    }

    /**
     * Remover uma categoria específica
     */
    public function destroy(Request $request, string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $category = Category::findOrFail($id);

        // Verificar se a categoria tem filhos
        if ($category->hasChildren()) {
            return response()->json([
                'message' => 'Não é possível excluir uma categoria que possui subcategorias',
                'errors' => ['category' => ['Esta categoria possui subcategorias e não pode ser excluída']],
            ], 422);
        }

        $category->delete();

        return response()->json([
            'message' => 'Categoria excluída com sucesso',
            'status' => 200
        ]);
    }

    /**
     * Listar categorias na lixeira
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
        $order_by = $request->input('order_by', 'cerated_at');
        $order = $request->input('order', 'desc');

        $query = Category::onlyTrashed()->orderBy($order_by, $order);

        // Filtros opcionais
        if ($request->filled('name')) {
            $query->where('name', 'like', '%' . $request->input('name') . '%');
        }

        $categories = $query->paginate($perPage);

        // Transformar dados para o formato do frontend
        $categories->getCollection()->transform(function ($category) {
            return [
                'id' => $category->id,
                'name' => $category->name,
                'description' => $category->description,
                'parentId' => $category->parent_id,
                'active' => $category->active,
                'created_at' => $category->created_at,
                'updated_at' => $category->updated_at,
                // 'deleted_at' => $category->deleted_at,
            ];
        });

        return response()->json($categories);
    }

    /**
     * Restaurar uma categoria da lixeira
     */
    public function restore(Request $request, string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $category = Category::onlyTrashed()->findOrFail($id);
        $category->restore();

        return response()->json([
            'message' => 'Categoria restaurada com sucesso',
            'status' => 200
        ]);
    }

    /**
     * Excluir permanentemente uma categoria
     */
    public function forceDelete(Request $request, string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $category = Category::onlyTrashed()->findOrFail($id);
        $category->forceDelete();

        return response()->json([
            'message' => 'Categoria excluída permanentemente',
            'status' => 200
        ]);
    }

    /**
     * Obter árvore de categorias
     */
    public function tree(Request $request)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $query = Category::root()->with('childrenRecursive');

        // Filtrar apenas categorias ativas se solicitado
        if ($request->boolean('active_only')) {
            $query->active();
        }

        $categories = $query->get();

        // Transformar dados para o formato do frontend
        $tree = $categories->map(function ($category) {
            return $this->formatCategoryTree($category);
        });

        return response()->json($tree);
    }

    /**
     * Formatar categoria para árvore recursivamente
     */
    private function formatCategoryTree($category)
    {
        $formatted = [
            'id' => $category->id,
            'name' => $category->name,
            'description' => $category->description,
            'parentId' => $category->parent_id,
            'active' => $category->active,
            'created_at' => $category->created_at,
            'updated_at' => $category->updated_at,
        ];

        if ($category->relationLoaded('childrenRecursive') && $category->childrenRecursive->isNotEmpty()) {
            $formatted['children'] = $category->childrenRecursive->map(function ($child) {
                return $this->formatCategoryTree($child);
            });
        }
        return $formatted;
    }
}
