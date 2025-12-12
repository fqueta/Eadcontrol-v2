import { AircraftRecord, CreateAircraftInput, UpdateAircraftInput, AircraftListParams } from '@/types/aircraft';
import { aircraftService } from '@/services/aircraftService';
import { useGenericApi } from './useGenericApi';

/**
 * Função para obter os hooks de aeronaves
 */
function getAircraftApi() {
  return useGenericApi<AircraftRecord, CreateAircraftInput, UpdateAircraftInput, AircraftListParams>({
    service: aircraftService,
    queryKey: 'aircraft',
    entityName: 'Aeronave'
  });
}

// Exporta os hooks individuais para manter compatibilidade
export function useAircraftList(params?: AircraftListParams, queryOptions?: any) {
  const api = getAircraftApi();
  return api.useList(params, queryOptions);
}

export function useAircraft(id: string, queryOptions?: any) {
  const api = getAircraftApi();
  return api.useGetById(id, queryOptions);
}

export function useCreateAircraft(mutationOptions?: any) {
  const api = getAircraftApi();
  return api.useCreate(mutationOptions);
}

export function useUpdateAircraft(mutationOptions?: any) {
  const api = getAircraftApi();
  return api.useUpdate(mutationOptions);
}

export function useDeleteAircraft(mutationOptions?: any) {
  const api = getAircraftApi();
  return api.useDelete(mutationOptions);
}

// Exporta função para uso avançado
export const useAircraftApi = getAircraftApi;