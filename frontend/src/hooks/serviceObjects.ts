import { ServiceObjectRecord, CreateServiceObjectInput, UpdateServiceObjectInput, ServiceObjectsListParams } from '@/types/serviceObjects';
import { serviceObjectsService } from '@/services/serviceObjectsService';
import { useGenericApi } from './useGenericApi';

/**
 * Função para obter os hooks de objetos de serviço
 */
function getServiceObjectsApi() {
  return useGenericApi<ServiceObjectRecord, CreateServiceObjectInput, UpdateServiceObjectInput, ServiceObjectsListParams>({
    service: serviceObjectsService,
    queryKey: 'serviceObjects',
    entityName: 'Objeto de Serviço'
  });
}

// Exporta os hooks individuais para manter compatibilidade
export function useServiceObjectsList(params?: ServiceObjectsListParams, queryOptions?: any) {
  const api = getServiceObjectsApi();
  return api.useList(params, queryOptions);
}

export function useServiceObject(id: string, queryOptions?: any) {
  const api = getServiceObjectsApi();
  return api.useGetById(id, queryOptions);
}

export function useCreateServiceObject(mutationOptions?: any) {
  const api = getServiceObjectsApi();
  return api.useCreate(mutationOptions);
}

export function useUpdateServiceObject(mutationOptions?: any) {
  const api = getServiceObjectsApi();
  return api.useUpdate(mutationOptions);
}

export function useDeleteServiceObject(mutationOptions?: any) {
  const api = getServiceObjectsApi();
  return api.useDelete(mutationOptions);
}

// Exporta função para uso avançado
export const useServiceObjectsApi = getServiceObjectsApi;