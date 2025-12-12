<?php

namespace App\Http\Controllers\api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use App\Models\FinancialAccount;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class FinancialOverviewController extends BaseController
{
    public function index(Request $request)
    {
        // Filtro de período (YYYY-MM)
        $period = $request->input('period');
        $hasPeriod = false;
        $periodStartDate = null;
        $periodEndDate = null;
        if ($period && preg_match('/^\d{4}-\d{2}$/', $period)) {
            $periodStartDate = Carbon::createFromFormat('Y-m', $period)->startOfMonth();
            $periodEndDate = Carbon::createFromFormat('Y-m', $period)->endOfMonth();
            $hasPeriod = true;
        }

        // Totais baseados em pagamentos realizados
        $totalIncome = (float) FinancialAccount::query()
            ->receivable()
            ->paid()
            ->when($hasPeriod, function($q) use ($periodStartDate, $periodEndDate) {
                $q->whereBetween('payment_date', [
                    $periodStartDate->toDateString(),
                    $periodEndDate->toDateString()
                ]);
            })
            ->sum(DB::raw('COALESCE(paid_amount, 0)'));

        $totalExpenses = (float) FinancialAccount::query()
            ->payable()
            ->paid()
            ->when($hasPeriod, function($q) use ($periodStartDate, $periodEndDate) {
                $q->whereBetween('payment_date', [
                    $periodStartDate->toDateString(),
                    $periodEndDate->toDateString()
                ]);
            })
            ->sum(DB::raw('COALESCE(paid_amount, 0)'));

        $netProfit = $totalIncome - $totalExpenses;
        $cashBalance = $netProfit; // aproximação: entradas pagas menos saídas pagas

        // Vencidos (valor restante)
        $overdueReceivables = (float) FinancialAccount::query()
            ->receivable()
            ->when($hasPeriod, function($q) use ($periodStartDate, $periodEndDate) {
                $q->whereBetween('due_date', [
                    $periodStartDate->toDateString(),
                    $periodEndDate->toDateString()
                ]);
            })
            ->overdue()
            ->selectRaw('SUM(amount - COALESCE(paid_amount,0)) as total')
            ->value('total') ?? 0.0;

        $overduePayables = (float) FinancialAccount::query()
            ->payable()
            ->when($hasPeriod, function($q) use ($periodStartDate, $periodEndDate) {
                $q->whereBetween('due_date', [
                    $periodStartDate->toDateString(),
                    $periodEndDate->toDateString()
                ]);
            })
            ->overdue()
            ->selectRaw('SUM(amount - COALESCE(paid_amount,0)) as total')
            ->value('total') ?? 0.0;

        // Transações recentes: últimas 5 contas (considera payment_date se existir, senão due_date, senão created_at)
        $recentTransactions = FinancialAccount::query()
            ->when($hasPeriod, function($q) use ($periodStartDate, $periodEndDate) {
                $start = $periodStartDate->copy()->startOfDay()->toDateTimeString();
                $end = $periodEndDate->copy()->endOfDay()->toDateTimeString();
                $q->where(function($w) use ($start, $end) {
                    $w->whereBetween('payment_date', [$start, $end])
                      ->orWhere(function($qq) use ($start, $end) {
                          $qq->whereNull('payment_date')
                             ->whereBetween('due_date', [substr($start,0,10), substr($end,0,10)]);
                      })
                      ->orWhere(function($qq) use ($start, $end) {
                          $qq->whereNull('payment_date')
                             ->whereNull('due_date')
                             ->whereBetween('created_at', [$start, $end]);
                      });
                });
            })
            ->orderByRaw('COALESCE(payment_date, due_date, created_at) DESC')
            ->limit(5)
            ->get()
            ->map(function ($acc) {
                $date = $acc->payment_date ?? $acc->due_date ?? $acc->created_at;
                return [
                    'id' => (string) $acc->id,
                    'description' => $acc->description ?? ('Conta #' . $acc->id),
                    'amount' => $acc->isPaid() ? (float) ($acc->paid_amount ?? 0) : (float) $acc->amount,
                    'date' => optional($date)->toIso8601String(),
                    'type' => $acc->isReceivable() ? 'income' : 'expense',
                ];
            })->values();

        // Próximos vencimentos (30 dias)
        $startDate = now()->startOfDay()->toDateString();
        $endDate = now()->addDays(30)->endOfDay()->toDateString();

        $upcomingReceivables = FinancialAccount::query()
            ->receivable()
            ->pending()
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [$startDate, $endDate])
            ->orderBy('due_date')
            ->limit(5)
            ->get()
            ->map(function ($acc) {
                return [
                    'id' => (string) $acc->id,
                    'description' => $acc->description ?? ('Conta #' . $acc->id),
                    'amount' => (float) ($acc->amount - ($acc->paid_amount ?? 0)),
                    'date' => optional($acc->due_date)->toIso8601String(),
                ];
            })->values();

        $upcomingPayables = FinancialAccount::query()
            ->payable()
            ->pending()
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [$startDate, $endDate])
            ->orderBy('due_date')
            ->limit(5)
            ->get()
            ->map(function ($acc) {
                return [
                    'id' => (string) $acc->id,
                    'description' => $acc->description ?? ('Conta #' . $acc->id),
                    'amount' => (float) ($acc->amount - ($acc->paid_amount ?? 0)),
                    'date' => optional($acc->due_date)->toIso8601String(),
                ];
            })->values();
        $data = [
            'summary' => [
                'totalIncome' => round($totalIncome, 2),
                'totalExpenses' => round($totalExpenses, 2),
                'netProfit' => round($netProfit, 2),
                'cashBalance' => round($cashBalance, 2),
                'overdueReceivables' => round($overdueReceivables, 2),
                'overduePayables' => round($overduePayables, 2),
            ],
            'recentTransactions' => $recentTransactions,
            'upcomingReceivables' => $upcomingReceivables,
            'upcomingPayables' => $upcomingPayables,
        ];
        return response()->json($data);
    }
}
