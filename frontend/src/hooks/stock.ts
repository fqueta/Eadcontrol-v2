import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGenericApi } from './useGenericApi';
import { stockService } from '@/services/stockService';
import type { StockEntry, StockEntryPayload, StockMovement, StockSummaryItem } from '@/types/stock';
import type { PaginatedResponse } from '@/types/index';

/**
 * Hooks de estoque (auxílio logístico).
 * pt-BR: Resumo de saldo, lançamentos e livro de movimentações.
 */

export function useStockSummary(params?: { search?: string; only_low?: boolean }) {
  return useQuery({
    queryKey: ['stock-summary', params?.search, params?.only_low],
    queryFn: () => stockService.summary(params),
    staleTime: 30 * 1000,
  });
}

export function useStockEntries(params?: Record<string, any>) {
  const api = useGenericApi<StockEntry, StockEntryPayload, StockEntryPayload, Record<string, any>>({
    service: stockService,
    queryKey: 'stock-entries',
    entityName: 'Lançamento de estoque',
  });
  return api.useList(params);
}

export function useStockEntry(id: string, queryOptions?: any) {
  const api = useGenericApi<StockEntry, StockEntryPayload, StockEntryPayload, Record<string, any>>({
    service: stockService,
    queryKey: 'stock-entries',
    entityName: 'Lançamento de estoque',
  });
  return api.useGetById(id, queryOptions);
}

export function useCreateStockEntry(mutationOptions?: any) {
  const api = useGenericApi<StockEntry, StockEntryPayload, StockEntryPayload, Record<string, any>>({
    service: stockService,
    queryKey: 'stock-entries',
    entityName: 'Lançamento de estoque',
  });
  return api.useCreate(mutationOptions);
}

export function useStockMovements(params?: {
  product_id?: number;
  type?: 'entrada' | 'saida';
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['stock-movements', params],
    queryFn: () => stockService.movements(params),
    staleTime: 30 * 1000,
  });
}

export function useProductBalance(productId?: number) {
  return useQuery({
    queryKey: ['stock-balance', productId],
    queryFn: () => stockService.balance(productId as number),
    enabled: !!productId,
    staleTime: 30 * 1000,
  });
}

export function useCancelStockEntry(mutationOptions?: any) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => stockService.cancelEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    ...mutationOptions,
  });
}

export type { StockEntry, StockSummaryItem, StockMovement };
