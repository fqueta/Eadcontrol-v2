import { BaseApiService } from './BaseApiService';
import { 
  ServiceOrder, 
  CreateServiceOrderInput, 
  UpdateServiceOrderInput, 
  ServiceOrderFilters,
  ServiceOrderStats
} from '@/types/serviceOrders';
import { ApiResponse, PaginatedResponse } from '@/types/index';

/**
 * Parâmetros para listagem de ordens de serviço
 */
export interface ServiceOrderListParams extends ServiceOrderFilters {
  page?: number;
  per_page?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Serviço para gerenciar ordens de serviço
 * Estende BaseApiService para reutilizar funcionalidades comuns
 */
class ServiceOrdersService extends BaseApiService {
  private readonly endpoint = '/service-orders';

  /**
   * Lista todas as ordens de serviço com paginação e filtros
   * @param params - Parâmetros de filtro e paginação
   */
  async listServiceOrders(params?: ServiceOrderListParams): Promise<PaginatedResponse<ServiceOrder>> {
    const response = await this.get<any>(this.endpoint, params);
    return this.normalizePaginatedResponse<ServiceOrder>(response);
  }

  /**
   * Obtém uma ordem de serviço por ID
   * @param id - ID da ordem de serviço
   */
  async getServiceOrder(id: string): Promise<ServiceOrder> {
    const response = await this.get<ApiResponse<ServiceOrder>>(`${this.endpoint}/${id}`);
    return response.data;
  }

  /**
   * Cria uma nova ordem de serviço
   * @param data - Dados da ordem de serviço
   */
  async createServiceOrder(data: CreateServiceOrderInput): Promise<ServiceOrder> {
    const response = await this.post<ApiResponse<ServiceOrder>>(this.endpoint, data);
    return response.data;
  }

  /**
   * Atualiza uma ordem de serviço existente
   * @param id - ID da ordem de serviço
   * @param data - Dados para atualização
   */
  async updateServiceOrder(id: string, data: UpdateServiceOrderInput): Promise<ServiceOrder> {
    const response = await this.put<ApiResponse<ServiceOrder>>(`${this.endpoint}/${id}`, data);
    return response.data;
  }

  /**
   * Exclui uma ordem de serviço
   * @param id - ID da ordem de serviço
   */
  async deleteServiceOrder(id: string): Promise<void> {
    const response = await fetch(`${this.API_BASE_URL}${this.endpoint}/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    await this.handleResponse<void>(response);
  }

  /**
   * Obtém estatísticas das ordens de serviço
   */
  async getStats(): Promise<ServiceOrderStats> {
    const response = await this.get<ApiResponse<ServiceOrderStats>>(`${this.endpoint}/stats`);
    return response.data;
  }

  /**
   * Obtém lista de clientes para seleção
   */
  async getClients(): Promise<{ id: string; name: string }[]> {
    const response = await this.get<ApiResponse<{ id: string; name: string }[]>>('/clients/list');
    return response.data;
  }

  /**
   * Busca clientes dinamicamente por termo de pesquisa
   * @param search - Termo de pesquisa
   */
  async searchClients(search?: string): Promise<{ id: string; name: string }[]> {
    const params = search ? { search } : {};
    const response = await this.get<ApiResponse<{ id: string; name: string }[]>>('/clients', params);
    return response.data;
  }

  /**
   * Obtém lista de usuários para atribuição
   */
  async getUsers(): Promise<{ id: string; name: string }[]> {
    const response = await this.get<ApiResponse<{ id: string; name: string }[]>>('/users/list');
    return response.data;
  }

  /**
   * Busca usuários dinamicamente por termo de pesquisa
   * @param search - Termo de pesquisa
   */
  async searchUsers(search?: string): Promise<{ id: string; name: string }[]> {
    const params = search ? { search } : {};
    const response = await this.get<ApiResponse<{ id: string; name: string }[]>>('/users', params);
    return response.data;
  }

  /**
   * Obtém lista de serviços disponíveis
   */
  async getAvailableServices(): Promise<{ id: string; name: string; price: number; unit: string }[]> {
    const response = await this.get<ApiResponse<{ id: string; name: string; price: number; unit: string }[]>>('/services/available');
    return response.data;
  }

  /**
   * Busca serviços dinamicamente por termo de pesquisa
   * @param search - Termo de pesquisa
   */
  async searchServices(search?: string): Promise<{ id: string; name: string; price: number; unit: string }[]> {
    const params = search ? { search } : {};
    const response = await this.get<ApiResponse<{ id: string; name: string; price: number; unit: string }[]>>('/services', params);
    return response.data;
  }

  /**
   * Obtém lista de produtos disponíveis
   */
  async getAvailableProducts(): Promise<{ id: string; name: string; points: number; availability: string; category: string }[]> {
    const response = await this.get<ApiResponse<{ id: string; name: string; points: number; availability: string; category: string }[]>>('/products/available');
    return response.data;
  }

  /**
   * Busca produtos dinamicamente por termo de pesquisa
   * @param search - Termo de pesquisa
   */
  async searchProducts(search?: string): Promise<{ id: string; name: string; points: number; availability: string; category: string }[]> {
    const params = search ? { search } : {};
    const response = await this.get<ApiResponse<{ id: string; name: string; points: number; availability: string; category: string }[]>>('/products', params);
    return response.data;
  }

  /**
   * Gera número automático para nova ordem
   */
  async generateOrderNumber(): Promise<string> {
    const response = await this.get<ApiResponse<{ order_number: string }>>(`${this.endpoint}/generate-number`);
    return response.data.order_number;
  }

  /**
   * Duplica uma ordem de serviço existente
   * @param id - ID da ordem de serviço a ser duplicada
   */
  async duplicateServiceOrder(id: string): Promise<ServiceOrder> {
    const response = await this.post<ApiResponse<ServiceOrder>>(`${this.endpoint}/${id}/duplicate`);
    return response.data;
  }

  /**
   * Atualiza apenas o status de uma ordem de serviço
   * @param id - ID da ordem de serviço
   * @param status - Novo status
   */
  async updateStatus(id: string, status: string): Promise<ServiceOrder> {
    const response = await this.put<ApiResponse<ServiceOrder>>(`${this.endpoint}/${id}/status`, { status });
    return response.data;
  }

  // Métodos de conveniência para manter compatibilidade com useGenericApi
  async list(params?: ServiceOrderListParams): Promise<PaginatedResponse<ServiceOrder>> {
    return this.listServiceOrders(params);
  }

  async getById(id: string): Promise<ServiceOrder> {
    return this.getServiceOrder(id);
  }

  async create(data: CreateServiceOrderInput): Promise<ServiceOrder> {
    return this.createServiceOrder(data);
  }

  async update(id: string, data: UpdateServiceOrderInput): Promise<ServiceOrder> {
    return this.updateServiceOrder(id, data);
  }

  async deleteById(id: string): Promise<void> {
    return this.deleteServiceOrder(id);
  }
}

/**
 * Instância singleton do serviço de ordens de serviço
 */
export const serviceOrdersService = new ServiceOrdersService();