<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\SaasInvoice;
use App\Models\SaasPlan;
use App\Models\SaasSubscription;
use App\Models\Tenant;
use Illuminate\Http\Request;

class SaasDashboardController extends Controller
{
    /**
     * Retorna métricas consolidadas do painel SaaS.
     */
    public function index(Request $request)
    {
        // ── Tenants ──
        $totalTenants = Tenant::count();
        $activeTenants = Tenant::where('ativo', 's')->count();
        $inactiveTenants = $totalTenants - $activeTenants;

        // ── Assinaturas ──
        $subscriptions = SaasSubscription::selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN status = 'trial' THEN 1 ELSE 0 END) as trial,
            SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
            SUM(CASE WHEN status = 'past_due' THEN 1 ELSE 0 END) as past_due
        ")->first();

        // ── MRR (Monthly Recurring Revenue) ──
        $mrr = SaasSubscription::whereIn('status', ['active'])
            ->with('plan')
            ->get()
            ->sum(function ($sub) {
                if ($sub->billing_cycle === 'yearly') {
                    return ($sub->plan->price_yearly ?? $sub->plan->price_monthly * 12) / 12;
                }
                return $sub->plan->price_monthly;
            });

        // ── ARR (Annual Recurring Revenue) ──
        $arr = $mrr * 12;

        // ── Faturas ──
        $currentMonth = now()->startOfMonth()->toDateString();
        $currentMonthEnd = now()->endOfMonth()->toDateString();

        $invoiceStats = SaasInvoice::selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
            SUM(CASE WHEN status = 'overdue' OR (status = 'pending' AND due_date < CURDATE()) THEN 1 ELSE 0 END) as overdue,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
        ")->first();

        $revenueThisMonth = SaasInvoice::where('status', 'paid')
            ->whereBetween('paid_at', [$currentMonth, $currentMonthEnd])
            ->sum('total');

        $pendingAmount = SaasInvoice::where('status', 'pending')
            ->sum('total');

        $overdueAmount = SaasInvoice::where(function ($q) {
            $q->where('status', 'overdue')
              ->orWhere(function ($q2) {
                  $q2->where('status', 'pending')
                     ->where('due_date', '<', now()->toDateString());
              });
        })->sum('total');

        // ── Receita mensal (últimos 6 meses) ──
        $revenueByMonth = SaasInvoice::where('status', 'paid')
            ->where('paid_at', '>=', now()->subMonths(6)->startOfMonth())
            ->selectRaw("DATE_FORMAT(paid_at, '%Y-%m') as month, SUM(total) as revenue")
            ->groupBy('month')
            ->orderBy('month')
            ->pluck('revenue', 'month')
            ->toArray();

        // ── Planos populares ──
        $planDistribution = SaasSubscription::whereIn('status', ['active', 'trial'])
            ->selectRaw('plan_id, COUNT(*) as count')
            ->groupBy('plan_id')
            ->with('plan:id,name')
            ->get()
            ->map(function ($item) {
                return [
                    'plan_name' => $item->plan->name ?? 'Desconhecido',
                    'count' => $item->count,
                ];
            });

        // ── Tenants sem assinatura ──
        $tenantsWithoutSubscription = Tenant::whereNotIn('id', function ($q) {
            $q->select('tenant_id')
              ->from('saas_subscriptions')
              ->whereIn('status', ['active', 'trial', 'past_due']);
        })->count();

        return response()->json([
            'tenants' => [
                'total' => $totalTenants,
                'active' => $activeTenants,
                'inactive' => $inactiveTenants,
                'without_subscription' => $tenantsWithoutSubscription,
            ],
            'subscriptions' => [
                'total' => (int) $subscriptions->total,
                'active' => (int) $subscriptions->active,
                'trial' => (int) $subscriptions->trial,
                'suspended' => (int) $subscriptions->suspended,
                'cancelled' => (int) $subscriptions->cancelled,
                'past_due' => (int) $subscriptions->past_due,
            ],
            'revenue' => [
                'mrr' => round($mrr, 2),
                'arr' => round($arr, 2),
                'this_month' => round($revenueThisMonth, 2),
                'pending' => round($pendingAmount, 2),
                'overdue' => round($overdueAmount, 2),
            ],
            'invoices' => [
                'total' => (int) $invoiceStats->total,
                'pending' => (int) $invoiceStats->pending,
                'paid' => (int) $invoiceStats->paid,
                'overdue' => (int) $invoiceStats->overdue,
                'cancelled' => (int) $invoiceStats->cancelled,
            ],
            'charts' => [
                'revenue_by_month' => $revenueByMonth,
                'plan_distribution' => $planDistribution,
            ],
        ]);
    }
}
