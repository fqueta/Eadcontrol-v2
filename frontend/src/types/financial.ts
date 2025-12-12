/**
 * Tipos para o módulo financeiro
 * Inclui contas a pagar, contas a receber, fluxo de caixa e relatórios
 */

// Enums para status e categorias
export enum AccountStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

// Alias para compatibilidade com componentes
export type CategoryType = 'income' | 'expense';

export enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  PIX = 'pix',
  CHECK = 'check',
  BOLETO = 'boleto'
}

export enum RecurrenceType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

// Interface base para contas
export interface BaseAccount {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: AccountStatus;
  category: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Contas a Pagar
export interface AccountPayable extends BaseAccount {
  supplierId?: string;
  supplierName?: string;
  invoiceNumber?: string;
  purchaseOrderId?: string;
  paymentDate?: string;
  discountAmount?: number;
  interestAmount?: number;
  recurrence?: RecurrenceType;
  installments?: number;
  currentInstallment?: number;
}

// Contas a Receber
export interface AccountReceivable extends BaseAccount {
  customerId?: string;
  customerName?: string;
  serviceOrderId?: string;
  invoiceNumber?: string;
  receivedDate?: string;
  discountAmount?: number;
  interestAmount?: number;
  recurrence?: RecurrenceType;
  installments?: number;
  currentInstallment?: number;
}

// Fluxo de Caixa
export interface CashFlowEntry {
  id: string;
  date: string;
  description: string;
  type: TransactionType;
  amount: number;
  category: string;
  paymentMethod: PaymentMethod;
  accountId?: string; // Referência para conta a pagar/receber
  balance: number;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

// Categorias Financeiras
export interface FinancialCategory {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  description?: string;
  parentId?: string;
  parent?: FinancialCategory;
  children?: FinancialCategory[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tipos para CRUD de categorias financeiras
export interface CreateFinancialCategoryInput {
  name: string;
  description?: string;
  type: TransactionType;
  color: string;
  parentId?: string;
  isActive?: boolean;
}

export interface UpdateFinancialCategoryInput {
  name?: string;
  description?: string;
  type?: TransactionType;
  color?: string;
  parentId?: string;
  isActive?: boolean;
}

export interface FinancialCategoriesResponse {
  data: FinancialCategory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FinancialCategoryFilters {
  search?: string;
  type?: TransactionType;
  parentId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface FinancialCategoryFormData {
  name: string;
  description: string;
  type: TransactionType;
  color: string;
  parentId: string;
  isActive: boolean;
}

export interface FinancialCategoryOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// Cores predefinidas para categorias
export const FINANCIAL_CATEGORY_COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#22c55e', // green-500
  '#06b6d4', // cyan-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#64748b', // slate-500
  '#78716c', // stone-500
] as const;

// Tipos de categoria predefinidos
export const FINANCIAL_CATEGORY_TYPES = [
  { value: TransactionType.INCOME, label: 'Receita', color: '#22c55e' },
  { value: TransactionType.EXPENSE, label: 'Despesa', color: '#ef4444' },
] as const;

// Relatórios
export interface ReportFilter {
  startDate: string;
  endDate: string;
  categories?: string[];
  status?: AccountStatus[];
  paymentMethods?: PaymentMethod[];
  customerId?: string;
  supplierId?: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  pendingReceivables: number;
  pendingPayables: number;
  overdueReceivables: number;
  overduePayables: number;
  cashBalance: number;
}

export interface MonthlyReport {
  month: string;
  year: number;
  summary: FinancialSummary;
  topCategories: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  dailyFlow: {
    date: string;
    income: number;
    expenses: number;
    balance: number;
  }[];
}

export interface BillingReport {
  period: string;
  totalBilled: number;
  totalReceived: number;
  pendingAmount: number;
  overdueAmount: number;
  customers: {
    customerId: string;
    customerName: string;
    totalBilled: number;
    totalReceived: number;
    pendingAmount: number;
  }[];
  services: {
    serviceId: string;
    serviceName: string;
    quantity: number;
    totalAmount: number;
  }[];
}

// DTOs para formulários
export interface CreateAccountPayableDto {
  description: string;
  amount: number;
  dueDate: string;
  category: string;
  supplierId?: string;
  supplierName?: string;
  invoiceNumber?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  recurrence?: RecurrenceType;
  installments?: number;
}

export interface CreateAccountReceivableDto {
  description: string;
  amount: number;
  dueDate: string;
  category: string;
  customerId?: string;
  customerName?: string;
  serviceOrderId?: string;
  invoiceNumber?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  recurrence?: RecurrenceType;
  installments?: number;
}

export interface CreateCashFlowEntryDto {
  date: string;
  description: string;
  type: TransactionType;
  amount: number;
  category: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface UpdateAccountDto {
  description?: string;
  amount?: number;
  dueDate?: string;
  category?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  status?: AccountStatus;
}

// Responses da API
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FinancialDashboardData {
  summary: FinancialSummary;
  recentTransactions: CashFlowEntry[];
  upcomingPayables: AccountPayable[];
  upcomingReceivables: AccountReceivable[];
  monthlyTrend: {
    month: string;
    income: number;
    expenses: number;
  }[];
  categoryBreakdown: {
    category: string;
    amount: number;
    type: TransactionType;
  }[];
}

// Filtros para listagens
export interface AccountsFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: AccountStatus;
  category?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: PaymentMethod;
  sortBy?: 'dueDate' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CashFlowFilter {
  page?: number;
  limit?: number;
  search?: string;
  type?: TransactionType;
  category?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: PaymentMethod;
  sortBy?: 'date' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}