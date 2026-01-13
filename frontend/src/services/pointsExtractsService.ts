import { BaseApiService } from './BaseApiService';
import { PointsExtract, PointsExtractFilters } from '@/types/redemptions';
import { ApiResponse, PaginatedResponse } from '@/types/index';
import { link } from 'fs';

/**
 * Parâmetros para listagem de extratos de pontos
 */
export interface PointsExtractListParams extends PointsExtractFilters {
  page?: number;
  per_page?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Interface para criação de ajuste manual
 */
export interface CreateAdjustmentRequest {
  user_id: string;
  points: number;
  description: string;
  reason?: string;
}

/**
 * Interface para estatísticas de extratos
 */
export interface PointsExtractStats {
  totalTransactions: number;
  totalEarned: number;
  totalRedeemed: number;
  totalExpired: number;
  activeUsers: number;
  totalAdjustments: number;
  totalRefunds: number;
}

/**
 * Serviço para gerenciar extratos de pontos
 */
class PointsExtractsService extends BaseApiService {
  private readonly endpoint = '/admin/points-extracts';

  /**
   * Lista todos os extratos de pontos (admin)
   * @param params - Parâmetros de filtro e paginação
   *
   * Nota: não aninhar `params` no objeto; passar plano para evitar
   * `params=[object Object]` na query string.
   */
  async listPointsExtracts(params?: PointsExtractListParams): Promise<PaginatedResponse<PointsExtract>> {
    const response = await this.get<any>(this.endpoint, params);
    return response;
  }

  /**
   * Obtém um extrato específico por ID
   * @param id - ID do extrato
   */
  async getPointsExtract(id: string): Promise<PointsExtract> {
    const response = await this.get<any>(`${this.endpoint}/${id}`);
    return this.mapApiResponseToPointsExtract(response);
  }

  /**
   * Mapeia a resposta da API para a interface PointsExtract
   * @param apiData - Dados da API
   */
  private mapApiResponseToPointsExtract(apiData: any): PointsExtract {
    // Mapear tipo de transação
    const typeMapping: { [key: string]: PointsTransactionType } = {
      'credito': 'earned',
      'debito': 'redeemed',
      'bonus': 'bonus',
      'ajuste': 'adjustment',
      'reembolso': 'refund',
      'expiracao': 'expired'
    };

    // Calcular pontos considerando o tipo de transação
    const valorNumerico = parseFloat(apiData.valor || '0');
    const tipo = apiData.tipo || '';
    let points = valorNumerico;
    
    // Para débitos, manter valor negativo
    if (tipo === 'debito' || tipo === 'expiracao') {
      points = -Math.abs(valorNumerico);
    } else {
      points = Math.abs(valorNumerico);
    }

    return {
      id: apiData.id?.toString() || '',
      userId: apiData.client_id || apiData.usuario_id || '',
      userName: apiData.cliente?.name || apiData.usuario?.name || '',
      userEmail: apiData.cliente?.email || apiData.usuario?.email || '',
      type: typeMapping[apiData.tipo] || 'adjustment',
      points: points,
      description: apiData.description || '',
      reference: apiData.pedido_id || undefined,
      balanceBefore: 0, // Será calculado ou obtido de outra fonte
      balanceAfter: 0,  // Será calculado ou obtido de outra fonte
      expirationDate: apiData.data_expiracao || undefined,
      createdAt: apiData.created_at || apiData.data || '',
      createdBy: undefined,
      // Manter campos originais da API para compatibilidade
      client_id: apiData.client_id,
      valor: apiData.valor,
      data: apiData.data,
      tipo: apiData.tipo,
      origem: apiData.origem,
      valor_referencia: apiData.valor_referencia,
      data_expiracao: apiData.data_expiracao,
      status: apiData.status,
      usuario_id: apiData.usuario_id,
      pedido_id: apiData.pedido_id,
      config: apiData.config,
      ativo: apiData.ativo,
      updated_at: apiData.updated_at,
      deleted_at: apiData.deleted_at,
      cliente: apiData.cliente,
      usuario: apiData.usuario
    };
  }

  /**
   * Obtém estatísticas dos extratos de pontos
   *
   * pt-BR: Permite passar os mesmos filtros da listagem para obter
   * estatísticas filtradas (tipo, período, busca, etc.).
   * en-US: Accepts list filters to return filtered stats
   * (type, date range, search, etc.).
   */
  async getPointsExtractStats(params?: PointsExtractListParams): Promise<PointsExtractStats> {
    const response = await this.get<ApiResponse<PointsExtractStats>>(`${this.endpoint}/stats`, params);
    return response.data;
  }

  /**
   * Cria um ajuste manual de pontos
   * @param data - Dados do ajuste
   */
  async createAdjustment(data: CreateAdjustmentRequest): Promise<PointsExtract> {
    const response = await this.post<ApiResponse<PointsExtract>>(`${this.endpoint}/adjustments`, data);
    return response.data;
  }

  /**
   * Exporta extratos de pontos em formato Blob (CSV/Excel)
   * @param params - Parâmetros de filtro
   * @returns Blob com o arquivo exportado
   *
   * Implementação manual de GET para retornar Blob:
   * - Serializa `params` corretamente na URL
   * - Usa `response.blob()` no lugar de `handleResponse(json)`
   */
  async exportPointsExtracts(params?: PointsExtractListParams): Promise<Blob> {
    const url = this.buildUrlWithParams(`${this.API_BASE_URL}${this.endpoint}/export`, params);
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Falha ao exportar extratos: ${response.status}`);
    }
    return await response.blob();
  }

  /**
   * Obtém extratos de pontos de um usuário específico
   * @param userId - ID do usuário
   * @param params - Parâmetros de filtro e paginação
   *
   * Nota: passar `params` plano para serialização correta na URL.
   */
  async getUserPointsExtracts(userId: string, params?: PointsExtractListParams): Promise<PaginatedResponse<PointsExtract>> {
    const response = await this.get<any>(`/admin/users/${userId}/points-extracts`, params);
    if (response.data && response.data.points && Array.isArray(response.data.points)) {
      response.data.points = response.data.points.map((item: any) => this.mapApiResponseToPointsExtract(item));
    }
    return response;
  }

  /**
   * Obtém saldo de pontos de um usuário
   * @param userId - ID do usuário
   */
  async getUserPointsBalance(userId: string): Promise<{
    user: {
      id: string;
      name: string;
      email: string;
      cpf: string;
    };
    balance: {
      total_points: string;
      total_earned: string;
      total_spent: string;
      total_transactions: number;
      active_points: string;
      expired_points: number;
    };
  }> {
    const response = await this.get<ApiResponse<any>>(`/admin/users/${userId}/points-balance`);
    return response.data;
  }
}

export const pointsExtractsService = new PointsExtractsService();