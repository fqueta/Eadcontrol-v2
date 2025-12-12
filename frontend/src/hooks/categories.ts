/**
 * Hooks React Query para gerenciamento de categorias
 * Fornece operações CRUD com cache e sincronização automática
 */

import { useGenericApi } from './useGenericApi';
import { categoriesService } from '../services/categoriesService';
import {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryFilters
} from '../types/categories';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Chaves de query para cache
const QUERY_KEYS = {
  categories: 'categories',
  category: 'category',
  parentCategories: 'parentCategories',
  subcategories: 'subcategories'
} as const;

/**
 * Hook para listar categorias com filtros
 * @param filters - Filtros de busca e paginação
 * @returns Query com lista de categorias
 */
export const useCategoriesList = (filters?: CategoryFilters) => {
  return useQuery({
    queryKey: [QUERY_KEYS.categories, filters],
    queryFn: () => categoriesService.listCategories(filters),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

/**
 * Hook para obter uma categoria específica
 * @param id - ID da categoria
 * @returns Query com dados da categoria
 */
export const useCategory = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.category, id],
    queryFn: () => categoriesService.getCategory(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook para criar categoria
 * @param options - Opções de callback
 * @returns Mutation para criar categoria
 */
export const useCreateCategory = (options?: {
  onSuccess?: (data: Category) => void;
  onError?: (error: any) => void;
}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateCategoryInput) => categoriesService.createCategory(data),
    onSuccess: (data) => {
      // Invalida cache de listas
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.categories] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.parentCategories] });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
};

/**
 * Hook para atualizar categoria
 * @param options - Opções de callback
 * @returns Mutation para atualizar categoria
 */
export const useUpdateCategory = (options?: {
  onSuccess?: (data: Category) => void;
  onError?: (error: any) => void;
}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryInput }) => 
      categoriesService.updateCategory(id, data),
    onSuccess: (data) => {
      // Invalida cache específico e listas
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.category, data.id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.categories] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.parentCategories] });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
};

/**
 * Hook para excluir categoria
 * @param options - Opções de callback
 * @returns Mutation para excluir categoria
 */
export const useDeleteCategory = (options?: {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => categoriesService.deleteCategory(id),
    onSuccess: () => {
      // Invalida todos os caches relacionados
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.categories] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.parentCategories] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.category] });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
};

/**
 * Hook para listar categorias principais (para seleção como pai)
 * @returns Query com categorias principais
 */
export const useParentCategories = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.parentCategories],
    queryFn: () => categoriesService.listParentCategories(),
    staleTime: 10 * 60 * 1000, // 10 minutos (dados mais estáveis)
  });
};

/**
 * Hook para listar subcategorias de uma categoria
 * @param parentId - ID da categoria pai
 * @returns Query com subcategorias
 */
export const useSubcategories = (parentId: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.subcategories, parentId],
    queryFn: () => categoriesService.listSubcategories(parentId),
    enabled: !!parentId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook genérico para uso avançado com useGenericApi
 * @returns API genérica para categorias
 */
export const useCategoriesApi = () => {
  return useGenericApi({
    service: categoriesService,
    queryKey: QUERY_KEYS.categories,
  });
};

// Exportações individuais para compatibilidade
export {
  useCategoriesList as useCategoriesQuery,
  useCategory as useCategoryQuery,
  useCreateCategory as useCreateCategoryMutation,
  useUpdateCategory as useUpdateCategoryMutation,
  useDeleteCategory as useDeleteCategoryMutation,
};