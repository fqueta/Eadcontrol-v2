/**
 * SaaS Management Service
 *
 * Serviço para gerenciar planos, assinaturas e faturas SaaS.
 * As rotas SaaS rodam no domínio CENTRAL (não no domínio do tenant).
 */

import {
  SaasPlan,
  SaasTenant,
  SaasSubscription,
  SaasInvoice,
  SaasDashboardData,
  SaasGatewayConfig,
  PaginatedResponse
} from '@/types/saas';
import { getTenantIdFromSubdomain } from '@/lib/qlib';

// ─── API Base ─────────────────────────────────────────────

/**
 * Retorna a URL base da API SaaS (domínio central, NÃO tenant).
 * As rotas SaaS ficam em /api/v1/saas/*
 */
function getSaasApiBaseUrl(): string {
  const protocol = window.location.protocol;
  const host = window.location.host;

  // Em desenvolvimento local
  if (/localhost|127\.0\.0\.1/.test(host)) {
    const envUrl = (import.meta as any).env?.VITE_SAAS_API_URL;
    if (envUrl) return envUrl.replace(/\/+$/, '');
    // Usa porta 8002 do backend central (sem subdomínio de tenant)
    return `${protocol}//localhost:8002/api/v1/saas`;
  }

  // Em produção, usar o subdomínio api- (ex: cursos -> api-cursos, hairacademyrj -> api-hairacademyrj)
  const apiHost = /^api[-.]/.test(host) ? host : host.replace(/^[^.]+/, 'api-$&');
  return `${protocol}//${apiHost}/api/v1/saas`;
}

const SAAS_API_BASE = getSaasApiBaseUrl();

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const token = localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const tenantId = getTenantIdFromSubdomain();
  if (tenantId) {
    headers['X-Tenant-Id'] = tenantId;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = 'Erro na requisição';
    try {
      const errorBody = await response.json();
      errorMessage = errorBody?.message || errorBody?.error || errorMessage;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

async function apiGet<T>(path: string, params?: Record<string, any>): Promise<T> {
  const url = new URL(`${SAAS_API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.append(k, String(v));
      }
    });
  }
  const res = await fetch(url.toString(), { headers: getHeaders() });
  return handleResponse<T>(res);
}

async function apiPost<T>(path: string, data?: any): Promise<T> {
  const res = await fetch(`${SAAS_API_BASE}${path}`, {
    method: 'POST',
    headers: getHeaders(),
    body: data ? JSON.stringify(data) : undefined,
  });
  return handleResponse<T>(res);
}

async function apiPut<T>(path: string, data?: any): Promise<T> {
  const res = await fetch(`${SAAS_API_BASE}${path}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: data ? JSON.stringify(data) : undefined,
  });
  return handleResponse<T>(res);
}

async function apiPatch<T>(path: string, data?: any): Promise<T> {
  const res = await fetch(`${SAAS_API_BASE}${path}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: data ? JSON.stringify(data) : undefined,
  });
  return handleResponse<T>(res);
}

async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${SAAS_API_BASE}${path}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return handleResponse<T>(res);
}

// ─── Service Methods ──────────────────────────────────────

export const saasService = {
  // ── Tenants ──
  getTenants: () =>
    apiGet<{ data: SaasTenant[] }>('/tenants'),
  getTenant: (id: string) =>
    apiGet<SaasTenant>(`/tenants/${id}`),
  createTenant: (data: any) =>
    apiPost<{ message: string; data: SaasTenant }>('/tenants', data),
  updateTenant: (id: string, data: Partial<SaasTenant>) =>
    apiPut<{ message: string; data: SaasTenant }>(`/tenants/${id}`, data),
  // ── Gateway Config ──
  getGatewayConfigs: () =>
    apiGet<SaasGatewayConfig[]>('/gateway-configs'),
  getGatewayConfig: (provider: string) =>
    apiGet<SaasGatewayConfig>(`/gateway-configs/${provider}`),
  createGatewayConfig: (data: Partial<SaasGatewayConfig>) =>
    apiPost<{ message: string; data: SaasGatewayConfig }>('/gateway-configs', data),
  updateGatewayConfig: (provider: string, data: Partial<SaasGatewayConfig>) =>
    apiPut<{ message: string; data: SaasGatewayConfig }>(`/gateway-configs/${provider}`, data),
  deleteGatewayConfig: (provider: string) =>
    apiDelete<{ message: string }>(`/gateway-configs/${provider}`),
  // ── Dashboard ──
  getDashboard: () => apiGet<SaasDashboardData>('/dashboard'),

  // ── Plans ──
  getPlans: (params?: Record<string, any>) =>
    apiGet<PaginatedResponse<SaasPlan>>('/plans', params),
  getAllPlans: () =>
    apiGet<{ data: SaasPlan[] }>('/plans', { all: true }),
  getPlan: (id: number) =>
    apiGet<SaasPlan>(`/plans/${id}`),
  createPlan: (data: Partial<SaasPlan>) =>
    apiPost<{ message: string; data: SaasPlan }>('/plans', data),
  updatePlan: (id: number, data: Partial<SaasPlan>) =>
    apiPut<{ message: string; data: SaasPlan }>(`/plans/${id}`, data),
  deletePlan: (id: number) =>
    apiDelete<{ message: string }>(`/plans/${id}`),

  // ── Subscriptions ──
  getSubscriptions: (params?: Record<string, any>) =>
    apiGet<PaginatedResponse<SaasSubscription>>('/subscriptions', params),
  getSubscription: (id: number) =>
    apiGet<SaasSubscription>(`/subscriptions/${id}`),
  createSubscription: (data: any) =>
    apiPost<{ message: string; data: SaasSubscription }>('/subscriptions', data),
  updateSubscription: (id: number, data: any) =>
    apiPut<{ message: string; data: SaasSubscription }>(`/subscriptions/${id}`, data),
  suspendSubscription: (id: number, reason?: string) =>
    apiPatch<{ message: string; data: SaasSubscription }>(`/subscriptions/${id}/suspend`, { reason }),
  reactivateSubscription: (id: number) =>
    apiPatch<{ message: string; data: SaasSubscription }>(`/subscriptions/${id}/reactivate`),
  deleteSubscription: (id: number) =>
    apiDelete<{ message: string }>(`/subscriptions/${id}`),

  // ── Invoices ──
  getInvoices: (params?: Record<string, any>) =>
    apiGet<PaginatedResponse<SaasInvoice>>('/invoices', params),
  getInvoice: (id: number) =>
    apiGet<SaasInvoice>(`/invoices/${id}`),
  createInvoice: (data: any) =>
    apiPost<{ message: string; data: SaasInvoice }>('/invoices', data),
  updateInvoice: (id: number, data: any) =>
    apiPut<{ message: string; data: SaasInvoice }>(`/invoices/${id}`, data),
  chargeInvoice: (id: number, billingType?: string) =>
    apiPost<{ message: string; data: SaasInvoice; gateway_response: any }>(`/invoices/${id}/charge`, { billing_type: billingType }),
  markInvoicePaid: (id: number, paymentMethod?: string, paidAmount?: number) =>
    apiPatch<{ message: string; data: SaasInvoice }>(`/invoices/${id}/mark-paid`, { payment_method: paymentMethod, paid_amount: paidAmount }),
  generateBatchInvoices: (referenceDate?: string) =>
    apiPost<{ message: string; generated: number; errors: any[] }>('/invoices/generate-batch', { reference_date: referenceDate }),
  deleteInvoice: (id: number) =>
    apiDelete<{ message: string }>(`/invoices/${id}`),
};
