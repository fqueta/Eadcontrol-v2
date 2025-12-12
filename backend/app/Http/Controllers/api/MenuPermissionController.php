<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\MenuController;
use App\Models\Menu;
use App\Models\MenuPermission;
use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class MenuPermissionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, $permissionId)
    {
        $arr_parmission = (new MenuController)->getMenuPermissions($permissionId);
        return response()->json($arr_parmission);
    }
    public function updatePermissions(Request $request, $permissionId)
    {
        $validator = Validator::make($request->all(), [
            'permissions' => 'required|array',
            'permissions.*.menu_id' => 'required|max:100',
            'permissions.*.can_view' => 'required|boolean',
            'permissions.*.can_create' => 'required|boolean',
            'permissions.*.can_edit' => 'required|boolean',
            'permissions.*.can_delete' => 'required|boolean',
            'permissions.*.can_upload' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors()
            ], 422);
        }

        $validated = $validator->validated();

        // Busca a permission e decodifica o campo id_menu
        $permission = Permission::findOrFail($permissionId);
        if(isset($permission['id_menu']) && !is_array($permission['id_menu'])) {
            $permission['id_menu'] = json_decode($permission['id_menu'], true);
        }
        $menuKeys = $permission['id_menu'] ?? [];

        foreach ($validated['permissions'] as $perm) {
            // dd($perm,$menuKeys);
            // // Verifica se o permission_key está autorizado para esse grupo
            // if (!in_array($perm['menu_id'], $menuKeys)) {
            //     continue; // Ignora se não estiver listado
            // }

           // Busca o menu correspondente ao permission_key (url)
            $menu = Menu::where('id', $perm['menu_id'])->first();
            // dd($menu);
            if (!$menu) {
                continue; // Ignora se não encontrar o menu
            }

            MenuPermission::updateOrCreate(
                [
                    'menu_id' => $menu['id'],
                    'permission_id' => $permissionId,
                    // 'permission_key' => $perm['permission_key'],
                ],
                [
                    'can_view' => $perm['can_view'],
                    'can_create' => $perm['can_create'],
                    'can_edit' => $perm['can_edit'],
                    'can_delete' => $perm['can_delete'],
                    'can_upload' => $perm['can_upload'],
                ]
            );
        }
        $menuSchema = (new MenuController)->getMenus($permissionId);
        return response()->json(['message' => 'Permissões atualizadas com sucesso!','menu'=>$menuSchema]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $menuId)
    {

        $validator = Validator::make($request->all(), [
            'permission_id' => 'required|integer|exists:permissions,id',
            'permissions' => 'required|array',
            'permissions.*.permission_key' => 'required|string|max:100',
            'permissions.*.can_view' => 'required|boolean',
            'permissions.*.can_create' => 'required|boolean',
            'permissions.*.can_edit' => 'required|boolean',
            'permissions.*.can_delete' => 'required|boolean',
            'permissions.*.can_upload' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }
        $validated = $request->validate();

        foreach ($validated['permissions'] as $perm) {
            MenuPermission::updateOrCreate(
                [
                    'menu_id' => $menuId,
                    'permission_id' => $validated['permission_id'],
                    'permission_key' => $perm['permission_key'],
                ],
                [
                    'can_view' => $perm['can_view'],
                    'can_create' => $perm['can_create'],
                    'can_edit' => $perm['can_edit'],
                    'can_delete' => $perm['can_delete'],
                    'can_upload' => $perm['can_upload'],
                ]
            );
        }

        return response()->json(['message' => 'Permissões atualizadas com sucesso!']);

    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
