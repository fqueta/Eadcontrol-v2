<?php

namespace Database\Seeders;

use App\Services\Qlib;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        /**
         * Trunca a tabela para garantir IDs consistentes (ex.: Master = 1).
         * Como há FK de menu_permission -> permissions, desabilitamos FKs temporariamente.
         */
        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0');
        } catch (\Throwable $e) {
            // Em bancos que não suportam (ex.: SQLite), ignorar.
        }
        DB::table('permissions')->truncate();
        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        } catch (\Throwable $e) {
            // Ignorar para compatibilidade.
        }
        if(Qlib::is_crm_aero()){
            $data = [
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
                    'name' => 'Auxiliar Adminstrativo',
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
                // CONSULTOR → somente dois primeiros menus
                [
                    'name' => 'Consultor',
                    'description' => 'Consultores do sistema',
                    'redirect_login' => '/home',
                    'active' => 's'
                ],
                // INSTRUTOR → somente dois primeiros menus
                [
                    'name' => 'Instrutor',
                    'description' => 'Instrutores do sistema',
                    'redirect_login' => '/home',
                    'active' => 's'
                ],
                // Cliente → para clientes sem acesso ao admin
                [
                    'name' => 'Cliente',
                    'description' => 'Sem acesso ao Dashboard porem com acesso ao painel de Clientes',
                    'redirect_login' => '/home',
                    'active' => 's'
                ],
            ];
        }else{
           $data = [
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
                    'name' => 'Auxiliar Adminstrativo',
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
                // CONSULTOR → somente dois primeiros menus
                [
                    'name' => 'Consultor',
                    'description' => 'Consultores do sistema',
                    'redirect_login' => '/home',
                    'active' => 's'
                ],
                // INSTRUTOR → somente dois primeiros menus
                [
                    'name' => 'Instrutor',
                    'description' => 'Instrutores do sistema',
                    'redirect_login' => '/home',
                    'active' => 's'
                ],
                // Cliente → para clientes sem acesso ao admin
                [
                    'name' => 'Cliente',
                    'description' => 'Sem acesso ao Dashboard porem com acesso ao painel de Clientes',
                    'redirect_login' => '/home',
                    'active' => 's'
                ],
            ];
        }
        DB::table('permissions')->insert($data);
    }
}
