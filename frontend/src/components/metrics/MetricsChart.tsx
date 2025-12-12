import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricRecord } from "@/types/metrics";
import { useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";

interface MetricsChartProps {
  data: MetricRecord[];
  title: string;
  description?: string;
  type?: 'line' | 'bar' | 'area';
}

/**
 * Componente de gráfico simples para métricas
 * Renderiza visualizações básicas dos dados de métricas
 */
export function MetricsChart({ data, title, description, type = 'bar' }: MetricsChartProps) {
  // Processar dados para visualização
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.slice(-6).map((record) => ({
      period: record.period,
      visitors: record.visitors,
      conversations: record.human_conversations,
      proposals: record.proposals,
      deals: record.closed_deals,
      investment: record.investment,
    }));
  }, [data]);

  // Calcular valores máximos para normalização
  const maxValues = useMemo(() => {
    if (chartData.length === 0) return { visitors: 0, conversations: 0, proposals: 0, deals: 0 };

    return {
      visitors: Math.max(...chartData.map(d => d.visitors)),
      conversations: Math.max(...chartData.map(d => d.conversations)),
      proposals: Math.max(...chartData.map(d => d.proposals)),
      deals: Math.max(...chartData.map(d => d.deals)),
    };
  }, [chartData]);

  // Calcular tendência geral
  const trend = useMemo(() => {
    if (chartData.length < 2) return 0;
    
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    
    const firstTotal = first.visitors + first.conversations + first.proposals + first.deals;
    const lastTotal = last.visitors + last.conversations + last.proposals + last.deals;
    
    return firstTotal > 0 ? ((lastTotal - firstTotal) / firstTotal) * 100 : 0;
  }, [chartData]);

  /**
   * Renderiza uma barra simples para visualização
   */
  const renderBar = (value: number, maxValue: number, color: string) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    return (
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    );
  };

  /**
   * Renderiza indicador de tendência
   */
  const renderTrendIndicator = () => {
    const isPositive = trend > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const color = isPositive ? "text-green-600" : "text-red-600";
    
    return (
      <div className={`flex items-center gap-1 ${color}`}>
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">
          {Math.abs(trend).toFixed(1)}%
        </span>
      </div>
    );
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Activity className="h-8 w-8 mb-2" />
            <p>Nenhum dado disponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {title}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {renderTrendIndicator()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {chartData.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.period}</span>
                <span className="text-muted-foreground">
                  {item.visitors + item.conversations + item.proposals + item.deals} total
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>Visitantes</span>
                    <span className="font-medium">{item.visitors}</span>
                  </div>
                  {renderBar(item.visitors, maxValues.visitors, "bg-blue-500")}
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>Conversas</span>
                    <span className="font-medium">{item.conversations}</span>
                  </div>
                  {renderBar(item.conversations, maxValues.conversations, "bg-green-500")}
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>Propostas</span>
                    <span className="font-medium">{item.proposals}</span>
                  </div>
                  {renderBar(item.proposals, maxValues.proposals, "bg-orange-500")}
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>Fechamentos</span>
                    <span className="font-medium">{item.deals}</span>
                  </div>
                  {renderBar(item.deals, maxValues.deals, "bg-purple-500")}
                </div>
              </div>
              
              {index < chartData.length - 1 && <hr className="my-3" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Componente de gráfico de funil de conversão
 */
interface ConversionFunnelProps {
  visitors: number;
  conversations: number;
  proposals: number;
  deals: number;
}

export function ConversionFunnel({ visitors, conversations, proposals, deals }: ConversionFunnelProps) {
  const stages = [
    { label: 'Visitantes', value: visitors, color: 'bg-blue-500' },
    { label: 'Conversas', value: conversations, color: 'bg-green-500' },
    { label: 'Propostas', value: proposals, color: 'bg-orange-500' },
    { label: 'Fechamentos', value: deals, color: 'bg-purple-500' },
  ];

  const maxValue = Math.max(visitors, conversations, proposals, deals);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          Funil de Conversão
        </CardTitle>
        <CardDescription>
          Visualização do processo de conversão
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const percentage = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
            const conversionRate = index > 0 && stages[index - 1].value > 0 
              ? (stage.value / stages[index - 1].value) * 100 
              : 100;

            return (
              <div key={stage.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{stage.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{stage.value.toLocaleString()}</span>
                    {index > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({conversionRate.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${stage.color}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}