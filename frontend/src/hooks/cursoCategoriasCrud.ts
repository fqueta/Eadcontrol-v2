import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cursoCategoriasService, CursoCategoriaRecord, CursoCategoriaPayload } from '@/services/cursoCategoriasService';
import { toast } from '@/hooks/use-toast';

const QUERY_KEYS = {
  list: 'cursoCategorias',
} as const;

export function useCursoCategoriasList(filters?: any) {
  return useQuery({
    queryKey: [QUERY_KEYS.list, filters],
    queryFn: () => cursoCategoriasService.listCategorias(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCursoCategoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CursoCategoriaPayload) => cursoCategoriasService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.list] });
      toast({ title: 'Sucesso', description: 'Categoria criada com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message || 'Erro ao criar categoria', variant: 'destructive' });
    },
  });
}

export function useUpdateCursoCategoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: CursoCategoriaPayload }) =>
      cursoCategoriasService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.list] });
      toast({ title: 'Sucesso', description: 'Categoria atualizada com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message || 'Erro ao atualizar categoria', variant: 'destructive' });
    },
  });
}

export function useDeleteCursoCategoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => cursoCategoriasService.deleteById(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.list] });
      toast({ title: 'Sucesso', description: 'Categoria excluída com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message || 'Erro ao excluir categoria', variant: 'destructive' });
    },
  });
}
