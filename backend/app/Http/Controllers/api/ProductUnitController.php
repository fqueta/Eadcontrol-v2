<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductUnit;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ProductUnitController extends Controller
{
    protected PermissionService $permissionService;
    public $routeName;
    public $sec;
    public $post_type;
    /**
     * Construtor do controlador
     */
    public function __construct()
    {
        $this->permissionService = new PermissionService();
        $this->post_type = 'product-units';
    }

    /**
     * Sanitiza os dados recebidos
     */
    private function sanitizeInput($input)
    {
        if (is_array($input)) {
            $sanitized = [];
            foreach ($input as $key => $value) {
                $sanitized[$key] = $this->sanitizeInput($value);
            }
            return $sanitized;
        } elseif (is_string($input)) {
            return trim(strip_tags($input));
        }
        return $input;
    }

    /**
     * Converte status booleano para post_status
     */
    private function get_status($active)
    {
        return $active ? 'publish' : 'draft';
    }

    /**
     * Converte post_status para booleano
     */
    private function decode_status($post_status)
    {
        return $post_status === 'publish';
    }

    /**
     * Listar todas as unidades de produto
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
        $query = ProductUnit::query()
            ->orderBy($order_by, $order);

        // Filtros opcionais
        if ($request->filled('label')) {
            $query->where('post_title', 'like', '%' . $request->input('label') . '%');
        }
        if ($request->filled('value')) {
            $query->where('post_name', 'like', '%' . $request->input('value') . '%');
        }
        if ($request->filled('active')) {
            $status = $this->get_status($request->boolean('active'));
            $query->where('post_status', $status);
        }

        $productUnits = $query->paginate($perPage);
        // Transformar dados para o formato do frontend
        $productUnits->getCollection()->transform(function ($item) {
            return $this->map_product_unit($item);
        });

        return response()->json($productUnits);
    }
    public function map_product_unit($productUnit)
    {
        // dd($productUnit);
        return [
            'id' => $productUnit->ID,
            'label' => $productUnit->post_title,
            'value' => $productUnit->post_name,
            'active' => $this->decode_status($productUnit->post_status),
            'created_at' => $productUnit->created_at,
            'updated_at' => $productUnit->updated_at,
        ];
    }
    /**
     * Criar uma nova unidade de produto
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

        // Verifica se já existe unidade deletada com o mesmo value
        if (!empty($request->value)) {
            $productUnitValueDel = ProductUnit::withoutGlobalScope('notDeleted')
                ->where('post_name', $request->value)
                ->where('post_type', 'product-units')
                ->where(function($q){
                    $q->where('deletado', 's')->orWhere('excluido', 's');
                })->first();
            if ($productUnitValueDel) {
                return response()->json([
                    'message' => 'Esta unidade já está em nossa base de dados, verifique na lixeira.',
                    'errors'  => ['value' => ['Unidade com este valor está na lixeira']],
                ], 422);
            }
        }

        $validator = Validator::make($request->all(), [
            'label' => 'required|string|max:255',
            'value' => 'required|string|max:200|unique:posts,post_name',
            'active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        // Mapear campos do frontend para campos do banco
        $mappedData = [
            'post_title' => $validated['label'], // label -> post_title
            'post_name' => $validated['value'], // value -> post_name
            'post_status' => $this->get_status($validated['active'] ?? true), // active -> post_status
        ];

        // Sanitização dos dados
        $mappedData = $this->sanitizeInput($mappedData);

        // Gerar token único
        $mappedData['token'] = Qlib::token();

        // Definir autor como usuário logado
        $mappedData['post_author'] = $user->id;

        // Valores padrão
        $mappedData['post_content'] = '';
        $mappedData['comment_status'] = 'closed';
        $mappedData['ping_status'] = 'closed';
        $mappedData['post_type'] = 'product-units'; // Forçar tipo product-units
        $mappedData['menu_order'] = 0;
        $mappedData['comment_count'] = 0;
        $mappedData['excluido'] = 'n';
        $mappedData['deletado'] = 'n';

        $productUnit = ProductUnit::create($mappedData);

        // Preparar resposta no formato do frontend
        $responseData = $this->map_product_unit($productUnit);

        return response()->json([
            'data' => $responseData,
            'message' => 'Unidade de produto criada com sucesso',
            'status' => 201,
        ], 201);
    }

    /**
     * Exibir uma unidade de produto específica
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

        $productUnit = ProductUnit::findOrFail($id);

        // Preparar resposta no formato do frontend
        $responseData = $this->map_product_unit($productUnit);

        return response()->json([
            'data' => $responseData,
            'message' => 'Unidade de produto encontrada com sucesso',
            'status' => 200,
        ], 200);
    }

    /**
     * Atualizar uma unidade de produto
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

        $productUnitToUpdate = ProductUnit::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'label' => 'sometimes|required|string|max:255',
            'value' => ['sometimes', 'required', 'string', 'max:200', Rule::unique('posts', 'post_name')->ignore($productUnitToUpdate->ID, 'ID')],
            'active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'exec' => false,
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        // Mapear campos do frontend para campos do banco
        $mappedData = [];

        if (isset($validated['label'])) {
            $mappedData['post_title'] = $validated['label']; // label -> post_title
        }
        if (isset($validated['value'])) {
            $mappedData['post_name'] = $validated['value']; // value -> post_name
        }
        if (isset($validated['active'])) {
            $mappedData['post_status'] = $this->get_status($validated['active']); // active -> post_status
        }

        // Sanitização dos dados
        $mappedData = $this->sanitizeInput($mappedData);

        // Garantir que o post_type permaneça como product-units
        $mappedData['post_type'] = 'product-units';

        $productUnitToUpdate->update($mappedData);

        // Preparar resposta no formato do frontend
        $responseData = $this->map_product_unit($productUnitToUpdate);

        return response()->json([
            'exec' => true,
            'data' => $responseData,
            'message' => 'Unidade de produto atualizada com sucesso',
            'status' => 200,
        ]);
    }

    /**
     * Mover unidade de produto para lixeira (soft delete)
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

        $productUnitToDelete = ProductUnit::find($id);
        if (!$productUnitToDelete) {
            return response()->json(['error' => 'Unidade de produto não encontrada'], 404);
        }

        $productUnitToDelete->update([
            'excluido'     => 's',
            'deletado'     => 's',
            'reg_deletado' => json_encode([
                'data' => now()->toDateTimeString(),
                'user_id' => request()->user()->id
            ]),
        ]);

        return response()->json([
            'message' => 'Unidade de produto marcada como deletada com sucesso'
        ], 200);
    }

    /**
     * Listar unidades de produto na lixeira
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

        $query = ProductUnit::onlyTrashed()
            ->orderBy($order_by, $order);

        // Filtros opcionais
        if ($request->filled('label')) {
            $query->where('post_title', 'like', '%' . $request->input('label') . '%');
        }
        if ($request->filled('value')) {
            $query->where('post_name', 'like', '%' . $request->input('value') . '%');
        }

        $productUnits = $query->paginate($perPage);

        // Transformar dados para o formato do frontend
        $productUnits->getCollection()->transform(function ($item) {
            return $this->map_product_unit($item);
        });

        return response()->json($productUnits);
    }

    /**
     * Restaurar unidade de produto da lixeira
     */
    public function restore(string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $productUnit = ProductUnit::withoutGlobalScope('notDeleted')
                   ->where('ID', $id)
                   ->where('post_type', 'product-units')
                   ->where(function($q) {
                       $q->where('deletado', 's')->orWhere('excluido', 's');
                   })
                   ->first();

        if (!$productUnit) {
            return response()->json(['error' => 'Unidade de produto não encontrada na lixeira'], 404);
        }

        $productUnit->update([
            'excluido' => 'n',
            'deletado' => 'n',
            'reg_excluido' => null,
            'reg_deletado' => null,
        ]);

        return response()->json([
            'message' => 'Unidade de produto restaurada com sucesso'
        ], 200);
    }

    /**
     * Deletar permanentemente uma unidade de produto
     */
    public function forceDelete(string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $productUnit = ProductUnit::withoutGlobalScope('notDeleted')
                   ->where('ID', $id)
                   ->where('post_type', 'product-units')
                   ->where(function($q) {
                       $q->where('deletado', 's')->orWhere('excluido', 's');
                   })
                   ->first();

        if (!$productUnit) {
            return response()->json(['error' => 'Unidade de produto não encontrada na lixeira'], 404);
        }

        $productUnit->forceDelete();

        return response()->json([
            'message' => 'Unidade de produto deletada permanentemente com sucesso'
        ], 200);
    }
}
