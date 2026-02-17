<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MenuPermission;
use App\Models\Permission;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class PermissionController extends Controller
{
    protected PermissionService $permissionService;
    public $routeName;
    public $sec;
    public $sec1;
    public function __construct(PermissionService $permissionService)
    {
        $this->routeName = request()->route()->getName();
        $this->permissionService = $permissionService;
        $this->sec = request()->segment(2);
        $this->sec1 = request()->segment(3);
    }
    /**
     * Listar todas as permissões
     */
    public function index()
    {
        $user = request()->user();
        if(!$user){
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $order_by = request()->input('order_by', 'created_at');
        $order = request()->input('order', 'desc');
        $permission_id = $user->permission_id ?? null;
        // if (!$this->isHasPermission('view')) {
        //     return response()->json(['error' => 'Acesso negado'], 403);
        // }
        $d = Permission::where('id','>=',$permission_id)->where('excluido','n')->where('deletado','n')->orderBy($order_by,$order)->get();
        return response()->json($d, 200);
    }
    /**
     * Metodo para veriricar se o usuario tem permissão para executar ao acessar esse recurso atraves de ''
     * @params string 'view | create | edit | delete'
     */
    private function isHasPermission($permissao=''){
        $user = request()->user();
        if ($this->permissionService->can($user, $this->routeName, $permissao)) {
            return true;
        }else{
            return false;
        }
    }

    /**
     * Criar uma nova permissão
     */
    public function store(Request $request)
    {
        if (!$this->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $validator = Validator::make($request->all(), [
            'name'           => 'required|string|max:125|unique:permissions,name',
            'id_menu'        => 'nullable|array',
            'redirect_login' => 'nullable|string|max:255',
            'config'         => 'nullable|array',
            'description'    => 'nullable|string',
            'guard_name'     => 'nullable|string|max:125',
            // 'active'         => 'required|in:s,n',
            'autor'          => 'nullable|integer',
            // 'excluido'       => 'in:s,n',
            // 'deletado'       => 'in:s,n',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'exec'    => false,
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        $data['autor'] = Auth::id();
        // Gera token único automático, se não vier do request
        $data['token'] = $data['token'] ?? Qlib::token();
        $data['excluido'] = isset($data['excluido']) ? $data['excluido'] : 'n';
        $data['deletado'] = isset($data['deletado']) ? $data['deletado'] : 'n';
        $data['reg_excluido'] = $data['reg_excluido'] ?? null;
        $data['reg_deletado'] = $data['reg_deletado'] ?? null;
        $permission = Permission::create($data);

        return response()->json([
            'exec'    => true,
            'message' => 'Permissão criada com sucesso',
            'data'    => $permission
        ], 201);
    }

    /**
     * Mostrar uma permissão específica
     */
    public function show($id)
    {
        $permission = Permission::find($id);

        if (!$permission) {
            return response()->json(['message' => 'Permissão não encontrada'], 404);
        }
        if (!$this->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        return response()->json($permission, 200);
    }

    /**
     * Atualizar uma permissão
     */
    public function update(Request $request, $id)
    {
        $permission = Permission::find($id);

        if (!$permission) {
            return response()->json(['message' => 'Permissão não encontrada'], 404);
        }
        if (!$this->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado, sem permissão'], 403);
        }
        $validator = Validator::make($request->all(), [
            'name'           => 'sometimes|required|string|max:125|unique:permissions,name,' . $id,
            'id_menu'        => 'nullable|array',
            'redirect_login' => 'nullable|string|max:255',
            'config'         => 'nullable|array',
            'description'    => 'nullable|string',
            'guard_name'     => 'nullable|string|max:125',
            // 'active'         => 'in:s,n',
            'autor'          => 'nullable|integer',
            'excluido'       => 'in:s,n',
            'deletado'       => 'in:s,n',
            'permissions'    => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        try {
            $permission->update($validator->validated());

            return response()->json([
                'message' => 'Permissão atualizada com sucesso',
                'data'    => $permission
            ], 200);

        } catch (\Exception $e) {
            // DB::rollBack();
            return response()->json([
                'message' => 'Erro ao atualizar permissão',
                'error'   => $e->getMessage()
            ], 500);
        }
    }


    /**
     * Deletar (soft delete) uma permissão
     */
    public function destroy($id)
    {
        $permission = Permission::find($id);

        if (!$permission) {
            return response()->json(['message' => 'Permissão não encontrada'], 404);
        }

        // Aqui você pode decidir se realmente deleta ou só marca como deletado
        $permission->update([
            'excluido'     => 's',
            'deletado'     => 's',
            'reg_deletado' => ['data'=>now()->toDateTimeString(),'user_id'=>request()->user()->id]
        ]);

        return response()->json([
            'message' => 'Permissão marcada como deletada com sucesso'
        ], 200);
    }
}
