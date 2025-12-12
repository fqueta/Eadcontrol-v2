/**
 * Página principal do módulo financeiro
 * Inclui dashboard com resumo financeiro e acesso às funcionalidades
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { toast } from 'react-hot-toast';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  AlertTriangle,
  Plus,
  FileText,
  BarChart3,
  PieChart
} from 'lucide-react';
import {
  FinancialDashboardData,
  FinancialSummary,
  FinancialCategory,
  AccountStatus
} from '../../types/financial';
import { financialService } from '../../services/financialService';
import AccountsPayableTable from '../../components/financial/AccountsPayableTable';
import AccountsReceivableTable from '../../components/financial/AccountsReceivableTable';

/**
 * Componente principal do módulo financeiro
 */
export const Financial: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<FinancialDashboardData | null>(null);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  /**
   * Carrega dados do dashboard
   */
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [dashData, categoriesData] = await Promise.all([
        financialService.dashboard.getDashboardData(selectedPeriod),
        financialService.categories.getAll()
      ]);
      
      setDashboardData(dashData);
      setCategories(categoriesData);
    } catch (error: any) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Carrega dados quando componente monta ou período muda
   */
  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  /**
   * Formata valor monetário
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  /**
   * Formata data
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  /**
   * Retorna cor baseada no valor (positivo/negativo)
   */
  const getValueColor = (value: number): string => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  /**
   * Retorna badge de status
   */
  const getStatusBadge = (status: AccountStatus) => {
    const statusConfig = {
      [AccountStatus.PENDING]: { label: 'Pendente', variant: 'secondary' as const },
      [AccountStatus.PAID]: { label: 'Pago', variant: 'default' as const },
      [AccountStatus.OVERDUE]: { label: 'Vencido', variant: 'destructive' as const },
      [AccountStatus.CANCELLED]: { label: 'Cancelado', variant: 'outline' as const }
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Carregando dados financeiros...</div>
      </div>
    );
  }

  const summary = dashboardData?.summary;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <p className="text-gray-600">Controle financeiro completo da sua empresa</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Relatórios
          </Button>
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Fluxo de Caixa
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Receitas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receitas</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalIncome)}
              </div>
              <p className="text-xs text-gray-600">Últimos 30 dias</p>
            </CardContent>
          </Card>

          {/* Despesas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalExpenses)}
              </div>
              <p className="text-xs text-gray-600">Últimos 30 dias</p>
            </CardContent>
          </Card>

          {/* Lucro Líquido */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getValueColor(summary.netProfit)}`}>
                {formatCurrency(summary.netProfit)}
              </div>
              <p className="text-xs text-gray-600">Últimos 30 dias</p>
            </CardContent>
          </Card>

          {/* Saldo em Caixa */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo em Caixa</CardTitle>
              <CreditCard className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getValueColor(summary.cashBalance)}`}>
                {formatCurrency(summary.cashBalance)}
              </div>
              <p className="text-xs text-gray-600">Saldo atual</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cards de Alertas */}
      {summary && (summary.overdueReceivables > 0 || summary.overduePayables > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contas a Receber Vencidas */}
          {summary.overdueReceivables > 0 && (
            <Card className="border-red-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-600">
                  Contas a Receber Vencidas
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.overdueReceivables)}
                </div>
                <p className="text-xs text-gray-600">Requer atenção imediata</p>
              </CardContent>
            </Card>
          )}

          {/* Contas a Pagar Vencidas */}
          {summary.overduePayables > 0 && (
            <Card className="border-orange-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-600">
                  Contas a Pagar Vencidas
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(summary.overduePayables)}
                </div>
                <p className="text-xs text-gray-600">Requer atenção imediata</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Transações Recentes */}
      {dashboardData?.recentTransactions && dashboardData.recentTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recentTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-gray-600">{formatDate(transaction.date)}</p>
                    </div>
                  </div>
                  <div className={`font-medium ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Próximos Vencimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contas a Receber */}
        {dashboardData?.upcomingReceivables && dashboardData.upcomingReceivables.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Próximas Contas a Receber</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.upcomingReceivables.slice(0, 5).map((account) => (
                  <div key={account.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{account.description}</p>
                      <p className="text-sm text-gray-600">
                        {account.customerName} • {formatDate(account.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-green-600">
                        {formatCurrency(account.amount)}
                      </div>
                      {getStatusBadge(account.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contas a Pagar */}
        {dashboardData?.upcomingPayables && dashboardData.upcomingPayables.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Próximas Contas a Pagar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.upcomingPayables.slice(0, 5).map((account) => (
                  <div key={account.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{account.description}</p>
                      <p className="text-sm text-gray-600">
                        {account.supplierName} • {formatDate(account.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-red-600">
                        {formatCurrency(account.amount)}
                      </div>
                      {getStatusBadge(account.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Abas de Gerenciamento */}
      <Tabs defaultValue="receivables" className="space-y-4">
        <TabsList>
          <TabsTrigger value="receivables">Contas a Receber</TabsTrigger>
          <TabsTrigger value="payables">Contas a Pagar</TabsTrigger>
        </TabsList>
        
        <TabsContent value="receivables">
          <AccountsReceivableTable categories={categories} />
        </TabsContent>
        
        <TabsContent value="payables">
          <AccountsPayableTable categories={categories} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Financial;