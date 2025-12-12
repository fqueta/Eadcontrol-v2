import { 
  MetricRecord, 
  MetricList, 
  CreateMetricInput, 
  UpdateMetricInput, 
  MetricsListParams,
  Paginated 
} from '@/types/metrics';

import { getTenantIdFromSubdomain, getTenantApiUrl, getVersionApi } from '@/lib/qlib';
import { authService } from '@/services/authService';
import { emitInvalidToken, emitInactiveUser } from '@/services/authEvents';

const tenant_id = getTenantIdFromSubdomain() || 'default';
const api_version = getVersionApi();
const API_BASE_URL = getTenantApiUrl() + api_version;
// console.log(`API_BASE_URL: ${API_BASE_URL}`);

class MetricsService {
  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = 'Erro na requisição';
      let errorBody: any = null;
      try {
        errorBody = await response.json();
        errorMessage = errorBody?.message || errorMessage;
      } catch {
        // ignora erro no parse
      }
      const error = new Error(errorMessage) as Error & { status?: number; body?: any };
      error.status = response.status;
      error.body = errorBody;

      // Logout imediato se usuário inativo
      const lowerMsg = String(errorMessage || '').toLowerCase();
      const bodyText = JSON.stringify(errorBody || {}).toLowerCase();
      const inactiveRegex = /(usuario\s*inativo|usuário\s*inativo|inactive\s*user|user\s*inactive|inactive|inativo)/i;
      const isInactive = inactiveRegex.test(lowerMsg) || inactiveRegex.test(bodyText) ||
        ['inactive','user_inactive','usuario_inativo','usuario-inativo'].includes(String(errorBody?.code || '').toLowerCase());
      if (isInactive) {
        emitInactiveUser();
      }

      // Validação de token em erros de permissão usando /user/validate-token/{token}
      if (response.status === 403 || response.status === 401) {
        try {
          const token = localStorage.getItem('auth_token');
          const isValid = await authService.validateToken(token || undefined);
          if (!isValid) {
            emitInvalidToken();
          }
        } catch {
          // Erros na validação não forçam logout automaticamente
        }
      }
      throw error;
    }

    return response.json();
  }

  async listMetrics(params?: MetricsListParams): Promise<Paginated<MetricRecord | MetricList>> {
    const searchParams = new URLSearchParams();
    
    if (params?.year) searchParams.append('year', params.year.toString());
    if (params?.month) searchParams.append('month', params.month.toString());
    if (params?.week) searchParams.append('week', params.week.toString());
    if (params?.start_date && params?.end_date) {
      searchParams.append('data_inicio', params.start_date);
      searchParams.append('data_fim', params.end_date);
    }
    if (params?.search) {
      searchParams.append('search', params.search);
    }

    const url = `${API_BASE_URL}/metrics/filter${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    // console.log('Requesting:', url);

    const data = await this.request<any>(url, { method: 'GET' });

    // Normalização da resposta
    // const registros = data.registros || data.items || data.data || [];
    if (Array.isArray(data)) {
      return {
        data: data,
        current_page: 1,
        last_page: 1,
        per_page: data.length,
        total: data.length,
      };
    }

    if (data.items) {
      return {
        data: data.items,
        current_page: data.meta?.current_page || 1,
        last_page: data.meta?.last_page || 1,
        per_page: data.meta?.per_page || data.items.length,
        total: data.meta?.total || data.items.length,
      };
    }

    return data;
  }

  async getMetric(id: string): Promise<MetricRecord> {
    return this.request<MetricRecord>(`${API_BASE_URL}/metrics/${id}`, {
      method: 'GET',
    });
  }

  async createMetric(payload: CreateMetricInput): Promise<MetricRecord> {
    return this.request<MetricRecord>(`${API_BASE_URL}/metrics`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateMetric(id: string, payload: UpdateMetricInput): Promise<MetricRecord> {
    return this.request<MetricRecord>(`${API_BASE_URL}/metrics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteMetric(id: string): Promise<void> {
    await this.request<void>(`${API_BASE_URL}/metrics/${id}`, {
      method: 'DELETE',
    });
  }
}

export const metricsService = new MetricsService();
