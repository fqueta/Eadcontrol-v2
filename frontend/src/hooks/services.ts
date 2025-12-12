import { Service, CreateServiceInput, UpdateServiceInput, ServiceFilters } from '@/types/services';
import { servicesService, ServiceListParams } from '@/services/servicesService';
import { useGenericApi } from './useGenericApi';
import { useQuery } from '@tanstack/react-query';

/**
 * Função para obter os hooks de serviços
 */
function getServicesApi() {
  return useGenericApi<Service, CreateServiceInput, UpdateServiceInput, ServiceListParams>({
    service: servicesService,
    queryKey: 'services',
    entityName: 'Serviço'
  });
}

// Exporta os hooks individuais para manter compatibilidade
export function useServicesList(params?: ServiceListParams, queryOptions?: any) {
  const api = getServicesApi();
  // Configurações específicas para prevenir loops infinitos em listas vazias
  const safeQueryOptions = {
    retry: (failureCount: number, error: any) => {
      // Não tenta novamente para listas vazias (404) ou erros de cliente
      if (error?.status === 404 || (error?.status >= 400 && error?.status < 500)) {
        return false;
      }
      return failureCount < 1;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos para listas
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    ...queryOptions
  };
  return api.useList(params, safeQueryOptions);
}

export function useService(id: string, queryOptions?: any) {
  const api = getServicesApi();
  return api.useGetById(id, queryOptions);
}

export function useCreateService(mutationOptions?: any) {
  const api = getServicesApi();
  return api.useCreate(mutationOptions);
}

export function useUpdateService(mutationOptions?: any) {
  const api = getServicesApi();
  return api.useUpdate(mutationOptions);
}

export function useDeleteService(mutationOptions?: any) {
  const api = getServicesApi();
  return api.useDelete(mutationOptions);
}

// Hook para categorias de serviços
export function useServiceCategories() {
  return useQuery({
    queryKey: ['service-categories'],
    queryFn: () => servicesService.getCategories(),
    staleTime: 10 * 60 * 1000, // 10 minutos
    retry: (failureCount: number, error: any) => {
      // Não tenta novamente para erros de cliente
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 1;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// Hook para unidades de tempo de serviços
export function useServiceUnits() {
  return useQuery({
    queryKey: ['service-units'],
    queryFn: () => servicesService.getUnits(),
    staleTime: 10 * 60 * 1000, // 10 minutos
    retry: (failureCount: number, error: any) => {
      // Não tenta novamente para erros de cliente
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 1;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Hook principal para API de serviços
 */
export const useServicesApi = getServicesApi;