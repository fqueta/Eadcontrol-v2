<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * DashboardChartController
 * pt-BR: Endpoints simples que retornam dados mocados para os gráficos
 *        de Interessados e Matriculados do Dashboard (2024/2025).
 * en-US: Simple endpoints returning mocked data for Dashboard charts
 *        of Leads and Enrolled (years 2024/2025).
 */
class DashboardChartController extends Controller
{
    /**
     * summary
     * pt-BR: Retorna payload único com todos os dados necessários ao Dashboard.
     *        Inclui gráficos de Interessados e Matriculados (dados mocados 2024/2025).
     * en-US: Returns a single payload with all Dashboard required data.
     *        Includes charts for Leads and Enrolled (mocked 2024/2025).
     */
    public function summary(Request $request)
    {
        $months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

        /**
         * Ano dinâmico via painel
         * pt-BR: Recebe `year` via querystring (ex.: /dashboard/summary?year=2025).
         *        Se não informado, usa o ano corrente. O comparativo é o ano anterior.
         * en-US: Receives `year` via querystring (e.g., /dashboard/summary?year=2025).
         *        Defaults to current year if not provided. Comparison is previous year.
         */
        $selectedYear = (int) ($request->input('year', date('Y')));
        if ($selectedYear < 2000 || $selectedYear > 3000) {
            $selectedYear = (int) date('Y');
        }
        $comparisonYear = $selectedYear - 1;

        // pt-BR: Calcula contagens mensais por ano para Interessados (situacao=int) e Matriculados (situacao=mat).
        // en-US: Computes monthly counts per year for Interested (situacao=int) and Enrolled (situacao=mat).
        $interestedPrev = $this->getMonthlyCounts($comparisonYear, 'interested');
        $interestedCurr = $this->getMonthlyCounts($selectedYear, 'interested');
        $enrolledPrev   = $this->getMonthlyCounts($comparisonYear, 'enrolled');
        $enrolledCurr   = $this->getMonthlyCounts($selectedYear, 'enrolled');

        // Monta séries no formato esperado pelo frontend, com chaves dinâmicas y{ano}
        $keyPrev = 'y' . $comparisonYear;
        $keyCurr = 'y' . $selectedYear;
        $interested = [];
        $enrolled = [];
        for ($m = 1; $m <= 12; $m++) {
            $interested[] = [
                'mes' => $months[$m - 1],
                $keyPrev => $interestedPrev[$m] ?? 0,
                $keyCurr => $interestedCurr[$m] ?? 0,
            ];
            $enrolled[] = [
                'mes' => $months[$m - 1],
                $keyPrev => $enrolledPrev[$m] ?? 0,
                $keyCurr => $enrolledCurr[$m] ?? 0,
            ];
        }

        $payload = [
            'data' => [
                'charts' => [
                    'interested' => $interested,
                    'enrolled'   => $enrolled,
                ],
                // pt-BR: Inclui metadados de ano selecionado e comparativo
                // en-US: Include selected and comparison year metadata
                'meta' => [
                    'selected_year' => $selectedYear,
                    'comparison_year' => $comparisonYear,
                ],
            ],
        ];

        return response()->json($payload);
    }
    
