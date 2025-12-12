<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Service;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Categorias da entidade PRODUTOS
        $categoriasProdutos = [
            'Lubrificantes',
            'Filtros',
            'Pneus',
            'Elétrica',
            'Freios',
            'Suspensão',
            'Motor',
            'Diversos',
        ];

        // Categorias da entidade SERVIÇOS
        $categoriasServicos = [
            'Manutenção de 50h',
            'Manutenção de 100h',
            'Manutenção de 200h',
            'Manutenção de 500h',
            'Manutenção de 1000h',
            'CVA',
            'Inspeção de aeronavegabilidade',
            'Inspeção pré-compra',
            'Pane',
            'Outros',
        ];

        // 🔹 Mantém apenas as categorias definidas
        DB::table('categories')
            ->where('entidade', 'produtos')
            ->whereNotIn('name', $categoriasProdutos)
            ->delete();

        DB::table('categories')
            ->where('entidade', 'servicos')
            ->whereNotIn('name', $categoriasServicos)
            ->delete();

        // 🔹 Recria/atualiza categorias de PRODUTOS
        foreach ($categoriasProdutos as $nome) {
            DB::table('categories')->updateOrInsert(
                [
                    'name'     => $nome,
                    'entidade' => 'produtos',
                ],
                [
                    'description' => "Categoria de produto: {$nome}",
                    'parent_id'   => null,
                    'active'      => true,
                    'entidade'    => 'produtos',
                    'updated_at'  => now(),
                    'created_at'  => now(),
                ]
            );
        }

        // 🔹 Recria/atualiza categorias de SERVIÇOS
        foreach ($categoriasServicos as $nome) {
            DB::table('categories')->updateOrInsert(
                [
                    'name'     => $nome,
                    'entidade' => 'servicos',
                ],
                [
                    'description' => "Categoria de serviço: {$nome}",
                    'parent_id'   => null,
                    'active'      => true,
                    'entidade'    => 'servicos',
                    'updated_at'  => now(),
                    'created_at'  => now(),
                ]
            );
        }

        // 🔹 Cria serviços para cada categoria de serviço
        $this->createServicesForCategories($categoriasServicos);
    }

    /**
     * Cria um serviço para cada categoria de serviço
     *
     * @param array $categoriasServicos
     * @return void
     */
    private function createServicesForCategories(array $categoriasServicos): void
    {
        foreach ($categoriasServicos as $nomeCategoria) {
            // Busca a categoria criada
            $categoria = DB::table('categories')
                ->where('name', $nomeCategoria)
                ->where('entidade', 'servicos')
                ->first();

            if ($categoria) {
                // Verifica se já existe um serviço para esta categoria
                $servicoExistente = DB::table('posts')
                    ->where('post_type', 'service')
                    ->where('post_title', "Serviço de {$nomeCategoria}")
                    ->whereNull('excluido')
                    ->first();

                if (!$servicoExistente) {
                    // Cria o serviço
                    DB::table('posts')->insert([
                        'post_author' => '1', // ID do usuário admin
                        'post_content' => "Serviço especializado em {$nomeCategoria}",
                        'post_title' => "Serviço de {$nomeCategoria}",
                        'post_excerpt' => "Serviço de {$nomeCategoria} com qualidade garantida",
                        'post_status' => 'publish',
                        'comment_status' => 'closed',
                        'ping_status' => 'closed',
                        'post_password' => '',
                        'post_name' => \Illuminate\Support\Str::slug("servico-{$nomeCategoria}"),
                        'to_ping' => 'n', // Para não aparecer nas pesquisas
                        'pinged' => '',
                        'post_content_filtered' => '',
                        'post_parent' => 0,
                        'guid' => '',
                        'menu_order' => 0,
                        'post_type' => 'service',
                        'post_mime_type' => '',
                        'comment_count' => 0,
                        'config' => json_encode([
                            'category_id' => $categoria->id,
                            'category_name' => $nomeCategoria,
                            'price' => 100.00,
                            'duration' => '1 hora',
                            'description' => "Serviço especializado em {$nomeCategoria}"
                        ]),
                        'token' => \Illuminate\Support\Str::random(32),
                        'excluido' => 'n',
                        'reg_excluido' => null,
                        'deletado' => 'n',
                        'reg_deletado' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }
}
