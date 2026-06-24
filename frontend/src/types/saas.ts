export interface SaasPlan {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  features: Record<string, any> | null;
  usage_pricing: Record<string, number> | null;
  config: Record<string, any> | null;
  active: boolean;
  is_free: boolean;
  trial_days: number;
  sort_order: number;
  active_subscriptions_count?: number;
  formatted_price_monthly?: string;
  formatted_price_yearly?: string;
  yearly_savings_percent?: number | null;
  created_at: string;
  updated_at: string;
}

export interface SaasTenant {
  id: string;
  name: string;
  email: string | null;
  cpf_cnpj: string | null;
  phone: string | null;
  ativo: string;
  domain: string | null;
  course_badge_position: string;
  created_at?: string;
}

export interface SaasSubscription {
  id: number;
  tenant_id: string;
  plan_id: number;
  billing_cycle: 'monthly' | 'yearly';
  status: 'active' | 'suspended' | 'cancelled' | 'trial' | 'past_due';
  starts_at: string;
  ends_at: string | null;
  trial_ends_at: string | null;
  next_billing_date: string | null;
  suspended_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  gateway_subscription_id: string | null;
  gateway_customer_id: string | null;
  usage_data: Record<string, any> | null;
  config: Record<string, any> | null;
  plan?: SaasPlan;
  tenant?: SaasTenant;
  invoices?: SaasInvoice[];
  status_label?: string;
  billing_cycle_label?: string;
  current_price?: number;
  created_at: string;
  updated_at: string;
}

export interface SaasInvoice {
  id: number;
  subscription_id: number;
  tenant_id: string;
  invoice_number: string;
  amount: number;
  usage_amount: number;
  discount: number;
  total: number;
  due_date: string;
  paid_at: string | null;
  paid_amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  payment_method: string | null;
  gateway_payment_id: string | null;
  gateway_invoice_url: string | null;
  gateway_boleto_url: string | null;
  gateway_pix_code: string | null;
  gateway_pix_qrcode_url: string | null;
  usage_details: Record<string, any> | null;
  config: Record<string, any> | null;
  notes: string | null;
  subscription?: SaasSubscription;
  tenant?: SaasTenant;
  status_label?: string;
  formatted_total?: string;
  payment_method_label?: string;
  created_at: string;
  updated_at: string;
}

export interface SaasDashboardData {
  tenants: {
    total: number;
    active: number;
    inactive: number;
    without_subscription: number;
  };
  subscriptions: {
    total: number;
    active: number;
    trial: number;
    suspended: number;
    cancelled: number;
    past_due: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    this_month: number;
    pending: number;
    overdue: number;
  };
  invoices: {
    total: number;
    pending: number;
    paid: number;
    overdue: number;
    cancelled: number;
  };
  charts: {
    revenue_by_month: Record<string, number>;
    plan_distribution: { plan_name: string; count: number }[];
  };
}

export interface SaasGatewayConfig {
  id: number;
  provider: string;
  api_key: string | null;
  environment: 'sandbox' | 'production';
  webhook_secret: string | null;
  active: boolean;
  config: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
