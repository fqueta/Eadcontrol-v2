<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CursoCategoria;

class CursoCategoriaSeeder extends Seeder
{
    public function run(): void
    {
        $categorias = [
            ['nome' => 'Cursos Online', 'slug' => 'cursos_online'],
            ['nome' => 'Presenciais', 'slug' => 'cursos_presencias'],
            ['nome' => 'Semi-Presenciais', 'slug' => 'cursos_semi_presencias'],
        ];

        foreach ($categorias as $cat) {
            CursoCategoria::firstOrCreate(
                ['slug' => $cat['slug']],
                ['nome' => $cat['nome']]
            );
        }
    }
}
