/**
 * Hooks React Query para gerenciamento de categorias financeiras
 * Fornece operações CRUD com cache e sincronização automática
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialCategoriesService } from '../services/financialCategoriesService';
import {
  FinancialCategory,
  CreateFinancialCategoryInput,
  UpdateFinancialCategoryInput,
  FinancialCategoryFilters
} from '../types/financial';
import { toast } from './use-toast';

// Chaves de query para cache
const QUERY_KEYS = {
  financialCategories: 'financialCategories',
  financialCategory: 'financialCategory',
  financialCategoriesByType: 'financialCategoriesByType',
  activeFinancialCategories: 'activeFinancialCategories'
} as const;

/**
 * Hook para listar categorias financeiras com filtros
 * @param filters - Filtros de busca e paginação
 * @returns Query com lista de categorias financeiras
 */
export const useFinancialCategoriesList = (filters?: FinancialCategoryFilters) => {
  return useQuery({
    queryKey: [QUERY_KEYS.financialCategories, filters],
    queryFn: () => financialCategoriesService.listCategories(filters),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

/**
 * Hook para obter uma categoria financeira específica
 * @param id - ID da categoria financeira
 * @returns Query com dados da categoria financeira
 */
export const useFinancialCategory = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.financialCategory, id],
    queryFn: () => financialCategoriesService.getCategory(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook para criar uma nova categoria financeira
 * @returns Mutation para criação de categoria financeira
 */
export const useCreateFinancialCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFinancialCategoryInput) => 
      financialCategoriesService.createCategory(data),
    onSuccess: (data) => {
      // Invalida e refetch das listas
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.financialCategories] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.financialCategoriesByType] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activeFinancialCategories] });
      
      toast({
        title: 'Sucesso',
        description: 'Categoria financeira criada com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar categoria financeira',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook para atualizar uma categoria financeira
 * @returns Mutation para atualização de categoria financeira
 */
export const useUpdateFinancialCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFinancialCategoryInput }) => 
      financialCategoriesService.updateCategory(id, data),
    onSuccess: (data, variables) => {
      // Atualiza o cache da categoria específica
      queryClient.setQueryData([QUERY_KEYS.financialCategory, variables.id], data);
      
      // Invalida listas relacionadas
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.financialCategories] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.financialCategoriesByType] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activeFinancialCategories] });
      
      toast({
        title: 'Sucesso',
        description: 'Categoria financeira atualizada com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar categoria financeira',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook para deletar uma categoria financeira
 * @returns Mutation para exclusão de categoria financeira
 */
export const useDeleteFinancialCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => financialCategoriesService.deleteCategory(id),
    onSuccess: (_, deletedId) => {
      // Remove do cache
      queryClient.removeQueries({ queryKey: [QUERY_KEYS.financialCategory, deletedId] });
      
      // Invalida listas
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.financialCategories] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.financialCategoriesByType] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activeFinancialCategories] });
      
      toast({
        title: 'Sucesso',
        description: 'Categoria financeira removida com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao remover categoria financeira',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook para listar categorias financeiras por tipo
 * @param type - Tipo da categoria (income ou expense)
 * @returns Query com categorias do tipo especificado
 */
export const useFinancialCategoriesByType = (type: 'income' | 'expense') => {
  return useQuery({
    queryKey: [QUERY_KEYS.financialCategoriesByType, type],
    queryFn: () => financialCategoriesService.getCategoriesByType(type),
    staleTime: 10 * 60 * 1000, // 10 minutos (dados mais estáveis)
  });
};

/**
 * Hook para listar apenas categorias financeiras ativas
 * @returns Query com categorias ativas
 */
export const useActiveFinancialCategories = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.activeFinancialCategories],
    queryFn: () => financialCategoriesService.getActiveCategories(),
    staleTime: 10 * 60 * 1000, // 10 minutos (dados mais estáveis)
  });
};

// Exportações individuais para compatibilidade
export {
  useFinancialCategoriesList as useFinancialCategoriesQuery,
  useFinancialCategory as useFinancialCategoryQuery,
  useCreateFinancialCategory as useCreateFinancialCategoryMutation,
  useUpdateFinancialCategory as useUpdateFinancialCategoryMutation,
  useDeleteFinancialCategory as useDeleteFinancialCategoryMutation,
};