<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ServiceController extends Controller
{
    protected $permissionService;
    protected $post_type;

    /**
     * Construtor do controller
     */
    public function __construct()
    {
        $this->permissionService = new PermissionService();
        $this->post_type = 'service';
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
     * Listar todos os serviços
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

        $query = Service::query()
            ->orderBy($order_by, $order);

        // Filtros opcionais
        if($search = $request->get('search')){
            $query->where('post_title', 'like', '%' . $search . '%');
            $query->orWhere('post_content', 'like', '%' . $search . '%');
            $query->orWhere('post_excerpt', 'like', '%' . $search . '%');
        }
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

        $services = $query->paginate($perPage);
        // Transformar dados para o formato do frontend
        $services->getCollection()->transform(function ($item) {
            return $this->map_service($item);
        });

        return response()->json($services);
    }

    /**
     * Mapeia um serviço para o formato do frontend
     * @param Service $service
     * @return array
     */
    public function map_service($service)
    {
        if(is_array($service)){
            $service = (object)$service;
        }
        return [
            'id' => $service->ID,
            'name' => $service->post_title,
            'description' => $service->post_content,
            'slug' => $service->post_name,
            'active' => $this->decode_status($service->post_status),
            'category' => $service->guid,
            'price' => $service->post_value1 ?? 0.00, // Valor padrão até que post_value1 seja implementado
            'estimatedDuration' => $service->config['estimatedDuration'] ?? null,
            'unit' => $service->config['unit'] ?? null,
            'requiresMaterials' => $service->config['requiresMaterials'] ?? false,
            'skillLevel' => $service->config['skillLevel'] ?? null,
            'categoryData' => Qlib::get_category_by_id($service->guid),
            'created_at' => $service->created_at,
            'updated_at' => $service->updated_at,
        ];
    }

    /**
     * Regras de validação para serviços
     */
    public function array_filder_validate()
    {
        return [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'active' => 'boolean',
            'category' => 'nullable|string|max:255',
            'price' => 'nullable|numeric|min:0',
            'estimatedDuration' => 'nullable',
            'unit' => 'nullable|string|max:100',
            'requiresMaterials' => 'boolean',
            'skillLevel' => 'nullable|string|max:100',
        ];
    }

    /**
     * Criar um novo serviço
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

        // Verificar se já existe um serviço deletado com o mesmo nome
        $existingService = Service::withoutGlobalScope('notDeleted')
            ->where('post_title', $validated['name'])
            ->where(function($query) {
                $query->where('excluido', 's')->orWhere('deletado', 's');
            })
            ->first();

        if ($existingService) {
            return response()->json([
                'message' => 'Já existe um serviço com este nome que foi excluído. Restaure-o ou use outro nome.',
                'error' => 'duplicate_name'
            ], 409);
        }
        // dd($validated);

        // Mapear campos do frontend para campos do banco
        $mappedData = [
            'post_title' => $validated['name'], // name -> post_title
            'post_content' => $validated['description'] ?? '', // description -> post_content
            'post_status' => $this->get_status($validated['active'] ?? true), // active -> post_status
            'guid' => $validated['category'] ?? null, // category -> guid
            'post_value1' => $validated['price'] ?? 0, // price -> post_value1
        ];

        // Configurar campos específicos do serviço no campo config
        $config = [];
        if (isset($validated['estimatedDuration'])) {
            $config['estimatedDuration'] = $validated['estimatedDuration'];
        }
        if (isset($validated['unit'])) {
            $config['unit'] = $validated['unit'];
        }
        if (isset($validated['requiresMaterials'])) {
            $config['requiresMaterials'] = $validated['requiresMaterials'];
        }
        if (isset($validated['skillLevel'])) {
            $config['skillLevel'] = $validated['skillLevel'];
        }

        if (!empty($config)) {
            $mappedData['config'] = $config;
        }

        // Gerar slug automaticamente
        $mappedData['post_name'] = (new Service())->generateSlug($validated['name']);

        // Sanitização dos dados
        $mappedData = $this->sanitizeInput($mappedData);

        // Gerar token único
        $mappedData['token'] = Qlib::token();

        // Definir autor como usuário logado
        $mappedData['post_author'] = $user->id;

        // Valores padrão
        $mappedData['comment_status'] = 'closed';
        $mappedData['ping_status'] = 'closed';
        $mappedData['post_type'] = $this->post_type; // Forçar tipo service
        $mappedData['menu_order'] = 0;
        $mappedData['to_ping'] = 's';
        $mappedData['excluido'] = 'n';
        $mappedData['deletado'] = 'n';

        $service = Service::create($mappedData);

        // Preparar resposta no formato do frontend
        $responseData = $this->map_service($service);

        return response()->json([
            'data' => $responseData,
            'message' => 'Serviço criado com sucesso',
            'status' => 201,
        ], 201);
    }

    /**
     * Exibir um serviço específico
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

        $service = Service::findOrFail($id);

        // Preparar resposta no formato do frontend
        $responseData = $this->map_service($service);

        return response()->json([
            'data' => $responseData,
            'message' => 'Serviço encontrado com sucesso',
            'status' => 200,
        ], 200);
    }

    /**
     * Atualizar um serviço
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
        $validator = Validator::make($request->all(), $this->array_filder_validate());

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $serviceToUpdate = Service::findOrFail($id);

        // Mapear campos do frontend para campos do banco
        $mappedData = [];

        if (isset($validated['name'])) {
            $mappedData['post_title'] = $validated['name']; // name -> post_title
            $mappedData['post_name'] = $serviceToUpdate->generateSlug($validated['name']); // Gerar novo slug
        }
        if (isset($validated['description'])) {
            $mappedData['post_content'] = $validated['description']; // description -> post_content
        }
        if (isset($validated['category'])) {
            $mappedData['guid'] = $validated['category']; // category -> guid
        }
        if (isset($validated['price'])) {
            $mappedData['post_value1'] = $validated['price']; // price -> post_value1
        }
        if (isset($validated['active'])) {
            $mappedData['post_status'] = $this->get_status($validated['active']); // active -> post_status
        }

        // Configurar campos específicos do serviço no campo config
        $config = $serviceToUpdate->config ?? [];
        if (isset($validated['estimatedDuration'])) {
            $config['estimatedDuration'] = $validated['estimatedDuration'];
        }
        if (isset($validated['unit'])) {
            $config['unit'] = $validated['unit'];
        }
        if (isset($validated['requiresMaterials'])) {
            $config['requiresMaterials'] = $validated['requiresMaterials'];
        }
        if (isset($validated['skillLevel'])) {
            $config['skillLevel'] = $validated['skillLevel'];
        }

        if (!empty($config)) {
            $mappedData['config'] = $config;
        }

        // Sanitização dos dados
        $mappedData = $this->sanitizeInput($mappedData);

        // Garantir que o post_type permaneça como service
        $mappedData['post_type'] = $this->post_type;
        // dd($request->all(), $mappedData);
        $serviceToUpdate->update($mappedData);
        // dd($serviceToUpdate);
        // Preparar resposta no formato do frontend
        $responseData = $this->map_service($serviceToUpdate);

        return response()->json([
            'exec' => true,
            'data' => $responseData,
            'message' => 'Serviço atualizado com sucesso',
            'status' => 200,
        ]);
    }

    /**
     * Excluir um serviço (soft delete)
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

        $serviceToDelete = Service::find($id);
        if (!$serviceToDelete) {
            return response()->json([
                'message' => 'Serviço não encontrado',
                'status' => 404,
            ], 404);
        }
        if($serviceToDelete->post_type != $this->post_type){
            return response()->json([
                'message' => 'Serviço não encontrado ou tipo inválido',
                'status' => 404,
            ], 404);
        }

        if($serviceToDelete->excluido == 's'){
            return response()->json([
                'message' => 'Serviço já excluído',
                'status' => 400,
            ], 400);
        }

        // Soft delete - marcar como excluído
        $serviceToDelete->update([
            'excluido' => 's',
            'reg_excluido' => json_encode([
                'excluido_por' => $user->id,
                'excluido_em' => now()->toDateTimeString(),
                'motivo' => 'Exclusão via API'
            ])
        ]);

        return response()->json([
            'exec' => true,
            'message' => 'Serviço excluído com sucesso',
            'status' => 200,
        ]);
    }

    /**
     * Listar serviços na lixeira
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

        $services = Service::withoutGlobalScope('notDeleted')
            ->where(function($query) {
                $query->where('excluido', 's')->orWhere('deletado', 's');
            })
            ->orderBy($order_by, $order)
            ->paginate($perPage);

        // Transformar dados para o formato do frontend
        $services->getCollection()->transform(function ($item) {
            return $this->map_service($item);
        });

        return response()->json($services);
    }

    /**
     * Restaurar um serviço da lixeira
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

        $service = Service::withoutGlobalScope('notDeleted')
            ->where('ID', $id)
            ->where(function($query) {
                $query->where('excluido', 's')->orWhere('deletado', 's');
            })
            ->first();

        if (!$service) {
            return response()->json([
                'message' => 'Serviço não encontrado na lixeira',
                'status' => 404,
            ], 404);
        }

        // Restaurar serviço
        $service->update([
            'excluido' => 'n',
            'deletado' => 'n',
            'reg_excluido' => null,
            'reg_deletado' => null,
        ]);

        return response()->json([
            'exec' => true,
            'message' => 'Serviço restaurado com sucesso',
            'status' => 200,
        ]);
    }

    /**
     * Excluir permanentemente um serviço
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

        $service = Service::withoutGlobalScope('notDeleted')
            ->where('ID', $id)
            ->where(function($query) {
                $query->where('excluido', 's')->orWhere('deletado', 's');
            })
            ->first();

        if (!$service) {
            return response()->json([
                'message' => 'Serviço não encontrado na lixeira',
                'status' => 404,
            ], 404);
        }

        // Excluir permanentemente
        $service->forceDelete();

        return response()->json([
            'exec' => true,
            'message' => 'Serviço excluído permanentemente',
            'status' => 200,
        ]);
    }
}
