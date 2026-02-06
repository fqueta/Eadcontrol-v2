<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Laravel\Sanctum\PersonalAccessToken;

class UserController extends Controller
{
    /**
     * Sanitiza os dados recebidos, inclusive arrays como config
     */
    protected function sanitizeInput($input)
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
    protected PermissionService $permissionService;
    public $routeName;
    public $sec;
    public $cliente_permission_id;
    public function __construct(PermissionService $permissionService)
    {
        $this->routeName = request()->route()->getName();
        $this->permissionService = $permissionService;
        $this->sec = request()->segment(3);
        $this->cliente_permission_id = (new ClientController)->cliente_permission_id ?? Qlib::qoption('permission_client_id');
    }
    /**
     * Listar todos os usuários
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
        //listar usuarios com permissões dele pra cima
        $permission_id = $request->user()->permission_id;
        // dd($permission_id);
        $query = User::query()->where('permission_id','!=',$this->cliente_permission_id)->orderBy($order_by,$order);

        // Não exibir registros marcados como deletados ou excluídos
        $query->where(function($q) {
            $q->whereNull('deletado')->orWhere('deletado', '!=', 's');
        });
        $query->where(function($q) {
            $q->whereNull('excluido')->orWhere('excluido', '!=', 's');
        });

        if ($request->filled('email')) {
            $query->where('email', 'like', '%' . $request->input('email') . '%');
        }
        if ($request->filled('cpf')) {
            $query->where('cpf', 'like', '%' . $request->input('cpf') . '%');
        }
        if ($request->filled('cnpj')) {
            $query->where('cnpj', 'like', '%' . $request->input('cnpj') . '%');
        }
        //**Adicionar filtros extras  */
        //se existir um campo consultores for true então filtrar todos com permissão maior ou igual a dele
        if($request->filled('consultores')){
            $query->where('permission_id','>=',$user->permission_id);
        }

