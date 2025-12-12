<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class GenericPostsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 🔹 Defina aqui o post_type e os itens que deseja inserir/atualizar
        $postType = 'product-units';

        $items = [
            ['post_title' => 'Unidade',     'post_name' => 'unidade'],
            ['post_title' => 'Litro',       'post_name' => 'litro'],
            ['post_title' => 'Quilograma',  'post_name' => 'quilograma'],
            ['post_title' => 'Metro',       'post_name' => 'metro'],
            ['post_title' => 'Par',         'post_name' => 'par'],
        ];

        // 🔹 Lista de nomes permitidos
        $postNames = array_column($items, 'post_name');

        // 🔹 Remove registros antigos do mesmo post_type que não estão na lista
        DB::table('posts')
            ->where('post_type', $postType)
            ->whereNotIn('post_name', $postNames)
            ->delete();

        // 🔹 Recria/atualiza os itens
        foreach ($items as $item) {
            DB::table('posts')->updateOrInsert(
                [
                    'post_name' => $item['post_name'],
                    'post_type' => $postType,
                ],
                [
                    'post_title'      => $item['post_title'],
                    'post_status'     => 'publish',
                    'comment_status'  => 'closed',
                    'ping_status'     => 'closed',
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ]
            );
        }
    }
}
