<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductUnitsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $unidades = [
            ['post_title' => 'Unidade',     'post_name' => 'unidade'],
            ['post_title' => 'Litro',       'post_name' => 'litro'],
            ['post_title' => 'Quilograma',  'post_name' => 'quilograma'],
            ['post_title' => 'Metro',       'post_name' => 'metro'],
            ['post_title' => 'Par',         'post_name' => 'par'],
        ];

        // 🔹 Lista de nomes permitidos
        $postNames = array_column($unidades, 'post_name');

        // 🔹 Remove todas as unidades antigas que não estão na lista
        DB::table('posts')
            ->where('post_type', 'product-units')
            ->whereNotIn('post_name', $postNames)
            ->delete();

        // 🔹 Recria/atualiza as unidades definidas
        foreach ($unidades as $item) {
            DB::table('posts')->updateOrInsert(
                [
                    'post_name' => $item['post_name'],
                    'post_type' => 'product-units',
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
