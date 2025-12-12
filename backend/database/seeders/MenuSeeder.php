<?php

namespace Database\Seeders;

use App\Models\Menu;
use App\Models\Permission;
use App\Services\Qlib;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MenuSeeder extends Seeder
{
    /**
     * Seed principal:
     * - Cria menus a partir do JSON (CRM ou Oficina).
     * - Garante grupos de permissões iniciais.
     * - Vincula todos os menus aos grupos em `menu_permission`.
     */
    public function run(): void
    {
        /**
         * Desabilita FKs temporariamente para permitir truncates em ordem segura.
         */
        try { DB::statement('SET FOREIGN_KEY_CHECKS=0'); } catch (\Throwable $e) {}

        // Limpa vínculos dependentes e tabela de menus para evitar duplicações
        DB::table('menu_permission')->truncate();
        DB::table('menus')->truncate();

        // Carrega JSON externo conforme modo do sistema
        if (Qlib::is_crm_aero()) {
            $json = file_get_contents(database_path('seeders/data/menu_crm.json'));
        } else {
            $json = file_get_contents(database_path('seeders/data/menu.json'));
        }
        $menus = json_decode($json, true);

        // Cria toda a hierarquia de menus
        $this->createMenus($menus);

        /**
         * Permissões iniciais (Master = 1) e vínculos menu_permission.
         */
        DB::table('permissions')->truncate();
        DB::table('permissions')->insert([
            // MASTER → acesso a tudo
            [
                'name' => 'Master',
                'description' => 'Desenvolvedores',
                'redirect_login' => '/home',
                'active' => 's',
            ],

            // ADMINISTRADOR → tudo, mas em configurações só "Usuários" e "Perfis"
            [
                'name' => 'Administrador',
                'description' => 'Administradores do sistema',
                'redirect_login' => '/home',
                'active' => 's'
            ],

            // GERENTE → todos os menus exceto configurações
            [
                'name' => 'Gerente',
                'description' => 'Gerente do sistema (sem acesso a configurações)',
                'redirect_login' => '/home',
                'active' => 's'
            ],

            // ESCRITÓRIO → somente dois primeiros menus
            [
                'name' => 'Escritório',
                'description' => 'Acesso limitado a Dashboard e Clientes',
                'redirect_login' => '/home',
                'active' => 's'
            ],
            // Cliente → para clientes sem acesso ao admin
            [
                'name' => 'Cliente',
                'description' => 'Acesso limitado a Dashboard e Clientes',
                'redirect_login' => '/home',
                'active' => 's'
            ],
        ]);

        // Recria vínculos de permissão para todos os menus
        $menusCollection = Menu::all();
        $groupsCollection = Permission::all();
        foreach ($menusCollection as $menu) {
            foreach ($groupsCollection as $group) {
                DB::table('menu_permission')->insert([
                    'menu_id'       => $menu->id,
                    'permission_id' => $group->id,
                    'can_view'      => $group->id == 1,
                    'can_create'    => $group->id == 1,
                    'can_edit'      => $group->id == 1,
                    'can_delete'    => $group->id == 1,
                    'can_upload'    => $group->id == 1,
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]);
            }
        }

        // Restaura verificação de FKs
        try { DB::statement('SET FOREIGN_KEY_CHECKS=1'); } catch (\Throwable $e) {}
    }

    /**
     * Cria hierarquia de menus a partir do JSON.
     */
    private function createMenus(array $menus, ?int $parentId = null): void
    {
        foreach ($menus as $index => $menu) {
            $id = DB::table('menus')->insertGetId([
                'title'      => $menu['title'],
                'url'        => $menu['url'] ?? null,
                'icon'       => $menu['icon'] ?? null,
                'items'      => isset($menu['submenu']) ? json_encode($menu['submenu'], JSON_UNESCAPED_UNICODE) : null,
                'active'     => 'y',
                'order'      => $index,
                'parent_id'  => $parentId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if (!empty($menu['submenu'])) {
                $this->createMenus($menu['submenu'], $id);
            }
        }
    }
}
