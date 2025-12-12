/**
 * Serviços para operações financeiras
 * Inclui APIs para contas a pagar, contas a receber, fluxo de caixa e relatórios
 */

import { BaseApiService } from './BaseApiService';

const api = new BaseApiService();
import {
  AccountPayable,
  AccountReceivable,
  CashFlowEntry,
  FinancialCategory,
  FinancialDashboardData,
  FinancialSummary,
  MonthlyReport,
  BillingReport,
  CreateAccountPayableDto,
  CreateAccountReceivableDto,
  CreateCashFlowEntryDto,
  UpdateAccountDto,
  PaginatedResponse,
  AccountsFilter,
  CashFlowFilter,
  ReportFilter
} from '../types/financial';

// Serviços para Contas a Pagar
export const accountsPayableService = {
  /**
   * Lista todas as contas a pagar com filtros
   */
  async getAll(filters: AccountsFilter = {}): Promise<PaginatedResponse<AccountPayable>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/financial/accounts-payable?${params}`);
    return response.data;
  },

  /**
   * Busca uma conta a pagar por ID
   */
  async getById(id: string): Promise<AccountPayable> {
    const response = await api.get(`/financial/accounts-payable/${id}`);
    return response.data;
  },

  /**
   * Cria uma nova conta a pagar
   */
  async create(data: CreateAccountPayableDto): Promise<AccountPayable> {
    const response = await api.post('/financial/accounts-payable', data);
    return response.data;
  },

  /**
   * Atualiza uma conta a pagar
   */
  async update(id: string, data: UpdateAccountDto): Promise<AccountPayable> {
    const response = await api.put(`/financial/accounts-payable/${id}`, data);
    return response.data;
  },

  /**
   * Marca uma conta como paga
   */
  async markAsPaid(id: string, paymentDate: string, paymentMethod: string): Promise<AccountPayable> {
    const response = await api.patch(`/financial/accounts-payable/${id}/pay`, {
      paymentDate,
      paymentMethod
    });
    return response.data;
  },

  /**
   * Cancela uma conta a pagar
   */
  async cancel(id: string, reason?: string): Promise<AccountPayable> {
    const response = await api.patch(`/financial/accounts-payable/${id}/cancel`, { reason });
    return response.data;
  },

  /**
   * Remove uma conta a pagar
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/financial/accounts-payable/${id}`);
  }
};

// Serviços para Contas a Receber
export const accountsReceivableService = {
  /**
   * Lista todas as contas a receber com filtros
   */
  async getAll(filters: AccountsFilter = {}): Promise<PaginatedResponse<AccountReceivable>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/financial/accounts-receivable?${params}`);
    return response.data;
  },

  /**
   * Busca uma conta a receber por ID
   */
  async getById(id: string): Promise<AccountReceivable> {
    const response = await api.get(`/financial/accounts-receivable/${id}`);
    return response.data;
  },

  /**
   * Cria uma nova conta a receber
   */
  async create(data: CreateAccountReceivableDto): Promise<AccountReceivable> {
    const response = await api.post('/financial/accounts-receivable', data);
    return response.data;
  },

  /**
   * Atualiza uma conta a receber
   */
  async update(id: string, data: UpdateAccountDto): Promise<AccountReceivable> {
    const response = await api.put(`/financial/accounts-receivable/${id}`, data);
    return response.data;
  },

  /**
   * Marca uma conta como recebida
   */
  async markAsReceived(id: string, receivedDate: string, paymentMethod: string): Promise<AccountReceivable> {
    const response = await api.patch(`/financial/accounts-receivable/${id}/receive`, {
      receivedDate,
      paymentMethod
    });
    return response.data;
  },

  /**
   * Cancela uma conta a receber
   */
  async cancel(id: string, reason?: string): Promise<AccountReceivable> {
    const response = await api.patch(`/financial/accounts-receivable/${id}/cancel`, { reason });
    return response.data;
  },

  /**
   * Remove uma conta a receber
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/financial/accounts-receivable/${id}`);
  }
};

