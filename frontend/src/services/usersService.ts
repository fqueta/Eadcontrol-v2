import { 
  UserRecord, 
  CreateUserInput, 
  UpdateUserInput, 
  UsersListParams, 
  Paginated
} from '@/types/users';

import { getTenantIdFromSubdomain, getTenantApiUrl, getVersionApi } from '@/lib/qlib';
const tenant_id = getTenantIdFromSubdomain() || 'default';
const api_version = getVersionApi();
const API_BASE_URL = getTenantApiUrl() + api_version;

class UsersService {
  private getHeaders(): HeadersInit {
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

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = 'Erro na requisição';
      let errorBody: any = null;
      try {
        errorBody = await response.json();
        errorMessage = errorBody?.message || errorMessage;
      } catch {
        // ignore json parse errors
      }
      const error = new Error(errorMessage) as Error & { status?: number; body?: any };
      error.status = response.status;
      error.body = errorBody;
      throw error;
    }
    return response.json();
  }

  async listUsers(params?: UsersListParams): Promise<Paginated<UserRecord>> {
    const searchParams = new URLSearchParams();
    
    if (params?.search) {
      searchParams.append('search', params.search);
    }
    if (params?.page) {
      searchParams.append('page', params.page.toString());
    }
    if (params?.per_page) {
      searchParams.append('per_page', params.per_page.toString());
    }
    // pt-BR: Quando consultores=true, retorna apenas usuários consultores.
    // en-US: When consultores=true, return only consultant users.
    if (params?.consultores) {
      searchParams.append('consultores', 'true');
    }
    // pt-BR: Adiciona parâmetro de ordenação quando informado.
    // en-US: Adds sort parameter when provided.
    if (params?.sort) {
      searchParams.append('sort', params.sort);
    }

    const url = `${API_BASE_URL}/users${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const data = await this.handleResponse<any>(response);
    
    // Handle both paginated and non-paginated responses
    if (Array.isArray(data)) {
      return {
        data: data,
        current_page: 1,
        last_page: 1,
        per_page: data.length,
        total: data.length,
      };
    }
    
    // Handle paginated response with different possible structures
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

  async getUser(id: string): Promise<UserRecord> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<UserRecord>(response);
  }

  async createUser(payload: CreateUserInput): Promise<UserRecord> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    return this.handleResponse<UserRecord>(response);
  }

  async updateUser(id: string, payload: UpdateUserInput): Promise<UserRecord> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    return this.handleResponse<UserRecord>(response);
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (response.status === 404) {
        throw new Error('Usuário não encontrado');
      }

      await this.handleResponse(response);
    } catch (error) {
      throw new Error(`Erro ao excluir usuário: ${(error as Error).message}`);
    }
  }

  /**
   * Busca propriedades dos usuários
   */
  async getUsersPropertys(): Promise<UserRecord[]> {
    const response = await fetch(`${API_BASE_URL}/users/propertys`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<UserRecord[]>(response);
  }
}

export const usersService = new UsersService();