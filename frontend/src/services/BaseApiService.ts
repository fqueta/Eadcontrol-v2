import { PaginatedResponse } from '@/types/index';
import { getTenantIdFromSubdomain, getTenantApiUrl, getVersionApi } from '@/lib/qlib';
import { authService } from '@/services/authService';
import { emitInvalidToken, emitInactiveUser } from '@/services/authEvents';

/**
 * Classe base para todos os serviços de API
 * Fornece funcionalidades comuns como headers, tratamento de erros e normalização de respostas
 */
export abstract class BaseApiService {
  protected readonly API_BASE_URL: string;
  protected readonly tenant_id: string;
  protected readonly api_version: string;

  constructor() {
    this.tenant_id = getTenantIdFromSubdomain() || 'default';
    this.api_version = getVersionApi();
    this.API_BASE_URL = getTenantApiUrl() + this.api_version;
  }

  /**
   * Obtém os headers padrão para requisições
   */
  protected getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Trata a resposta da API e converte para JSON
   * @param response - Resposta da requisição fetch
   */
  protected async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = 'Erro na requisição';
      let errorBody: any = null;
      try {
        errorBody = await response.json();
        errorMessage = errorBody?.message || errorBody?.error || errorMessage;
      } catch {
        // ignore json parse errors
      }
      
      // Detecta usuário inativo pelo conteúdo da mensagem/corpo
      const lowerMsg = String(errorMessage || '').toLowerCase();
      const bodyText = JSON.stringify(errorBody || {}).toLowerCase();
      const inactiveRegex = /(usuario\s*inativo|usuário\s*inativo|inactive\s*user|user\s*inactive|inactive|inativo)/i;
      const isInactive = inactiveRegex.test(lowerMsg) || inactiveRegex.test(bodyText) ||
        ['inactive','user_inactive','usuario_inativo','usuario-inativo'].includes(String(errorBody?.code || '').toLowerCase());

      // Criar erro com status code para verificação de acesso
      const error = new Error(errorMessage) as Error & { status?: number; body?: any };
      error.status = response.status;
      error.body = errorBody;

      // Logout imediato se usuário inativo
      if (isInactive) {
        emitInactiveUser();
      }

      // Validação de token em erros de permissão
      // pt-BR: Se 403/401, valida token via GET; se inválido, dispara logout.
      // en-US: On 403/401, validate token via GET; if invalid, trigger logout.
      if (response.status === 403 || response.status === 401) {
        try {
          const token = localStorage.getItem('auth_token');
          const isValid = await authService.validateToken(token || undefined);
          if (!isValid) {
            emitInvalidToken();
          }
        } catch {
          // Em caso de erro inesperado na validação, não forçar logout
        }
      }
      
      throw error;
    }
    return response.json();
  }

  /**
   * Constrói URL com parâmetros de query
   * @param baseUrl - URL base
   * @param params - Parâmetros de query
   */
  protected buildUrlWithParams(baseUrl: string, params?: Record<string, any>): string {
    if (!params) return baseUrl;

    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * Normaliza resposta paginada para o formato esperado
   * @param response - Resposta da API
   */
  protected normalizePaginatedResponse<T>(response: any): PaginatedResponse<T> {
    // Se já está no formato correto, retorna como está
    if (response.data && Array.isArray(response.data)) {
      return response as PaginatedResponse<T>;
    }

    // Se é um array direto, converte para formato paginado
    if (Array.isArray(response)) {
      return {
        data: response,
        current_page: 1,
        last_page: 1,
        per_page: response.length,
        total: response.length
      };
    }

    // Fallback para outros formatos
    return {
      data: response?.items || response?.data || [],
      current_page: response?.current_page || response?.page || 1,
      last_page: response?.last_page || response?.total_pages || 1,
      per_page: response?.per_page || response?.limit || 10,
      total: response?.total || response?.count || 0
    };
  }

  /**
   * Executa requisição GET
   * @param endpoint - Endpoint da API
   * @param params - Parâmetros de query
   */
  protected async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    if (endpoint === '/aeronaves') {
      return {
        data: [],
        current_page: 1,
        last_page: 1,
        per_page: 0,
        total: 0
      } as any as T;
    }
    if (endpoint.startsWith('/aeronaves/')) {
      return { data: null } as any as T;
    }
    const url = this.buildUrlWithParams(`${this.API_BASE_URL}${endpoint}`, params);
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  /**
   * Executa requisição POST
   * @param endpoint - Endpoint da API
   * @param data - Dados para envio
   */
  protected async post<T>(endpoint: string, data?: any): Promise<T> {
    if (endpoint === '/aeronaves' || endpoint.startsWith('/aeronaves/')) {
      return { data: null } as any as T;
    }
    const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  /**
   * postFormData
   * pt-BR: Executa POST com FormData (upload de arquivos). Não define Content-Type.
   * en-US: Executes POST with FormData (file upload). Does not set Content-Type.
   */
  protected async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const headers = this.getHeaders();
    // Remover Content-Type para que o browser defina o boundary corretamente
    delete (headers as any)['Content-Type'];
    const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return this.handleResponse<T>(response);
  }

  /**
   * Executa requisição PUT
   * @param endpoint - Endpoint da API
   * @param data - Dados para envio
   */
  protected async put<T>(endpoint: string, data?: any): Promise<T> {
    if (endpoint === '/aeronaves' || endpoint.startsWith('/aeronaves/')) {
      return { data: null } as any as T;
    }
    const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  /**
   * putFormData
   * pt-BR: Executa PUT com FormData (upload/atualização de arquivos). Sem Content-Type.
   * en-US: Executes PUT with FormData (upload/update files). No Content-Type.
   */
  protected async putFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    if (endpoint === '/aeronaves' || endpoint.startsWith('/aeronaves/')) {
      return { data: null } as any as T;
    }
    const headers = this.getHeaders();
    delete (headers as any)['Content-Type'];
    const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: formData,
    });
    return this.handleResponse<T>(response);
  }

  /**
   * Executa requisição PATCH
   * @param endpoint - Endpoint da API
   * @param data - Dados para enviar no corpo da requisição
   */
  protected async patch<T>(endpoint: string, data?: any): Promise<T> {
    if (endpoint === '/aeronaves' || endpoint.startsWith('/aeronaves/')) {
      return { data: null } as any as T;
    }
    const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  /**
   * Executa requisição DELETE
   * @param endpoint - Endpoint da API
   */
  protected async delete<T>(endpoint: string): Promise<T> {
    if (endpoint === '/aeronaves' || endpoint.startsWith('/aeronaves/')) {
      return {} as any as T;
    }
    const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }
}
