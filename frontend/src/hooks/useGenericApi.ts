import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PaginatedResponse } from '@/types/index';

/**
 * GenericApiService interface
 * pt-BR: Interface de serviço genérico usada pelos hooks. Importante: o método de deleção
 *         deve ser `deleteById(id)` para evitar colisão com o método protegido `delete(endpoint)`
 *         da classe base e garantir que o endpoint correto (`/<resource>/{id}`) seja chamado.
 * en-US: Generic service interface used by hooks. Important: the deletion method must be
 *         `deleteById(id)` to avoid collision with the protected `delete(endpoint)` method
 *         from the base class and ensure the correct endpoint (`/<resource>/{id}`) is called.
 */
export interface GenericApiService<T, CreateInput, UpdateInput, ListParams = any> {
  list(params?: ListParams): Promise<PaginatedResponse<T>>;
  getById(id: string): Promise<T>;
  create(data: CreateInput): Promise<T>;
  update(id: string, data: UpdateInput): Promise<T>;
  /**
   * pt-BR: Preferencial — evita colisão com método protegido `delete(endpoint)`.
   * en-US: Preferred — avoids collision with protected `delete(endpoint)`.
   */
  deleteById?: (id: string) => Promise<void>;
  /**
   * pt-BR: Fallback — alguns serviços implementam `delete(id)` diretamente.
   * en-US: Fallback — some services implement `delete(id)` directly.
   */
  delete?: (id: string) => Promise<void>;
}

export interface UseGenericApiOptions<T, CreateInput, UpdateInput, ListParams = any> {
  service: GenericApiService<T, CreateInput, UpdateInput, ListParams>;
  queryKey: string;
  entityName: string; // Para mensagens de toast (ex: "Cliente", "Objeto de Serviço")
  /**
   * suppressToasts
   * pt-BR: Suprime toasts internos do hook, permitindo que o chamador trate mensagens.
   * en-US: Suppresses internal hook toasts, letting the caller handle messages.
   */
  suppressToasts?: boolean;
}

/**
 * Hook genérico para operações CRUD com React Query
 * @param options - Configurações do hook
 */
export function useGenericApi<T, CreateInput, UpdateInput, ListParams = any>(
  options: UseGenericApiOptions<T, CreateInput, UpdateInput, ListParams>
) {
  const { service, queryKey, entityName, suppressToasts = false } = options;
  const queryClient = useQueryClient();

  /**
   * Hook para listar entidades
   * @param params - Parâmetros de listagem
   * @param queryOptions - Opções do useQuery
   */
  const useList = (
    params?: ListParams,
    queryOptions?: Omit<UseQueryOptions<PaginatedResponse<T>>, 'queryKey' | 'queryFn'>
  ) => {
    return useQuery({
      queryKey: [queryKey, 'list', params],
      queryFn: () => service.list(params),
      ...queryOptions,
    });
  };

  /**
   * Hook para obter entidade por ID
   * @param id - ID da entidade
   * @param queryOptions - Opções do useQuery
   */
  const useGetById = (
    id: string,
    queryOptions?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
  ) => {
    return useQuery({
      queryKey: [queryKey, 'detail', id],
      queryFn: () => service.getById(id),
      enabled: !!id,
      ...queryOptions,
    });
  };

  /**
   * Hook para criar entidade
   * @param mutationOptions - Opções do useMutation
   */
  const useCreate = (
    mutationOptions?: UseMutationOptions<T, Error, CreateInput>
  ) => {
    return useMutation({
      mutationFn: (data: CreateInput) => service.create(data),
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        if (!suppressToasts) toast.success(`${entityName} criado com sucesso!`);
        mutationOptions?.onSuccess?.(data, data as any, undefined);
      },
      onError: (error) => {
        if (!suppressToasts) toast.error(`Erro ao criar ${entityName.toLowerCase()}: ${error.message}`);
        mutationOptions?.onError?.(error, error as any, undefined);
      },
      ...mutationOptions,
    });
  };

  /**
   * Hook para atualizar entidade
   * @param mutationOptions - Opções do useMutation
   */
  const useUpdate = (
    mutationOptions?: UseMutationOptions<T, Error, { id: string; data: UpdateInput }>
  ) => {
    return useMutation({
      mutationFn: ({ id, data }: { id: string; data: UpdateInput }) => service.update(id, data),
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        queryClient.invalidateQueries({ queryKey: [queryKey, 'detail', variables.id] });
        if (!suppressToasts) toast.success(`${entityName} atualizado com sucesso!`);
        mutationOptions?.onSuccess?.(data, variables, undefined);
      },
      onError: (error) => {
        if (!suppressToasts) toast.error(`Erro ao atualizar ${entityName.toLowerCase()}: ${error.message}`);
        mutationOptions?.onError?.(error, error as any, undefined);
      },
      ...mutationOptions,
    });
  };

  /**
   * Hook para deletar entidade
   * pt-BR: Usa `service.deleteById(id)` para evitar chamada ao método interno protegido `delete(endpoint)`.
   * en-US: Uses `service.deleteById(id)` to avoid calling the internal protected `delete(endpoint)` method.
   * @param mutationOptions - Opções do useMutation
   */
  const useDelete = (
    mutationOptions?: UseMutationOptions<void, Error, string>
  ) => {
    return useMutation({
      /**
       * pt-BR: Usa `deleteById` se disponível; caso contrário, usa `delete`.
       * en-US: Uses `deleteById` if available; otherwise falls back to `delete`.
       */
      mutationFn: (id: string) =>
        service.deleteById
          ? service.deleteById(id)
          : (service.delete ? service.delete(id) : Promise.reject(new Error('Método de deleção não disponível'))),
      onSuccess: (data, id) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        queryClient.removeQueries({ queryKey: [queryKey, 'detail', id] });
        if (!suppressToasts) toast.success(`${entityName} excluído com sucesso!`);
        mutationOptions?.onSuccess?.(data, id, undefined);
      },
      onError: (error) => {
        if (!suppressToasts) toast.error(`Erro ao excluir ${entityName.toLowerCase()}: ${error.message}`);
        mutationOptions?.onError?.(error, error as any, undefined);
      },
      ...mutationOptions,
    });
  };

  return {
    useList,
    useGetById,
    useCreate,
    useUpdate,
    useDelete,
  };
}