    /**
     * getMonthlyCounts
     * pt-BR: Retorna contagens por mês para um ano específico, com filtro de situação.
     *        'interested' aplica posts.post_name = 'int'; 'enrolled' aplica posts.post_name != 'int'.
     *        Aplica também filtros adicionais: matriculas.ativo = 's' e matriculas.excluido = 'n'.
     * en-US: Returns month-wise counts for a specific year, filtered by situation.
     *        'interested' applies posts.post_name = 'int'; 'enrolled' applies posts.post_name != 'int'.
     *        Also applies extra filters: matriculas.ativo = 's' and matriculas.excluido = 'n'.
     * @param int $year Ano alvo (ex.: 2024)
     * @param string $mode Modo: 'interested' | 'enrolled'
     * @return array<int,int> Mapa mês(1-12) => contagem
     */
    private function getMonthlyCounts(int $year, string $mode): array
    {
        // Consulta agregada por mês usando a coluna 'data' de matriculas
        $rows = DB::table('matriculas')
            ->leftJoin('posts', 'matriculas.situacao_id', '=', 'posts.id')
            ->selectRaw('MONTH(matriculas.data) as month, COUNT(*) as total')
            ->whereYear('matriculas.data', $year)
            // Filtro de registros ativos e não excluídos
            ->where('matriculas.ativo', 's')
            ->where('matriculas.excluido', 'n')
            ->when($mode === 'interested', function ($q) {
                $q->where('posts.post_name', 'int');
            }, function ($q) {
                // 'mat' conforme MatriculaController: tudo que não é 'int'
                $q->where('posts.post_name', '!=', 'int');
            })
            ->groupBy('month')
            ->get();

        $out = [];
        foreach ($rows as $r) {
            $month = (int) ($r->month ?? 0);
            if ($month >= 1 && $month <= 12) {
                $out[$month] = (int) $r->total;
            }
        }
        // Garante chaves ausentes com zero
        for ($m = 1; $m <= 12; $m++) {
            if (!array_key_exists($m, $out)) {
                $out[$m] = 0;
            }
        }
        ksort($out);
        return $out;
    }
    /**
     * interestedMonthly
     * pt-BR: Retorna série mensal de Interessados (dados mocados).
     * en-US: Returns monthly series for Leads (mocked data).
     */
    public function interestedMonthly(Request $request)
    {
        $months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
        $data = [
            ['mes' => $months[0],  'y2024' => 5, 'y2025' => 8],
            ['mes' => $months[1],  'y2024' => 3, 'y2025' => 5],
            ['mes' => $months[2],  'y2024' => 6, 'y2025' => 7],
            ['mes' => $months[3],  'y2024' => 4, 'y2025' => 6],
            ['mes' => $months[4],  'y2024' => 7, 'y2025' => 5],
            ['mes' => $months[5],  'y2024' => 5, 'y2025' => 6],
            ['mes' => $months[6],  'y2024' => 6, 'y2025' => 7],
            ['mes' => $months[7],  'y2024' => 8, 'y2025' => 9],
            ['mes' => $months[8],  'y2024' => 7, 'y2025' => 6],
            ['mes' => $months[9],  'y2024' => 5, 'y2025' => 7],
            ['mes' => $months[10], 'y2024' => 6, 'y2025' => 8],
            ['mes' => $months[11], 'y2024' => 7, 'y2025' => 9],
        ];

        return response()->json($data);
    }

    /**
     * enrolledMonthly
     * pt-BR: Retorna série mensal de Matriculados (dados mocados).
     * en-US: Returns monthly series for Enrolled (mocked data).
     */
    public function enrolledMonthly(Request $request)
    {
        $months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
        $data = [
            ['mes' => $months[0],  'y2024' => 4, 'y2025' => 6],
            ['mes' => $months[1],  'y2024' => 2, 'y2025' => 3],
            ['mes' => $months[2],  'y2024' => 3, 'y2025' => 4],
            ['mes' => $months[3],  'y2024' => 4, 'y2025' => 5],
            ['mes' => $months[4],  'y2024' => 3, 'y2025' => 4],
            ['mes' => $months[5],  'y2024' => 2, 'y2025' => 3],
            ['mes' => $months[6],  'y2024' => 3, 'y2025' => 4],
            ['mes' => $months[7],  'y2024' => 5, 'y2025' => 8],
            ['mes' => $months[8],  'y2024' => 4, 'y2025' => 5],
            ['mes' => $months[9],  'y2024' => 3, 'y2025' => 4],
            ['mes' => $months[10], 'y2024' => 4, 'y2025' => 5],
            ['mes' => $months[11], 'y2024' => 6, 'y2025' => 11],
        ];

        return response()->json($data);
    }
}