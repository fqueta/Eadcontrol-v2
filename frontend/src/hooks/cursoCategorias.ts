import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface CursoCategoria {
  id: number;
  nome: string;
  slug: string;
}

export function useCursoCategorias() {
  return useQuery<CursoCategoria[]>({
    queryKey: ['curso-categorias'],
    queryFn: async () => {
      const response = await api.get('/cursos-categorias-lista');
      const data = response?.data?.data ?? [];
      return data as CursoCategoria[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
