<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Stage;
use App\Models\User;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ClientController extends Controller
{
    protected PermissionService $permissionService;
    public $routeName;
    public $sec;
    public $cliente_permission_id;
    /**
     * ID de permissão para Responsáveis (clientes responsáveis).
     * EN: Permission ID for Guardians (responsáveis).
     */
    protected int $responsavel_permission_id = 8;
    public function __construct()
    {
        $this->cliente_permission_id = Qlib::qoption('permission_client_id');
        $this->routeName = request()->route()->getName();
        $this->permissionService = new PermissionService();
        $this->sec = request()->segment(3);
    }

    /**
     * Listar todos os clientes
     *
     * Filtros suportados via query params:
     * - `search`: termo para buscar em `email`, `cpf`, `cnpj`, `name`.
     * - `email`, `cpf`, `cnpj`: filtros específicos por campo.
     * - `stage_id` ou `stageId`: filtra clientes pelo estágio atual (busca em JSON `config.stage_id` ou `preferencias.pipeline.stage_id`).
     * - `funnel_id` ou `funnelId`: filtra clientes pelo funil (derivado via `stage_id` -> `stages.funnel_id`).
     * - `per_page`, `order_by`, `order`: paginação e ordenação.
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

        $query = Client::query()->where('permission_id','=', $this->cliente_permission_id)->orderBy($order_by, $order);

        // Não exibir registros marcados como deletados ou excluídos
        //adicionar filtro para a lixeira onde excluido=s
        // $query->where(function($q) {
        //     $q->whereNull('deletado')->orWhere('deletado', '!=', 's');
        // });
        if($request->filled('excluido') && $request->input('excluido') == 's'){
            $query->where('excluido', 's');
        }else{
            // Não exibir registros marcados como deletados ou excluídos
            $query->where(function($q) {
                $q->whereNull('deletado')->orWhere('deletado', '!=', 's');
            });
            $query->where(function($q) {
                $q->whereNull('excluido')->orWhere('excluido', '!=', 's');
            });
        }
        //adiciona filtro search por email, cpf ou cnpj ou nome
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('email', 'like', '%' . $search . '%')
                  ->orWhere('cpf', 'like', '%' . $search . '%')
                  ->orWhere('celular', 'like', '%' . $search . '%')
                  ->orWhere('cnpj', 'like', '%' . $search . '%')
                  ->orWhere('name', 'like', '%' . $search . '%');
            });
        }
        if ($request->filled('email')) {
            $query->where('email', 'like', '%' . $request->input('email') . '%');
        }
        if ($request->filled('cpf')) {
            $query->where('cpf', 'like', '%' . $request->input('cpf') . '%');
        }
        if ($request->filled('cnpj')) {
            $query->where('cnpj', 'like', '%' . $request->input('cnpj') . '%');
        }
        if ($request->filled('celular')) {
            $query->where('celular', 'like', '%' . $request->input('celular') . '%');
        }
        // Filtro por stage (stage_id ou stageId) usando JSON em config/preferencias
        if ($request->filled('stage_id') || $request->filled('stageId')) {
            $stageId = (int) ($request->input('stage_id') ?? $request->input('stageId'));
            $query->where(function($q) use ($stageId) {
                $q->whereRaw("CAST(JSON_UNQUOTE(JSON_EXTRACT(`config`, '$.stage_id')) AS UNSIGNED) = ?", [$stageId])
                  ->orWhereRaw("CAST(JSON_UNQUOTE(JSON_EXTRACT(`preferencias`, '$.pipeline.stage_id')) AS UNSIGNED) = ?", [$stageId]);
            });
        }

        // Filtro por funil (funnel_id ou funnelId) derivado via stage_id
        if ($request->filled('funnel_id') || $request->filled('funnelId')) {
            $funnelId = (int) ($request->input('funnel_id') ?? $request->input('funnelId'));
            // Obter todos os stage_ids pertencentes ao funil informado
            $stageIds = \App\Models\Stage::where('funnel_id', $funnelId)->pluck('id')->all();
            $query->where(function($q) use ($stageIds) {
                if (empty($stageIds)) {
                    // Nenhum estágio para este funil: força vazio
                    $q->whereRaw('1 = 0');
                } else {
                    $placeholders = implode(',', array_fill(0, count($stageIds), '?'));
                    $q->whereRaw("CAST(JSON_UNQUOTE(JSON_EXTRACT(`config`, '$.stage_id')) AS UNSIGNED) IN ($placeholders)", $stageIds)
                      ->orWhereRaw("CAST(JSON_UNQUOTE(JSON_EXTRACT(`preferencias`, '$.pipeline.stage_id')) AS UNSIGNED) IN ($placeholders)", $stageIds);
                }
            });
        }
        //quero debugar a query em sql string completa
        // dd([
        //     'sql_string' => vsprintf($query->toSql(), $query->getBindings()),
        //     'bindings' => $query->getBindings(),
        // ]);
        $clients = $query->paginate($perPage);

        // Mapear campos para compatibilidade no resultado do index
        $clients->getCollection()->transform(function ($client) {
            return $this->mapIndexItemOutput($client);
        });

        return response()->json($clients);
    }

    /**
     * Mapeia campos de um item na listagem (index) para compatibilidade com o front-end.
     *
     * - Converte config de JSON para array e normaliza valores nulos.
     * - Adiciona alias em camelCase mantendo os originais em snake_case.
     * - Normaliza campo de ativo ('s'/'n') para booleano em "active".
     */
    private function mapIndexItemOutput($client): array
    {
        // Base em array para manipulação
        $data = is_array($client) ? $client : $client->toArray();

        // Converter config para array e substituir null por string vazia
        if (isset($data['config'])) {
            if (is_string($data['config'])) {
                $configArr = json_decode($data['config'], true) ?? [];
                array_walk($configArr, function (&$value) {
                    if (is_null($value)) {
                        $value = (string)'';
                    }
                });
                $data['config'] = $configArr;
            } elseif (is_array($data['config'])) {
                array_walk($data['config'], function (&$value) {
                    if (is_null($value)) {
                        $value = (string)'';
                    }
                });
            }
        }

        // Garantir estrutura de preferencias
        if (!isset($data['preferencias']) || !is_array($data['preferencias'])) {
            $data['preferencias'] = [];
        }
        if (!isset($data['preferencias']['pipeline']) || !is_array($data['preferencias']['pipeline'])) {
            $data['preferencias']['pipeline'] = [];
        }

        // Copiar stage_id para preferencias.pipeline a partir de config, se existir
        if (isset($data['config']) && is_array($data['config']) && isset($data['config']['stage_id'])) {
            $data['preferencias']['pipeline']['stage_id'] = $data['config']['stage_id'];
        }
        // Se preferências.pipeline.stage_id estiver presente mas config.stage_id não, reflete em config
        if (isset($data['preferencias']['pipeline']['stage_id']) && (!isset($data['config']['stage_id']) || empty($data['config']['stage_id']))) {
            $data['config']['stage_id'] = $data['preferencias']['pipeline']['stage_id'];
        }
        // Derivar funnelId via Stage quando possível
        if (isset($data['config']['stage_id']) && (!isset($data['config']['funnelId']) || empty($data['config']['funnelId']))) {
            $stageId = $data['config']['stage_id'];
            $stage = null;
            try {
                $stage = Stage::select(['id','funnel_id'])->find($stageId);
            } catch (\Exception $e) {
                $stage = null;
            }
            if ($stage && isset($stage->funnel_id)) {
                $data['config']['funnelId'] = $stage->funnel_id;
            }
        }

        // Aliases em camelCase (mantendo originais)
        $data['createdAt'] = $data['created_at'] ?? null;
        $data['updatedAt'] = $data['updated_at'] ?? null;
        $data['permissionId'] = $data['permission_id'] ?? null;
        $data['tipoPessoa'] = $data['tipo_pessoa'] ?? null;

        // Normalizar ativo para booleano em alias "active"
        if (array_key_exists('ativo', $data)) {
            $data['active'] = ($data['ativo'] === 's');
        }

        // Enriquecer autor_name quando possível
        if (isset($data['autor']) && !empty($data['autor']) && is_numeric($data['autor'])) {
            $autorUser = null;
            try {
                $autorUser = User::find($data['autor']);
            } catch (\Exception $e) {
                $autorUser = null;
            }
            if ($autorUser) {
                $data['autor_name'] = $autorUser->name ?? null;
            }
        }
        // Garantir chaves esperadas mesmo que nulas
        $data['points'] = $data['points'] ?? null;
        $data['is_alloyal'] = $data['is_alloyal'] ?? null;

        return $data;
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
     * Normaliza strings opcionais para null quando vazias.
     * Normalize optional string inputs to null when empty.
     */
    private function normalizeOptionalString($value): ?string
    {
        if ($value === null) {
            return null;
        }
        if (is_string($value)) {
            $trimmed = trim($value);
            return $trimmed === '' ? null : $trimmed;
        }
        return null;
    }

    /**
     * Criar um novo cliente
     *
     * Nota/Note: Força `permission_id = 7` na criação para
     * padronizar clientes no grupo correto.
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

        // Verificar se o email já existe na lixeira
        if ($request->filled('email')) {
            $existingUser = Client::withoutGlobalScope('client')
                ->where('email', $request->email)
                ->where(function($q) {
                    $q->where('deletado', 's')->orWhere('excluido', 's');
                })
                ->first();

            if ($existingUser) {
                return response()->json([
                    'message' => 'Este cadastro já está em nossa base de dados, verifique na lixeira.',
                    'errors'  => ['email' => ['Cadastro com este e-mail está na lixeira']],
                ], 422);
            }
        }
        // verificar se ja existe o celular na lixeira
        if ($request->filled('celular')) {
            $existingUser = Client::withoutGlobalScope('client')
                ->where('celular', $request->celular)
                ->where(function($q) {
                    $q->where('deletado', 's')->orWhere('excluido', 's');
                })
                ->first();

            if ($existingUser) {
                return response()->json([
                    'message' => 'Este cadastro já está em nossa base de dados, verifique na lixeira.',
                    'errors'  => ['celular' => ['Cadastro com este celular está na lixeira']],
                ], 422);
            }
        }
        //remover a mascara do celular
        if ($request->filled('celular')) {
            $request->merge([
                'celular' => preg_replace('/\D/', '', $request->celular),
            ]);
        }
        // Normalizar campos opcionais para null quando vazios (evita unique com "")
        $request->merge([
            'email'   => $this->normalizeOptionalString($request->get('email')),
            'cpf'     => $this->normalizeOptionalString($request->get('cpf')),
            'cnpj'    => $this->normalizeOptionalString($request->get('cnpj')),
            'celular' => $this->normalizeOptionalString($request->get('celular')),
        ]);
        // Verificar se o CPF ou CNPJ já existe na lixeira
        if ($request->filled('cpf') || $request->filled('cnpj')) {
            $existingUser = Client::withoutGlobalScope('client')
                ->where(function($q) use ($request) {
                    $q->where('cpf', $request->cpf)->orWhere('cnpj', $request->cnpj);
                })
                ->where(function($q) {
                    $q->where('deletado', 's')->orWhere('excluido', 's');
                })
                ->first();

            if ($existingUser) {
                return response()->json([
                    'message' => 'Este cadastro já está em nossa base de dados, verifique na lixeira.',
                    'errors'  => ['cpf' => ['Cadastro com este CPF está na lixeira'], 'cnpj' => ['Cadastro com este CNPJ está na lixeira']],
                ], 422);
            }
        }

        $request->merge([
            'tipo_pessoa' => $request->get('tipo_pessoa') ? $request->get('tipo_pessoa') : 'pf',
            'genero' => $request->get('genero') ? $request->get('genero') : 'ni',
        ]);

        $validator = Validator::make($request->all(), [
            'tipo_pessoa'   => ['required', Rule::in(['pf','pj'])],
            'name'          => 'required|string|max:255',
            'razao'         => 'nullable|string|max:255',
            'cpf'           => 'nullable|string|max:20|unique:users,cpf',
            'cnpj'          => 'nullable|string|max:20|unique:users,cnpj',
            'email'         => 'nullable|email|unique:users,email',
            'celular'         => 'nullable|celular|unique:users,celular',
            'password'      => 'nullable|string|min:6',
            'genero'        => ['required', Rule::in(['ni','m','f'])],
            'config'        => 'array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        // Validação extra de CPF
        if (!empty($request->cpf) && !Qlib::validaCpf($request->cpf)) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => ['cpf' => ['CPF inválido']],
            ], 422);
        }

        $validated = $validator->validated();
        // Sanitização dos dados
        $validated = $this->sanitizeInput($validated);
        $validated['token'] = Qlib::token();
        if(isset($validated['password'])){
            $validated['password'] = Hash::make($validated['password']);
        }
        $validated['ativo'] = isset($validated['ativo']) ? $validated['ativo'] : 's';
        $validated['status'] = isset($validated['status']) ? $validated['status'] : 'actived';
        $validated['tipo_pessoa'] = isset($validated['tipo_pessoa']) ? $validated['tipo_pessoa'] : 'pf';
        $validated['permission_id'] = $this->cliente_permission_id;
        $validated['config'] = isset($validated['config']) ? $this->sanitizeInput($validated['config']) : [];

        if(is_array($validated['config'])){
            $validated['config'] = json_encode($validated['config']);
        }
        // dd($validated);
        $client = Client::create($validated);
        // converter o client->config para array
        if (is_string($client->config)) {
            $client->config = json_decode($client->config, true) ?? [];
        }
        $ret['data'] = $client;
        $ret['message'] = 'Cliente criado com sucesso';
        $ret['status'] = 201;

        return response()->json($ret, 201);
    }

    /**
     * Exibir um cliente específico
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

        $client = Client::findOrFail($id);

        // Converter config para array
        if (is_string($client->config)) {
            $client->config = json_decode($client->config, true) ?? [];
        }

        return response()->json($client);
    }

    /**
     * Retorna dados do cliente
     */
    public function can_access(Request $request)
    {
        $user = $request->user();
        if(!$user){
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        return response()->json($user);
    }

    /**
     * Atualizar um cliente específico
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

        $clientToUpdate = Client::findOrFail($id);

        // Normalizar campos opcionais para null quando vazios (evita unique com "")
        $request->merge([
            'email'   => $this->normalizeOptionalString($request->get('email')),
            'cpf'     => $this->normalizeOptionalString($request->get('cpf')),
            'cnpj'    => $this->normalizeOptionalString($request->get('cnpj')),
            'celular' => $this->normalizeOptionalString($request->get('celular')),
        ]);

        $validator = Validator::make($request->all(), [
            'tipo_pessoa'   => ['sometimes', Rule::in(['pf','pj'])],
            'name'          => 'sometimes|required|string|max:255',
            'razao'         => 'nullable|string|max:255',
            'cpf'           => ['nullable','string','max:20', Rule::unique('users','cpf')->ignore($clientToUpdate->id)],
            'cnpj'          => ['nullable','string','max:20', Rule::unique('users','cnpj')->ignore($clientToUpdate->id)],
            'email'         => ['nullable','email', Rule::unique('users','email')->ignore($clientToUpdate->id)],
            'password'      => 'nullable|string|min:6',
            'genero'        => ['sometimes', Rule::in(['ni','m','f'])],
            'verificado'    => ['sometimes', Rule::in(['n','s'])],
            'config'        => 'array'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'exec'=>false,
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        // Validação extra de CPF
        if (!empty($request->cpf) && !Qlib::validaCpf($request->cpf)) {
            return response()->json([
                'exec'=>false,
                'message' => 'Erro de validação',
                'errors'  => ['cpf' => ['CPF inválido']],
            ], 422);
        }

        $validated = $validator->validated();

        // Sanitização dos dados
        $validated = $this->sanitizeInput($validated);

        // Tratar senha se fornecida
        if (isset($validated['password']) && !empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        // Garantir que permission_id seja sempre 5 (cliente)
        $validated['permission_id'] = $this->cliente_permission_id;

        // Tratar config se fornecido
        if (isset($validated['config'])) {
            $validated['config'] = $this->sanitizeInput($validated['config']);
            if (is_array($validated['config'])) {
                $validated['config'] = json_encode($validated['config']);
            }
        }
        // dd($validated);
        $clientToUpdate->update($validated);

        // Converter config para array na resposta
        if (is_string($clientToUpdate->config)) {
            $clientToUpdate->config = json_decode($clientToUpdate->config, true) ?? [];
        }

        $ret['data'] = $clientToUpdate;
        $ret['message'] = 'Cliente atualizado com sucesso';
        $ret['status'] = 200;

        return response()->json($ret);
    }

    /**
     * Mover cliente para a lixeira
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

        $client = Client::findOrFail($id);

        // Mover para lixeira em vez de excluir permanentemente
        $client->update([
            'ativo' => 'n',
            'status' => 'inactived',
            'excluido' => 's',
            'reg_deletado' => json_encode([
                'usuario' => $user->id,
                'nome' => $user->name,
                'created_at' => now(),
            ])
        ]);

        return response()->json([
            'exec'=>true,
            'message' => 'Cliente movido para a lixeira com sucesso',
            'status' => 200
        ]);
    }

    /**
     * Listar clientes na lixeira
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

        $query = Client::withoutGlobalScope('client')
            ->where('permission_id', $this->cliente_permission_id)
            ->where(function($q) {
                $q->where('deletado', 's')->orWhere('excluido', 's');
            })
            ->orderBy($order_by, $order);

        if ($request->filled('email')) {
            $query->where('email', 'like', '%' . $request->input('email') . '%');
        }
        if ($request->filled('cpf')) {
            $query->where('cpf', 'like', '%' . $request->input('cpf') . '%');
        }
        if ($request->filled('cnpj')) {
            $query->where('cnpj', 'like', '%' . $request->input('cnpj') . '%');
        }

        $clients = $query->paginate($perPage);

        // Converter config para array em cada cliente
        $clients->getCollection()->transform(function ($client) {
            if (is_string($client->config)) {
                $configArr = json_decode($client->config, true) ?? [];
                array_walk($configArr, function (&$value) {
                    if (is_null($value)) {
                        $value = (string)'';
                    }
                });
                $client->config = $configArr;
            }
            return $client;
        });

        return response()->json($clients);
    }

    /**
     * Restaurar cliente da lixeira
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

        $client = Client::withoutGlobalScope('client')
            ->where('id', $id)
            ->where(function($q) {
                $q->where('deletado', 's')->orWhere('excluido', 's');
            })
            ->where('permission_id', $this->cliente_permission_id)
            ->firstOrFail();

        $client->update([
            'deletado' => 'n',
            'excluido' => 'n',
            'ativo' => 's',
            'status' => 'actived',
            'reg_deletado' => null,
            'reg_excluido' => null
        ]);

        return response()->json([
            'message' => 'Cliente restaurado com sucesso',
            'status' => 200
        ]);
    }

    /**
     * Excluir cliente permanentemente
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

        $client = Client::withoutGlobalScope('client')
            ->where('id', $id)
            ->where('permission_id', $this->cliente_permission_id)
            ->firstOrFail();

        $client->delete();

        return response()->json([
            'message' => 'Cliente excluído permanentemente',
            'status' => 200
        ]);
    }

    /**
     * Listar responsáveis (clientes com permission_id=8) com paginação e filtros.
     * EN: List guardians (clients with permission_id=8) with pagination and filters.
     */
    public function responsaveisIndex(Request $request)
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

        $query = Client::withoutGlobalScope('client')
            ->where('permission_id', $this->responsavel_permission_id)
            ->orderBy($order_by, $order);

        // Não exibir registros marcados como deletados ou excluídos
        $query->where(function($q) {
            $q->whereNull('deletado')->orWhere('deletado', '!=', 's');
        });
        $query->where(function($q) {
            $q->whereNull('excluido')->orWhere('excluido', '!=', 's');
        });

        // Filtro search e campos individuais
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('email', 'like', '%' . $search . '%')
                  ->orWhere('cpf', 'like', '%' . $search . '%')
                  ->orWhere('cnpj', 'like', '%' . $search . '%')
                  ->orWhere('name', 'like', '%' . $search . '%');
            });
        }
        if ($request->filled('email')) {
            $query->where('email', 'like', '%' . $request->input('email') . '%');
        }
        if ($request->filled('cpf')) {
            $query->where('cpf', 'like', '%' . $request->input('cpf') . '%');
        }
        if ($request->filled('cnpj')) {
            $query->where('cnpj', 'like', '%' . $request->input('cnpj') . '%');
        }
        if ($request->filled('celular')) {
            $cel = preg_replace('/\D/', '', (string)$request->input('celular'));
            $query->where('celular', 'like', '%' . $cel . '%');
        }
        // Filtros por status simples
        if ($request->filled('ativo')) {
            $ativo = $request->input('ativo'); // esperado 's' ou 'n'
            $query->where('ativo', $ativo);
        }
        if ($request->filled('verificado')) {
            $verificado = $request->input('verificado'); // 's' ou 'n'
            $query->where('verificado', $verificado);
        }
        // Filtro por par chave/valor em config (match simples por string)
        if ($request->filled('config_key') && $request->filled('config_value')) {
            $key = $request->input('config_key');
            $val = $request->input('config_value');
            $query->where('config', 'like', '%"' . $key . '"%');
            $query->where('config', 'like', '%"' . $key . '"\s*:\s*"' . $val . '"%');
        }

        $clients = $query->paginate($perPage);

        $clients->getCollection()->transform(function ($client) {
            return $this->mapIndexItemOutput($client);
        });

        return response()->json($clients);
    }

    /**
     * Criar um novo responsável (permission_id=8).
     * EN: Create a new guardian (permission_id=8).
     */
    public function responsaveisStore(Request $request)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        // Remover máscara do celular
        if ($request->filled('celular')) {
            $request->merge(['celular' => preg_replace('/\D/', '', $request->celular)]);
        }
        // Normalizar campos opcionais para null quando vazios
        $request->merge([
            'email'   => $this->normalizeOptionalString($request->get('email')),
            'cpf'     => $this->normalizeOptionalString($request->get('cpf')),
            'cnpj'    => $this->normalizeOptionalString($request->get('cnpj')),
            'celular' => $this->normalizeOptionalString($request->get('celular')),
        ]);

        $request->merge([
            'tipo_pessoa' => $request->get('tipo_pessoa') ? $request->get('tipo_pessoa') : 'pf',
            'genero' => $request->get('genero') ? $request->get('genero') : 'ni',
        ]);

        $validator = Validator::make($request->all(), [
            'tipo_pessoa'   => ['required', Rule::in(['pf','pj'])],
            'name'          => 'required|string|max:255',
            'razao'         => 'nullable|string|max:255',
            'cpf'           => 'nullable|string|max:20|unique:users,cpf',
            'cnpj'          => 'nullable|string|max:20|unique:users,cnpj',
            'email'         => 'nullable|email|unique:users,email',
            'celular'       => 'nullable|celular|unique:users,celular',
            'password'      => 'nullable|string|min:6',
            'genero'        => ['required', Rule::in(['ni','m','f'])],
            'config'        => 'array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        if (!empty($request->cpf) && !Qlib::validaCpf($request->cpf)) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => ['cpf' => ['CPF inválido']],
            ], 422);
        }

        $validated = $validator->validated();
        $validated = $this->sanitizeInput($validated);
        $validated['token'] = Qlib::token();
        if(isset($validated['password'])){
            $validated['password'] = Hash::make($validated['password']);
        }
        $validated['ativo'] = $validated['ativo'] ?? 's';
        $validated['status'] = $validated['status'] ?? 'actived';
        $validated['tipo_pessoa'] = $validated['tipo_pessoa'] ?? 'pf';
        $validated['permission_id'] = $this->responsavel_permission_id; // força responsável
        $validated['config'] = isset($validated['config']) ? $this->sanitizeInput($validated['config']) : [];
        if(is_array($validated['config'])){
            $validated['config'] = json_encode($validated['config']);
        }

        $client = Client::create($validated);
        if (is_string($client->config)) {
            $client->config = json_decode($client->config, true) ?? [];
        }
        return response()->json([
            'data' => $client,
            'message' => 'Responsável criado com sucesso',
            'status' => 201,
        ], 201);
    }

    /**
     * Exibir um responsável específico.
     * EN: Show a specific guardian.
     */
    public function responsaveisShow(Request $request, string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $client = Client::withoutGlobalScope('client')
            ->where('id', $id)
            ->where('permission_id', $this->responsavel_permission_id)
            ->firstOrFail();

        if (is_string($client->config)) {
            $client->config = json_decode($client->config, true) ?? [];
        }

        return response()->json($client);
    }

    /**
     * Atualizar um responsável específico (permission_id=8).
     * EN: Update a specific guardian (permission_id=8).
     */
    public function responsaveisUpdate(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $clientToUpdate = Client::withoutGlobalScope('client')
            ->where('id', $id)
            ->where('permission_id', $this->responsavel_permission_id)
            ->firstOrFail();

        $request->merge([
            'email'   => $this->normalizeOptionalString($request->get('email')),
            'cpf'     => $this->normalizeOptionalString($request->get('cpf')),
            'cnpj'    => $this->normalizeOptionalString($request->get('cnpj')),
            'celular' => $this->normalizeOptionalString($request->get('celular')),
        ]);

        $validator = Validator::make($request->all(), [
            'tipo_pessoa'   => ['sometimes', Rule::in(['pf','pj'])],
            'name'          => 'sometimes|required|string|max:255',
            'razao'         => 'nullable|string|max:255',
            'cpf'           => ['nullable','string','max:20', Rule::unique('users','cpf')->ignore($clientToUpdate->id)],
            'cnpj'          => ['nullable','string','max:20', Rule::unique('users','cnpj')->ignore($clientToUpdate->id)],
            'email'         => ['nullable','email', Rule::unique('users','email')->ignore($clientToUpdate->id)],
            'password'      => 'nullable|string|min:6',
            'genero'        => ['sometimes', Rule::in(['ni','m','f'])],
            'verificado'    => ['sometimes', Rule::in(['n','s'])],
            'config'        => 'array'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'exec'=>false,
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        if (!empty($request->cpf) && !Qlib::validaCpf($request->cpf)) {
            return response()->json([
                'exec'=>false,
                'message' => 'Erro de validação',
                'errors'  => ['cpf' => ['CPF inválido']],
            ], 422);
        }

        $validated = $validator->validated();
        $validated = $this->sanitizeInput($validated);
        if (isset($validated['password']) && !empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        // Garantir permission_id=8
        $validated['permission_id'] = $this->responsavel_permission_id;

        if (isset($validated['config'])) {
            $validated['config'] = $this->sanitizeInput($validated['config']);
            if (is_array($validated['config'])) {
                $validated['config'] = json_encode($validated['config']);
            }
        }

        $clientToUpdate->update($validated);

        if (is_string($clientToUpdate->config)) {
            $clientToUpdate->config = json_decode($clientToUpdate->config, true) ?? [];
        }

        return response()->json([
            'data' => $clientToUpdate,
            'message' => 'Responsável atualizado com sucesso',
            'status' => 200,
        ]);
    }

    /**
     * Mover responsável para a lixeira.
     * EN: Move guardian to trash.
     */
    public function responsaveisDestroy(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $client = Client::withoutGlobalScope('client')
            ->where('id', $id)
            ->where('permission_id', $this->responsavel_permission_id)
            ->firstOrFail();

        $client->update([
            'deletado' => 's',
            'reg_deletado' => json_encode([
                'usuario' => $user->id,
                'nome' => $user->name,
                'created_at' => now(),
            ])
        ]);

        return response()->json([
            'exec'=>true,
            'message' => 'Responsável movido para a lixeira com sucesso',
            'status' => 200
        ]);
    }

    /**
     * Listar responsáveis na lixeira.
     * EN: List guardians in trash.
     */
    public function responsaveisTrash(Request $request)
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

        $query = Client::withoutGlobalScope('client')
            ->where('permission_id', $this->responsavel_permission_id)
            ->where('deletado', 's')
            ->orderBy($order_by, $order);

        // Filtros adicionais
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('email', 'like', '%' . $search . '%')
                  ->orWhere('cpf', 'like', '%' . $search . '%')
                  ->orWhere('cnpj', 'like', '%' . $search . '%')
                  ->orWhere('name', 'like', '%' . $search . '%');
            });
        }
        if ($request->filled('email')) {
            $query->where('email', 'like', '%' . $request->input('email') . '%');
        }
        if ($request->filled('cpf')) {
            $query->where('cpf', 'like', '%' . $request->input('cpf') . '%');
        }
        if ($request->filled('cnpj')) {
            $query->where('cnpj', 'like', '%' . $request->input('cnpj') . '%');
        }
        if ($request->filled('celular')) {
            $cel = preg_replace('/\D/', '', (string)$request->input('celular'));
            $query->where('celular', 'like', '%' . $cel . '%');
        }
        if ($request->filled('ativo')) {
            $query->where('ativo', $request->input('ativo'));
        }
        if ($request->filled('verificado')) {
            $query->where('verificado', $request->input('verificado'));
        }
        if ($request->filled('config_key') && $request->filled('config_value')) {
            $key = $request->input('config_key');
            $val = $request->input('config_value');
            $query->where('config', 'like', '%"' . $key . '"%');
            $query->where('config', 'like', '%"' . $key . '"\s*:\s*"' . $val . '"%');
        }

        $clients = $query->paginate($perPage);
        $clients->getCollection()->transform(function ($client) {
            if (is_string($client->config)) {
                $configArr = json_decode($client->config, true) ?? [];
                array_walk($configArr, function (&$value) {
                    if (is_null($value)) {
                        $value = (string)'';
                    }
                });
                $client->config = $configArr;
            }
            return $client;
        });

        return response()->json($clients);
    }

    /**
     * Restaurar responsável da lixeira.
     * EN: Restore guardian from trash.
     */
    public function responsaveisRestore(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $client = Client::withoutGlobalScope('client')
            ->where('id', $id)
            ->where('deletado', 's')
            ->where('permission_id', $this->responsavel_permission_id)
            ->firstOrFail();

        $client->update([
            'deletado' => 'n',
            'reg_deletado' => null
        ]);

        return response()->json([
            'message' => 'Responsável restaurado com sucesso',
            'status' => 200
        ]);
    }

    /**
     * Exclusão permanente de responsável.
     * EN: Permanently delete guardian.
     */
    public function responsaveisForceDelete(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $client = Client::withoutGlobalScope('client')
            ->where('id', $id)
            ->where('permission_id', $this->responsavel_permission_id)
            ->firstOrFail();

        $client->delete();

        return response()->json([
            'message' => 'Responsável excluído permanentemente',
            'status' => 200
        ]);
    }

    /**
     * Promove um cliente para usuário (permission_id = 3).
     * EN: Promotes a client to user (permission_id = 3).
     */
    public function promote(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        // Tenta encontrar o cliente (pode estar na lixeira ou não, melhor usar sem escopo global se quisermos promover mesmo os inativos/excluidos, 
        // mas o pedido parece ser para clientes ativos na listagem principal)
        $client = User::findOrFail($id);

        $client->update([
            'permission_id' => 3
        ]);

        return response()->json([
            'exec' => true,
            'message' => 'Cliente promovido a usuário com sucesso',
            'status' => 200,
            'data' => $client
        ]);
    }
}
