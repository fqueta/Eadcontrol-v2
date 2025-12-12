import { useGenericApi } from '@/hooks/useGenericApi';
import { enrollmentSituationsService } from '@/services/enrollmentSituationsService';
import {
  EnrollmentSituation,
  EnrollmentSituationCreatePayload,
  EnrollmentSituationUpdatePayload,
  EnrollmentSituationListParams,
} from '@/types/enrollmentSituation';

/**
 * useEnrollmentSituationsApi
 * pt-BR: Hook factory para CRUD de Situações de Matrícula com React Query.
 * en-US: Hook factory for Enrollment Situations CRUD with React Query.
 */
export function useEnrollmentSituationsApi() {
  return useGenericApi<
    EnrollmentSituation,
    EnrollmentSituationCreatePayload,
    EnrollmentSituationUpdatePayload,
    EnrollmentSituationListParams
  >({
    service: enrollmentSituationsService,
    queryKey: 'enrollment_situations',
    entityName: 'Situação de matrícula',
  });
}

/**
 * useEnrollmentSituationsList
 * pt-BR: Lista situações com paginação e busca.
 * en-US: Lists situations with pagination and search.
 */
export function useEnrollmentSituationsList(
  params?: EnrollmentSituationListParams
) {
  const { useList } = useEnrollmentSituationsApi();
  return useList(params);
}

/**
 * useCreateEnrollmentSituation
 * pt-BR: Cria uma nova situação.
 * en-US: Creates a new situation.
 */
export function useCreateEnrollmentSituation() {
  const { useCreate } = useEnrollmentSituationsApi();
  return useCreate();
}

/**
 * useUpdateEnrollmentSituation
 * pt-BR: Atualiza uma situação existente.
 * en-US: Updates an existing situation.
 */
export function useUpdateEnrollmentSituation() {
  const { useUpdate } = useEnrollmentSituationsApi();
  return useUpdate();
}

/**
 * useDeleteEnrollmentSituation
 * pt-BR: Exclui uma situação por ID.
 * en-US: Deletes a situation by ID.
 */
export function useDeleteEnrollmentSituation() {
  const { useDelete } = useEnrollmentSituationsApi();
  return useDelete();
}