import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsService } from '@/services/permissionsService';
import { 
  PermissionRecord, 
  CreatePermissionInput, 
  UpdatePermissionInput, 
  PermissionsListParams,
  MenuPermissionRow,
  MenuPermissionUpsert
} from '@/types/permissions';
import { useToast } from '@/hooks/use-toast';

export function usePermissionsList(params?: PermissionsListParams) {
  return useQuery({
    queryKey: ['permissions', 'list', params],
    queryFn: () => permissionsService.listPermissions(params),
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function usePermission(id: string) {
  return useQuery({
    queryKey: ['permissions', 'detail', id],
    queryFn: () => permissionsService.getPermission(id),
    enabled: !!id,
  });
}

export function useCreatePermission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreatePermissionInput) => permissionsService.createPermission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      toast({
        title: "Sucesso",
        description: "Permissão criada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar permissão",
        variant: "destructive",
      });
    },
  });
}

export function useUpdatePermission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePermissionInput }) => 
      permissionsService.updatePermission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      toast({
        title: "Sucesso",
        description: "Permissão atualizada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar permissão",
        variant: "destructive",
      });
    },
  });
}

export function useDeletePermission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => permissionsService.deletePermission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      toast({
        title: "Sucesso",
        description: "Permissão excluída com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir permissão",
        variant: "destructive",
      });
    },
  });
}

export function useMenuPermissions(permissionId: string) {
  return useQuery({
    queryKey: ['permissions', 'menu', permissionId],
    queryFn: () => permissionsService.getMenuPermissions(permissionId),
    enabled: !!permissionId,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateMenuPermissions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: MenuPermissionUpsert) => permissionsService.updateMenuPermissions(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions', 'menu'] });
      toast({
        title: "Sucesso",
        description: "Permissões de acesso salvas com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro", 
        description: error.message || "Erro ao salvar permissões de acesso",
        variant: "destructive",
      });
    },
  });
}