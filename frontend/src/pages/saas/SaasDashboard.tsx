import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Users,
  FileText,
  DollarSign,
  ArrowUpRight,
  Clock,
  XCircle,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import { saasService, SaasDashboardData } from '@/services/saasService';

export default function SaasDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<SaasDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const result = await saasService.getDashboard();
      setData(result);
    } catch (error) {
      console.error('Erro ao carregar dashboard SaaS:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Painel SaaS</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-8 bg-muted rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Painel SaaS
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerenciamento de assinaturas e faturamento dos tenants
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/saas/plans')}>
            Planos
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/saas/subscriptions')}>
            Assinaturas
          </Button>
          <Button onClick={() => navigate('/admin/saas/invoices')}>
            <FileText className="h-4 w-4 mr-2" />
            Faturas
          </Button>
        </div>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">MRR</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(data.revenue.mrr)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500 opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ARR: {formatCurrency(data.revenue.arr)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Este Mês</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(data.revenue.this_month)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(data.revenue.pending)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vencido</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(data.revenue.overdue)}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenants & Subscriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Tenants
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold">{data.tenants.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                <p className="text-3xl font-bold text-emerald-600">{data.tenants.active}</p>
                <p className="text-sm text-muted-foreground">Ativos</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950/20">
                <p className="text-3xl font-bold text-red-600">{data.tenants.inactive}</p>
                <p className="text-sm text-muted-foreground">Inativos</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                <p className="text-3xl font-bold text-amber-600">{data.tenants.without_subscription}</p>
                <p className="text-sm text-muted-foreground">Sem Assinatura</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Assinaturas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Ativas</span>
              <Badge variant="default" className="bg-emerald-500">{data.subscriptions.active}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Trial</span>
              <Badge variant="secondary">{data.subscriptions.trial}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Em Atraso</span>
              <Badge variant="outline" className="text-amber-600 border-amber-300">{data.subscriptions.past_due}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Suspensas</span>
              <Badge variant="destructive">{data.subscriptions.suspended}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Canceladas</span>
              <Badge variant="outline">{data.subscriptions.cancelled}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices & Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Faturas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm">Pagas</span>
              </div>
              <span className="font-semibold">{data.invoices.paid}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Pendentes</span>
              </div>
              <span className="font-semibold">{data.invoices.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Vencidas</span>
              </div>
              <span className="font-semibold text-red-600">{data.invoices.overdue}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Canceladas</span>
              </div>
              <span className="font-semibold">{data.invoices.cancelled}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Distribuição por Plano
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.charts.plan_distribution.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma assinatura ativa ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {data.charts.plan_distribution.map((item, idx) => {
                  const total = data.charts.plan_distribution.reduce((s, i) => s + i.count, 0);
                  const pct = total > 0 ? (item.count / total) * 100 : 0;
                  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500'];
                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{item.plan_name}</span>
                        <span className="text-sm text-muted-foreground">{item.count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${colors[idx % colors.length]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart (simplified) */}
      {Object.keys(data.charts.revenue_by_month).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Receita nos Últimos 6 Meses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {Object.entries(data.charts.revenue_by_month).map(([month, revenue]) => {
                const maxRevenue = Math.max(...Object.values(data.charts.revenue_by_month));
                const heightPct = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground">{formatCurrency(revenue)}</span>
                    <div
                      className="w-full bg-primary/80 rounded-t-md transition-all hover:bg-primary min-h-[4px]"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-xs text-muted-foreground">{month.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
