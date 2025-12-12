import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Users,
  MessageCircle,
  Bot,
  FileText,
  Target,
  DollarSign,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMetricsList } from "@/hooks/metrics";
import { useMemo } from "react";
import { MetricRecord } from "@/types/metrics";
import { MetricsChart, ConversionFunnel } from "@/components/metrics/MetricsChart";
import { ROIChart, ConversionMetrics } from "@/components/metrics/ROIChart";

/**
 * Dashboard de métricas com visualizações avançadas
 * Exibe KPIs, tendências e análises de performance do projeto
 */
export default function MetricsDashboard() {
  // Buscar dados de métricas
  const { data: metricsData, isLoading, error } = useMetricsList();

  // Calcular métricas agregadas e KPIs
  const analytics = useMemo(() => {
    if (!metricsData?.registros || metricsData.registros.length === 0) {
      return {
        totalInvestment: 0,
        totalVisitors: 0,
        totalBotConversations: 0,
        totalHumanConversations: 0,
        totalProposals: 0,
        totalClosedDeals: 0,
        conversionRate: 0,
        proposalConversionRate: 0,
        averageInvestment: 0,
        roi: 0,
        recentMetrics: [],
        trends: {
          visitors: 0,
          conversations: 0,
          proposals: 0,
          deals: 0,
        },
      };
    }

    const records = metricsData.registros;
    const totals = metricsData.totais_filtrados;

    // Usar totais filtrados se disponíveis, senão calcular
    const totalInvestment = records.reduce((sum, record) => sum + record.investment, 0);
    const totalVisitors = totals?.total_visitors || records.reduce((sum, record) => sum + record.visitors, 0);
    const totalBotConversations = totals?.total_bot_conversations || records.reduce((sum, record) => sum + record.bot_conversations, 0);
    const totalHumanConversations = totals?.total_human_conversations || records.reduce((sum, record) => sum + record.human_conversations, 0);
    const totalProposals = totals?.total_proposals || records.reduce((sum, record) => sum + record.proposals, 0);
    const totalClosedDeals = totals?.total_closed_deals || records.reduce((sum, record) => sum + record.closed_deals, 0);

    // Calcular KPIs
    const conversionRate = totalVisitors > 0 ? (totalClosedDeals / totalVisitors) * 100 : 0;
    const proposalConversionRate = totalProposals > 0 ? (totalClosedDeals / totalProposals) * 100 : 0;
    const averageInvestment = records.length > 0 ? totalInvestment / records.length : 0;
    const roi = totalInvestment > 0 ? ((totalClosedDeals * averageInvestment - totalInvestment) / totalInvestment) * 100 : 0;

    // Métricas recentes (últimos 5 registros)
    const recentMetrics = records.slice(-5).reverse();

    // Calcular tendências (comparar últimos 2 períodos)
    const trends = {
      visitors: 0,
      conversations: 0,
      proposals: 0,
      deals: 0,
    };

    if (records.length >= 2) {
      const current = records[records.length - 1];
      const previous = records[records.length - 2];

      trends.visitors = previous.visitors > 0 ? ((current.visitors - previous.visitors) / previous.visitors) * 100 : 0;
      trends.conversations = previous.human_conversations > 0 ? ((current.human_conversations - previous.human_conversations) / previous.human_conversations) * 100 : 0;
      trends.proposals = previous.proposals > 0 ? ((current.proposals - previous.proposals) / previous.proposals) * 100 : 0;
      trends.deals = previous.closed_deals > 0 ? ((current.closed_deals - previous.closed_deals) / previous.closed_deals) * 100 : 0;
    }

    return {
      totalInvestment,
      totalVisitors,
      totalBotConversations,
      totalHumanConversations,
      totalProposals,
      totalClosedDeals,
      conversionRate,
      proposalConversionRate,
      averageInvestment,
      roi,
      recentMetrics,
      trends,
    };
  }, [metricsData]);

  /**
   * Renderiza indicador de tendência
   */
  const renderTrend = (value: number) => {
    const isPositive = value > 0;
    const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
    const color = isPositive ? "text-green-600" : "text-red-600";
    
    return (
      <div className={`flex items-center gap-1 ${color}`}>
        <Icon className="h-3 w-3" />
        <span className="text-xs font-medium">
          {Math.abs(value).toFixed(1)}%
        </span>
      </div>
    );
  };

  /**
   * Formata valores monetários
   */
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  /**
   * Formata números grandes
   */
  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Carregando métricas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-2">Erro ao carregar métricas</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Métricas</h1>
          <p className="text-muted-foreground">
            Análise de performance e KPIs do projeto
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/admin/settings/metrics">
              <BarChart3 className="mr-2 h-4 w-4" />
              Gerenciar Métricas
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin">
              <Activity className="mr-2 h-4 w-4" />
              Dashboard Principal
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visitantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analytics.totalVisitors)}</div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Total acumulado</p>
              {renderTrend(analytics.trends.visitors)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversas</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(analytics.totalHumanConversations)}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                +{formatNumber(analytics.totalBotConversations)} bot
              </p>
              {renderTrend(analytics.trends.conversations)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propostas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analytics.totalProposals)}</div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Geradas</p>
              {renderTrend(analytics.trends.proposals)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fechamentos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analytics.totalClosedDeals)}</div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Vendas</p>
              {renderTrend(analytics.trends.deals)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas de Performance */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.conversionRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              Visitantes → Vendas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conv. Propostas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.proposalConversionRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              Propostas → Vendas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investimento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.totalInvestment)}
            </div>
            <p className="text-xs text-muted-foreground">
              Média: {formatCurrency(analytics.averageInvestment)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              analytics.roi >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {analytics.roi.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Retorno sobre investimento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos e Visualizações */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Gráfico de Performance */}
          <MetricsChart
            data={analytics.recentMetrics}
            title="Performance Mensal"
            description="Evolução das métricas ao longo do tempo"
            type="bar"
          />

          {/* Funil de Conversão */}
          <ConversionFunnel
            visitors={analytics.totalVisitors}
            conversations={analytics.totalHumanConversations}
            proposals={analytics.totalProposals}
            deals={analytics.totalClosedDeals}
          />
        </div>

        {/* Análise Financeira e ROI */}
        <ROIChart data={analytics.recentMetrics} />

        {/* Métricas de Conversão */}
        <ConversionMetrics data={analytics.recentMetrics} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Métricas Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Métricas Recentes</CardTitle>
            <CardDescription>
              Últimos registros de performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.recentMetrics.length > 0 ? (
                analytics.recentMetrics.map((metric: MetricRecord) => (
                  <div key={metric.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{metric.period}</p>
                        <p className="text-xs text-muted-foreground">
                          {metric.visitors} visitantes • {metric.closed_deals} vendas
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(metric.investment)}
                      </p>
                      <Badge variant="outline">
                        {metric.proposals} propostas
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <PieChart className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhuma métrica encontrada</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resumo de Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo de Performance</CardTitle>
            <CardDescription>
              Análise consolidada dos resultados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">Conversas Bot</span>
                </div>
                <span className="text-sm font-bold">
                  {formatNumber(analytics.totalBotConversations)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">Conversas Humanas</span>
                </div>
                <span className="text-sm font-bold">
                  {formatNumber(analytics.totalHumanConversations)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-orange-600" />
                  <span className="text-sm font-medium">Taxa Proposta/Conversa</span>
                </div>
                <span className="text-sm font-bold">
                  {analytics.totalHumanConversations > 0 
                    ? ((analytics.totalProposals / analytics.totalHumanConversations) * 100).toFixed(1)
                    : '0'
                  }%
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium">Eficiência Bot</span>
                </div>
                <span className="text-sm font-bold">
                  {analytics.totalBotConversations > 0 
                    ? ((analytics.totalHumanConversations / analytics.totalBotConversations) * 100).toFixed(1)
                    : '0'
                  }%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}