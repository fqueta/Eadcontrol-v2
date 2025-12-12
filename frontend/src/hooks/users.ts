import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services/usersService';
import { 
  UserRecord, 
  CreateUserInput, 
  UpdateUserInput, 
  UsersListParams 
} from '@/types/users';
import { toast } from '@/hooks/use-toast';

const USERS_QUERY_KEY = 'users';

export function useUsersList(params?: UsersListParams) {
  return useQuery({
    queryKey: [USERS_QUERY_KEY, 'list', params],
    queryFn: () => usersService.listUsers(params),
    retry: (failureCount, error: any) => {
      // Don't retry on 403 errors (permission issues)
      if (error?.status === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: [USERS_QUERY_KEY, 'detail', id],
    queryFn: () => usersService.getUser(id),
    enabled: !!id,
    retry: (failureCount, error: any) => {
      if (error?.status === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserInput) => usersService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      toast({
        title: "Usuário criado",
        description: "O usuário foi criado com sucesso.",
      });
    },
    onError: (error: Error & { status?: number }) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) => 
      usersService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      toast({
        title: "Usuário atualizado",
        description: "O usuário foi atualizado com sucesso.",
      });
    },
    onError: (error: Error & { status?: number }) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      toast({
        title: "Usuário deletado",
        description: "O usuário foi deletado com sucesso.",
      });
    },
    onError: (error: Error & { status?: number }) => {
      toast({
        title: "Erro ao deletar usuário",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para buscar propriedades dos usuários
 */
export function useUsersPropertys() {
  return useQuery({
    queryKey: [USERS_QUERY_KEY, 'propertys'],
    queryFn: () => usersService.getUsersPropertys(),
    retry: (failureCount, error: any) => {
      // Don't retry on 403 errors (permission issues)
      if (error?.status === 403) return false;
      return failureCount < 2;
    },
  });
}