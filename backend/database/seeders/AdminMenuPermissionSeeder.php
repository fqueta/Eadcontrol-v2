<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Menu;

class AdminMenuPermissionSeeder extends Seeder
{
    /**
     * Seed para configurar as permissões do grupo Administrador (permission_id = 2).
     * O Administrador tem acesso a todos os menus, exceto nos submenus de Configurações,
     * onde ele só tem acesso a "Usuários" e "Permissões" (ou "Perfis").
     *
     * @return void
     */
    public function run(): void
    {
        $adminPermissionId = 2;
        $menus = Menu::all();

        // Encontrar o menu pai de Configurações
        $configMenu = Menu::where('title', 'Configurações')->whereNull('parent_id')->first();
        $configMenuId = $configMenu ? $configMenu->id : null;

        // Limpa permissões existentes para o grupo 2 para evitar duplicados
        DB::table('menu_permission')->where('permission_id', $adminPermissionId)->delete();

        foreach ($menus as $menu) {
            $canAccess = true;

            // Se for um submenu de Configurações, restringir aos permitidos
            if ($configMenuId && $menu->parent_id == $configMenuId) {
                $allowedSubmenus = ['Usuários', 'Permissões', 'Perfis'];
                if (!in_array($menu->title, $allowedSubmenus)) {
                    $canAccess = false;
                }
            }

            DB::table('menu_permission')->insert([
                'menu_id'       => $menu->id,
                'permission_id' => $adminPermissionId,
                'can_view'      => $canAccess,
                'can_create'    => $canAccess,
                'can_edit'      => $canAccess,
                'can_delete'    => $canAccess,
                'can_upload'    => $canAccess,
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
        }
    }
}
