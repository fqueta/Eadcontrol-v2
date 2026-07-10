<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AdminMenuPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $adminPermissionId = 2;

        DB::table('menu_permission')->where('permission_id', $adminPermissionId)->delete();

        $permissions = [
            // Dashboard
            ['menu_id' => 1,  'parent_id' => null, 'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Clientes > Suporte (FloW)
            ['menu_id' => 3,  'parent_id' => 2,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Clientes > Lista de clientes
            ['menu_id' => 4,  'parent_id' => 2,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Escola > Vendas (FloW)
            ['menu_id' => 6,  'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Escola > Interessados
            ['menu_id' => 7,  'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Escola > Matrículas
            ['menu_id' => 8,  'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Escola > Convites
            ['menu_id' => 9,  'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Escola > Todos cursos
            ['menu_id' => 10, 'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Escola > Todas turmas
            ['menu_id' => 11, 'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Escola > Categorias de curso
            ['menu_id' => 12, 'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Escola > Agenda de Aulas
            ['menu_id' => 13, 'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Escola > Todos módulos
            ['menu_id' => 14, 'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Escola > Todos atividades
            ['menu_id' => 15, 'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Escola > Comentários
            ['menu_id' => 16, 'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Escola > Situações
            ['menu_id' => 17, 'parent_id' => 5,    'can_view' => false, 'can_create' => false, 'can_edit' => false, 'can_delete' => false, 'can_upload' => false],
            // Escola > Certificados
            ['menu_id' => 18, 'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Escola > Vídeos / Dicas
            ['menu_id' => 19, 'parent_id' => 5,    'can_view' => false, 'can_create' => false, 'can_edit' => false, 'can_delete' => false, 'can_upload' => false],
            // Escola > Produtos
            ['menu_id' => 20, 'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Gerenciar Site > Paginas do site
            ['menu_id' => 22, 'parent_id' => 21,   'can_view' => false, 'can_create' => false, 'can_edit' => false, 'can_delete' => false, 'can_upload' => false],
            // Gerenciar Site > Componentes
            ['menu_id' => 23, 'parent_id' => 21,   'can_view' => false, 'can_create' => false, 'can_edit' => false, 'can_delete' => false, 'can_upload' => false],
            // Gerenciar Site > Comentários
            ['menu_id' => 24, 'parent_id' => 21,   'can_view' => false, 'can_create' => false, 'can_edit' => false, 'can_delete' => false, 'can_upload' => false],
            // Gerenciar Site > Modalidade
            ['menu_id' => 25, 'parent_id' => 21,   'can_view' => false, 'can_create' => false, 'can_edit' => false, 'can_delete' => false, 'can_upload' => false],
            // Relatórios > Geral
            ['menu_id' => 27, 'parent_id' => 26,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Relatórios > Acesso de conteudo
            ['menu_id' => 28, 'parent_id' => 26,   'can_view' => false, 'can_create' => false, 'can_edit' => false, 'can_delete' => false, 'can_upload' => false],
            // Relatórios > Turmas
            ['menu_id' => 29, 'parent_id' => 26,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Relatórios > Frequência ao Vivo
            ['menu_id' => 30, 'parent_id' => 26,   'can_view' => false, 'can_create' => false, 'can_edit' => false, 'can_delete' => false, 'can_upload' => false],
            // Relatórios > Financeiro
            ['menu_id' => 31, 'parent_id' => 26,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Financeiro > Resumo
            ['menu_id' => 33, 'parent_id' => 32,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Financeiro > Contas a Receber
            ['menu_id' => 34, 'parent_id' => 32,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Financeiro > Contas a Pagar
            ['menu_id' => 35, 'parent_id' => 32,   'can_view' => false, 'can_create' => false, 'can_edit' => false, 'can_delete' => false, 'can_upload' => false],
            // Financeiro > Categorias
            ['menu_id' => 36, 'parent_id' => 32,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Configurações > Usuários
            ['menu_id' => 38, 'parent_id' => 37,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Configurações > Biblioteca de mídia
            ['menu_id' => 39, 'parent_id' => 37,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Configurações > Permissões
            ['menu_id' => 40, 'parent_id' => 37,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Configurações > Cupom de desconto
            ['menu_id' => 41, 'parent_id' => 37,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Configurações > Funil e etapas
            ['menu_id' => 42, 'parent_id' => 37,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Configurações > Categorias
            ['menu_id' => 43, 'parent_id' => 37,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            // Configurações > Integrações
            ['menu_id' => 44, 'parent_id' => 37,   'can_view' => false, 'can_create' => false, 'can_edit' => false, 'can_delete' => false, 'can_upload' => false],
            // Configurações > Sistema
            ['menu_id' => 45, 'parent_id' => 37,   'can_view' => false, 'can_create' => false, 'can_edit' => false, 'can_delete' => false, 'can_upload' => false],
        ];

        $rows = array_map(function ($item) use ($adminPermissionId) {
            return [
                'menu_id'       => $item['menu_id'],
                'permission_id' => $adminPermissionId,
                'can_view'      => $item['can_view'],
                'can_create'    => $item['can_create'],
                'can_edit'      => $item['can_edit'],
                'can_delete'    => $item['can_delete'],
                'can_upload'    => $item['can_upload'],
                'created_at'    => now(),
                'updated_at'    => now(),
            ];
        }, $permissions);

        DB::table('menu_permission')->insert($rows);
    }
}
