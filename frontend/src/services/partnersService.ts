import { 
  PartnerRecord, 
  CreatePartnerInput, 
  UpdatePartnerInput, 
  PartnersListParams,  
} from '@/types/partners';
import { PaginatedResponse } from '@/types/index';
import { BaseApiService } from './BaseApiService';

/**
 * Serviço para gerenciamento de parceiros
 * Estende BaseApiService para reutilizar funcionalidades comuns
 */
class PartnersService extends BaseApiService {
  /**
   * Lista parceiros com parâmetros de filtro
   * @param params - Parâmetros de listagem
   */
  async listPartners(params?: PartnersListParams): Promise<PaginatedResponse<PartnerRecord>> {
    const response = await this.get<any>('/partners', params);
    return this.normalizePaginatedResponse<PartnerRecord>(response);
  }

  /**
   * Obtém parceiro por ID
   * @param id - ID do parceiro
   */
  async getPartner(id: string): Promise<PartnerRecord> {
    return this.get<PartnerRecord>(`/partners/${id}`);
  }

  /**
   * Cria novo parceiro
   * @param payload - Dados do parceiro
   */
  async createPartner(payload: CreatePartnerInput): Promise<PartnerRecord> {
    return this.post<PartnerRecord>('/partners', payload);
  }

  /**
   * Atualiza parceiro existente
   * @param id - ID do parceiro
   * @param payload - Dados atualizados
   */
  async updatePartner(id: string, payload: UpdatePartnerInput): Promise<PartnerRecord> {
    return this.put<PartnerRecord>(`/partners/${id}`, payload);
  }

  /**
   * Exclui parceiro
   * @param id - ID do parceiro
   */
  async deletePartner(id: string): Promise<void> {
    await this.delete(`/partners/${id}`);
  }

  // Métodos de conveniência para compatibilidade com useGenericApi
  async list(params?: PartnersListParams): Promise<PaginatedResponse<PartnerRecord>> {
    return this.listPartners(params);
  }

  async getById(id: string): Promise<PartnerRecord> {
    return this.getPartner(id);
  }

  async create(data: CreatePartnerInput): Promise<PartnerRecord> {
    return this.createPartner(data);
  }

  async update(id: string, data: UpdatePartnerInput): Promise<PartnerRecord> {
    return this.updatePartner(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.deletePartner(id);
  }
}

export const partnersService = new PartnersService();