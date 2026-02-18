import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCredentialsService } from '@/services/apiCredentialsService';
import { ApiCredential } from '@/types';
import { toast } from '@/hooks/use-toast';

const API_CREDENTIALS_QUERY_KEY = 'api_credentials';

export function useApiCredentialsList(params?: any) {
  return useQuery({
    queryKey: [API_CREDENTIALS_QUERY_KEY, 'list', params],
    queryFn: () => apiCredentialsService.list(params),
    retry: (failureCount, error: any) => {
      if (error?.status === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useApiCredentialsTrash(params?: any) {
  return useQuery({
    queryKey: [API_CREDENTIALS_QUERY_KEY, 'trash', params],
    queryFn: () => apiCredentialsService.trash(params),
    retry: (failureCount, error: any) => {
        if (error?.status === 403) return false;
        return failureCount < 2;
    },
  });
}

export function useApiCredential(id: number) {
  return useQuery({
    queryKey: [API_CREDENTIALS_QUERY_KEY, 'detail', id],
    queryFn: () => apiCredentialsService.getOne(id),
    enabled: !!id,
    retry: (failureCount, error: any) => {
      if (error?.status === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useCreateApiCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => apiCredentialsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_CREDENTIALS_QUERY_KEY] });
      toast({
        title: "Credencial criada",
        description: "A credencial foi criada com sucesso.",
      });
    },
    onError: (error: Error & { status?: number }) => {
      toast({
        title: "Erro ao criar credencial",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateApiCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiCredentialsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_CREDENTIALS_QUERY_KEY] });
      toast({
        title: "Credencial atualizada",
        description: "A credencial foi atualizada com sucesso.",
      });
    },
    onError: (error: Error & { status?: number }) => {
      toast({
        title: "Erro ao atualizar credencial",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteApiCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiCredentialsService.destroy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_CREDENTIALS_QUERY_KEY] });
      toast({
        title: "Credencial removida",
        description: "A credencial foi movida para a lixeira.",
      });
    },
    onError: (error: Error & { status?: number }) => {
      toast({
        title: "Erro ao remover credencial",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });
}

export function useRestoreApiCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiCredentialsService.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_CREDENTIALS_QUERY_KEY] });
      toast({
        title: "Credencial restaurada",
        description: "A credencial foi restaurada com sucesso.",
      });
    },
    onError: (error: Error & { status?: number }) => {
      toast({
        title: "Erro ao restaurar credencial",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
}

export function useForceDeleteApiCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiCredentialsService.forceDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_CREDENTIALS_QUERY_KEY] });
      toast({
        title: "Credencial excluída permanentemente",
        description: "A credencial foi excluída permanentemente.",
      });
    },
    onError: (error: Error & { status?: number }) => {
      toast({
        title: "Erro ao excluir credencial",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
}
