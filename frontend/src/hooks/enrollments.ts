import { EnrollmentRecord, CreateEnrollmentInput, UpdateEnrollmentInput, EnrollmentsListParams } from '@/types/enrollments';
import { enrollmentsService } from '@/services/enrollmentsService';
import { useGenericApi } from './useGenericApi';

/**
 * getEnrollmentsApi
 * pt-BR: Fornece hooks genéricos para CRUD de matrículas via React Query.
 * en-US: Provides generic CRUD hooks for enrollments via React Query.
 */
function getEnrollmentsApi() {
  return useGenericApi<EnrollmentRecord, CreateEnrollmentInput, UpdateEnrollmentInput, EnrollmentsListParams>({
    service: enrollmentsService,
    queryKey: 'enrollments',
    entityName: 'Matrícula',
    suppressToasts: true,
  });
}

/**
 * useEnrollmentsList
 * pt-BR: Lista de matrículas com suporte a paginação e filtros.
 * en-US: Enrollment list with pagination and filters.
 */
export function useEnrollmentsList(params?: EnrollmentsListParams, queryOptions?: any) {
  const api = getEnrollmentsApi();
  return api.useList(params, queryOptions);
}

export function useEnrollment(id: string, queryOptions?: any) {
  const api = getEnrollmentsApi();
  return api.useGetById(id, queryOptions);
}

export function useCreateEnrollment(mutationOptions?: any) {
  const api = getEnrollmentsApi();
  return api.useCreate(mutationOptions);
}

export function useUpdateEnrollment(mutationOptions?: any) {
  const api = getEnrollmentsApi();
  return api.useUpdate(mutationOptions);
}

export function useDeleteEnrollment(mutationOptions?: any) {
  const api = getEnrollmentsApi();
  return api.useDelete(mutationOptions);
}

export const useEnrollmentsApi = getEnrollmentsApi;