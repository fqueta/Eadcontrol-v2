import { GenericApiService } from './GenericApiService';
import { PaginatedResponse } from '@/types/index';

// Tipos específicos para clientes ativos
/**
 * ActiveClientStep1Data
 * pt-BR: Tornamos `cpf` opcional para suportar fluxo público sem CPF.
 * en-US: Make `cpf` optional to support public flow without CPF.
 */
export interface ActiveClientStep1Data {
  name: string;
  cpf?: string;
  email: string;
  phone: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

export interface ActiveClientStep2Data {
  password: string;
}

/**
 * ActiveClientCompleteData
 * pt-BR: Dados completos com senha; `cpf` segue opcional.
 * en-US: Complete data with password; `cpf` remains optional.
 */
export interface ActiveClientCompleteData extends ActiveClientStep1Data {
  password: string;
}

/**
 * ActiveClientResponse
 * pt-BR: Resposta da API; `cpf` pode não estar presente.
 * en-US: API response; `cpf` may be absent.
 */
export interface ActiveClientResponse {
  id: string;
  name: string;
  cpf?: string;
  email: string;
  phone: string;
  status: 'pending' | 'active';
  created_at: string;
}

/**
 * Serviço específico para clientes ativos
 * Implementa a interface GenericApiService para compatibilidade com useGenericApi
 */
class ActiveClientsService extends GenericApiService<
  ActiveClientResponse,
  ActiveClientStep1Data,
  ActiveClientCompleteData
> {
  constructor() {
    // super('/clients/active');
    super('/clients/matricula');
  }

  /**
   * Primeira etapa: verificação e registro inicial
   * @param data - Dados do cliente
   * @param endpoint - Endpoint customizado (opcional)
   * @param token - Token de segurança para formulário público (opcional)
   */
  async verifyAndRegister(
    data: ActiveClientStep1Data, 
    endpoint?: string, 
    token?: string
  ): Promise<ActiveClientResponse> {
    const response = await this.postWithToken<any>(endpoint ?? this.endpoint, data, token);
    return response.data || response;
  }

  /**
   * Segunda etapa: finalização com senha
   * @param data - Dados completos do cliente
   * @param token - Token de segurança para formulário público (opcional)
   */
  async finalizeRegistration(data: ActiveClientCompleteData, token?: string): Promise<ActiveClientResponse> {
    const response = await this.postWithToken<any>(this.endpoint, data, token);
    return response.data || response;
  }

  /**
   * Executa requisição POST com token customizado
   * @param endpoint - Endpoint da API
   * @param data - Dados para envio
   * @param token - Token de segurança
   */
  private async postWithToken<T>(endpoint: string, data?: any, token?: string): Promise<T> {
    const headers = this.getHeaders();
    if (token) {
      headers['X-Form-Token'] = token;
    }

    const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  /**
   * Executa requisição PUT com token customizado
   * @param endpoint - Endpoint da API
   * @param data - Dados para envio
   * @param token - Token de segurança
   */
  private async putWithToken<T>(endpoint: string, data?: any, token?: string): Promise<T> {
    const headers = this.getHeaders();
    if (token) {
      headers['X-Form-Token'] = token;
    }

    const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  // Implementação da interface GenericApiService
  async create(data: ActiveClientStep1Data): Promise<ActiveClientResponse> {
    return this.verifyAndRegister(data);
  }

  async update(id: string, data: ActiveClientCompleteData): Promise<ActiveClientResponse> {
    return this.finalizeRegistration(data);
  }
}

export const activeClientsService = new ActiveClientsService();