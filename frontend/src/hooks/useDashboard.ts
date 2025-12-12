import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardService, DashboardData, ClientActivity, ClientRegistrationData, PendingPreRegistration } from '@/services/dashboardService';

/**
 * Hook para buscar atividades recentes de clientes
 * @param limit - Número máximo de atividades a retornar
 * @param queryOptions - Opções adicionais da query
 */
export function useRecentActivities(limit: number = 10, queryOptions?: any) {
  return useQuery({
    queryKey: ['dashboard', 'recent-activities', limit],
    queryFn: () => dashboardService.getRecentActivities(limit),
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 30 * 1000, // Atualiza a cada 30 segundos
    ...queryOptions,
  });
}

/**
 * Hook para buscar dados de cadastro de clientes por período
 * @param startDate - Data de início
 * @param endDate - Data de fim
 * @param queryOptions - Opções adicionais da query
 */
export function useRegistrationData(startDate?: string, endDate?: string, queryOptions?: any) {
  return useQuery({
    queryKey: ['dashboard', 'registration-data', startDate, endDate],
    queryFn: () => dashboardService.getRegistrationData(startDate, endDate),
    staleTime: 10 * 60 * 1000, // 10 minutos
    refetchInterval: 60 * 1000, // Atualiza a cada 1 minuto
    ...queryOptions,
  });
}

/**
 * Hook para buscar pré-registros pendentes
 * @param limit - Número máximo de pré-registros a retornar
 * @param queryOptions - Opções adicionais da query
 */
export function usePendingPreRegistrations(limit: number = 10, queryOptions?: any) {
  // console.log('usePendingPreRegistrations 109:', dashboardService.getPendingPreRegistrations(limit));
  return useQuery({
    queryKey: ['dashboard', 'pending-pre-registrations', limit],
    queryFn: () => dashboardService.getPendingPreRegistrations(limit),
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 30 * 1000, // Atualiza a cada 30 segundos
    ...queryOptions,
  });
}

/**
 * Hook para buscar todos os dados do dashboard de uma vez
 * @param queryOptions - Opções adicionais da query
 */
export function useDashboardData(queryOptions?: any) {
  return useQuery({
    queryKey: ['dashboard', 'all-data'],
    queryFn: () => dashboardService.getDashboardData(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 30 * 1000, // Atualiza a cada 30 segundos
    ...queryOptions,
  });
}

/**
 * Hook para invalidar cache do dashboard
 * Útil para forçar atualização após operações CRUD
 */
export function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

// Re-exporta tipos para facilitar uso
export type {
  DashboardData,
  ClientActivity,
  ClientRegistrationData,
  PendingPreRegistration
} from '@/services/dashboardService';