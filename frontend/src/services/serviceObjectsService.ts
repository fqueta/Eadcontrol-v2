import { 
  ServiceObjectRecord, 
  CreateServiceObjectInput, 
  UpdateServiceObjectInput, 
  ServiceObjectsListParams,  
} from '@/types/serviceObjects';
import { PaginatedResponse } from '@/types/index';
import { BaseApiService } from './BaseApiService';

/**
 * Serviço para gerenciamento de objetos de serviço
 * Estende BaseApiService para reutilizar funcionalidades comuns
 */
class ServiceObjectsService extends BaseApiService {
  /**
   * Lista objetos de serviço com parâmetros de filtro
   * @param params - Parâmetros de listagem
   */
  async listServiceObjects(params?: ServiceObjectsListParams): Promise<PaginatedResponse<ServiceObjectRecord>> {
    const response = await this.get<any>('/service-objects', params);
    return this.normalizePaginatedResponse<ServiceObjectRecord>(response);
  }

  /**
   * Obtém objeto de serviço por ID
   * @param id - ID do objeto de serviço
   */
  async getServiceObject(id: string): Promise<ServiceObjectRecord> {
    return this.get<ServiceObjectRecord>(`/service-objects/${id}`);
  }

  /**
   * Cria novo objeto de serviço
   * @param payload - Dados do objeto de serviço
   */
  async createServiceObject(payload: CreateServiceObjectInput): Promise<ServiceObjectRecord> {
    return this.post<ServiceObjectRecord>('/service-objects', payload);
  }

  /**
   * Atualiza objeto de serviço existente
   * @param id - ID do objeto de serviço
   * @param payload - Dados atualizados
   */
  async updateServiceObject(id: string, payload: UpdateServiceObjectInput): Promise<ServiceObjectRecord> {
    return this.put<ServiceObjectRecord>(`/service-objects/${id}`, payload);
  }

  /**
   * Exclui objeto de serviço
   * @param id - ID do objeto de serviço
   */
  async deleteServiceObject(id: string): Promise<void> {
    return this.delete<void>(`/service-objects/${id}`);
  }

  // Métodos para compatibilidade com o hook genérico
  async list(params?: ServiceObjectsListParams): Promise<PaginatedResponse<ServiceObjectRecord>> {
    return this.listServiceObjects(params);
  }

  async getById(id: string): Promise<ServiceObjectRecord> {
    return this.getServiceObject(id);
  }

  async create(data: CreateServiceObjectInput): Promise<ServiceObjectRecord> {
    return this.createServiceObject(data);
  }

  async update(id: string, data: UpdateServiceObjectInput): Promise<ServiceObjectRecord> {
    return this.updateServiceObject(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.deleteServiceObject(id);
  }
}

export const serviceObjectsService = new ServiceObjectsService();
export default serviceObjectsService;