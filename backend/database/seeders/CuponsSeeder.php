<?php

namespace Database\Seeders;

use App\Models\Cupom;
use Illuminate\Database\Seeder;

class CuponsSeeder extends Seeder
{
    public function run(): void
    {
        Cupom::create([
            'codigo' => 'BEMVINDO10',
            'tipo' => 'percentual',
            'valor_desconto' => 10,
            'validade_inicio' => now()->subDays(30),
            'validade_fim' => now()->addDays(90),
            'limite_uso' => 100,
            'usos' => 0,
            'ativo' => 's',
            'descricao' => 'Cupom de 10% para novos alunos',
        ]);

        Cupom::create([
            'codigo' => 'DESCONTO50',
            'tipo' => 'fixo',
            'valor_desconto' => 50,
            'validade_inicio' => now()->subDays(10),
            'validade_fim' => now()->addDays(60),
            'limite_uso' => 50,
            'usos' => 0,
            'ativo' => 's',
            'descricao' => 'Desconto de R$50,00',
        ]);

        Cupom::create([
            'codigo' => 'VIP2026',
            'tipo' => 'percentual',
            'valor_desconto' => 25,
            'validade_inicio' => now(),
            'validade_fim' => now()->addYear(),
            'limite_uso' => 500,
            'usos' => 0,
            'valor_minimo' => 100,
            'ativo' => 's',
            'descricao' => 'Cupom VIP 25% - compras acima de R$100',
        ]);
    }
}
