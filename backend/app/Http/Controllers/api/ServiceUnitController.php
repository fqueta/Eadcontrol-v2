<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductUnit;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ServiceUnitController extends Controller
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
        $this->post_type = 'service-units';
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
     * Listar todas as unidades de serviço
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

        $query = ProductUnit::where('post_type', 'service-units')
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

        $serviceUnits = $query->paginate($perPage);
        // Transformar dados para o formato do frontend
        $serviceUnits->getCollection()->transform(function ($item) {
            return $this->map_service_unit($item);
        });

        return response()->json($serviceUnits);
    }
    
    /**
     * Mapeia os dados da unidade de serviço para o formato do frontend
     */
    public function map_service_unit($serviceUnit)
    {
        return [
            'id' => $serviceUnit->ID,
            'label' => $serviceUnit->post_title,
            'value' => $serviceUnit->post_name,
            'active' => $this->decode_status($serviceUnit->post_status),
            'created_at' => $serviceUnit->created_at,
            'updated_at' => $serviceUnit->updated_at,
        ];
    }
    
    /**
     * Criar uma nova unidade de serviço
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
            $serviceUnitValueDel = ProductUnit::withoutGlobalScope('notDeleted')
                ->where('post_name', $request->value)
                ->where('post_type', 'service-units')
                ->where(function($q){
                    $q->where('deletado', 's')->orWhere('excluido', 's');
                })->first();
            if ($serviceUnitValueDel) {
                return response()->json([
                    'message' => 'Esta unidade de serviço já está em nossa base de dados, verifique na lixeira.',
                    'errors'  => ['value' => ['Unidade de serviço com este valor está na lixeira']],
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
        $mappedData['post_type'] = 'service-units'; // Forçar tipo service-units
        $mappedData['menu_order'] = 0;
        $mappedData['comment_count'] = 0;
        $mappedData['excluido'] = 'n';
        $mappedData['deletado'] = 'n';

        $serviceUnit = ProductUnit::create($mappedData);

        // Preparar resposta no formato do frontend
        $responseData = $this->map_service_unit($serviceUnit);

        return response()->json([
            'data' => $responseData,
            'message' => 'Unidade de serviço criada com sucesso',
            'status' => 201,
        ], 201);
    }

    /**
     * Exibir uma unidade de serviço específica
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

        $serviceUnit = ProductUnit::where('post_type', 'service-units')->findOrFail($id);

        // Preparar resposta no formato do frontend
        $responseData = $this->map_service_unit($serviceUnit);

        return response()->json([
            'data' => $responseData,
            'message' => 'Unidade de serviço encontrada com sucesso',
            'status' => 200,
        ], 200);
    }

    /**
     * Atualizar uma unidade de serviço
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

        $serviceUnitToUpdate = ProductUnit::where('post_type', 'service-units')->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'label' => 'sometimes|required|string|max:255',
            'value' => ['sometimes', 'required', 'string', 'max:200', Rule::unique('posts', 'post_name')->ignore($serviceUnitToUpdate->ID, 'ID')],
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

        // Garantir que o post_type permaneça como service-units
        $mappedData['post_type'] = 'service-units';

        $serviceUnitToUpdate->update($mappedData);

        // Preparar resposta no formato do frontend
        $responseData = $this->map_service_unit($serviceUnitToUpdate);

        return response()->json([
            'exec' => true,
            'data' => $responseData,
            'message' => 'Unidade de serviço atualizada com sucesso',
            'status' => 200,
        ]);
    }

    /**
     * Mover unidade de serviço para lixeira (soft delete)
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

        $serviceUnitToDelete = ProductUnit::where('post_type', 'service-units')->find($id);
        if (!$serviceUnitToDelete) {
            return response()->json(['error' => 'Unidade de serviço não encontrada'], 404);
        }

        $serviceUnitToDelete->update([
            'excluido'     => 's',
            'deletado'     => 's',
            'reg_deletado' => json_encode([
                'data' => now()->toDateTimeString(),
                'user_id' => request()->user()->id
            ]),
        ]);

        return response()->json([
            'message' => 'Unidade de serviço marcada como deletada com sucesso'
        ], 200);
    }

    /**
     * Listar unidades de serviço na lixeira
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

        $query = ProductUnit::withoutGlobalScope('notDeleted')
            ->where('post_type', 'service-units')
            ->where(function($q) {
                $q->where('deletado', 's')->orWhere('excluido', 's');
            })
            ->orderBy($order_by, $order);

        // Filtros opcionais
        if ($request->filled('label')) {
            $query->where('post_title', 'like', '%' . $request->input('label') . '%');
        }
        if ($request->filled('value')) {
            $query->where('post_name', 'like', '%' . $request->input('value') . '%');
        }

        $serviceUnits = $query->paginate($perPage);

        // Transformar dados para o formato do frontend
        $serviceUnits->getCollection()->transform(function ($item) {
            return $this->map_service_unit($item);
        });

        return response()->json($serviceUnits);
    }

    /**
     * Restaurar unidade de serviço da lixeira
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

        $serviceUnit = ProductUnit::withoutGlobalScope('notDeleted')
                   ->where('ID', $id)
                   ->where('post_type', 'service-units')
                   ->where(function($q) {
                       $q->where('deletado', 's')->orWhere('excluido', 's');
                   })
                   ->first();

        if (!$serviceUnit) {
            return response()->json(['error' => 'Unidade de serviço não encontrada na lixeira'], 404);
        }

        $serviceUnit->update([
            'excluido' => 'n',
            'deletado' => 'n',
            'reg_excluido' => null,
            'reg_deletado' => null,
        ]);

        return response()->json([
            'message' => 'Unidade de serviço restaurada com sucesso'
        ], 200);
    }

    /**
     * Deletar permanentemente uma unidade de serviço
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

        $serviceUnit = ProductUnit::withoutGlobalScope('notDeleted')
                   ->where('ID', $id)
                   ->where('post_type', 'service-units')
                   ->where(function($q) {
                       $q->where('deletado', 's')->orWhere('excluido', 's');
                   })
                   ->first();

        if (!$serviceUnit) {
            return response()->json(['error' => 'Unidade de serviço não encontrada na lixeira'], 404);
        }

        $serviceUnit->forceDelete();

        return response()->json([
            'message' => 'Unidade de serviço deletada permanentemente com sucesso'
        ], 200);
    }
}