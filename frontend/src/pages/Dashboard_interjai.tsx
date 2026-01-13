import { useEffect, useState } from "react";
import { KPICard } from "@/components/metrics/KPICard";
import { PeriodSelector } from "@/components/metrics/PeriodSelector";
import { FunnelChart } from "@/components/metrics/FunnelChart";
import { TrendChart } from "@/components/metrics/TrendChart";
import { Card } from "@/components/ui/card";
import { BarChart3, TrendingUp, Settings, Activity } from "lucide-react";
import { WebhookTester } from "@/components/metrics/WebhookTester";
import { metricsService } from "@/services/metricsService";

const Dashboard2 = () => {
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const [activeTab, setActiveTab] = useState('principais');
  const [selectedPeriod, setSelectedPeriod] = useState(currentMonth);
  interface kpiData {
    investment: number;
    visitors: number;
    botConversations: number;
    humanConversations: number;
    proposals: number;
    closedDeals: number;
  }
  interface trendData {
    period : string;
    value : number;
  }
  type ConverTrend = {
    period: string;
    value: number;
  }
  const [kpiData, setKpiData] = useState<kpiData>({
    investment: 26000,
    visitors: 11350,
    botConversations: 1852,
    humanConversations: 463,
    proposals: 185,
    closedDeals: 45
  });

  // Adicionar estado para variações
  const [variationsData, setVariationsData] = useState({
    closingRateVariation: 18.9,
    cpfVariation: -15.3,
    proposalsVariation: 22.1,
    humanConversationsVariation: -5.2,
    transferRateVariation: -3.2
  });
  const [trendData,setDataTrend] = useState<trendData[]>([
    { period: "Sem 1", value: 8200 },
    { period: "Sem 2", value: 9500 },
    { period: "Sem 3", value: 11200 },
    { period: "Sem 4", value: 12350 }
  ]);
 
  const [conversationTrend,setConverTrend] = useState<trendData[]>([
    { period: "Sem 1", value: 1420 },
    { period: "Sem 2", value: 1680 },
    { period: "Sem 3", value: 1950 },
    { period: "Sem 4", value: 2315 }
  ]);
  const consult = ({ type, value, inicio, fim }) => {
    setSelectedPeriod(type);
    // console.log(`Consultando métricas pagina dashboard para: type=> ${type} - value=> ${value} de Inicio: ${inicio} a Fim=> ${fim}`);
    metricsService.listMetrics({
      start_date: typeof inicio === 'string' ? inicio : inicio.toISOString().split('T')[0],
      end_date: typeof fim === 'string' ? fim : fim.toISOString().split('T')[0]
      }).then((res) => {
        console.log("Métricas retornadas:", res);
        const resAny = res as any;
        const totalMetrics = resAny?.totais_filtrados || [];
        const totalTends = resAny?.agregados?.visitas?.por_semana || [];
        const totalTendsConv = resAny?.agregados?.conversas?.por_semana || [];

        // Adicionar processamento de variações
        const variations = resAny?.variacoes || {};
        
        if (variations) {
          setVariationsData({
            closingRateVariation: variations.taxa_fechamento || 0,
            cpfVariation: variations.cpf || 0,
            proposalsVariation: variations.propostas || 0,
            humanConversationsVariation: variations.conversas_humanas || 0,
            transferRateVariation: variations.taxa_transbordo || 0
          });
        }
      // console.log(res);
      
      // console.log("Total de métricas:", totalMetrics.length);
      // Supondo que totalMetrics.data é um array de MetricRecord
      if (totalMetrics) {
        const investment = totalMetrics.total_investment??'0,00';
        const visitors = totalMetrics.total_visitors??0;
        const total_bot_conversations = totalMetrics.total_bot_conversations??'0,00';
        const total_human_conversations = totalMetrics.total_human_conversations??'0,00';
        const proposals = totalMetrics.total_proposals??'0,00';
        const total_closed_deals = totalMetrics.total_closed_deals??'0,00';
        // console.log(investment);        
        setKpiData({
          investment: investment,
          visitors: visitors,
          botConversations: total_bot_conversations,
          humanConversations: total_human_conversations,
          proposals: proposals,
          closedDeals: total_closed_deals
        });
      } else {
        // Se não houver dados, zera os KPIs ou mantém os anteriores
        setKpiData({
          investment: 0,
          visitors: 0,
          botConversations: 0,
          humanConversations: 0,
          proposals: 0,
          closedDeals: 0
        });
      }
      if(totalTends){
        const convertedTotalTends: ConverTrend[] = totalTends.map(item => ({
          period: `Semana ${item.semana}`,
          value: Number(item.total_visitors) // converte para number
        }));
        setDataTrend(convertedTotalTends);
      }
      if(totalTendsConv){
        const ctoalConverTends: ConverTrend[] = totalTendsConv.map((item)=>({
          period: `Semana ${item.semana}`,
          value: Number(item.total_human_conversations) // converte para number
        }));
        
        setConverTrend(ctoalConverTends);
        // console.log(ctoalConverTends);
      }
      
    }).catch((error) => {
      console.error("Erro ao buscar métricas:", error);
    });
  } 
  // console.log(selectedPeriod);

  
  // Cálculo dos indicadores derivados
  // console.log(kpiData); 
  
  const derivedKPIs = {
    conversionRate: (() => {
      const val = ((kpiData.botConversations + kpiData.humanConversations) / kpiData.visitors * 100);
      return isNaN(val) ? '0' : val.toFixed(1);
    })(),
    transferRate: (() => {
      const val = (kpiData.humanConversations / kpiData.botConversations * 100);
      return isNaN(val) ? '0' : val.toFixed(1);
    })(),
    proposalRate: (() => {
      const val = (kpiData.proposals / kpiData.humanConversations * 100);
      return isNaN(val) ? '0' : val.toFixed(1);
    })(),
    closingRate: (() => {
      const val = (kpiData.closedDeals / kpiData.proposals * 100);
      return isNaN(val) ? '0' : val.toFixed(1);
    })(),
    cpl: (() => {
      const val = (kpiData.investment / (kpiData.botConversations + kpiData.humanConversations));
      return isNaN(val) ? '0.00' : val.toFixed(2);
    })(),
    cpf: (() => {
      const val = (kpiData.investment / kpiData.closedDeals);
      return isNaN(val) ? '0.00' : val.toFixed(2);
    })()
  };

  const funnelData = [
    { stage: "Visitantes", value: kpiData.visitors, percentage: 100 },
    { stage: "Conversas", value: kpiData.botConversations + kpiData.humanConversations, percentage: parseFloat(derivedKPIs.conversionRate) },
    { stage: "Propostas", value: kpiData.proposals, percentage: parseFloat(derivedKPIs.proposalRate) },
    { stage: "Fechamentos", value: kpiData.closedDeals, percentage: parseFloat(derivedKPIs.closingRate) }
  ];

  // Função para gerar resumo executivo dinâmico
  const generateExecutiveSummary = () => {
    const positivePoints = [];
    const attentionPoints = [];
    
    // Analisar variações e categorizar
    if (variationsData.closingRateVariation > 0) {
      positivePoints.push(`Taxa de fechamento cresceu ${variationsData.closingRateVariation.toFixed(1)}%`);
    } else if (variationsData.closingRateVariation < 0) {
      attentionPoints.push(`Taxa de fechamento caiu ${Math.abs(variationsData.closingRateVariation).toFixed(1)}%`);
    }
    
    if (variationsData.cpfVariation < 0) {
      positivePoints.push(`CPF reduziu em ${Math.abs(variationsData.cpfVariation).toFixed(1)}%`);
    } else if (variationsData.cpfVariation > 0) {
      attentionPoints.push(`CPF aumentou ${variationsData.cpfVariation.toFixed(1)}%`);
    }
    
    if (variationsData.proposalsVariation > 0) {
      positivePoints.push(`Volume de propostas +${variationsData.proposalsVariation.toFixed(1)}%`);
    } else if (variationsData.proposalsVariation < 0) {
      attentionPoints.push(`Volume de propostas ${variationsData.proposalsVariation.toFixed(1)}%`);
    }
    
    if (variationsData.humanConversationsVariation < 0) {
      attentionPoints.push(`Conversas humanas caíram ${Math.abs(variationsData.humanConversationsVariation).toFixed(1)}%`);
    } else if (variationsData.humanConversationsVariation > 0) {
      positivePoints.push(`Conversas humanas cresceram ${variationsData.humanConversationsVariation.toFixed(1)}%`);
    }
    
    if (variationsData.transferRateVariation < 0) {
      attentionPoints.push(`Taxa de transbordo reduziu ${Math.abs(variationsData.transferRateVariation).toFixed(1)}%`);
    } else if (variationsData.transferRateVariation > 0) {
      positivePoints.push(`Taxa de transbordo aumentou ${variationsData.transferRateVariation.toFixed(1)}%`);
    }
    
    return { positivePoints, attentionPoints };
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'principais':
        return (
          <div className="space-y-6">
            {/* Seleção de Período */}
            {/* <PeriodSelector 
              selectedPeriod={selectedPeriod}
              onPeriodChange={ setSelectedPeriod}
            /> */}
            <PeriodSelector
              selectedPeriod={selectedPeriod}
              onPeriodChange={consult}
            />

            {/* Investimento primeiro */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-3 text-foreground text-center">Investimento</h3>
              <div className="max-w-xs mx-auto">
                <KPICard
                  title="Investimento em Mídia"
                  value={kpiData.investment}
                  format="currency"
                  variation={12.5}
                  className="bg-card border-accent/30"
                />
              </div>
            </Card>

            {/* Funil de Conversão */}
            <div className="relative">
              {/* Funil de fundo mais sutil */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <div className="w-full max-w-xs">
                  <div className="flex flex-col space-y-3 items-center mt-16">
                    <div className="w-full h-4 bg-primary/30 rounded"></div>
                    <div className="w-5/6 h-4 bg-primary/30 rounded"></div>
                    <div className="w-4/6 h-4 bg-primary/30 rounded"></div>
                    <div className="w-3/6 h-4 bg-primary/30 rounded"></div>
                    <div className="w-2/6 h-4 bg-primary/30 rounded"></div>
                  </div>
                </div>
              </div>
              
              <div className="relative z-10">
                <h3 className="text-lg font-semibold mb-4 text-foreground text-center">Funil de Conversão</h3>
                
                {/* Indicadores organizados como funil vertical */}
                <div className="space-y-3 max-w-sm mx-auto">
                  {/* Topo do funil - mais largo */}
                  <div className="w-full">
                    <KPICard
                      title="Visitantes LP"
                      value={kpiData.visitors}
                      variation={8.3}
                      className="bg-card border-2 border-primary/30"
                    />
                  </div>
                  
                  {/* Segundo nível */}
                  <div className="w-11/12 mx-auto">
                    <KPICard
                      title="Conversas Bot"
                      value={kpiData.botConversations}
                      variation={15.7}
                      className="bg-card border border-primary/20"
                    />
                  </div>
                  
                  {/* Terceiro nível */}
                  <div className="w-10/12 mx-auto">
                    <KPICard
                      title="Conversas Humanas"
                      value={kpiData.humanConversations}
                      variation={-5.2}
                      className="bg-card border border-primary/20"
                    />
                  </div>
                  
                  {/* Quarto nível */}
                  <div className="w-9/12 mx-auto">
                    <KPICard
                      title="Propostas"
                      value={kpiData.proposals}
                      variation={22.1}
                      className="bg-card border border-primary/20"
                    />
                  </div>
                  
                  {/* Base do funil - mais estreito */}
                  <div className="w-8/12 mx-auto">
                    <KPICard
                      title="Fechamentos"
                      value={kpiData.closedDeals}
                      variation={18.9}
                      className="bg-card border-2 border-success/40"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'derivados':
        return (
          <div className="space-y-6">
            {/* Seleção de Período */}
            <PeriodSelector 
              selectedPeriod={selectedPeriod}
              onPeriodChange={consult}
            />
            
            <div>
              <h2 className="text-xl font-semibold mb-4 text-foreground">Indicadores Derivados</h2>
              <div className="grid grid-cols-2 gap-4">
                <KPICard
                  title="Taxa de Conversão LP"
                  value={derivedKPIs.conversionRate}
                  format="percentage"
                  variation={5.8}
                  className="bg-accent/10 border-accent/30"
                />
                <KPICard
                  title="Taxa de Transbordo"
                  value={derivedKPIs.transferRate}
                  format="percentage"
                  variation={-3.2}
                />
                <KPICard
                  title="Taxa de Proposta"
                  value={derivedKPIs.proposalRate}
                  format="percentage"
                  variation={12.4}
                />
                <KPICard
                  title="Taxa de Fechamento"
                  value={derivedKPIs.closingRate}
                  format="percentage"
                  variation={7.9}
                />
                <KPICard
                  title="CPL"
                  value={derivedKPIs.cpl}
                  format="currency"
                  variation={-8.5}
                />
                <KPICard
                  title="CPF"
                  value={derivedKPIs.cpf}
                  format="currency"
                  variation={-15.3}
                />
              </div>
            </div>
          </div>
        );
      
      case 'graficos':
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Gráficos e Tendências</h2>
            <div className="space-y-4">
              <Card className="p-4">
                <TrendChart 
                  data={trendData} 
                  title="Tendência de Visitantes"
                  color="hsl(var(--primary))"
                />
              </Card>
              
              <Card className="p-4">
                <TrendChart 
                  data={conversationTrend} 
                  title="Tendência de Conversas"
                  color="hsl(var(--accent))"
                />
              </Card>
              
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-3 text-foreground">Resumo Executivo</h3>
                <div className="space-y-3">
                  {(() => {
                    const { positivePoints, attentionPoints } = generateExecutiveSummary();
                    
                    return (
                      <>
                        {positivePoints.length > 0 && (
                          <div className="p-3 bg-success/10 border border-success/30 rounded-lg">
                            <h4 className="font-semibold text-success mb-2 text-sm">Pontos Positivos</h4>
                            <ul className="text-xs text-foreground space-y-1">
                              {positivePoints.map((point, index) => (
                                <li key={index}>• {point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {attentionPoints.length > 0 && (
                          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                            <h4 className="font-semibold text-destructive mb-2 text-sm">Pontos de Atenção</h4>
                            <ul className="text-xs text-foreground space-y-1">
                              {attentionPoints.map((point, index) => (
                                <li key={index}>• {point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {positivePoints.length === 0 && attentionPoints.length === 0 && (
                          <div className="p-3 bg-muted/10 border border-muted/30 rounded-lg">
                            <p className="text-xs text-muted-foreground text-center">
                              Sem variações significativas no período selecionado
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </Card>
            </div>
          </div>
        );
      
      case 'configuracoes':
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Configurações</h2>
            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-3">Período de Análise</h3>
                <div className="space-y-2">
                  <button className="w-full p-3 text-left bg-primary/10 border border-primary/30 rounded-lg">
                    Dezembro 2024 (Atual)
                  </button>
                  <button className="w-full p-3 text-left border border-border rounded-lg">
                    Novembro 2024
                  </button>
                  <button className="w-full p-3 text-left border border-border rounded-lg">
                    Outubro 2024
                  </button>
                </div>
              </Card>
              
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-3">Notificações</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Alertas de Performance</span>
                    <div className="w-10 h-6 bg-primary rounded-full relative">
                      <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Relatórios Semanais</span>
                    <div className="w-10 h-6 bg-muted rounded-full relative">
                      <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1"></div>
                    </div>
                  </div>
                </div>
              </Card>
              
              <WebhookTester />
              
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-3">Sobre o App</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Dashboard InterajAI v1.0</p>
                  <p>Desenvolvido para acompanhamento de performance</p>
                  <p>Última atualização: Hoje, 14:30</p>
                </div>
              </Card>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header fixo */}
      <div className="bg-card border-b border-border p-4 sticky top-0 z-50">
        <h1 className="text-xl font-bold text-foreground">Dashboard InterajAI</h1>
        <p className="text-sm text-muted-foreground">Acompanhamento de Marketing e Vendas</p>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 p-4 pb-24 overflow-y-auto">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="grid grid-cols-4 h-16">
          <button
            onClick={() => setActiveTab('principais')}
            className={`flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'principais' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs">Principais</span>
          </button>
          
          <button
            onClick={() => setActiveTab('derivados')}
            className={`flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'derivados' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span className="text-xs">Derivados</span>
          </button>
          
          <button
            onClick={() => setActiveTab('graficos')}
            className={`flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'graficos' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-xs">Gráficos</span>
          </button>
          
          <button
            onClick={() => setActiveTab('configuracoes')}
            className={`flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'configuracoes' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs">Config</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard2;