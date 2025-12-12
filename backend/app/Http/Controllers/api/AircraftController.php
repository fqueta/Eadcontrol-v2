<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Aircraft;
use App\Models\Client;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AircraftController extends Controller
{
    protected PermissionService $permissionService;
    public $routeName;
    public $sec;

    /**
     * Construtor do controlador
     */
    public function __construct()
    {
        $this->routeName = request()->route()->getName();
        $this->permissionService = new PermissionService();
        $this->sec = request()->segment(3);
    }

    /**
     * Sanitiza os dados recebidos, inclusive arrays como config
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
     * Listar todos os aircraft
     */
    public function index(Request $request)
    {
        // $this->authorize('ler', Aircraft::class);
        $dataForm = $this->sanitizeInput($request->all());
        $page = $dataForm['page'] ?? 1;
        $limit = $dataForm['limit'] ?? 10;
        $order = $dataForm['order'] ?? 'desc';
        $orderBy = $dataForm['orderBy'] ?? 'ID';
        $search = $dataForm['search'] ?? false;
        $searchFields = $dataForm['searchFields'] ?? ['post_title'];
        $where = $dataForm['where'] ?? false;
        $whereRaw = $dataForm['whereRaw'] ?? false;
        $include = $dataForm['include'] ?? '';
        $arr_ret = [];

        $query = Aircraft::query();

        // Verificar se deve incluir o cliente
        if ($include === 'client') {
            $query->with('client');
        }

        if ($search && is_array($searchFields) && count($searchFields)) {
            $query->where(function ($q) use ($search, $searchFields) {
                foreach ($searchFields as $field) {
                    $q->orWhere($field, 'like', "%{$search}%");
                }
            });
        }

        if ($where && is_array($where)) {
            foreach ($where as $condition) {
                if (isset($condition['field'], $condition['operator'], $condition['value'])) {
                    $query->where($condition['field'], $condition['operator'], $condition['value']);
                }
            }
        }

        if ($whereRaw) {
            $query->whereRaw($whereRaw);
        }

        $total = $query->count();
        $aircrafts = $query->orderBy($orderBy, $order)
            ->skip(($page - 1) * $limit)
            ->take($limit)
            ->get();

        $arr_ret['data'] = $aircrafts->map(function ($aircraft) use ($include) {
            return $this->map_aircraft($aircraft, $include);
        });

        $arr_ret['current_page'] = (int) $page;
        $arr_ret['last_page'] = (int) ceil($total / $limit);
        $arr_ret['per_page'] = (int) $limit;
        $arr_ret['total'] = (int) $total;

        return response()->json($arr_ret);
    }
    /**
     * Metodo para localizar uma aeronave pelo id e retornar os dados formatados
     */
    public function get_data($id, $include = ''){
        $aircraft = Aircraft::find($id);
        if(!$aircraft){
            return response()->json(['error' => 'Aeronave não encontrada'], 404);
        }
        return $this->map_aircraft($aircraft, $include);
    }
    public function map_aircraft($item, $include = ''){
        if(isset($item->config) && !empty($item->config)){
            // Verificar se config já é um array ou se é uma string JSON
            if(is_string($item->config)){
                $arr_config = json_decode($item->config, true);
            } else if(is_array($item->config)){
                $arr_config = $item->config;
            } else {
                $arr_config = [];
            }
        }else{
            $arr_config = [];
        }
        if(is_array($item)){
            $item = (object)$item;
        }

        $aircraft_data = [
            'id' => $item->ID,
            'client_id' => $item->guid,
            'config' => $item->config, // Manter como JSON string
            'description' => $item->post_content,
            'matricula' => $item->post_title,
            'rab' => $arr_config,
            'created_at' => $item->created_at,
            'updated_at' => $item->updated_at,
            'active' => $this->decode_status($item->post_status),
        ];

        // Incluir dados do cliente se solicitado
        if ($include === 'client' && isset($item->client)) {
            $client = $item->client;
            $client_config = [];

            if (isset($client->config) && !empty($client->config)) {
                // Verificar se config já é um array ou se é uma string JSON
                if(is_string($client->config)){
                    $client_config = json_decode($client->config, true);
                } else if(is_array($client->config)){
                    $client_config = $client->config;
                } else {
                    $client_config = [];
                }
            }

            $aircraft_data['client'] = [
                'id' => $client->id,
                'tipo_pessoa' => $client->tipo_pessoa,
                'email' => $client->email,
                'name' => $client->name,
                'cpf' => $client->cpf,
                'cnpj' => $client->cnpj,
                'razao' => $client->razao,
                'config' => $client_config,
                'genero' => $client->genero,
                'ativo' => $client->ativo,
                'created_at' => $client->created_at,
                'updated_at' => $client->updated_at,
            ];
        }

        return $aircraft_data;
    }

    /**
     * Criar um novo aircraft
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

        // Verifica se já existe aircraft deletado com a mesma matrícula
        if (!empty($request->matricula)) {
            $aircraftTitleDel = Aircraft::withoutGlobalScope('notDeleted')
                ->where('post_title', $request->matricula)
                ->where('post_type', 'aircraft')
                ->where(function($q){
                    $q->where('deletado', 's')->orWhere('excluido', 's');
                })->first();
            if ($aircraftTitleDel) {
                return response()->json([
                    'message' => 'Este aircraft já está em nossa base de dados, verifique na lixeira.',
                    'errors'  => ['matricula' => ['Aircraft com esta matrícula está na lixeira']],
                ], 422);
            }
        }

        $validator = Validator::make($request->all(), [
            // Campos do frontend
            'client_id'     => 'required|string|max:255',
            'config'        => 'required|string', // JSON string do frontend
            'description'   => 'nullable|string',
            'matricula'     => 'required|string|max:255',

            // Campos opcionais do backend (para compatibilidade)
            'post_title'    => 'nullable|string|max:255',
            'post_content'  => 'nullable|string',
            'post_excerpt'  => 'nullable|string',
            'post_status'   => ['nullable', Rule::in(['publish', 'draft', 'private', 'pending'])],
            'comment_status' => ['nullable', Rule::in(['open', 'closed'])],
            'ping_status'   => ['nullable', Rule::in(['open', 'closed'])],
            'post_password' => 'nullable|string|max:255',
            'post_name'     => 'nullable|string|max:200|unique:posts,post_name',
            'to_ping'       => ['nullable', Rule::in(['n', 's'])],
            'pinged'        => 'nullable|string',
            'post_content_filtered' => 'nullable|string',
            'post_parent'   => 'nullable|integer|exists:posts,ID',
            'guid'          => 'nullable|string|max:255',
            'menu_order'    => 'nullable|integer',
            'post_mime_type' => 'nullable|string|max:100',
            'comment_count' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        // Mapear campos do frontend para campos do banco
        $mappedData = [];

        // Mapeamento dos campos principais
        $mappedData['post_title'] = $validated['matricula']; // matricula -> post_title
        $mappedData['post_content'] = $validated['description'] ?? ''; // description -> post_content
        $mappedData['config'] = $validated['config']; // config já vem como JSON string
        $mappedData['guid'] = $validated['client_id']; // client_id -> guid

        // Manter campos do backend se fornecidos
        if (isset($validated['post_excerpt'])) $mappedData['post_excerpt'] = $validated['post_excerpt'];
        if (isset($validated['post_status'])) $mappedData['post_status'] = $validated['post_status'];
        if (isset($validated['comment_status'])) $mappedData['comment_status'] = $validated['comment_status'];
        if (isset($validated['ping_status'])) $mappedData['ping_status'] = $validated['ping_status'];
        if (isset($validated['post_password'])) $mappedData['post_password'] = $validated['post_password'];
        if (isset($validated['post_name'])) $mappedData['post_name'] = $validated['post_name'];
        if (isset($validated['to_ping'])) $mappedData['to_ping'] = $validated['to_ping'];
        if (isset($validated['pinged'])) $mappedData['pinged'] = $validated['pinged'];
        if (isset($validated['post_content_filtered'])) $mappedData['post_content_filtered'] = $validated['post_content_filtered'];
        if (isset($validated['post_parent'])) $mappedData['post_parent'] = $validated['post_parent'];
        if (isset($validated['menu_order'])) $mappedData['menu_order'] = $validated['menu_order'];
        if (isset($validated['post_mime_type'])) $mappedData['post_mime_type'] = $validated['post_mime_type'];
        if (isset($validated['comment_count'])) $mappedData['comment_count'] = $validated['comment_count'];

        // Sanitização dos dados
        $mappedData = $this->sanitizeInput($mappedData);

        // Gerar token único
        $mappedData['token'] = Qlib::token();

        // Definir autor como usuário logado
        $mappedData['post_author'] = $user->id;

        // Valores padrão
        // $mappedData['post_status'] = $mappedData['post_status'] ?? 'draft';
        $mappedData['post_status'] = $mappedData['post_status'] ?? 'publish';
        $mappedData['comment_status'] = $mappedData['comment_status'] ?? 'open';
        $mappedData['ping_status'] = $mappedData['ping_status'] ?? 'open';
        $mappedData['post_type'] = 'aircraft'; // Forçar tipo aircraft
        $mappedData['menu_order'] = $mappedData['menu_order'] ?? 0;
        $mappedData['comment_count'] = $mappedData['comment_count'] ?? 0;
        $mappedData['excluido'] = 'n';
        $mappedData['deletado'] = 'n';

        // Gerar post_name se não fornecido
        if (empty($mappedData['post_name'])) {
            $aircraft = new Aircraft();
            $mappedData['post_name'] = $aircraft->generateSlug($mappedData['post_title']);
        }

        // Config já vem como JSON string do frontend, não precisa converter

        $aircraft = Aircraft::create($mappedData);

        // Preparar resposta no formato do frontend
        $responseData = $this->map_aircraft($aircraft);

        return response()->json([
            'data' => $responseData,
            'message' => 'Aircraft criado com sucesso',
            'status' => 201,
        ], 201);
    }

    /**
     * Exibir um aircraft específico
     */
    public function show(string $id)
    {
        $user = request()->user();
        // dd($user);
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $aircraft = Aircraft::findOrFail($id);
        // Preparar resposta no formato do frontend
        $responseData = [
            'id' => $aircraft->ID,
            'client' => ['name'=>Qlib::get_user_name($aircraft->guid)],
            'client_id' => $aircraft->guid,
            'config' => $aircraft->config, // Manter como JSON string
            'description' => $aircraft->post_content,
            'matricula' => $aircraft->post_title,
            'created_at' => $aircraft->created_at,
            'updated_at' => $aircraft->updated_at,
            'active' => $this->decode_status($aircraft->post_status),
        ];

        return response()->json([
            'data' => $responseData,
            'message' => 'Aircraft atualizado com sucesso',
            'status' => 200,
        ], 200);
    }

    /**
     * Atualizar um aircraft
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

        $aircraftToUpdate = Aircraft::findOrFail($id);
        $d = $request->all();
        $d['post_status']= $this->get_status($d['active']);
        // dd($d);
        $validator = Validator::make($d, [
            // Campos do frontend
            'client_id'     => 'sometimes|required|string|max:255',
            'config'        => 'sometimes|required|string', // JSON string do frontend
            'description'   => 'nullable|string',
            'matricula'     => 'sometimes|required|string|max:255',

            // Campos opcionais do backend (para compatibilidade)
            'post_title'    => 'nullable|string|max:255',
            'post_content'  => 'nullable|string',
            'post_excerpt'  => 'nullable|string',
            'post_status'   => ['nullable', Rule::in(['publish', 'draft', 'private', 'pending'])],
            'comment_status' => ['nullable', Rule::in(['open', 'closed'])],
            'ping_status'   => ['nullable', Rule::in(['open', 'closed'])],
            'post_password' => 'nullable|string|max:255',
            'post_name'     => ['nullable', 'string', 'max:200', Rule::unique('posts', 'post_name')->ignore($aircraftToUpdate->ID, 'ID')],
            'to_ping'       => ['nullable', Rule::in(['n', 's'])],
            'pinged'        => 'nullable|string',
            'post_content_filtered' => 'nullable|string',
            'post_parent'   => 'nullable|integer|exists:posts,ID',
            'guid'          => 'nullable|string|max:255',
            'menu_order'    => 'nullable|integer',
            'post_mime_type' => 'nullable|string|max:100',
            'comment_count' => 'nullable|integer',
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

        // Mapeamento dos campos principais (se fornecidos)
        if (isset($validated['matricula'])) {
            $mappedData['post_title'] = $validated['matricula']; // matricula -> post_title
        }
        if (isset($validated['description'])) {
            $mappedData['post_content'] = $validated['description']; // description -> post_content
        }
        if (isset($validated['config'])) {
            $mappedData['config'] = $validated['config']; // config já vem como JSON string
        }
        if (isset($validated['client_id'])) {
            $mappedData['guid'] = $validated['client_id']; // client_id -> guid
        }

        // Manter campos do backend se fornecidos
        if (isset($validated['post_title'])) $mappedData['post_title'] = $validated['post_title'];
        if (isset($validated['post_content'])) $mappedData['post_content'] = $validated['post_content'];
        if (isset($validated['post_excerpt'])) $mappedData['post_excerpt'] = $validated['post_excerpt'];
        if (isset($validated['post_status'])) $mappedData['post_status'] = $validated['post_status'];
        if (isset($validated['comment_status'])) $mappedData['comment_status'] = $validated['comment_status'];
        if (isset($validated['ping_status'])) $mappedData['ping_status'] = $validated['ping_status'];
        if (isset($validated['post_password'])) $mappedData['post_password'] = $validated['post_password'];
        if (isset($validated['post_name'])) $mappedData['post_name'] = $validated['post_name'];
        if (isset($validated['to_ping'])) $mappedData['to_ping'] = $validated['to_ping'];
        if (isset($validated['pinged'])) $mappedData['pinged'] = $validated['pinged'];
        if (isset($validated['post_content_filtered'])) $mappedData['post_content_filtered'] = $validated['post_content_filtered'];
        if (isset($validated['post_parent'])) $mappedData['post_parent'] = $validated['post_parent'];
        if (isset($validated['guid'])) $mappedData['guid'] = $validated['guid'];
        if (isset($validated['menu_order'])) $mappedData['menu_order'] = $validated['menu_order'];
        if (isset($validated['post_mime_type'])) $mappedData['post_mime_type'] = $validated['post_mime_type'];
        if (isset($validated['comment_count'])) $mappedData['comment_count'] = $validated['comment_count'];

        // Sanitização dos dados
        $mappedData = $this->sanitizeInput($mappedData);

        // Garantir que o post_type permaneça como aircraft
        $mappedData['post_type'] = 'aircraft';

        // Config já vem como JSON string do frontend, não precisa converter
        // dd($mappedData);
        $aircraftToUpdate->update($mappedData);

        // Preparar resposta no formato do frontend
        $responseData = $this->map_aircraft($aircraftToUpdate);

        return response()->json([
            'exec' => true,
            'data' => $responseData,
            'message' => 'Aircraft atualizado com sucesso',
            'status' => 200,
        ]);
    }

    /**
     * Mover aircraft para lixeira (soft delete)
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

        $aircraftToDelete = Aircraft::find($id);
        if (!$aircraftToDelete) {
            return response()->json(['error' => 'Aircraft não encontrado'], 404);
        }

        $aircraftToDelete->update([
            'excluido'     => 's',
            'deletado'     => 's',
            'reg_deletado' => json_encode([
                'data' => now()->toDateTimeString(),
                'user_id' => request()->user()->id
            ]),
        ]);

        return response()->json([
            'message' => 'Aircraft marcado como deletado com sucesso'
        ], 200);
    }

    /**
     * Listar aircraft na lixeira
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

        $query = Aircraft::onlyTrashed()->orderBy($order_by, $order);

        // Filtros opcionais
        if ($request->filled('post_title')) {
            $query->where('post_title', 'like', '%' . $request->input('post_title') . '%');
        }
        if ($request->filled('post_author')) {
            $query->where('post_author', $request->input('post_author'));
        }

        $aircraft = $query->paginate($perPage);

        // Transformar dados para o formato do frontend
        $aircraft->getCollection()->transform(function ($item) {
            return [
                'client_id' => $item->guid,
                'config' => $item->config, // Manter como JSON string
                'description' => $item->post_content,
                'matricula' => $item->post_title,
            ];
        });

        return response()->json($aircraft);
    }

    /**
     * Restaurar aircraft da lixeira
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

        $aircraft = Aircraft::withoutGlobalScope('notDeleted')
                   ->where('ID', $id)
                   ->where('post_type', 'aircraft')
                   ->where(function($q) {
                       $q->where('deletado', 's')->orWhere('excluido', 's');
                   })
                   ->first();

        if (!$aircraft) {
            return response()->json(['error' => 'Aircraft não encontrado na lixeira'], 404);
        }

        $aircraft->update([
            'excluido' => 'n',
            'deletado' => 'n',
            'reg_excluido' => null,
            'reg_deletado' => null,
        ]);

        return response()->json([
            'message' => 'Aircraft restaurado com sucesso'
        ], 200);
    }

    /**
     * Excluir aircraft permanentemente
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

        $aircraft = Aircraft::withoutGlobalScope('notDeleted')
                   ->where('ID', $id)
                   ->where('post_type', 'aircraft')
                   ->where(function($q) {
                       $q->where('deletado', 's')->orWhere('excluido', 's');
                   })
                   ->first();

        if (!$aircraft) {
            return response()->json(['error' => 'Aircraft não encontrado na lixeira'], 404);
        }

        $aircraft->forceDelete();

        return response()->json([
            'message' => 'Aircraft excluído permanentemente'
        ], 200);
    }
    /**
     * Obter status do aircraft
     * @param string $status
     * @return string
     */
    public function get_status($status=false){
        if($status){
            $status = 'publish';
        }else{
            $status = 'draft';
        }
        return $status;
    }
    /**
     * Decodificar status do aircraft
     * @param string $status
     * @return bool
     */
    public function decode_status($status){
        if($status == 'publish'){
            $status = true;
        }elseif($status == 'draft'){
            $status = false;
        }else{
            $status = false;
        }
        return $status;
    }
}
