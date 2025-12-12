<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Permission;
use App\Models\Menu;
use App\Models\MenuPermission;

class PermissionMenuController extends Controller
{
    /**
     * Lista menus com status (permitido ou não) para um perfil
     */
    public function index($permissionId)
    {
        $permission = Permission::findOrFail($permissionId);

        // Todos os menus
        $menus = Menu::all();

        // Pivot menu_permission para este perfil
        $permissions = MenuPermission::where('permission_id', $permission->id)
            ->pluck('menu_id')
            ->toArray();

        // Marca cada menu se está liberado
        $menus = $menus->map(function ($menu) use ($permissions) {
            $menu->allowed = in_array($menu->id, $permissions);
            return $menu;
        });

        return response()->json([
            'permission' => $permission,
            'menus'      => $menus
        ]);
    }

    /**
     * Atualiza os menus permitidos para o perfil
     */
    public function update(Request $request, $permissionId)
    {
        $permission = Permission::findOrFail($permissionId);

        $request->validate([
            'menus' => 'array|required',
            'menus.*' => 'integer|exists:menus,id',
        ]);

        // Remove todos os vínculos anteriores
        MenuPermission::where('permission_id', $permission->id)->delete();

        // Recria vínculos com base na seleção do usuário
        foreach ($request->menus as $menuId) {
            MenuPermission::create([
                'menu_id'       => $menuId,
                'permission_id' => $permission->id,
                'can_view'      => true,
                'can_create'    => true,
                'can_edit'      => true,
                'can_delete'    => true,
                'can_upload'    => true,
            ]);
        }

        return response()->json([
            'status'  => 200,
            'message' => 'Permissões de menu atualizadas com sucesso',
        ]);
    }
}
