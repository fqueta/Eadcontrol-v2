<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\DashboardMetric;
use Carbon\Carbon;

class DashboardMetricsSeeder extends Seeder
{
    public function run(): void
    {
        // Criar dados para 2024 e 2025 (mensais)
        foreach ([2023, 2024, 2025] as $ano) {
            for ($mes = 1; $mes <= 12; $mes++) {
                DashboardMetric::create([
                    'user_id' => 1, // ou null se não quiser vincular
                    'period' => Carbon::create($ano, $mes, 1)->format('Y-m-d'),
                    'investment' => rand(20000, 40000),
                    'visitors' => rand(8000, 15000),
                    'bot_conversations' => rand(1000, 3000),
                    'human_conversations' => rand(300, 800),
                    'proposals' => rand(100, 400),
                    'closed_deals' => rand(30, 120),
                ]);
            }
        }

        // Criar alguns dados semanais de 2025 (primeiros 8 semanas do ano)
        for ($semana = 1; $semana <= 8; $semana++) {
            $periodo = Carbon::now()->setISODate(2025, $semana, 1); // segunda-feira da semana
            DashboardMetric::create([
                'user_id' => 1,
                'period' => $periodo->format('Y-m-d'),
                'investment' => rand(3000, 6000),
                'visitors' => rand(1500, 4000),
                'bot_conversations' => rand(200, 600),
                'human_conversations' => rand(80, 200),
                'proposals' => rand(30, 100),
                'closed_deals' => rand(10, 40),
            ]);
        }
    }
}
