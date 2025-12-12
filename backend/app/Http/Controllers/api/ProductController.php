<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    protected $permissionService;
    protected $post_type;

    /**
     * Construtor do controller
     */
    public function __construct()
    {
        $this->permissionService = new PermissionService();
        $this->post_type = 'products';
    }

    /**
     * Sanitiza os dados de entrada
     */
    private function sanitizeInput($data)
    {
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                $data[$key] = strip_tags($value);
            }
        }
        return $data;
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
     * Listar todos os produtos
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

        $query = Product::query()
            ->orderBy($order_by, $order);

        // Filtros opcionais
        if ($request->filled('name')) {
            $query->where('post_title', 'like', '%' . $request->input('name') . '%');
        }
        if ($request->filled('slug')) {
            $query->where('post_name', 'like', '%' . $request->input('slug') . '%');
        }
        if ($request->filled('active')) {
            $status = $this->get_status($request->boolean('active'));
            $query->where('post_status', $status);
        }
        if ($request->filled('category')) {
            $query->where('guid', $request->input('category'));
        }
        $products = $query->paginate($perPage);
        // dd($products);
        // Transformar dados para o formato do frontend
        $products->getCollection()->transform(function ($item) {
            // dd($item);
            return $this->map_product($item);
        });
        // dd($products);

        return response()->json($products);
    }
    /**
     * Mapeia um produto para o formato do frontend     *
     * @param Product $product
     * @return array
     */
    public function map_product($product)
    {
        if(is_array($product)){
            $product = (object)$product;
        }
        // dd($product);
        return [
            'id' => $product->ID,
            'name' => $product->post_title,
            'description' => $product->post_content,
            'slug' => $product->post_name,
            'active' => $this->decode_status($product->post_status),
            'category' => $product->guid,
            'costPrice' => $product->post_value1,
            'salePrice' => $product->post_value2,
            'stock' => $product->comment_count,
            'categoryData' => Qlib::get_category_by_id($product->guid),
            'unitData' => Qlib::get_unit_by_id($product->config['unit'] ?? null),
            'unit' => $product->config['unit'] ?? null,
            'created_at' => $product->created_at,
            'updated_at' => $product->updated_at,
        ];
    }
    public function array_filder_validate(){
        return [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'active' => 'boolean',
            'category' => 'nullable|string|max:255',
            'costPrice' => 'nullable|numeric|min:0',
            'salePrice' => 'nullable|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'unit' => 'nullable|string|max:100',
        ];
    }
    /**
     * Criar um novo produto
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

        // Validação dos dados
        $validator = Validator::make($request->all(), $this->array_filder_validate());

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        // Verificar se já existe um produto deletado com o mesmo nome
        $existingProduct = Product::withoutGlobalScope('notDeleted')
            ->where('post_title', $validated['name'])
            ->where(function($query) {
                $query->where('excluido', 's')->orWhere('deletado', 's');
            })
            ->first();

        if ($existingProduct) {
            return response()->json([
                'message' => 'Já existe um produto com este nome que foi excluído. Restaure-o ou use outro nome.',
                'error' => 'duplicate_name'
            ], 409);
        }
        $validator = Validator::make($request->all(), $this->array_filder_validate());

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        // Verificar se já existe um produto deletado com o mesmo nome
        $existingProduct = Product::withoutGlobalScope('notDeleted')
            ->where('post_title', $validated['name'])
            ->where(function($query) {
                $query->where('excluido', 's')->orWhere('deletado', 's');
            })
            ->first();

        if ($existingProduct) {
            return response()->json([
                'message' => 'Já existe um produto com este nome que foi excluído. Restaure-o ou use outro nome.',
                'error' => 'duplicate_name'
            ], 409);
        }

        // Mapear campos do frontend para campos do banco
        $mappedData = [
            'post_title' => $validated['name'], // name -> post_title
            'post_content' => $validated['description'] ?? '', // description -> post_content
            'post_status' => $this->get_status($validated['active'] ?? true), // active -> post_status
            'guid' => $validated['category'] ?? null, // category -> guid
            'post_value1' => $validated['costPrice'] ?? 0, // costPrice -> post_value1
            'post_value2' => $validated['salePrice'] ?? 0, // salePrice -> post_value2
            'comment_count' => $validated['stock'] ?? 0, // stock -> comment_count
        ];

        // Configurar unidade no campo config
        if (isset($validated['unit'])) {
            $mappedData['config'] = ['unit' => $validated['unit']];
        }

        // Gerar slug automaticamente
        $mappedData['post_name'] = (new Product())->generateSlug($validated['name']);

        // Sanitização dos dados
        $mappedData = $this->sanitizeInput($mappedData);

        // Gerar token único
        $mappedData['token'] = Qlib::token();

        // Definir autor como usuário logado
        $mappedData['post_author'] = $user->id;

        // Valores padrão
        $mappedData['comment_status'] = 'closed';
        $mappedData['ping_status'] = 'closed';
        $mappedData['post_type'] = $this->post_type; // Forçar tipo products
        $mappedData['menu_order'] = 0;
        $mappedData['to_ping'] = 's';
        $mappedData['excluido'] = 'n';
        $mappedData['deletado'] = 'n';

        $product = Product::create($mappedData);

        // Preparar resposta no formato do frontend
        $responseData = $this->map_product($product);

        return response()->json([
            'data' => $responseData,
            'message' => 'Produto criado com sucesso',
            'status' => 201,
        ], 201);
    }
    /**
     * Exibir um produto específico
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

        $product = Product::findOrFail($id);

        // Preparar resposta no formato do frontend
        $responseData = $this->map_product($product);

        return response()->json([
            'data' => $responseData,
            'message' => 'Produto encontrado com sucesso',
            'status' => 200,
        ], 200);
    }

    /**
     * Atualizar um produto
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

        // Validação dos dados
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'active' => 'boolean',
            'category' => 'nullable|string|max:255',
            'costPrice' => 'nullable|numeric|min:0',
            'salePrice' => 'nullable|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'unit' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $productToUpdate = Product::findOrFail($id);

        // Mapear campos do frontend para campos do banco
        $mappedData = [];

        if (isset($validated['name'])) {
            $mappedData['post_title'] = $validated['name']; // name -> post_title
            $mappedData['post_name'] = $productToUpdate->generateSlug($validated['name']); // Gerar novo slug
        }
        if (isset($validated['description'])) {
            $mappedData['post_content'] = $validated['description']; // description -> post_content
        }
        if (isset($validated['category'])) {
            $mappedData['guid'] = $validated['category']; // category -> guid
        }
        if (isset($validated['costPrice'])) {
            $mappedData['post_value1'] = $validated['costPrice']; // costPrice -> post_value1
        }
        if (isset($validated['salePrice'])) {
            $mappedData['post_value2'] = $validated['salePrice']; // salePrice -> post_value2
        }
        if (isset($validated['stock'])) {
            $mappedData['comment_count'] = $validated['stock']; // stock -> comment_count
        }
        if (isset($validated['active'])) {
            $mappedData['post_status'] = $this->get_status($validated['active']); // active -> post_status
        }

        // Configurar unidade no campo config
        if (isset($validated['unit'])) {
            $config = $productToUpdate->config ?? [];
            $config['unit'] = $validated['unit'];
            $mappedData['config'] = $config;
        }

        // Sanitização dos dados
        $mappedData = $this->sanitizeInput($mappedData);

        // Garantir que o post_type permaneça como products
        $mappedData['post_type'] = $this->post_type;

        $productToUpdate->update($mappedData);

        // Preparar resposta no formato do frontend
        $responseData = $this->map_product($productToUpdate);

        return response()->json([
            'exec' => true,
            'data' => $responseData,
            'message' => 'Produto atualizado com sucesso',
            'status' => 200,
        ]);
    }

    /**
     * Excluir um produto (soft delete)
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

        $productToDelete = Product::find($id);

        if (!$productToDelete) {
            return response()->json([
                'message' => 'Produto não encontrado',
                'status' => 404,
            ], 404);
        }

        // Soft delete - marcar como excluído
        $productToDelete->update([
            'excluido' => 's',
            'reg_excluido' => json_encode([
                'excluido_por' => $user->id,
                'excluido_em' => now()->toDateTimeString(),
                'motivo' => 'Exclusão via API'
            ])
        ]);

        return response()->json([
            'exec' => true,
            'message' => 'Produto excluído com sucesso',
            'status' => 200,
        ]);
    }

    /**
     * Listar produtos na lixeira
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
        $order_by = $request->input('order_by', 'updated_at');
        $order = $request->input('order', 'desc');

        $products = Product::withoutGlobalScope('notDeleted')
            ->where(function($query) {
                $query->where('excluido', 's')->orWhere('deletado', 's');
            })
            ->orderBy($order_by, $order)
            ->paginate($perPage);

        // Transformar dados para o formato do frontend
        $products->getCollection()->transform(function ($item) {
            return $this->map_product($item);
        });

        return response()->json($products);
    }

    /**
     * Restaurar um produto da lixeira
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

        $product = Product::withoutGlobalScope('notDeleted')
            ->where('ID', $id)
            ->where(function($query) {
                $query->where('excluido', 's')->orWhere('deletado', 's');
            })
            ->first();

        if (!$product) {
            return response()->json([
                'message' => 'Produto não encontrado na lixeira',
                'status' => 404,
            ], 404);
        }

        // Restaurar produto
        $product->update([
            'excluido' => 'n',
            'deletado' => 'n',
            'reg_excluido' => null,
            'reg_deletado' => null,
        ]);

        return response()->json([
            'exec' => true,
            'message' => 'Produto restaurado com sucesso',
            'status' => 200,
        ]);
    }

    /**
     * Excluir permanentemente um produto
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

        $product = Product::withoutGlobalScope('notDeleted')
            ->where('ID', $id)
            ->where(function($query) {
                $query->where('excluido', 's')->orWhere('deletado', 's');
            })
            ->first();

        if (!$product) {
            return response()->json([
                'message' => 'Produto não encontrado na lixeira',
                'status' => 404,
            ], 404);
        }

        // Excluir permanentemente
        $product->forceDelete();

        return response()->json([
            'exec' => true,
            'message' => 'Produto excluído permanentemente',
            'status' => 200,
        ]);
    }
}
