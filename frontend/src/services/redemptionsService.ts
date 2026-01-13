import { BaseApiService } from './BaseApiService';
import { Redemption, RedemptionFilters } from '@/types/redemptions';
import { ApiResponse, PaginatedResponse } from '@/types/index';

/**
 * Parâmetros para listagem de resgates
 */
export interface RedemptionListParams extends RedemptionFilters {
  page?: number;
  per_page?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Serviço para gerenciar resgates de pontos
 */
class RedemptionsService extends BaseApiService {
  private readonly endpoint = '/point-store/redemptions';

  /**
   * Lista os resgates do usuário logado
   * @param params - Parâmetros de filtro e paginação
   */
  async listUserRedemptions(params?: RedemptionListParams): Promise<ApiResponse<Redemption[]>> {
    // Passa params diretamente para buildUrlWithParams
    const response = await this.get<ApiResponse<Redemption[]>>(this.endpoint, params);
    return response;
  }

  /**
   * Obtém um resgate específico por ID
   * @param id - ID do resgate
   */
  async getRedemption(id: string): Promise<Redemption> {
    const response = await this.get<ApiResponse<Redemption>>(`${this.endpoint}/${id}`);
    return response.data;
  }

  /**
   * Lista todos os resgates (admin)
   * @param params - Parâmetros de filtro e paginação
   */
  async listAllRedemptions(params?: RedemptionListParams): Promise<PaginatedResponse<Redemption>> {
    // Passa params diretamente para buildUrlWithParams
    const response = await this.get<ApiResponse<PaginatedResponse<Redemption>>>('/admin/redemptions', params);
    return response.data;
  }

  /**
   * Atualiza o status de um resgate (admin)
   * @param id - ID do resgate
   * @param status - Novo status
   * @param notes - Observações opcionais
   * @param trackingCode - Código de rastreamento opcional
   */
  async updateRedemptionStatus(id: string, status: string, notes?: string, trackingCode?: string): Promise<Redemption> {
    const response = await this.patch<ApiResponse<Redemption>>(`/admin/redemptions/${id}/status`, {
      status,
      notes,
      trackingCode
    });
    return response.data;
  }

  /**
   * Extorna um resgate (admin)
   * Endpoint correto: PATCH /admin/redemptions/{id}/refund
   * @param id - ID do resgate a ser extornado
   * @param notes - Observações opcionais
   */
  async refundRedemption(id: string, notes?: string): Promise<Redemption> {
    const response = await this.patch<ApiResponse<Redemption>>(`/admin/redemptions/${id}/refund`, { notes });
    return response.data;
  }

  /**
   * Exclui definitivamente um resgate (admin)
   * Executa DELETE em `/admin/redemptions/{id}`.
   * @param id - ID do resgate a excluir
   */
  async deleteRedemption(id: string): Promise<void> {
    await this.delete<void>(`/admin/redemptions/${id}`);
  }
}

export const redemptionsService = new RedemptionsService();