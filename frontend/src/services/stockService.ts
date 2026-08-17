import { GenericApiService } from './GenericApiService';
import type {
  StockEntry,
  StockEntryPayload,
  StockMovement,
  StockSummaryItem,
} from '@/types/stock';
import type { PaginatedResponse } from '@/types/index';

/**
 * StockService — controle de estoque (auxílio logístico).
 * pt-BR: Encapsula lançamentos, livro de movimentações e resumo de saldo.
 * en-US: Encapsulates stock entries, movement ledger and balance summary.
 */
class StockService extends GenericApiService<StockEntry, StockEntryPayload, StockEntryPayload> {
  constructor() {
    super('/stock-entries');
  }

  /** Resumo de estoque por produto */
  async summary(params?: { search?: string; only_low?: boolean }): Promise<StockSummaryItem[]> {
    const response = await this.get<{ data: StockSummaryItem[] }>('/stock/summary', params);
    return response?.data ?? [];
  }

  /** Livro de movimentações */
  async movements(params?: {
    product_id?: number;
    type?: 'entrada' | 'saida';
    date_from?: string;
    date_to?: string;
    search?: string;
    limit?: number;
  }): Promise<PaginatedResponse<StockMovement>> {
    const response = await this.get<PaginatedResponse<StockMovement>>('/stock-movements', params);
    return response;
  }

  /** Saldo e custo médio de um produto */
  async balance(productId: number): Promise<{ balance: number; average_cost: number; total_cost: number }> {
    const response = await this.get<{ data: { balance: number; average_cost: number; total_cost: number } }>(
      `/stock/balance/${productId}`
    );
    return response?.data ?? { balance: 0, average_cost: 0, total_cost: 0 };
  }

  /** Cancela (estorna) um lançamento */
  async cancelEntry(id: number | string): Promise<{ message: string }> {
    return this.post<{ message: string }>(`/stock-entries/${id}/cancel`);
  }
}

/** Instância padrão exportada */
export const stockService = new StockService();