<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\ServiceOrder;
use App\Models\ServiceOrderItem;
use App\Models\Product;
use App\Models\Service;
use App\Models\User;
use App\Models\Client;
use App\Models\Aircraft;
use App\Http\Controllers\api\AircraftController;
use App\Models\Funnel;
use App\Models\Stage;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use PHPUnit\Architecture\Services\ServiceContainer;

class ServiceOrderController extends Controller
{
    protected $permissionService;

    public function __construct()
    {
        $this->permissionService = new PermissionService;
    }

    /**
     * Display a listing of service orders.
     */
    public function index(Request $request): JsonResponse
    {
        // Check permissions
        $user = request()->user();
        if (!$user) {
            return response()->json(['message' => 'Acesso negado'], 403);
        }

        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $query = ServiceOrder::with([
            'items.product',
            'items.service',
            'aircraft',
            'client',
            'assignedUser'
        ])->where('excluido', 'n');

        // Apply filters
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->input('funnel_id') || $request->has('funnelId')) {
            $funnel_id = $request->input('funnel_id') ?: $request->funnelId;
            $query->where('funnel_id', $funnel_id);
        }

        if ($request->has('stage_id') || $request->has('stageId')) {
            $stage = $request->has('stage_id') ? $request->stage_id : $request->stageId;
            $query->where('stage_id', $stage);
        }

