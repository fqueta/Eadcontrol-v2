import { getTenantApiUrl, getVersionApi } from '@/lib/qlib';
import { authService } from '@/services/authService';
import { emitInvalidToken, emitInactiveUser } from '@/services/authEvents';

const api_version = getVersionApi();
const API_BASE_URL = getTenantApiUrl() + api_version;

export interface AnalyticsDashboardStats {
  overview: {
    total_views: number;
    active_users: number;
  };
  top_courses: Array<{
    id: number;
    title: string;
    views: number;
  }>;
  top_activities: Array<{
    id: number;
    title: string;
    type: string;
    views: number;
  }>;
  views_chart: Array<{
    date: string;
    count: number;
  }>;
  users_access: Array<{
    user_id: number | string;
    name: string;
    email: string | null;
    last_access: string;
  }>;
}

class AnalyticsService {
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

      const lowerMsg = String(errorMessage || '').toLowerCase();
      const bodyText = JSON.stringify(errorBody || {}).toLowerCase();
      const inactiveRegex = /(usuario\s*inativo|usuário\s*inativo|inactive\s*user|user\s*inactive|inactive|inativo)/i;
      const isInactive = inactiveRegex.test(lowerMsg) || inactiveRegex.test(bodyText);
      
      if (isInactive) {
        emitInactiveUser();
      }

      if (response.status === 403 || response.status === 401) {
        try {
          const isValid = await authService.validateToken(token || undefined);
          if (!isValid) {
            emitInvalidToken();
          }
        } catch {
          // ignora erro na validação
        }
      }
      throw error;
    }

    return response.json();
  }

  /**
   * Obtém estatísticas do dashboard de analytics
   * @param days Número de dias retroativos (padrão 30)
   */
  async getDashboardStats(days: number = 30): Promise<AnalyticsDashboardStats> {
    const url = `${API_BASE_URL}/tracking/dashboard?days=${days}`;
    return this.request<AnalyticsDashboardStats>(url, { method: 'GET' });
  }
}

export const analyticsService = new AnalyticsService();
