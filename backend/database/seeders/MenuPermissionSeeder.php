<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Menu;
use App\Models\Permission; // grupos

class MenuPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $menus = Menu::all();
        $groups = Permission::all(); // grupos de usuário do sistema
        DB::table('menu_permission')->delete();
        foreach ($menus as $menu) {
            foreach ($groups as $group) {
                // $keyBase = $this->generateKey($menu);
                if($group->id==1){
                    DB::table('menu_permission')->insert([
                        'menu_id'       => $menu->id,
                        'permission_id' => $group->id,
                        // 'permission_key'=> $keyBase . '.view',
                        'can_view'      => true,   // por padrão todos os grupos podem visualizar
                        'can_create'    => true,
                        'can_edit'      => true,
                        'can_delete'    => true,
                        'can_upload'    => true,
                        'created_at'    => now(),
                        'updated_at'    => now(),
                    ]);
                }else{
                    DB::table('menu_permission')->insert([
                        'menu_id'       => $menu->id,
                        'permission_id' => $group->id,
                        // 'permission_key'=> $keyBase . '.view',
                        'can_view'      => false,   // por padrão todos os grupos podem visualizar
                        'can_create'    => false,
                        'can_edit'      => false,
                        'can_delete'    => false,
                        'can_upload'    => false,
                        'created_at'    => now(),
                        'updated_at'    => now(),
                    ]);
                }
            }
        }
    }
}
