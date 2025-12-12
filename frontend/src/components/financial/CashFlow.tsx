/**
 * Componente de fluxo de caixa com gráficos
 * Exibe entradas, saídas e saldo ao longo do tempo
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DatePicker } from '../ui/date-picker';
import { Badge } from '../ui/badge';
import { toast } from 'react-hot-toast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import {
  CashFlowEntry,
  CashFlowData,
  FinancialCategory
} from '../../types/financial';
import { financialService } from '../../services/financialService';

interface CashFlowProps {
  categories: FinancialCategory[];
}

/**
 * Componente principal do fluxo de caixa
 */
export const CashFlow: React.FC<CashFlowProps> = ({ categories }) => {
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null);
  const [entries, setEntries] = useState<CashFlowEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cores para os gráficos
  const COLORS = {
    income: '#10b981',
    expense: '#ef4444',
    balance: '#3b82f6',
    categories: ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0']
  };

  /**
   * Carrega dados do fluxo de caixa
   */
  const loadCashFlowData = async () => {
    setIsLoading(true);
    try {
      const params = {
        period: selectedPeriod,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined
      };

      const [flowData, entriesData] = await Promise.all([
        financialService.cashFlow.getCashFlowData(params),
        financialService.cashFlow.getEntries(params)
      ]);

      setCashFlowData(flowData);
      setEntries(entriesData);
    } catch (error: any) {
      console.error('Erro ao carregar fluxo de caixa:', error);
      toast.error('Erro ao carregar dados do fluxo de caixa');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Carrega dados quando componente monta ou filtros mudam
   */
  useEffect(() => {
    loadCashFlowData();
  }, [selectedPeriod, startDate, endDate, selectedCategory]);

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
   * Formata data para exibição
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  /**
   * Prepara dados para o gráfico de linha (saldo acumulado)
   */
  const prepareBalanceChartData = () => {
    if (!cashFlowData?.dailyBalance) return [];
    
    return cashFlowData.dailyBalance.map(item => ({
      date: formatDate(item.date),
      saldo: item.balance,
      entradas: item.income,
      saidas: item.expenses
    }));
  };

  /**
   * Prepara dados para o gráfico de barras (entradas vs saídas)
   */
  const prepareIncomeExpenseChartData = () => {
    if (!cashFlowData?.dailyBalance) return [];
    
    return cashFlowData.dailyBalance.map(item => ({
      date: formatDate(item.date),
      Entradas: item.income,
      Saídas: -item.expenses // Negativo para mostrar abaixo do eixo
    }));
  };

  /**
   * Prepara dados para o gráfico de pizza (categorias)
   */
  const prepareCategoryChartData = () => {
    if (!cashFlowData?.categoryBreakdown) return [];
    
    return cashFlowData.categoryBreakdown.map(item => ({
      name: item.categoryName,
      value: Math.abs(item.amount),
      percentage: item.percentage
    }));
  };

  /**
   * Exporta dados do fluxo de caixa
   */
  const handleExport = async () => {
    try {
      const params = {
        period: selectedPeriod,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        format: 'excel'
      };

      await financialService.cashFlow.exportData(params);
      toast.success('Relatório exportado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar relatório');
    }
  };

  /**
   * Retorna cor baseada no tipo de entrada
   */
  const getEntryTypeColor = (type: 'income' | 'expense'): string => {
    return type === 'income' ? 'text-green-600' : 'text-red-600';
  };

  /**
   * Retorna ícone baseado no tipo de entrada
   */
  const getEntryTypeIcon = (type: 'income' | 'expense') => {
    return type === 'income' ? 
      <TrendingUp className="h-4 w-4 text-green-600" /> : 
      <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Carregando fluxo de caixa...</div>
      </div>
    );
  }

  const balanceChartData = prepareBalanceChartData();
  const incomeExpenseChartData = prepareIncomeExpenseChartData();
  const categoryChartData = prepareCategoryChartData();

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Filtros */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Fluxo de Caixa</h2>
          <p className="text-gray-600">Acompanhe entradas, saídas e saldo em tempo real</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          
          {selectedPeriod === 'custom' && (
            <>
              <DatePicker
                selected={startDate}
                onSelect={setStartDate}
                placeholderText="Data inicial"
              />
              <DatePicker
                selected={endDate}
                onSelect={setEndDate}
                placeholderText="Data final"
              />
            </>
          )}
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={loadCashFlowData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      {cashFlowData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Entradas</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(cashFlowData.totalIncome)}
              </div>
              <p className="text-xs text-gray-600">No período selecionado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Saídas</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(cashFlowData.totalExpenses)}
              </div>
              <p className="text-xs text-gray-600">No período selecionado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Líquido</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                cashFlowData.netFlow >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(cashFlowData.netFlow)}
              </div>
              <p className="text-xs text-gray-600">No período selecionado</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Saldo Acumulado */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução do Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={balanceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), '']}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="saldo" 
                  stroke={COLORS.balance} 
                  strokeWidth={2}
                  name="Saldo"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Entradas vs Saídas */}
        <Card>
          <CardHeader>
            <CardTitle>Entradas vs Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={incomeExpenseChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => formatCurrency(Math.abs(value))} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(Math.abs(value)), '']}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Legend />
                <Bar dataKey="Entradas" fill={COLORS.income} />
                <Bar dataKey="Saídas" fill={COLORS.expense} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Categorias e Transações Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Pizza - Categorias */}
        {categoryChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS.categories[index % COLORS.categories.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Transações Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Transações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {entries.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getEntryTypeIcon(entry.type)}
                    <div>
                      <p className="font-medium">{entry.description}</p>
                      <p className="text-sm text-gray-600">
                        {entry.categoryName} • {new Date(entry.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className={`font-medium ${getEntryTypeColor(entry.type)}`}>
                    {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount)}
                  </div>
                </div>
              ))}
              
              {entries.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  Nenhuma transação encontrada no período selecionado
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CashFlow;