// Serviços para Fluxo de Caixa
export const cashFlowService = {
  /**
   * Lista todas as entradas do fluxo de caixa com filtros
   */
  async getAll(filters: CashFlowFilter = {}): Promise<PaginatedResponse<CashFlowEntry>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/financial/cash-flow?${params}`);
    return response.data;
  },

  /**
   * Busca uma entrada do fluxo de caixa por ID
   */
  async getById(id: string): Promise<CashFlowEntry> {
    const response = await api.get(`/financial/cash-flow/${id}`);
    return response.data;
  },

  /**
   * Cria uma nova entrada no fluxo de caixa
   */
  async create(data: CreateCashFlowEntryDto): Promise<CashFlowEntry> {
    const response = await api.post('/financial/cash-flow', data);
    return response.data;
  },

  /**
   * Atualiza uma entrada do fluxo de caixa
   */
  async update(id: string, data: Partial<CreateCashFlowEntryDto>): Promise<CashFlowEntry> {
    const response = await api.put(`/financial/cash-flow/${id}`, data);
    return response.data;
  },

  /**
   * Remove uma entrada do fluxo de caixa
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/financial/cash-flow/${id}`);
  },

  /**
   * Obtém o saldo atual do caixa
   */
  async getCurrentBalance(): Promise<{ balance: number; lastUpdate: string }> {
    const response = await api.get('/financial/cash-flow/balance');
    return response.data;
  }
};

// Serviços para Categorias Financeiras
export const categoriesService = {
  /**
   * Lista todas as categorias financeiras
   */
  async getAll(): Promise<FinancialCategory[]> {
    const response = await api.get('/financial/categories');
    return response.data;
  },

  /**
   * Cria uma nova categoria financeira
   */
  async create(data: Omit<FinancialCategory, 'id' | 'createdAt'>): Promise<FinancialCategory> {
    const response = await api.post('/financial/categories', data);
    return response.data;
  },

  /**
   * Atualiza uma categoria financeira
   */
  async update(id: string, data: Partial<Omit<FinancialCategory, 'id' | 'createdAt'>>): Promise<FinancialCategory> {
    const response = await api.put(`/financial/categories/${id}`, data);
    return response.data;
  },

  /**
   * Remove uma categoria financeira
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/financial/categories/${id}`);
  }
};

// Serviços para Dashboard
export const dashboardService = {
  /**
   * Obtém dados do dashboard financeiro
   */
  async getDashboardData(period?: string): Promise<FinancialDashboardData> {
    const params = period ? `?period=${period}` : '';
    const response = await api.get(`/financial/dashboard${params}`);
    return response.data;
  },

  /**
   * Obtém resumo financeiro
   */
  async getFinancialSummary(startDate?: string, endDate?: string): Promise<FinancialSummary> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await api.get(`/financial/summary?${params}`);
    return response.data;
  }
};

// Serviços para Relatórios
export const reportsService = {
  /**
   * Gera relatório mensal
   */
  async getMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
    const response = await api.get(`/financial/reports/monthly/${year}/${month}`);
    return response.data;
  },

  /**
   * Gera relatório de faturamento
   */
  async getBillingReport(filters: ReportFilter): Promise<BillingReport> {
    const response = await api.post('/financial/reports/billing', filters);
    return response.data;
  },

  /**
   * Gera relatório personalizado
   */
  async getCustomReport(filters: ReportFilter): Promise<any> {
    const response = await api.post('/financial/reports/custom', filters);
    return response.data;
  },

  /**
   * Exporta relatório em PDF
   */
  async exportToPdf(reportType: string, filters: ReportFilter): Promise<Blob> {
    const response = await api.post(`/financial/reports/export/pdf/${reportType}`, filters, {
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Exporta relatório em Excel
   */
  async exportToExcel(reportType: string, filters: ReportFilter): Promise<Blob> {
    const response = await api.post(`/financial/reports/export/excel/${reportType}`, filters, {
      responseType: 'blob'
    });
    return response.data;
  }
};

// Serviço principal que agrupa todos os outros
export const financialService = {
  accountsPayable: accountsPayableService,
  accountsReceivable: accountsReceivableService,
  cashFlow: cashFlowService,
  categories: categoriesService,
  dashboard: dashboardService,
  reports: reportsService
};

export default financialService;