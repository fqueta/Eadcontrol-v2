/**
 * Componente de relatórios financeiros
 * Inclui relatórios de faturamento, DRE, fluxo de caixa e outros
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DatePicker } from '../ui/date-picker';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { toast } from 'react-hot-toast';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
  FileText,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  Mail,
  Printer
} from 'lucide-react';
import {
  FinancialReport,
  RevenueReport,
  ExpenseReport,
  ProfitLossReport,
  FinancialCategory
} from '../../types/financial';
import { financialService } from '../../services/financialService';

interface ReportsProps {
  categories: FinancialCategory[];
}

/**
 * Componente principal de relatórios
 */
export const Reports: React.FC<ReportsProps> = ({ categories }) => {
  const [revenueReport, setRevenueReport] = useState<RevenueReport | null>(null);
  const [expenseReport, setExpenseReport] = useState<ExpenseReport | null>(null);
  const [profitLossReport, setProfitLossReport] = useState<ProfitLossReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState('revenue');
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');

  // Cores para gráficos
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

  /**
   * Carrega relatórios baseado nos filtros
   */
  const loadReports = async () => {
    setIsLoading(true);
    try {
      const params = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        customerId: selectedCustomer !== 'all' ? selectedCustomer : undefined,
        supplierId: selectedSupplier !== 'all' ? selectedSupplier : undefined
      };

      const [revenueData, expenseData, profitLossData] = await Promise.all([
        financialService.reports.getRevenueReport(params),
        financialService.reports.getExpenseReport(params),
        financialService.reports.getProfitLossReport(params)
      ]);

      setRevenueReport(revenueData);
      setExpenseReport(expenseData);
      setProfitLossReport(profitLossData);
    } catch (error: any) {
      console.error('Erro ao carregar relatórios:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Carrega relatórios quando componente monta ou filtros mudam
   */
  useEffect(() => {
    loadReports();
  }, [startDate, endDate, selectedCategory, selectedCustomer, selectedSupplier]);

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
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR');
  };

  /**
   * Exporta relatório
   */
  const handleExport = async (reportType: string, format: 'pdf' | 'excel') => {
    try {
      const params = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        customerId: selectedCustomer !== 'all' ? selectedCustomer : undefined,
        supplierId: selectedSupplier !== 'all' ? selectedSupplier : undefined,
        format
      };

      await financialService.reports.exportReport(reportType, params);
      toast.success(`Relatório exportado em ${format.toUpperCase()} com sucesso!`);
    } catch (error: any) {
      console.error('Erro ao exportar relatório:', error);
      toast.error('Erro ao exportar relatório');
    }
  };

  /**
   * Envia relatório por email
   */
  const handleEmailReport = async (reportType: string) => {
    try {
      const params = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        reportType
      };

      await financialService.reports.emailReport(params);
      toast.success('Relatório enviado por email com sucesso!');
    } catch (error: any) {
      console.error('Erro ao enviar relatório:', error);
      toast.error('Erro ao enviar relatório por email');
    }
  };

  /**
   * Prepara dados para gráfico de faturamento mensal
   */
  const prepareRevenueChartData = () => {
    if (!revenueReport?.monthlyRevenue) return [];
    
    return revenueReport.monthlyRevenue.map(item => ({
      month: new Date(item.month).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
      faturamento: item.amount,
      meta: item.target || 0
    }));
  };

  /**
   * Prepara dados para gráfico de categorias de receita
   */
  const prepareRevenueCategoryData = () => {
    if (!revenueReport?.categoryBreakdown) return [];
    
    return revenueReport.categoryBreakdown.map(item => ({
      name: item.categoryName,
      value: item.amount,
      percentage: item.percentage
    }));
  };

  /**
   * Prepara dados para gráfico de despesas por categoria
   */
  const prepareExpenseCategoryData = () => {
    if (!expenseReport?.categoryBreakdown) return [];
    
    return expenseReport.categoryBreakdown.map(item => ({
      name: item.categoryName,
      value: item.amount,
      percentage: item.percentage
    }));
  };

  /**
   * Prepara dados para DRE
   */
  const prepareProfitLossData = () => {
    if (!profitLossReport) return [];
    
    return [
      { item: 'Receita Bruta', value: profitLossReport.grossRevenue, type: 'revenue' },
      { item: 'Deduções', value: -profitLossReport.deductions, type: 'deduction' },
      { item: 'Receita Líquida', value: profitLossReport.netRevenue, type: 'revenue' },
      { item: 'Custos', value: -profitLossReport.costs, type: 'cost' },
      { item: 'Lucro Bruto', value: profitLossReport.grossProfit, type: 'profit' },
      { item: 'Despesas Operacionais', value: -profitLossReport.operatingExpenses, type: 'expense' },
      { item: 'Lucro Operacional', value: profitLossReport.operatingProfit, type: 'profit' },
      { item: 'Outras Receitas/Despesas', value: profitLossReport.otherIncomeExpenses, type: 'other' },
      { item: 'Lucro Líquido', value: profitLossReport.netProfit, type: 'profit' }
    ];
  };

  /**
   * Retorna cor baseada no tipo de valor
   */
  const getValueColor = (type: string, value: number): string => {
    if (type === 'revenue' || type === 'profit') {
      return value >= 0 ? 'text-green-600' : 'text-red-600';
    }
    if (type === 'expense' || type === 'cost' || type === 'deduction') {
      return 'text-red-600';
    }
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const revenueChartData = prepareRevenueChartData();
  const revenueCategoryData = prepareRevenueCategoryData();
  const expenseCategoryData = prepareExpenseCategoryData();
  const profitLossData = prepareProfitLossData();

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Filtros */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Relatórios Financeiros</h2>
          <p className="text-gray-600">Análises detalhadas e relatórios de faturamento</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <DatePicker
            selected={startDate}
            onSelect={(date) => date && setStartDate(date)}
            placeholderText="Data inicial"
          />
          <DatePicker
            selected={endDate}
            onSelect={(date) => date && setEndDate(date)}
            placeholderText="Data final"
          />
          
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
          
          <Button variant="outline" onClick={loadReports} disabled={isLoading}>
            <Filter className="h-4 w-4 mr-2" />
            {isLoading ? 'Carregando...' : 'Filtrar'}
          </Button>
        </div>
      </div>

      {/* Resumo Executivo */}
      {revenueReport && expenseReport && profitLossReport && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(revenueReport.totalRevenue)}
              </div>
              <p className="text-xs text-gray-600">
                Período: {formatDate(startDate)} - {formatDate(endDate)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(expenseReport.totalExpenses)}
              </div>
              <p className="text-xs text-gray-600">
                Período: {formatDate(startDate)} - {formatDate(endDate)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                profitLossReport.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(profitLossReport.netProfit)}
              </div>
              <p className="text-xs text-gray-600">
                Margem: {((profitLossReport.netProfit / revenueReport.totalRevenue) * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <FileText className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(revenueReport.averageTicket)}
              </div>
              <p className="text-xs text-gray-600">
                {revenueReport.totalTransactions} transações
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Abas de Relatórios */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Faturamento</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="profitloss">DRE</TabsTrigger>
        </TabsList>
        
        {/* Relatório de Faturamento */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Relatório de Faturamento</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleExport('revenue', 'excel')}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" onClick={() => handleExport('revenue', 'pdf')}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" onClick={() => handleEmailReport('revenue')}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Faturamento Mensal */}
            <Card>
              <CardHeader>
                <CardTitle>Faturamento Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="faturamento" fill="#10b981" name="Faturamento" />
                    <Bar dataKey="meta" fill="#6b7280" name="Meta" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico de Categorias de Receita */}
            <Card>
              <CardHeader>
                <CardTitle>Faturamento por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenueCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {revenueCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Clientes */}
          {revenueReport?.topCustomers && (
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {revenueReport.topCustomers.slice(0, 10).map((customer, index) => (
                    <div key={customer.customerId} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span className="font-medium">{customer.customerName}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">
                          {formatCurrency(customer.totalRevenue)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {customer.transactionCount} transações
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Relatório de Despesas */}
        <TabsContent value="expenses" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Relatório de Despesas</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleExport('expenses', 'excel')}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" onClick={() => handleExport('expenses', 'pdf')}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Despesas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={expenseCategoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DRE - Demonstração do Resultado do Exercício */}
        <TabsContent value="profitloss" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Demonstração do Resultado do Exercício (DRE)</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleExport('profitloss', 'excel')}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" onClick={() => handleExport('profitloss', 'pdf')}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>DRE - {formatDate(startDate)} a {formatDate(endDate)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profitLossData.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b">
                    <span className={`font-medium ${
                      item.item.includes('Lucro') ? 'text-lg' : ''
                    }`}>
                      {item.item}
                    </span>
                    <span className={`font-bold ${
                      getValueColor(item.type, item.value)
                    } ${
                      item.item.includes('Lucro') ? 'text-lg' : ''
                    }`}>
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;