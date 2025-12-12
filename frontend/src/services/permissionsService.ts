import { 
  PermissionRecord, 
  CreatePermissionInput, 
  UpdatePermissionInput, 
  PermissionsListParams, 
  Paginated,
  MenuPermissionRow,
  MenuPermissionUpsert
} from '@/types/permissions';

import { getTenantIdFromSubdomain, getTenantApiUrl, getVersionApi } from '@/lib/qlib';
const tenant_id = getTenantIdFromSubdomain() || 'default';
const api_version = getVersionApi();
const API_BASE_URL = getTenantApiUrl() + api_version;

class PermissionsService {
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

  async listPermissions(params?: PermissionsListParams): Promise<Paginated<PermissionRecord>> {
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

    const url = `${API_BASE_URL}/permissions${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    
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

  async getPermission(id: string): Promise<PermissionRecord> {
    const response = await fetch(`${API_BASE_URL}/permissions/${id}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<PermissionRecord>(response);
  }

  async createPermission(payload: CreatePermissionInput): Promise<PermissionRecord> {
    const response = await fetch(`${API_BASE_URL}/permissions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    return this.handleResponse<PermissionRecord>(response);
  }

  async updatePermission(id: string, payload: UpdatePermissionInput): Promise<PermissionRecord> {
    const response = await fetch(`${API_BASE_URL}/permissions/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    return this.handleResponse<PermissionRecord>(response);
  }

  async deletePermission(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/permissions/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (response.status === 404) {
        throw new Error('Permissão não encontrada');
      }

      await this.handleResponse(response);
    } catch (error) {
      throw new Error(`Erro ao excluir permissão: ${(error as Error).message}`);
    }
  }

  /**
   * Get menu permissions for a specific permission ID
   */
  async getMenuPermissions(permissionId: string): Promise<MenuPermissionRow[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/permissions/${permissionId}/menu-permissions`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await this.handleResponse<any>(response);
      
      // Flatten nested tree structure and normalize boolean values
      return this.flattenMenuPermissions(data);
    } catch (error) {
      throw new Error(`Erro ao carregar permissões de menu: ${(error as Error).message}`);
    }
  }

  /**
   * Recursively flatten nested menu permissions tree into MenuPermissionRow array
   */
  private flattenMenuPermissions(menuItems: any[]): MenuPermissionRow[] {
    const result: MenuPermissionRow[] = [];
    
    const toBool = (value: any): boolean => {
      return value === true || value === 1 || value === '1';
    };

    const processItem = (item: any): void => {
      // Only process items that have menu_id (actual menu items, not just parent containers)
      if (item.menu_id !== undefined) {
        result.push({
          permission_id: '', // This will be set by the calling code if needed
          menu_id: item.menu_id,
          parent_id: item.parent_id ?? null,
          can_view: toBool(item.can_view),
          can_create: toBool(item.can_create),
          can_edit: toBool(item.can_edit),
          can_delete: toBool(item.can_delete),
          can_upload: toBool(item.can_upload),
        });
      }

      // Process nested items
      if (item.items && Array.isArray(item.items)) {
        item.items.forEach(processItem);
      }
    };

    menuItems.forEach(processItem);
    return result;
  }

  /**
   * Update menu permissions for a specific permission
   */
  async updateMenuPermissions(data: MenuPermissionUpsert): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/permissions/${data.permission_id}/menu-permissions`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      await this.handleResponse(response);
    } catch (error) {
      throw new Error(`Erro ao salvar permissões de menu: ${(error as Error).message}`);
    }
  }
}

export const permissionsService = new PermissionsService();