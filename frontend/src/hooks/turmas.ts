import { useGenericApi } from './useGenericApi';
import { turmasService } from '@/services/turmasService';
import { TurmaRecord, TurmaPayload, TurmasListParams } from '@/types/turmas';

/**
 * getTurmasApi
 * pt-BR: Configura e retorna o wrapper de hooks para Turmas.
 * en-US: Configures and returns the hooks wrapper for Turmas.
 */
function getTurmasApi() {
  return useGenericApi<TurmaRecord, TurmaPayload, TurmaPayload, TurmasListParams>({
    service: turmasService,
    queryKey: 'turmas',
    entityName: 'Turma',
  });
}

/**
 * useTurmasList
 * pt-BR: Lista turmas com paginação/filtros.
 * en-US: Lists classes with pagination/filters.
 */
export function useTurmasList(params?: TurmasListParams, queryOptions?: any) {
  const api = getTurmasApi();
  return api.useList(params, queryOptions);
}

/**
 * useTurma
 * pt-BR: Obtém turma por ID.
 * en-US: Fetches a class by ID.
 */
export function useTurma(id: string | number, queryOptions?: any) {
  const api = getTurmasApi();
  return api.useGetById(String(id), queryOptions);
}

/**
 * useCreateTurma
 * pt-BR: Mutation para criar turma.
 * en-US: Mutation to create a class.
 */
export function useCreateTurma(mutationOptions?: any) {
  const api = getTurmasApi();
  return api.useCreate(mutationOptions);
}

/**
 * useUpdateTurma
 * pt-BR: Mutation para atualizar turma.
 * en-US: Mutation to update a class.
 */
export function useUpdateTurma(mutationOptions?: any) {
  const api = getTurmasApi();
  return api.useUpdate(mutationOptions);
}

/**
 * useDeleteTurma
 * pt-BR: Mutation para excluir turma.
 * en-US: Mutation to delete a class.
 */
export function useDeleteTurma(mutationOptions?: any) {
  const api = getTurmasApi();
  return api.useDelete(mutationOptions);
}