import { useGenericApi } from '@/hooks/useGenericApi';
import { PaginatedResponse } from '@/types/index';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  FunnelRecord,
  StageRecord,
  CreateFunnelInput,
  UpdateFunnelInput,
  CreateStageInput,
  UpdateStageInput,
} from '@/types/pipelines';
import { funnelsService, FunnelListParams, StageListParams } from '@/services/funnelsService';

/**
 * Hooks de Funis e Etapas
 * pt-BR: Fornece hooks CRUD para funis e operações para etapas.
 * en-US: Provides CRUD hooks for funnels and operations for stages.
 */

function getFunnelsApi() {
  return useGenericApi<FunnelRecord, CreateFunnelInput, UpdateFunnelInput, FunnelListParams>({
    service: funnelsService,
    queryKey: 'funnels',
    entityName: 'Funil'
  });
}

// Funis: hooks genéricos
export function useFunnelsList(params?: FunnelListParams, queryOptions?: any) {
  const api = getFunnelsApi();
  return api.useList(params, queryOptions);
}

export function useFunnel(id: string, queryOptions?: any) {
  const api = getFunnelsApi();
  return api.useGetById(id, queryOptions);
}

export function useCreateFunnel(mutationOptions?: any) {
  const api = getFunnelsApi();
  return api.useCreate(mutationOptions);
}

export function useUpdateFunnel(mutationOptions?: any) {
  const api = getFunnelsApi();
  return api.useUpdate(mutationOptions);
}

export function useDeleteFunnel(mutationOptions?: any) {
  const api = getFunnelsApi();
  return api.useDelete(mutationOptions);
}

// Etapas: hooks específicos (nested)
/**
 * useStagesList
 * pt-BR: Lista etapas de um funil com opções seguras para evitar refetch em foco/reconexão.
 * en-US: Lists stages for a funnel with safe options to avoid refetch on focus/reconnect.
 */
export function useStagesList(funnelId: string, params?: StageListParams, queryOptions?: any) {
  const safeQueryOptions = {
    staleTime: 5 * 60 * 1000, // 5min cache
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount: number, error: any) => {
      // Avoid retries for client-side errors
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 1;
    },
    enabled: !!funnelId,
    ...queryOptions,
  };
  return useQuery({
    queryKey: ['funnels', funnelId, 'stages', params || {}],
    queryFn: () => funnelsService.listStages(funnelId, params),
    ...safeQueryOptions,
  });
}

/**
 * useCreateStage
 * pt-BR: Cria etapa e atualiza cache sem forçar refetch global.
 * en-US: Creates stage and updates cache without forcing global refetch.
 */
export function useCreateStage(funnelId: string, mutationOptions?: any) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStageInput) => funnelsService.createStage(funnelId, data),
    onSuccess: (data: StageRecord) => {
      // Atualiza todas as queries de lista de etapas para este funil
      const queries = queryClient.getQueriesData<PaginatedResponse<StageRecord>>({ queryKey: ['funnels', funnelId, 'stages'] });
      queries.forEach(([key, old]) => {
        if (!old) return;
        const next = {
          ...old,
          data: [data, ...old.data],
          meta: {
            ...old.meta,
            total: (old.meta?.total ?? old.data.length) + 1,
          },
        } as any;
        queryClient.setQueryData(key, next);
      });
      // pt-BR: Invalida queries para garantir que seções com parâmetros diferentes (ex.: per_page) sejam atualizadas.
      // en-US: Invalidate queries to ensure sections with different params (e.g., per_page) refresh correctly.
      queryClient.invalidateQueries({ queryKey: ['funnels', funnelId, 'stages'] });
      toast.success('Etapa criada com sucesso!');
      mutationOptions?.onSuccess?.(data);
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar etapa: ${error?.message || 'falha'}`);
      mutationOptions?.onError?.(error);
    }
  });
}

/**
 * useUpdateStage
 * pt-BR: Atualiza etapa e sincroniza cache, evitando refetch redundante.
 * en-US: Updates stage and syncs cache, avoiding redundant refetch.
 */
export function useUpdateStage(funnelId: string, mutationOptions?: any) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stageId, data }: { stageId: string; data: UpdateStageInput }) => 
      funnelsService.updateStage(funnelId, stageId, data),
    onSuccess: (data: StageRecord) => {
      const queries = queryClient.getQueriesData<PaginatedResponse<StageRecord>>({ queryKey: ['funnels', funnelId, 'stages'] });
      queries.forEach(([key, old]) => {
        if (!old) return;
        const next = {
          ...old,
          data: old.data.map(s => (s.id === data.id ? { ...s, ...data } : s)),
        } as any;
        queryClient.setQueryData(key, next);
      });
      toast.success('Etapa atualizada com sucesso!');
      mutationOptions?.onSuccess?.(data);
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar etapa: ${error?.message || 'falha'}`);
      mutationOptions?.onError?.(error);
    }
  });
}

/**
 * useDeleteStage
 * pt-BR: Exclui etapa e remove do cache sem invalidar queries.
 * en-US: Deletes stage and removes from cache without invalidating queries.
 */
export function useDeleteStage(funnelId: string, mutationOptions?: any) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stageId: string) => funnelsService.deleteStage(funnelId, stageId),
    onSuccess: (_data, stageId: string) => {
      const queries = queryClient.getQueriesData<PaginatedResponse<StageRecord>>({ queryKey: ['funnels', funnelId, 'stages'] });
      queries.forEach(([key, old]) => {
        if (!old) return;
        const next = { ...old, data: old.data.filter(s => s.id !== stageId) } as any;
        queryClient.setQueryData(key, next);
      });
      toast.success('Etapa excluída com sucesso!');
      mutationOptions?.onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir etapa: ${error?.message || 'falha'}`);
      mutationOptions?.onError?.(error);
    }
  });
}

// Exporta função para uso avançado
export const useFunnelsApi = getFunnelsApi;