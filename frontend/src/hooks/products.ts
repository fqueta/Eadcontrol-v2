import { Product, CreateProductInput, UpdateProductInput, ProductFilters, ProductRedemptionResponse } from '@/types/products';
import { productsService, ProductListParams } from '@/services/productsService';
import { useGenericApi } from './useGenericApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Função para obter os hooks de produtos
 */
function getProductsApi() {
  return useGenericApi<Product, CreateProductInput, UpdateProductInput, ProductListParams>({
    service: productsService,
    queryKey: 'products',
    entityName: 'Produto'
  });
}

// Exporta os hooks individuais para manter compatibilidade
export function useProductsList(params?: ProductListParams, queryOptions?: any) {
  const api = getProductsApi();
  // Configurações específicas para prevenir loops infinitos em listas vazias
  const safeQueryOptions = {
    retry: (failureCount: number, error: any) => {
      // Não tenta novamente para listas vazias (404) ou erros de cliente
      if (error?.status === 404 || (error?.status >= 400 && error?.status < 500)) {
        return false;
      }
      return failureCount < 1;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos para listas
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    ...queryOptions
  };
  return api.useList(params, safeQueryOptions);
}

/**
 * Hook para listar produtos da loja (Point Store)
 * Usa o endpoint público/cliente GET '/point-store/products'.
 * Suporta filtros e opções de query e evita retries em erros 4xx.
 */
export function useStoreProductsList(params?: ProductListParams, queryOptions?: any) {
  return useQuery({
    queryKey: ['point-store', 'products', params || {}],
    queryFn: () => productsService.listStoreProducts(params),
    retry: (failureCount: number, error: any) => {
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 1;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...queryOptions
  });
}

export function useProduct(id: string, queryOptions?: any) {
  const api = getProductsApi();
  return api.useGetById(id, queryOptions);
}

export function useProductBySlug(slug: string, queryOptions?: any) {
  return useQuery({
    queryKey: ['product', 'slug', slug],
    queryFn: () => productsService.getProductBySlug(slug),
    enabled: !!slug,
    retry: (failureCount: number, error: any) => {
      // Não tenta novamente para erros de cliente
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 1;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...queryOptions
  });
}

export function useCreateProduct(mutationOptions?: any) {
  const api = getProductsApi();
  return api.useCreate(mutationOptions);
}

export function useUpdateProduct(mutationOptions?: any) {
  const api = getProductsApi();
  return api.useUpdate(mutationOptions);
}

export function useDeleteProduct(mutationOptions?: any) {
  const api = getProductsApi();
  return api.useDelete(mutationOptions);
}

/**
 * Hook para resgatar produto com pontos
 */
export function useRedeemProduct(mutationOptions?: any) {
  const queryClient = useQueryClient();
  
  return useMutation<ProductRedemptionResponse, Error, { productId: string; quantity?: number; config?: any }>({
    mutationFn: ({ productId, quantity = 1, config }: { productId: string; quantity?: number; config?: any }) => 
      productsService.redeemProduct(productId, quantity, config),
    onSuccess: (data) => {
      // Invalidar cache de produtos para atualizar dados
      queryClient.invalidateQueries({ queryKey: ['products'] });
      // Dados da resposta disponíveis: data.redemption_id, data.product_name, etc.
    },
    ...mutationOptions
  });
}

// Hook para categorias de produtos
export function useProductCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: () => productsService.getCategories(),
    staleTime: 10 * 60 * 1000, // 10 minutos
    retry: (failureCount: number, error: any) => {
      // Não tenta novamente para erros de cliente
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 1;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// Hook para unidades de medida
export function useProductUnits() {
  return useQuery({
    queryKey: ['product-units'],
    queryFn: () => productsService.getUnits(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Exporta função para uso avançado
export const useProductsApi = getProductsApi;