        $users = $query->paginate($perPage);
        // Converter config para array em cada usuário
        $users->getCollection()->transform(function ($user) {
            if (is_string($user->config)) {
                $configArr = json_decode($user->config, true) ?? [];
                array_walk($configArr, function (&$value) {
                    if (is_null($value)) {
                        $value = (string)'';
                        // dd($value);
                    }
                    // dump($value);
                });
                $user->config = $configArr;
            }
            return $user;
        });
        // dd($users->toArray());
        return response()->json($users);
    }


    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)

    {
        $user = $request->user();
        if(!$user){
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        // Verifica se já existe usuário deletado com o mesmo CPF
        if (!empty($request->cpf)) {
            $userCpfDel = User::where('cpf', $request->cpf)
                ->where(function($q){
                    $q->where('deletado', 's')->orWhere('excluido', 's');
                })->first();
            if ($userCpfDel) {
                return response()->json([
                    'message' => 'Este cadastro já está em nossa base de dados, verifique na lixeira.',
                    'errors'  => ['cpf' => ['Cadastro com este CPF está na lixeira']],
                ], 422);
            }
        }
        // Verifica se já existe usuário deletado com o mesmo EMAIL
        if (!empty($request->email)) {
            $userEmailDel = User::where('email', $request->email)
                ->where(function($q){
                    $q->where('deletado', 's')->orWhere('excluido', 's');
                })->first();
            if ($userEmailDel) {
                return response()->json([
                    'message' => 'Este cadastro já está em nossa base de dados, verifique na lixeira.',
                    'errors'  => ['email' => ['Cadastro com este e-mail está na lixeira']],
                ], 422);
            }
        }
        $validator = Validator::make($request->all(), [
            'tipo_pessoa'   => ['required', Rule::in(['pf','pj'])],
            'name'          => 'required|string|max:255',
            'razao'         => 'nullable|string|max:255',
            'cpf'           => 'nullable|string|max:20|unique:users,cpf',
            'cnpj'          => 'nullable|string|max:20|unique:users,cnpj',
            'email'         => 'nullable|email|unique:users,email',
            'password'      => 'required|string|min:6',
            // 'status'        => ['required', Rule::in(['actived','inactived','pre_registred'])],
            'genero'        => ['required', Rule::in(['ni','m','f'])],
            // 'verificado'    => ['required', Rule::in(['n','s'])],
            'permission_id' => 'nullable|integer',
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
        /**
         * PT: Sanitiza e normaliza campos opcionais para evitar duplicidade de strings vazias
         * EN: Sanitize and normalize optional fields to avoid duplicate empty-string unique values
         */
        $validated = $this->sanitizeInput($validated);
        // Converter strings vazias em null para campos únicos opcionais
        if (array_key_exists('email', $validated) && ($validated['email'] === '' || $validated['email'] === null)) {
            $validated['email'] = null;
        }
        if (array_key_exists('cpf', $validated) && ($validated['cpf'] === '' || $validated['cpf'] === null)) {
            $validated['cpf'] = null;
        }
        if (array_key_exists('cnpj', $validated) && ($validated['cnpj'] === '' || $validated['cnpj'] === null)) {
            $validated['cnpj'] = null;
        }
        $validated['token'] = Qlib::token();
        $validated['password'] = Hash::make($validated['password']);
        $validated['ativo'] = isset($validated['ativo']) ? $validated['ativo'] : 's';
        $validated['status'] = isset($validated['status']) ? $validated['status'] : 'actived';
        $validated['tipo_pessoa'] = isset($validated['tipo_pessoa']) ? $validated['tipo_pessoa'] : 'pf';
        $validated['permission_id'] = isset($validated['permission_id']) ? $validated['permission_id'] : 5;
        $validated['config'] = isset($validated['config']) ? $this->sanitizeInput($validated['config']) : [];
        if(is_array($validated['config'])){
            $validated['config'] = json_encode($validated['config']);
        }

        $user = User::create($validated);
        $ret['data'] = $user;
        $ret['message'] = 'Usuário criado com sucesso';
        $ret['status'] = 201;
        return response()->json($ret, 201);
    }

    /**
     * Display the specified resource.
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
        $user = User::findOrFail($id);
        return response()->json($user,201);
    }
    /**
     * retorna dados do usuario
     */
    public function can_access(Request $request)
    {
        $user = $request->user();
        // dd($user);
        if(!$user || ($user->ativo ?? null) !== 's'){
            return response()->json(['error' => 'Usuário inativo'], 419);
        }
        return response()->json($user);
    }
    public function perfil(Request $request)
    {
        $user = $request->user();
        // dd($user);
        if(!$user || ($user->ativo ?? null) !== 's'){
            return response()->json(['error' => 'Usuário inativo'], 419);
        }
        return response()->json($user);
    }

    /**
     * Get logged-in user profile.
     *
     * Obtém o perfil do usuário autenticado (self-service).
     */
    public function profile(Request $request)
    {
        $user = $request->user();
        if (!$user || ($user->ativo ?? null) !== 's') {
            return response()->json(['error' => 'Usuário inativo'], 405);
        }
        return response()->json($user);
    }

    /**
     * Update logged-in user profile.
     *
     * Atualiza o perfil do usuário autenticado (nome, e-mail e senha).
     */
    public function updateProfile(Request $request)
    {
        $authUser = $request->user();
        if (!$authUser || ($authUser->ativo ?? null) !== 's') {
            return response()->json(['error' => 'Usuário inativo'], 405);
        }

        // Validação dos campos diretos e config
        $validator = Validator::make($request->all(), [
            'name'        => 'nullable|string|max:255',
            'email'       => ['nullable','email', Rule::unique('users','email')->ignore($authUser->id)],
            'password'    => 'nullable|string|min:6',
            'foto_perfil' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'cpf'         => 'nullable|string|max:20',
            'celular'     => 'nullable|string|max:20',
            'genero'      => 'nullable|string|max:10',
            'config'      => 'nullable|array',
            'config.nascimento'  => 'nullable|date',
            'config.rg'          => 'nullable|string|max:20',
            'config.escolaridade' => 'nullable|string|max:100',
            'config.profissao'    => 'nullable|string|max:100',
            'config.cep'          => 'nullable|string|max:10',
            'config.endereco'     => 'nullable|string|max:255',
            'config.numero'       => 'nullable|string|max:20',
            'config.complemento'  => 'nullable|string|max:100',
            'config.bairro'       => 'nullable|string|max:100',
            'config.cidade'       => 'nullable|string|max:100',
            'config.uf'           => 'nullable|string|max:2',
            'config.observacoes'  => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validated = $validator->validated();
        
        // Preparar array de atualização
        $updateData = [];

        // Campos diretos - converter explicitamente para string
        if (isset($validated['name'])) {
            $updateData['name'] = strval(trim($validated['name']));
        }
        if (isset($validated['email'])) {
            $updateData['email'] = strval(trim($validated['email']));
        }
        if (isset($validated['cpf'])) {
            $updateData['cpf'] = strval(trim($validated['cpf']));
        }
        if (isset($validated['celular'])) {
            $updateData['celular'] = strval(trim($validated['celular']));
        }
        if (isset($validated['genero'])) {
            $updateData['genero'] = strval(trim($validated['genero']));
        }
        
        // Handle Password
        if (isset($validated['password']) && $validated['password']) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        // Handle Photo Upload
        if ($request->hasFile('foto_perfil')) {
            $file = $request->file('foto_perfil');
            $path = $file->store('uploads/users/' . $authUser->id, 'public');
            $updateData['foto_perfil'] = strval($path);
        }

        // Handle config fields
        if (isset($validated['config']) && is_array($validated['config'])) {
            // Pega o config atual ou inicia array vazio
            $currentConfig = is_array($authUser->config) ? $authUser->config : [];
            
            // Limpar valores vazios e garantir que são strings
            $cleanConfig = [];
            foreach ($validated['config'] as $key => $value) {
                if ($value !== null && $value !== '') {
                    $cleanConfig[$key] = strval(trim($value));
                }
            }
            
            // Merge com os novos valores
            $newConfig = array_merge($currentConfig, $cleanConfig);
            
            // Eloquent vai converter automaticamente array para JSON graças ao cast
            $updateData['config'] = $newConfig;
        }

        // DEBUG: Log dos dados antes do update
        \Log::info('UpdateProfile - Dados para atualização:', [
            'updateData' => $updateData,
            'user_id' => $authUser->id
        ]);

        // Usar DB::table() com bindings explícitos para evitar problemas de type inference
        \DB::table('users')
            ->where('id', $authUser->id)
            ->update($updateData);

        return response()->json([
            'data' => User::find($authUser->id),
            'message' => 'Perfil atualizado com sucesso!',
            'status' => 200
        ]);
    }

    /**
     * Alterar senha do usuário autenticado
     */
    public function changePassword(Request $request)
    {
        $authUser = $request->user();
        if (!$authUser || ($authUser->ativo ?? null) !== 's') {
            return response()->json(['error' => 'Usuário inativo'], 405);
        }

        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Verificar se a senha atual está correta
        if (!Hash::check($request->current_password, $authUser->password)) {
            return response()->json([
                'errors' => ['current_password' => ['A senha atual está incorreta.']]
            ], 422);
        }

        // Atualizar senha
        DB::table('users')
            ->where('id', $authUser->id)
            ->update(['password' => Hash::make($request->new_password)]);

        return response()->json([
            'message' => 'Senha alterada com sucesso!',
            'status' => 200
        ]);
    }

    /**
     * Valida um token do Sanctum.
     *
     * Recebe um token no formato "id|plainText" (padrão do Sanctum) ou apenas
     * o "plainText". Retorna JSON com { status: "valid" } ou { status: "invalid" }.
     * Se o usuário do token estiver inativo (ativo != 's' ou status != 'actived'),
     * o token é revogado e o status retornado será "invalid".
     */
    public function validateToken(Request $request, string $token)
    {
        // Suporta ambos formatos: "id|token" e apenas "token"
        $tokenId = null;
        $plain = $token;
        if (str_contains($token, '|')) {
            [$tokenId, $plain] = explode('|', $token, 2);
        }

        $hashed = hash('sha256', $plain);
        $pat = null;

        if ($tokenId) {
            $pat = PersonalAccessToken::find($tokenId);
            if (!$pat || $pat->token !== $hashed) {
                return response()->json(['status' => 'invalid']);
            }
        } else {
            $pat = PersonalAccessToken::where('token', $hashed)->first();
            if (!$pat) {
                return response()->json(['status' => 'invalid']);
            }
        }

        $user = $pat->tokenable;

        $isActive = (($user->ativo ?? null) === 's') || (($user->status ?? null) === 'actived');
        if (!$isActive) {
            // Revoga o token do usuário inativo
            try {
                $pat->delete();
            } catch (\Throwable $e) {
                // opcionalmente registrar log
            }
            return response()->json(['status' => 'invalid', 'message' => 'Usuário inativo'], 419);
        }

        return response()->json(['status' => 'valid']);
    }

     /**
     * Lista usuários marcados como deletados/excluídos (lixeira)
     */
    public function trash(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $query = User::query();
        $query->where(function($q) {
            $q->where('deletado', 's')->orWhere('excluido', 's');
        });

        // Filtros opcionais
        if ($request->filled('email')) {
            $query->where('email', 'like', '%' . $request->input('email') . '%');
        }
        if ($request->filled('cpf')) {
            $query->where('cpf', 'like', '%' . $request->input('cpf') . '%');
        }
        if ($request->filled('cnpj')) {
            $query->where('cnpj', 'like', '%' . $request->input('cnpj') . '%');
        }

        $users = $query->paginate($perPage);
        return response()->json($users);
    }

    /**
     * Update the specified resource in storage.
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

        $userToUpdate = User::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'tipo_pessoa'   => ['sometimes', Rule::in(['pf','pj'])],
            'name'          => 'sometimes|required|string|max:255',
            'razao'         => 'nullable|string|max:255',
            'cpf'           => ['nullable','string','max:20', Rule::unique('users','cpf')->ignore($userToUpdate->id)],
            'cnpj'          => ['nullable','string','max:20', Rule::unique('users','cnpj')->ignore($userToUpdate->id)],
            'email'         => ['nullable','email', Rule::unique('users','email')->ignore($userToUpdate->id)],
            'password'      => 'nullable|string|min:6',
            // 'status'        => ['sometimes', Rule::in(['actived','inactived','pre_registred'])],
            'genero'        => ['sometimes', Rule::in(['ni','m','f'])],
            'verificado'    => ['sometimes', Rule::in(['n','s'])],
            'permission_id' => 'nullable|integer',
            'ativo'         => ['sometimes', Rule::in(['n','s'])],
            'config'        => 'array'
        ]);
        //se ativo = n status = inactived
        if ($request->ativo == 'n') {
            $request->merge(['status' => 'inactived']);
        }

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
                'exec' => false,
                'message' => 'Erro de validação',
                'errors'  => ['cpf' => ['CPF inválido']],
            ], 422);
        }

        $validated = $validator->validated();
        // dd($validated,$request->all());
        // Sanitização dos dados
        $validated = $this->sanitizeInput($validated);

        if (isset($validated['password'])) {
            if (!empty($validated['password'])) {
                $validated['password'] = Hash::make($validated['password']);
            } else {
                unset($validated['password']);
            }
        } else {
            unset($validated['password']);
        }

        if (isset($validated['config']) && is_array($validated['config'])) {
            $validated['config'] = json_encode($validated['config']);
        }
        // Normalizar campos únicos opcionais: strings vazias viram null
        if (array_key_exists('email', $validated) && ($validated['email'] === '' || $validated['email'] === null)) {
            $validated['email'] = null;
        }
        if (array_key_exists('cpf', $validated) && ($validated['cpf'] === '' || $validated['cpf'] === null)) {
            $validated['cpf'] = null;
        }
        if (array_key_exists('cnpj', $validated) && ($validated['cnpj'] === '' || $validated['cnpj'] === null)) {
            $validated['cnpj'] = null;
        }
        // dd($validated);
        $userToUpdate->update($validated);

        return response()->json([
            'exec' => true,
            'data' => $userToUpdate,
            'message' => 'Usuário atualizado com sucesso',
            'status' => 200,
        ]);
    }

    /**
     * Remove the specified resource from storage.
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
        $userToDelete = User::find($id);
        if (!$userToDelete) {
            return response()->json(['error' => 'Usuário não encontrado'], 404);
        }
        $userToDelete->update([
            'excluido'     => 's',
            'deletado'     => 's',
            'reg_deletado' =>['data'=>now()->toDateTimeString(),'user_id'=>request()->user()->id] ,
        ]);
        return response()->json([
            'message' => 'Usuário marcado como deletado com sucesso'
        ], 200);
    }
}
