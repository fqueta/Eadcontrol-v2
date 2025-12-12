import { 
  PartnerRecord, 
  CreatePartnerInput, 
  UpdatePartnerInput, 
  PartnersListParams 
} from '@/types/partners';
import { useGenericApi } from '@/hooks/useGenericApi';
import { partnersService } from '@/services/partnersService';

/**
 * Função que retorna hooks genéricos para API de parceiros
 * Utiliza o padrão estabelecido para reutilização de código
 */
function getPartnersApi() {
  return useGenericApi<PartnerRecord, CreatePartnerInput, UpdatePartnerInput, PartnersListParams>({
    service: partnersService,
    queryKey: 'partners',
    entityName: 'Parceiro'
  });
}

// Exporta os hooks individuais para manter compatibilidade
export function usePartnersList(params?: PartnersListParams, queryOptions?: any) {
  const api = getPartnersApi();
  return api.useList(params, queryOptions);
}

export function usePartner(id: string, queryOptions?: any) {
  const api = getPartnersApi();
  return api.useGetById(id, queryOptions);
}

export function useCreatePartner(mutationOptions?: any) {
  const api = getPartnersApi();
  return api.useCreate(mutationOptions);
}

export function useUpdatePartner(mutationOptions?: any) {
  const api = getPartnersApi();
  return api.useUpdate(mutationOptions);
}

export function useDeletePartner(mutationOptions?: any) {
  const api = getPartnersApi();
  return api.useDelete(mutationOptions);
}

/**
 * Hook completo da API de parceiros para uso avançado
 */
export const usePartnersApi = getPartnersApi;