        if ($request->has('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }

        if ($request->has('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        if ($request->has('aircraft_id')) {
            $query->where('object_id', $request->aircraft_id)
                  ->where('object_type', 'aircraft');
        }

        if ($request->has('object_id')) {
            $query->where('object_id', $request->object_id);
        }

        if ($request->has('object_type')) {
            $query->where('object_type', $request->object_type);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->get('per_page', 15);
        $serviceOrders = $query->paginate($perPage);

        // Transform data
        $responseData = $serviceOrders->toArray();
        $responseData['data'] = array_map([$this, 'transformServiceOrder'], $responseData['data']);
// dd($responseData);
        return response()->json([
            'success' => true,
            'data' => $responseData['data'],
        ]);
    }

    /**
     * Store a newly created service order.
     */
    public function store(Request $request): JsonResponse
    {
        // Check permissions
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = $this->validateServiceOrder($request);
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dados inválidos',
                'body' => $validator->errors(),
                'status' => 422,
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Normalize common camelCase inputs to expected snake_case fields
            // - aircraftId -> object_id (as 'aircraft')
            // - clientId -> client_id
            // - observations -> notes
            if ($request->has('aircraftId') && !$request->has('object_id')) {
                $request->merge([
                    'object_id' => (int) $request->aircraftId,
                    'object_type' => 'aircraft'
                ]);
            }
            if ($request->has('clientId') && !$request->has('client_id')) {
                $request->merge([
                    'client_id' => $request->clientId
                ]);
            }
            if ($request->has('observations') && !$request->has('notes')) {
                $request->merge([
                    'notes' => $request->observations
                ]);
            }

            $clientId = $request->client_id;
            $aircraftId = $request->object_id;
            // Verificar se local=workflow e aircraft_registration não está vazio
            if ($request->local === 'workflow') {
                // dd($request->all());

                // Ação 1: Verificar e salvar dados de cliente usando campos contact_*
                if ($request->has('contact_name') || $request->has('contact_email') || $request->has('contact_phone')) {
                    $clientId = $this->handleClientData($request);
                }

                // Ação 2: Verificar e salvar aeronave usando modelo Aircraft
                if ($request->has('aircraft_registration')) {
                    $aircraftId = $this->handleAircraftData($request, $clientId);
                }

                // Atualizar os dados da requisição com os IDs obtidos
                $request->merge([
                    'client_id' => $clientId,
                    'object_id' => $aircraftId,
                    'object_type' => 'aircraft'
                ]);
            }

            // Gerar token único
            $request->merge(['token' => Qlib::token()]);

            // Mapear campos de funnel e stage
            $additionalData = [];
            if ($request->has('funnelId')) {
                $additionalData['funnel_id'] = $request->funnelId;
            }
            if ($request->has('stageId')) {
                $additionalData['stage_id'] = $request->stageId;
            }
            //verifica se não tiver o responsavel assigned_to coloque o id do usuario como sendo o responsavel
            if (!$request->has('assigned_to')) {
                $request->merge(['assigned_to' => $user->id]);
            }

            // Tratar object_id para evitar strings vazias
            $requestData = $request->only([
                'doc_type',
                'title',
                'token',
                'description',
                'object_id',
                'object_type',
                'assigned_to',
                'client_id',
                'status',
                'priority',
                'estimated_start_date',
                'estimated_end_date',
                'actual_start_date',
                'actual_end_date',
                'notes',
                'internal_notes'
            ]);

            // Converter object_id vazio para null ou garantir que seja um inteiro válido

            if (isset($requestData['object_id']) && ($requestData['object_id'] === '' || $requestData['object_id'] === null)) {
                $requestData['object_id'] = null;
            } elseif (isset($requestData['object_id'])) {
                $requestData['object_id'] = (int) $requestData['object_id'];
            }
            $ds = array_merge($requestData, $additionalData);

            // Ação 3: Salvar dados da ordem de serviço
            $serviceOrder = ServiceOrder::create($ds);

            // Add products
            if ($request->has('products') && is_array($request->products)) {
                $this->addItemsToOrder($serviceOrder, $request->products, 'product');
            }
            // Add services
            if ($request->has('services') && is_array($request->services)) {
                $this->addItemsToOrder($serviceOrder, $request->services, 'service');
            }

            // Add services by IDs (service_ids)
            if ($request->has('service_ids') && is_array($request->service_ids)) {
                $this->addServicesByIds($serviceOrder, $request->service_ids);
            }

            // Calculate total amount
            $serviceOrder->calculateTotalAmount();

            DB::commit();

            // Load relationships for response
            $serviceOrder->load([
                'items.product',
                'items.service',
                'aircraft',
                'client',
                'assignedUser'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Ordem de serviço criada com sucesso',
                'data' => $this->transformServiceOrder($serviceOrder)
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar ordem de serviço: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified service order.
     */
    public function show(Request $request, $id): JsonResponse
    {
        // Check permissions
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['message' => 'Acesso negado'], 403);
        }
        $serviceOrder = ServiceOrder::find($id);
        if (!$serviceOrder) {
            return response()->json(['message' => 'Ordem de serviço não encontrada'], 404);
        }
        // $serviceOrder->load([
        //     'items.product',
        //     'items.service',
        //     'aircraft',
        //     'client',
        //     'assignedUser'
        // ]);

        return response()->json([
            'success' => true,
            'data' => $this->transformServiceOrder($serviceOrder)
        ]);
    }

    /**
     * Update the specified service order.
     */
    public function update(Request $request, $id): JsonResponse
    {
        // Check permissions
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['message' => 'Acesso negado'], 403);
        }

        $validator = $this->validateServiceOrder($request);
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dados inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Update service order
            // dd($request->only([
            //     'title',
            //     'description',
            //     'object_id',
            //     'object_type',
            //     'assigned_to',
            //     'client_id',
            //     'status',
            //     'priority',
            //     'estimated_start_date',
            //     'estimated_end_date',
            //     'actual_start_date',
            //     'actual_end_date',
            //     'notes',
            //     'internal_notes'
            // ]),$request->all());
            // dd($request->all());
            if($request->has('stageId')){
                $request->merge([
                    // Map stageId to stage_id; allow null to be omitted later
                    'stage_id' => $request->stageId !== null ? (int) $request->stageId : null
                ]);
            }
            if($request->has('funnelId')){
                $request->merge([
                    // Map funnelId to funnel_id; allow null to be omitted later
                    'funnel_id' => $request->funnelId !== null ? (int) $request->funnelId : null
                ]);
            }

            // Build update data and drop nulls for stage_id/funnel_id to avoid DB constraint issues
            $updateData = $request->only([
                'doc_type',
                'title',
                'description',
                'object_id',
                'object_type',
                'assigned_to',
                'client_id',
                'funnel_id',
                'status',
                'stage_id',
                'priority',
                'estimated_start_date',
                'estimated_end_date',
                'actual_start_date',
                'actual_end_date',
                'notes',
                'internal_notes'
            ]);

            // If funnel is provided and stage is not provided or null, set stage to first stage of the funnel
            /**
             * Auto-select first stage when funnel changes without explicit stage.
             * - Detects provided funnel_id.
             * - If stage_id not provided or null, fills with first ordered stage from funnel.
             */
            $stageIdProvided = $request->has('stageId') || $request->has('stage_id');
            $stageIdValue = $request->has('stage_id') ? $request->stage_id : ($request->stageId ?? null);
            if ((array_key_exists('funnel_id', $updateData) && $updateData['funnel_id'] !== null)
                && (!$stageIdProvided || $stageIdValue === null)) {
                $firstStageId = \App\Models\Stage::where('funnel_id', $updateData['funnel_id'])
                    ->orderBy('order', 'asc')
                    ->value('id');
                if ($firstStageId) {
                    $updateData['stage_id'] = $firstStageId;
                }
            }

            if (array_key_exists('stage_id', $updateData) && $updateData['stage_id'] === null) {
                unset($updateData['stage_id']);
            }
            if (array_key_exists('funnel_id', $updateData) && $updateData['funnel_id'] === null) {
                unset($updateData['funnel_id']);
            }

            // Perform update on the model instance to keep it loaded
            /**
             * Update service order with null-safe stage/funnel handling.
             * - Maps optional stageId/funnelId.
             * - Omits null stage_id/funnel_id to respect NOT NULL constraints.
             * - Auto-fills stage_id from funnel when not provided.
             */
            $serviceOrder = ServiceOrder::findOrFail($id);
            $serviceOrder->update($updateData);

            // Update items if provided
            if ($request->has('products') || $request->has('services')) {
                // Remove existing items
                // dd($serviceOrder->items());
                $serviceOrder->items()->delete();

                // Add new products
                if ($request->has('products') && is_array($request->products)) {
                    $this->addItemsToOrder($serviceOrder, $request->products, 'product');
                }

                // Add new services
                if ($request->has('services') && is_array($request->services)) {
                    $this->addItemsToOrder($serviceOrder, $request->services, 'service');
                }

                // Recalculate total amount
                $serviceOrder->calculateTotalAmount();
            }

            DB::commit();

            // Load relationships for response
            $serviceOrder->load([
                'items.product',
                'items.service',
                'aircraft',
                'client',
                'assignedUser'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Ordem de serviço atualizada com sucesso',
                'data' => $this->transformServiceOrder($serviceOrder)
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar ordem de serviço: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified service order (soft delete).
     */
    public function destroy($id): JsonResponse
    {
        // Check permissions
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        try {
            //Ao excluir preciso que atualize o campo excluido=s e reg_exluido para ['excluido_por'=>user_id,'data'=>now]
            ServiceOrder::where('id', $id)->update([
                'excluido' => 's',
                'deletado' => 's',
                'reg_excluido' => json_encode([
                    'excluido_por' => $user->id,
                    'data' => now()
                    ])
            ]);
            $serviceOrder = ServiceOrder::find($id);

            // dd($serviceOrder);

            // $serviceOrder->delete();
            //se excluido com sucesso retorna sucesso
            if($serviceOrder->excluido == 's'){
                return response()->json([
                    'exec' => true,
                    'success' => true,
                    'message' => 'Ordem de serviço movida para lixeira com sucesso'
                ]);
            }else{
                return response()->json([
                    'exec' => false,
                    'success' => false,
                    'message' => 'Erro ao mover ordem de serviço para lixeira'
                ]);
            }

            // return response()->json([

            //     'success' => true,
            //     'message' => 'Ordem de serviço movida para lixeira com sucesso'
            // ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erro ao mover ordem de serviço para lixeira: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display trashed service orders.
     */
    public function trash(Request $request): JsonResponse
    {
        // Check permissions
        if (!$this->permissionService->isHasPermission($request)) {
            return response()->json(['message' => 'Acesso negado'], 403);
        }

        $query = ServiceOrder::onlyTrashed()->with([
            'items.product',
            'items.service',
            'aircraft',
            'client',
            'assignedUser'
        ]);

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'deleted_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->get('per_page', 15);
        $serviceOrders = $query->paginate($perPage);

        // Transform data
        $responseData = $serviceOrders->toArray();
        $responseData['data'] = array_map([$this, 'transformServiceOrder'], $responseData['data']);

        return response()->json([
            'success' => true,
            'data' => $responseData,
        ]);
    }
    /**
     * Para atualizar o status da ordem de serviço
     */
    public function updateStatus(Request $request, $id)
    {
        // Check permissions
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['message' => 'Acesso negado'], 403);
        }

        // $validator = $this->validateServiceOrder($request, [
        //         'status' => 'required|in:draft,pending,in_progress,completed,cancelled,on_hold,approved'
        //     ],
        //     [
        //         'status.required' => 'O status é obrigatório',
        //         'status.in' => 'O status selecionado é inválido',
        //     ]);
        // if ($validator->fails()) {
        //     return response()->json([
        //         'success' => false,
        //         'message' => 'Dados inválidos',
        //         'errors' => $validator->errors()
        //     ], 422);
        // }

        // Check if status is valid
        $validStatuses = ['draft', 'pending', 'in_progress', 'completed', 'cancelled', 'on_hold', 'approved'];
        if (!in_array($request->status, $validStatuses)) {
            return response()->json([
                'success' => false,
                'message' => 'Status inválido'
            ], 422);
        }

        try {
            $serviceOrder = ServiceOrder::findOrFail($id);
            $serviceOrder->update($request->only([
                'status'
            ]));
            return response()->json([
                'success' => true,
                'message' => 'Status atualizado com sucesso',
                'data' => $this->transformServiceOrder($serviceOrder)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar ordem de serviço: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Restore a trashed service order.
     */
    public function restore(Request $request, $id): JsonResponse
    {
        // Check permissions
        if (!$this->permissionService->isHasPermission($request)) {
            return response()->json(['message' => 'Acesso negado'], 403);
        }

        try {
            $serviceOrder = ServiceOrder::onlyTrashed()->findOrFail($id);
            $serviceOrder->restore();

            return response()->json([
                'success' => true,
                'message' => 'Ordem de serviço restaurada com sucesso'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao restaurar ordem de serviço: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Permanently delete a service order.
     */
    public function forceDelete(Request $request, $id): JsonResponse
    {
        // Check permissions
        if (!$this->permissionService->isHasPermission($request)) {
            return response()->json(['message' => 'Acesso negado'], 403);
        }

        try {
            $serviceOrder = ServiceOrder::onlyTrashed()->findOrFail($id);
            $serviceOrder->forceDelete();

            return response()->json([
                'success' => true,
                'message' => 'Ordem de serviço excluída permanentemente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao excluir ordem de serviço permanentemente: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate service order data.
     */
    private function validateServiceOrder(Request $request, $rules = [],$messages=[])
    {
        // Mapear aircraft_id para object_id se fornecido para compatibilidade
        // dd($request->all());
        if ($request->has('aircraft_id') && !$request->has('object_id')) {
            $request->merge([
                'object_id' => $request->aircraft_id,
                'object_type' => 'aircraft'
            ]);
        }
        // $cliente_permission_id = Qlib::qoption('cliente_permission_id')??5;
        if(count($rules) != 0){
            $rules = [
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'object_id' => 'nullable|integer|min:1',
                'object_type' => 'required|in:aircraft,equipment,vehicle,facility',
                'aircraft_id' => 'nullable|integer|min:1', // Para compatibilidade
                'assigned_to' => 'required|exists:users,id',
                'client_id' => 'required',
                // 'client_id' => 'required|exists:users,id,permission_id,'.$cliente_permission_id,
                'status' => 'required|in:draft,pending,in_progress,completed,cancelled,on_hold,approved',
                'priority' => 'required|in:low,medium,high,urgent',
                'estimated_start_date' => 'nullable|date',
                'estimated_end_date' => 'nullable|date|after_or_equal:estimated_start_date',
                'actual_start_date' => 'nullable|date',
                'actual_end_date' => 'nullable|date|after_or_equal:actual_start_date',
                'notes' => 'nullable|string',
                'internal_notes' => 'nullable|string',
                'products' => 'nullable|array',
                'products.*.product_id' => 'required_with:products|exists:posts,ID',
                'products.*.quantity' => 'required_with:products|integer|min:1',
                'products.*.unit_price' => 'required_with:products|numeric|min:0',
                'products.*.total_price' => 'required_with:products|numeric|min:0',
                'products.*.notes' => 'nullable|string',
                'services' => 'nullable|array',
                'services.*.service_id' => 'required_with:services|exists:posts,ID',
                'services.*.quantity' => 'required_with:services|integer|min:1',
                'services.*.unit_price' => 'required_with:services|numeric|min:0',
                'services.*.total_price' => 'required_with:services|numeric|min:0',
                'services.*.notes' => 'nullable|string',
                'funnelId' => 'nullable|integer|exists:funnels,id',
                'stageId' => 'nullable|integer|exists:stages,id',
            ];
            $messages = [
                'title.required' => 'O título é obrigatório',
                'description.required' => 'A descrição é obrigatória',
                'object_id.required' => 'O objeto é obrigatório',
                'object_type.required' => 'O tipo de objeto é obrigatório',
                'assigned_to.required' => 'O responsável é obrigatório',
                'assigned_to.exists' => 'O responsável selecionado é inválido',
                'client_id.required' => 'O cliente é obrigatório',
                // 'client_id.exists' => 'O cliente selecionado é inválido ou não é um cliente válido',
                'status.required' => 'O status é obrigatório',
                'priority.required' => 'A prioridade é obrigatória',
            ];
        }
        return Validator::make($request->all(), $rules, $messages);
    }

    /**
     * Add items (products or services) to service order.
     *
     * Supports camelCase and snake_case payloads:
     * - product_id or productId
     * - service_id or serviceId
     * Derives unit_price/total_price when missing using model defaults.
     */
    private function addItemsToOrder(ServiceOrder $serviceOrder, array $items, string $itemType)
    {
        // Verificar se o service_order_id é válido
        if (!$serviceOrder->id) {
            throw new \Exception('Service Order ID is null. Cannot add items.');
        }

        foreach ($items as $item) {
            // Normalize item IDs based on type, accepting snake_case or camelCase
            $itemId = null;
            if ($itemType === 'product') {
                $itemId = $item['product_id'] ?? $item['productId'] ?? null;
            } else {
                $itemId = $item['service_id'] ?? $item['serviceId'] ?? null;
            }
            if (!$itemId) {
                // Skip items without an identifiable id
                continue;
            }

            $quantity = isset($item['quantity']) ? (int) $item['quantity'] : 1;

            // Determine unit price when not provided
            if (isset($item['unit_price'])) {
                $unitPrice = (float) $item['unit_price'];
            } else {
                if ($itemType === 'service') {
                    $service = Service::find($itemId);
                    $unitPrice = $service->post_value1 ?? 0;
                } else {
                    $product = Product::find($itemId);
                    $unitPrice = $product->post_value1 ?? 0;
                }
            }

            // Calculate total price when not provided
            $totalPrice = isset($item['total_price'])
                ? (float) $item['total_price']
                : ($unitPrice * $quantity);

            ServiceOrderItem::create([
                'service_order_id' => $serviceOrder->id,
                'item_type' => $itemType,
                'item_id' => $itemId,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'total_price' => $totalPrice,
                'notes' => $item['notes'] ?? null,
            ]);
        }
    }

    /**
     * Add services to service order by service IDs.
     */
    private function addServicesByIds(ServiceOrder $serviceOrder, array $serviceIds)
    {
        // Verificar se o service_order_id é válido
        if (!$serviceOrder->id) {
            throw new \Exception('Service Order ID is null. Cannot add services.');
        }

        foreach ($serviceIds as $serviceId) {
            // Buscar o serviço pelo ID
            $service = Service::find($serviceId);

            if (!$service) {
                // Log ou continuar se o serviço não for encontrado
                continue;
            }

            // Usar valor padrão de 100.00 já que post_value1 não existe na tabela atual
            $unitPrice = $service->post_value1 ?? 0;
            $quantity = 1; // Quantidade padrão
            $totalPrice = $unitPrice * $quantity;

            ServiceOrderItem::create([
                'service_order_id' => $serviceOrder->id,
                'item_type' => 'service',
                'item_id' => $serviceId,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'total_price' => $totalPrice,
                'notes' => null,
            ]);
        }
    }

    /**
     * Transform service order data for API response.
     */
    private function transformServiceOrder($serviceOrder)
    {
        $assigned_user = User::find($serviceOrder['assigned_to']);
        $data = [
            'id' => $serviceOrder['id'],
            'doc_type' => $serviceOrder['doc_type'],
            'title' => $serviceOrder['title'],
            'description' => $serviceOrder['description'],
            'object_id' => $serviceOrder['object_id'],
            'object_type' => $serviceOrder['object_type'],
            'aircraft_id' => $serviceOrder['object_type'] === 'aircraft' ? $serviceOrder['object_id'] : null, // Para compatibilidade
            'aricraft_data' => $serviceOrder['object_type'] === 'aircraft' ? (new AircraftController())->get_data($serviceOrder['object_id']) : null,
            'assigned_to' => $serviceOrder['assigned_to'],
            'assigned_user' => $assigned_user,
            'client_id' => $serviceOrder['client_id'],
            'status' => $serviceOrder['status'],
            'priority' => $serviceOrder['priority'],
            'estimated_start_date' => $serviceOrder['estimated_start_date'],
            'estimated_end_date' => $serviceOrder['estimated_end_date'],
            'actual_start_date' => $serviceOrder['actual_start_date'],
            'actual_end_date' => $serviceOrder['actual_end_date'],
            'notes' => $serviceOrder['notes'],
            'funnelId' => $serviceOrder['funnel_id'],
            'stageId' => $serviceOrder['stage_id'],
            'funnel_id' => $serviceOrder['funnel_id'],
            'stage_id' => $serviceOrder['stage_id'],
            'internal_notes' => $serviceOrder['internal_notes'],
            'total_amount' => $serviceOrder['total_amount'],
            'created_at' => $serviceOrder['created_at'],
            'updated_at' => $serviceOrder['updated_at'],
            'deleted_at' => $serviceOrder['deleted_at'] ?? null,
        ];
        // Add relationships
        if (isset($serviceOrder['aircraft'])) {
            // dd($serviceOrder['aircraft']);
            $data['aircraft'] = (new AircraftController())->map_aircraft($serviceOrder['aircraft']);
            // dd($data->toArray());
        }
        if (isset($serviceOrder['client'])) {
            $data['client'] = $serviceOrder['client'];
        }
        if (isset($serviceOrder['assigned_user'])) {
            $data['assigned_user'] = $serviceOrder['assigned_user'];
        }
        //pegar dados da etapa atraves do stage_id
        if (isset($serviceOrder['stage_id'])) {
            $data['stage'] = Stage::find($serviceOrder['stage_id'])->toArray();
        }
        //pegar dados do funnel atraves do funnel_id
        if (isset($serviceOrder['funnel_id'])) {
            $data['funnel'] = Funnel::find($serviceOrder['funnel_id'])->toArray();
        }

        // dd($data['funnel'], $data);


        // Transform items
        $data['products'] = [];
        $data['services'] = [];
        $map_service = new ServiceController();
        $map_product = new ProductController();
        if (isset($serviceOrder['items'])) {
            foreach ($serviceOrder['items'] as $item) {
                $itemData = [
                    'id' => $item['id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'total_price' => $item['total_price'],
                    'notes' => $item['notes'],
                ];
                if ($item['item_type'] === 'product') {
                    $itemData['product_id'] = $item['item_id'];
                    if (isset($item['product'])) {
                        $itemData['product'] = $map_product->map_product($item['product']);
                    }
                    $data['products'][] = $itemData;
                } elseif ($item['item_type'] === 'service') {
                    $itemData['service_id'] = $item['item_id'];
                    if (isset($item['service'])) {
                        $itemData['service'] = $map_service->map_service($item['service']);
                    }
                    $data['services'][] = $itemData;
                }
            }
        }

        return $data;
    }

    /**
     * Verificar e salvar dados de cliente usando campos contact_*
     *
     * @param Request $request
     * @return int Client ID
     */
    private function handleClientData(Request $request): string
    {
        $contactEmail = $request->contact_email;
        $contactName = $request->contact_name;
        $contactPhone = $request->contact_phone;

        // Verificar se já existe um cliente com este email
        $existingClient = null;
        if ($contactEmail) {
            $existingClient = Client::where('email', $contactEmail)->first();
        }
        if ($existingClient) {
            // Atualizar dados do cliente existente se necessário
            $updateData = [];
            if ($contactName && $existingClient->name !== $contactName) {
                $updateData['name'] = $contactName;
            }
            if ($contactPhone) {
                // Garantir que config seja sempre um array
                $currentConfig = $existingClient->config;
                if (is_string($currentConfig)) {
                    $currentConfig = json_decode($currentConfig, true) ?? [];
                } elseif (!is_array($currentConfig)) {
                    $currentConfig = [];
                }

                // Verificar se precisa atualizar o telefone
                if (!isset($currentConfig['phone']) || $currentConfig['phone'] !== $contactPhone) {
                    $currentConfig['celular'] = (string)$contactPhone;
                    $currentConfig['phone'] = $contactPhone;
                    $updateData['config'] = $currentConfig;
                }
            }

            if (!empty($updateData)) {
                $existingClient->update($updateData);
            }
            // dd($existingClient);
            return $existingClient->id;
        }
        // Criar novo cliente
        $clientData = [
            'name' => $contactName ?? 'Cliente',
            'email' => $contactEmail,
            'tipo_pessoa' => 'pf', // pessoa física por padrão
            'status' => 'actived',
            'ativo' => 's',
            'permission_id' => Qlib::qoption('permission_client_id') ?? 5, // ID da permissão de cliente
            'token' => Qlib::token(),
            'config' => [
                'celular' => $contactPhone
            ]
        ];
        $client = Client::create($clientData);
        //se o cliente foi cadastro com sucesso retorna o id do cliente em array
        $clientId = $client->id;
        // $client_save = Client::find($clientId);
        // dd($clientId,$client_save);

        return (string) $clientId;
    }

    /**
     * Verificar e salvar aeronave usando modelo Aircraft
     *
     * @param Request $request
     * @param int $clientId
     * @return int Aircraft ID
     */
    private function handleAircraftData(Request $request, string $clientId): string
    {
        $aircraftRegistration = $request->aircraft_registration;
        $description = $request->description;
        $rabData = $request->rab_data;

        // Verificar se já existe uma aeronave com esta matrícula (post_title)
        $existingAircraft = Aircraft::where('post_title', $aircraftRegistration)
                                  ->where('excluido', '!=', 's')
                                  ->where('deletado', '!=', 's')
                                  ->first();
                                  if ($existingAircraft) {
                                      // Atualizar dados da aeronave existente se necessário
            $updateData = [];
            if ($description && $existingAircraft->post_content !== $description) {
                $updateData['post_content'] = $description;
            }
            if ($rabData && $existingAircraft->config !== $rabData) {
                $updateData['config'] = $rabData;
            }
            if ($clientId && $existingAircraft->guid !== $clientId) {
                $updateData['guid'] = $clientId;
            }

            if (!empty($updateData)) {
                $existingAircraft->update($updateData);
            }
            // dd($existingAircraft);

            return (int) $existingAircraft['ID'];
        }

        // Criar nova aeronave usando o AircraftController
        $aircraftController = new AircraftController();

        // Preparar dados para o AircraftController->store()
        $aircraftRequest = new Request([
            'matricula' => $aircraftRegistration,
            'description' => $description,
            'config' => $rabData,
            'client_id' => $clientId
        ]);

        // Simular o usuário atual para o AircraftController
        $aircraftRequest->setUserResolver(function () {
            return request()->user();
        });

        // Chamar o método store do AircraftController
        $response = $aircraftController->store($aircraftRequest);
        $responseData = $response->getData(true);

        if ($response->getStatusCode() === 201 && isset($responseData['data']['id'])) {
            return (int) $responseData['data']['id'];
        }

        // Se falhar, criar diretamente no modelo Aircraft
        $aircraftData = [
            'post_title' => $aircraftRegistration,
            'post_content' => $description ?? '',
            'post_type' => 'aircraft',
            'post_status' => 'publish',
            'post_author' => request()->user()->id,
            'guid' => $clientId,
            'config' => $rabData,
            'token' => Qlib::token(),
            'post_name' => strtolower(str_replace(' ', '-', $aircraftRegistration)),
            'ativo' => 's',
            'excluido' => 'n',
            'deletado' => 'n'
        ];

        $aircraft = Aircraft::create($aircraftData);
        return (string) $aircraft->id;
    }
}
