import { BaseApiService } from './BaseApiService';
import { ApiResponse } from '@/types/index';

/**
 * Interface para saldo de pontos do usuário
 */
export interface UserPointsBalance {
  total_points: string;
  total_earned: string;
  total_spent: string;
  total_transactions: number;
  active_points: string;
  expired_points: number;
}

/**
 * Interface para extrato de pontos do usuário
 */
export interface UserPointsExtract {
  id: string;
  type: 'earned' | 'redeemed' | 'bonus' | 'adjustment' | 'refund' | 'expired';
  points: number;
  description: string;
  reference?: string;
  createdAt: string;
  expirationDate?: string;
}

/**
 * Parâmetros para listagem de extratos
 */
export interface UserPointsExtractParams {
  page?: number;
  per_page?: number;
  start_date?: string;
  end_date?: string;
  type?: string;
}

/**
 * Serviço para gerenciar pontos do usuário logado
 */
class UserPointsService extends BaseApiService {
  private readonly endpoint = '/user/points';

  /**
   * Obtém o saldo atual de pontos do usuário logado
   */
  async getCurrentUserPointsBalance(): Promise<UserPointsBalance> {
    const response = await this.get<ApiResponse<UserPointsBalance>>(`${this.endpoint}/balance`);
    return response.data;
  }

  /**
   * Obtém o extrato de pontos do usuário logado
   * @param params - Parâmetros de filtro e paginação
   * @returns Lista paginada do extrato do usuário
   *
   * Nota: passar `params` plano para serialização correta.
   */
  async getCurrentUserPointsExtracts(params?: UserPointsExtractParams): Promise<{
    data: UserPointsExtract[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  }> {
    const response = await this.get<any>(`${this.endpoint}/extracts`, params);
    return response;
  }

  /**
   * Obtém estatísticas resumidas dos pontos do usuário
   */
  async getCurrentUserPointsStats(): Promise<{
    balance: UserPointsBalance;
    recentTransactions: UserPointsExtract[];
  }> {
    const response = await this.get<ApiResponse<any>>(`${this.endpoint}/stats`);
    return response.data;
  }
}

export const userPointsService = new UserPointsService();