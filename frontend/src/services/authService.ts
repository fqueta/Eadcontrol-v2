import { LoginCredentials, RegisterData, ForgotPasswordData, ResetPasswordData, AuthResponse, User } from '@/types/auth';
import { MenuItemDTO } from '@/types/menu';
import { getTenantIdFromSubdomain, getTenantApiUrl, getVersionApi } from '@/lib/qlib';
const tenant_id = getTenantIdFromSubdomain() || 'default';
const api_version = getVersionApi();
const API_BASE_URL = getTenantApiUrl() + api_version;
class AuthService {
  private getHeaders(includeAuth = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (includeAuth) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * validateToken
   * pt-BR: Valida o token atual usando GET `/user/validate-token/{token}`.
   *        Retorna `true` se válido, `false` se inválido.
   * en-US: Validates the current token via GET `/user/validate-token/{token}`.
   *        Returns `true` if valid, `false` if invalid.
   */
  async validateToken(token?: string): Promise<boolean> {
    const tk = token || localStorage.getItem('auth_token');
    if (!tk) return false;
    try {
      const response = await fetch(`${API_BASE_URL}/user/validate-token/${tk}`, {
        method: 'GET',
        headers: this.getHeaders(false),
      });

      if (!response.ok) {
        // Considera inválido para 401/403/419; outros erros são propagados
        if ([401, 403, 419].includes(response.status)) {
          return false;
        }
        // Para outros status, tenta obter mensagem mas retorna false como padrão seguro
        return false;
      }

      // Tenta interpretar resposta com campo `valid`
      try {
        const data = await response.json();
        if (typeof data?.valid === 'boolean') {
          return data.valid;
        }
      } catch {
        // Se não conseguir parsear, assume válido para evitar logout indevido
        return true;
      }

      // Sem campo `valid`, assume válido
      return true;
    } catch (error) {
      // Em erros de rede, não forçar logout automaticamente
      console.warn('Falha ao validar token:', error);
      return true;
    }
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

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(credentials),
    });

    const data = await this.handleResponse<AuthResponse>(response);
    
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      
      // Store permissions and menu if provided
      if (data.permissions) {
        localStorage.setItem('auth_permissions', JSON.stringify(data.permissions));
      }
      if (data.menu) {
        localStorage.setItem('auth_menu', JSON.stringify(data.menu));
      }
      if (data.force_password_change) {
        localStorage.setItem('auth_force_password_change', 'true');
      } else {
        localStorage.removeItem('auth_force_password_change');
      }
    }

    return data;
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });

    const data = await this.handleResponse<AuthResponse>(response);
    
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      
      // Store permissions and menu if provided
      if (data.permissions) {
        localStorage.setItem('auth_permissions', JSON.stringify(data.permissions));
      }
      if (data.menu) {
        localStorage.setItem('auth_menu', JSON.stringify(data.menu));
      }
      if (data.force_password_change) {
        localStorage.setItem('auth_force_password_change', 'true');
      } else {
        localStorage.removeItem('auth_force_password_change');
      }
    }

    return data;
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        headers: this.getHeaders(true),
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      this.clearStorage();
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/user`, {
      method: 'GET',
      headers: this.getHeaders(true),
    });

    return this.handleResponse<User>(response);
  }

  /**
   * getProfile
   * pt-BR: Busca o perfil detalhado do usuário em `/user/profile`,
   * retornando o objeto `data` que contém campos básicos e `meta`.
   * en-US: Fetches detailed user profile from `/user/profile`,
   * returns the `data` object including basic fields and `meta`.
   */
  async getProfile(): Promise<{ id: string; name: string; email: string; avatar: string | null; meta?: Record<string, any> }> {
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      method: 'GET',
      headers: this.getHeaders(true),
    });

    const payload = await this.handleResponse<{ message?: string; data: { id: string; name: string; email: string; avatar: string | null; meta?: Record<string, any> } }>(response);
    return payload.data;
  }

  async updateProfile(data: Partial<User> | FormData): Promise<User> {
    const headers: HeadersInit = {
      'Accept': 'application/json',
    };

    // Adiciona token de autorização
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Se for FormData, não adiciona Content-Type (deixa o browser definir)
    // Se for objeto, adiciona Content-Type: application/json
    let body: string | FormData;
    if (data instanceof FormData) {
      body = data;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}/user/update-profile`, {
      method: 'POST',
      headers,
      body,
    });

    const responsePayload = await this.handleResponse<{ message?: string; user: User }>(response);
    
    // Extract user from response wrapper
    const updatedUser = responsePayload.user;
    
    // Atualiza o usuário no localStorage
    localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    
    return updatedUser;
  }

  async changePassword(passwordData: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/user/change-password`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(passwordData),
    });

    await this.handleResponse<void>(response);
  }

  async forgotPassword(data: ForgotPasswordData): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<{ message: string }>(response);
  }

  async resetPassword(data: ResetPasswordData): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/reset-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<{ message: string }>(response);
  }

  getStoredToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('auth_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  getStoredPermissions(): string[] | null {
    const permissionsStr = localStorage.getItem('auth_permissions');
    if (permissionsStr) {
      try {
        return JSON.parse(permissionsStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  getStoredMenu(): MenuItemDTO[] | null {
    const menuStr = localStorage.getItem('auth_menu');
    if (menuStr) {
      try {
        return JSON.parse(menuStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  async getUserPermissions(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/user/permissions`, {
      method: 'GET',
      headers: this.getHeaders(true),
    });

    const data = await this.handleResponse<{ permissions: string[] }>(response);
    return data.permissions;
  }

  async getUserMenu(): Promise<MenuItemDTO[]> {
    const response = await fetch(`${API_BASE_URL}/user/menu`, {
      method: 'GET',
      headers: this.getHeaders(true),
    });

    const data = await this.handleResponse<{ menu: MenuItemDTO[] }>(response);
    return data.menu;
  }

  async checkAccess({ permission, path }: { permission?: string; path?: string }): Promise<{ allowed: boolean }> {
    const params = new URLSearchParams();
    if (permission) params.append('permission', permission);
    if (path) params.append('path', path);

    try {
      const response = await fetch(`${API_BASE_URL}/user/can?${params.toString()}`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });

      if (response.status === 403 || response.status === 401) {
        return { allowed: false };
      }

      return this.handleResponse<{ allowed: boolean }>(response);
    } catch (error) {
      // On API errors, assume not allowed for safety
      console.warn('Access check failed:', error);
      return { allowed: false };
    }
  }

  clearStorage(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_permissions');
    localStorage.removeItem('auth_menu');
    localStorage.removeItem('auth_force_password_change');
  }
}

export const authService = new AuthService();