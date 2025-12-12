import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricRecord } from "@/types/metrics";
import { useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calculator,
  Target,
} from "lucide-react";

interface ROIChartProps {
  data: MetricRecord[];
}

/**
 * Componente para visualização de ROI e métricas financeiras
 */
export function ROIChart({ data }: ROIChartProps) {
  // Calcular métricas de ROI
  const roiMetrics = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalInvestment: 0,
        totalRevenue: 0,
        roi: 0,
        averageTicket: 0,
        costPerLead: 0,
        conversionRate: 0,
        monthlyData: [],
      };
    }

    const totalInvestment = data.reduce((sum, record) => sum + record.investment, 0);
    const totalDeals = data.reduce((sum, record) => sum + record.closed_deals, 0);
    const totalVisitors = data.reduce((sum, record) => sum + record.visitors, 0);
    
    // Estimativa de receita baseada em ticket médio (R$ 2.500 por deal)
    const averageTicket = 2500;
    const totalRevenue = totalDeals * averageTicket;
    
    const roi = totalInvestment > 0 ? ((totalRevenue - totalInvestment) / totalInvestment) * 100 : 0;
    const costPerLead = totalVisitors > 0 ? totalInvestment / totalVisitors : 0;
    const conversionRate = totalVisitors > 0 ? (totalDeals / totalVisitors) * 100 : 0;

    // Dados mensais para gráfico
    const monthlyData = data.slice(-6).map(record => {
      const monthRevenue = record.closed_deals * averageTicket;
      const monthROI = record.investment > 0 ? ((monthRevenue - record.investment) / record.investment) * 100 : 0;
      
      return {
        period: record.period,
        investment: record.investment,
        revenue: monthRevenue,
        roi: monthROI,
        deals: record.closed_deals,
      };
    });

    return {
      totalInvestment,
      totalRevenue,
      roi,
      averageTicket,
      costPerLead,
      conversionRate,
      monthlyData,
    };
  }, [data]);

  /**
   * Renderiza indicador de ROI com cor baseada na performance
   */
  const renderROIIndicator = (value: number) => {
    const isPositive = value > 0;
    const isGood = value > 20; // ROI acima de 20% é considerado bom
    
    let colorClass = "text-red-600";
    if (isPositive && value > 10) colorClass = "text-yellow-600";
    if (isGood) colorClass = "text-green-600";
    
    const Icon = isPositive ? TrendingUp : TrendingDown;
    
    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        <Icon className="h-4 w-4" />
        <span className="font-bold">{value.toFixed(1)}%</span>
      </div>
    );
  };

  /**
   * Renderiza barra de progresso para métricas
   */
  const renderProgressBar = (value: number, max: number, color: string) => {
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    
    return (
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Análise de ROI
          </CardTitle>
          <CardDescription>Retorno sobre investimento e métricas financeiras</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Calculator className="h-8 w-8 mb-2" />
            <p>Nenhum dado financeiro disponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Card de ROI Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Análise de ROI
          </CardTitle>
          <CardDescription>Retorno sobre investimento geral</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Investimento Total</p>
                <p className="text-2xl font-bold text-red-600">
                  R$ {roiMetrics.totalInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Receita Estimada</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {roiMetrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">ROI Total</p>
                <p className="text-lg font-semibold">Retorno sobre Investimento</p>
              </div>
              {renderROIIndicator(roiMetrics.roi)}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Ticket Médio</p>
                <p className="font-semibold">R$ {roiMetrics.averageTicket.toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Custo por Lead</p>
                <p className="font-semibold">R$ {roiMetrics.costPerLead.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Mensal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Performance Mensal
          </CardTitle>
          <CardDescription>ROI e receita por período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {roiMetrics.monthlyData.map((month, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{month.period}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {month.deals} deals
                    </span>
                    {renderROIIndicator(month.roi)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Investimento</span>
                      <span className="font-medium">R$ {month.investment.toLocaleString('pt-BR')}</span>
                    </div>
                    {renderProgressBar(month.investment, Math.max(...roiMetrics.monthlyData.map(m => m.investment)), "bg-red-500")}
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Receita</span>
                      <span className="font-medium">R$ {month.revenue.toLocaleString('pt-BR')}</span>
                    </div>
                    {renderProgressBar(month.revenue, Math.max(...roiMetrics.monthlyData.map(m => m.revenue)), "bg-green-500")}
                  </div>
                </div>
                
                {index < roiMetrics.monthlyData.length - 1 && <hr className="my-2" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Componente para métricas de conversão e eficiência
 */
interface ConversionMetricsProps {
  data: MetricRecord[];
}

export function ConversionMetrics({ data }: ConversionMetricsProps) {
  const metrics = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        visitorToConversation: 0,
        conversationToProposal: 0,
        proposalToDeal: 0,
        overallConversion: 0,
        efficiency: 'Baixa',
      };
    }

    const totals = data.reduce(
      (acc, record) => ({
        visitors: acc.visitors + record.visitors,
        conversations: acc.conversations + record.human_conversations,
        proposals: acc.proposals + record.proposals,
        deals: acc.deals + record.closed_deals,
      }),
      { visitors: 0, conversations: 0, proposals: 0, deals: 0 }
    );

    const visitorToConversation = totals.visitors > 0 ? (totals.conversations / totals.visitors) * 100 : 0;
    const conversationToProposal = totals.conversations > 0 ? (totals.proposals / totals.conversations) * 100 : 0;
    const proposalToDeal = totals.proposals > 0 ? (totals.deals / totals.proposals) * 100 : 0;
    const overallConversion = totals.visitors > 0 ? (totals.deals / totals.visitors) * 100 : 0;

    let efficiency = 'Baixa';
    if (overallConversion > 5) efficiency = 'Alta';
    else if (overallConversion > 2) efficiency = 'Média';

    return {
      visitorToConversation,
      conversationToProposal,
      proposalToDeal,
      overallConversion,
      efficiency,
    };
  }, [data]);

  const conversionSteps = [
    {
      label: 'Visitante → Conversa',
      value: metrics.visitorToConversation,
      target: 15, // Meta de 15%
      color: 'bg-blue-500',
    },
    {
      label: 'Conversa → Proposta',
      value: metrics.conversationToProposal,
      target: 30, // Meta de 30%
      color: 'bg-green-500',
    },
    {
      label: 'Proposta → Fechamento',
      value: metrics.proposalToDeal,
      target: 25, // Meta de 25%
      color: 'bg-purple-500',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Métricas de Conversão
        </CardTitle>
        <CardDescription>Eficiência do funil de vendas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Conversão Geral */}
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Conversão Geral</p>
            <p className="text-3xl font-bold">{metrics.overallConversion.toFixed(2)}%</p>
            <p className="text-sm">
              Eficiência: <span className={`font-semibold ${
                metrics.efficiency === 'Alta' ? 'text-green-600' :
                metrics.efficiency === 'Média' ? 'text-yellow-600' : 'text-red-600'
              }`}>{metrics.efficiency}</span>
            </p>
          </div>

          {/* Etapas de Conversão */}
          <div className="space-y-4">
            {conversionSteps.map((step, index) => {
              const isAboveTarget = step.value >= step.target;
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{step.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{step.value.toFixed(1)}%</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        isAboveTarget ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        Meta: {step.target}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${step.color}`}
                        style={{ width: `${Math.min((step.value / step.target) * 100, 100)}%` }}
                      />
                    </div>
                    {/* Linha da meta */}
                    <div 
                      className="absolute top-0 h-3 w-0.5 bg-gray-400"
                      style={{ left: '100%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}