import { BaseApiService } from './BaseApiService';
import { Service, CreateServiceInput, UpdateServiceInput, ServiceFilters } from '@/types/services';
import { ApiResponse, PaginatedResponse } from '@/types/index';

/**
 * Parâmetros para listagem de serviços
 */
export interface ServiceListParams extends ServiceFilters {
  page?: number;
  per_page?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Serviço para gerenciar serviços
 * Estende BaseApiService para reutilizar funcionalidades comuns
 */
class ServicesService extends BaseApiService {
  private readonly endpoint = '/services';

  /**
   * Lista todos os serviços com paginação e filtros
   * @param params - Parâmetros de filtro e paginação
   */
  async listServices(params?: ServiceListParams): Promise<PaginatedResponse<Service>> {
    const response = await this.get<any>(this.endpoint, params);
    return this.normalizePaginatedResponse<Service>(response);
  }

  /**
   * Obtém um serviço por ID
   * @param id - ID do serviço
   */
  async getService(id: string): Promise<Service> {
    const response = await this.get<ApiResponse<Service>>(`${this.endpoint}/${id}`);
    return response.data;
  }

  /**
   * Cria um novo serviço
   * @param data - Dados do serviço
   */
  async createService(data: CreateServiceInput): Promise<Service> {
    const response = await this.post<ApiResponse<Service>>(this.endpoint, data);
    return response.data;
  }

  /**
   * Atualiza um serviço existente
   * @param id - ID do serviço
   * @param data - Dados para atualização
   */
  async updateService(id: string, data: UpdateServiceInput): Promise<Service> {
    const response = await this.put<ApiResponse<Service>>(`${this.endpoint}/${id}`, data);
    return response.data;
  }

  /**
   * Remove um serviço
   * @param id - ID do serviço
   */
  async deleteService(id: string): Promise<void> {
    await this.delete(`${this.endpoint}/${id}`);
  }

  /**
   * Obtém categorias de serviços disponíveis
   */
  async getCategories(): Promise<{ id: string; name: string }[]> {
    const response = await this.get<ApiResponse<{ id: string; name: string }[]>>('/service-categories');
    return response.data;
  }

  /**
   * Obtém unidades de tempo disponíveis
   */
  async getUnits(): Promise<{ value: string; label: string }[]> {
    const response = await this.get<ApiResponse<{ value: string; label: string }[]>>('/service-units');
    return response.data;
  }

  // Métodos de conveniência para compatibilidade com hooks genéricos
  /**
   * Lista serviços (alias para listServices)
   */
  async list(params?: ServiceListParams): Promise<PaginatedResponse<Service>> {
    return this.listServices(params);
  }

  async getById(id: string): Promise<Service> {
    return this.getService(id);
  }

  async create(data: CreateServiceInput): Promise<Service> {
    return this.createService(data);
  }

  async update(id: string, data: UpdateServiceInput): Promise<Service> {
    return this.updateService(id, data);
  }

  async deleteById(id: string): Promise<void> {
    await super.delete(`${this.endpoint}/${id}`);
  }
}

/**
 * Instância singleton do serviço de serviços
 */
export const servicesService = new ServicesService();