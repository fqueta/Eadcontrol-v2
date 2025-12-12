// Core entities for the OS and Budget Management System

export interface User {
  id: string;
  name: string;
  email: string;
  profile_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  name: string;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  menu: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve?: boolean;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type ServiceObjectType = 'automovel' | 'aeronave';

export interface ServiceObject {
  id: string;
  client_id: string;
  client?: Client;
  type: ServiceObjectType;
  // Automóvel identificadores
  placa?: string;
  renavam?: string;
  chassi?: string;
  // Aeronave identificadores
  matricula?: string;
  numero_serie?: string;
  // Especificações comuns
  manufacturer?: string;
  model?: string;
  year?: number | string;
  color?: string;
  notes?: string;
  active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category_id: string;
  category?: Category;
  unit: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  category_id: string;
  category?: Category;
  unit: string;
  estimated_hours?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OSStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'cash' | 'pix' | 'card' | 'bank_transfer' | 'other';
  fee_percentage?: number;
  installments_allowed: boolean;
  max_installments?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetItem {
  id: string;
  budget_id: string;
  product_id?: string;
  service_id?: string;
  product?: Product;
  service?: Service;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Budget {
  id: string;
  client_id: string;
  client?: Client;
  service_object_id?: string;
  service_object?: ServiceObject;
  user_id: string;
  user?: User;
  number: string;
  description: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'accepted' | 'expired';
  approval_required: boolean;
  approved_by?: string;
  approved_at?: string;
  valid_until: string;
  items: BudgetItem[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceOrderItem {
  id: string;
  service_order_id: string;
  product_id?: string;
  service_id?: string;
  product?: Product;
  service?: Service;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ServiceOrder {
  id: string;
  budget_id?: string;
  budget?: Budget;
  client_id: string;
  client?: Client;
  user_id: string;
  user?: User;
  number: string;
  description: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status_id: string;
  status?: OSStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: string;
  end_date?: string;
  estimated_completion?: string;
  items: ServiceOrderItem[];
  notes?: string;
  attachments?: string[];
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  service_order_id?: string;
  budget_id?: string;
  service_order?: ServiceOrder;
  budget?: Budget;
  payment_method_id: string;
  payment_method?: PaymentMethod;
  amount: number;
  installments: number;
  installment_amount: number;
  payment_date: string;
  due_date?: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CashFlow {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  payment_id?: string;
  payment?: Payment;
  category: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface SystemSettings {
  id: string;
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// Form types
export interface BudgetFormData {
  client_id: string;
  description: string;
  discount: number;
  tax: number;
  valid_until: string;
  notes?: string;
  items: {
    type: 'product' | 'service';
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
  }[];
}

export interface ServiceOrderFormData {
  budget_id?: string;
  client_id: string;
  description: string;
  discount: number;
  tax: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimated_completion?: string;
  notes?: string;
  items: {
    type: 'product' | 'service';
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
  }[];
}

// API Response types
export interface ApiDeleteResponse {
  exec: boolean;
  message: string;
  status: number;
}

// Export product types
export * from './products';
export * from './serviceOrders';
export * from './redemptions';