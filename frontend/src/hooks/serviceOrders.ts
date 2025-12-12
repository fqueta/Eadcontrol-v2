import { 
  ServiceOrder, 
  CreateServiceOrderInput, 
  UpdateServiceOrderInput, 
  ServiceOrderFilters,
  ServiceOrderStats
} from '@/types/serviceOrders';
import { serviceOrdersService, ServiceOrderListParams } from '@/services/serviceOrdersService';
import { useGenericApi } from './useGenericApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { useAircraftList } from './aircraft';

/**
 * Função para obter os hooks de ordens de serviço
 */
function getServiceOrdersApi() {
  return useGenericApi<ServiceOrder, CreateServiceOrderInput, UpdateServiceOrderInput, ServiceOrderListParams>({
    service: serviceOrdersService,
    queryKey: 'service-orders',
    entityName: 'Ordem de Serviço'
  });
}

// Exporta os hooks individuais para manter compatibilidade
export function useServiceOrdersList(params?: ServiceOrderListParams, queryOptions?: any) {
  const api = getServiceOrdersApi();
  return api.useList(params, queryOptions);
}

export function useServiceOrder(id: string, queryOptions?: any) {
  const api = getServiceOrdersApi();
  return api.useGetById(id, queryOptions);
}

export function useCreateServiceOrder(mutationOptions?: any) {
  const api = getServiceOrdersApi();
  return api.useCreate(mutationOptions);
}

export function useUpdateServiceOrder(mutationOptions?: any) {
  const api = getServiceOrdersApi();
  return api.useUpdate(mutationOptions);
}

export function useDeleteServiceOrder(mutationOptions?: any) {
  const api = getServiceOrdersApi();
  return api.useDelete(mutationOptions);
}

// Hook para estatísticas de ordens de serviço
export function useServiceOrderStats() {
  return useQuery({
    queryKey: ['service-order-stats'],
    queryFn: () => serviceOrdersService.getStats(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para clientes disponíveis
export function useServiceOrderClients() {
  return useQuery({
    queryKey: ['service-order-clients'],
    queryFn: () => serviceOrdersService.getClients(),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

// Hook para usuários disponíveis para atribuição
export function useServiceOrderUsers() {
  return useQuery({
    queryKey: ['service-order-users'],
    queryFn: () => serviceOrdersService.getUsers(),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

// Hook para serviços disponíveis
export function useAvailableServices() {
  return useQuery({
    queryKey: ['available-services'],
    queryFn: () => serviceOrdersService.getAvailableServices(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para produtos disponíveis
export function useAvailableProducts() {
  return useQuery({
    queryKey: ['available-products'],
    queryFn: () => serviceOrdersService.getAvailableProducts(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para gerar número de ordem
export function useGenerateOrderNumber() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => serviceOrdersService.generateOrderNumber(),
    onSuccess: () => {
      // Invalida cache relacionado se necessário
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    }
  });
}

// Hook para duplicar ordem de serviço
export function useDuplicateServiceOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => serviceOrdersService.duplicateServiceOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    }
  });
}

// Hook para atualizar status
export function useUpdateServiceOrderStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      serviceOrdersService.updateStatus(id, status),
    onSuccess: (data, variables) => {
      // Atualiza o cache da ordem específica
      queryClient.setQueryData(['service-orders', variables.id], data);
      // Invalida a lista para refletir mudanças
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['service-order-stats'] });
    }
  });
}

// Hook principal que exporta a API completa
export const useServiceOrdersApi = getServiceOrdersApi;

// Hooks de conveniência para formulários
export function useServiceOrderForm() {
  const clients = useServiceOrderClients();
  const users = useServiceOrderUsers();
  const services = useAvailableServices();
  const products = useAvailableProducts();
  const generateNumber = useGenerateOrderNumber();
  
  return {
    clients,
    users,
    services,
    products,
    generateNumber,
    isLoading: clients.isLoading || users.isLoading || services.isLoading || products.isLoading
  };
}

// Hook para dados da página de listagem
export function useServiceOrdersPage(params?: ServiceOrderListParams) {
  const list = useServiceOrdersList(params);
  const stats = useServiceOrderStats();
  
  return {
    ...list,
    stats,
    isLoading: list.isLoading || stats.isLoading
  };
}

// Hook para busca dinâmica de clientes
export function useSearchClients() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce do termo de busca
  const debounceSearch = useCallback((term: string) => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(term);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const search = useCallback((term: string) => {
    setSearchTerm(term);
    debounceSearch(term);
  }, [debounceSearch]);

  const query = useQuery({
    queryKey: ['search-clients', debouncedSearchTerm],
    queryFn: () => serviceOrdersService.searchClients(debouncedSearchTerm || undefined),
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    search,
    searchTerm,
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error
  };
}

// Hook para busca dinâmica de usuários
export function useSearchUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce do termo de busca
  const debounceSearch = useCallback((term: string) => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(term);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const search = useCallback((term: string) => {
    setSearchTerm(term);
    debounceSearch(term);
  }, [debounceSearch]);

  const query = useQuery({
    queryKey: ['search-users', debouncedSearchTerm],
    queryFn: () => serviceOrdersService.searchUsers(debouncedSearchTerm || undefined),
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    search,
    searchTerm,
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error
  };
}

// Hook para busca dinâmica de serviços
export function useSearchServices() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce do termo de busca
  const debounceSearch = useCallback((term: string) => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(term);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const search = useCallback((term: string) => {
    setSearchTerm(term);
    debounceSearch(term);
  }, [debounceSearch]);

  const query = useQuery({
    queryKey: ['search-services', debouncedSearchTerm],
    queryFn: () => serviceOrdersService.searchServices(debouncedSearchTerm || undefined),
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    search,
    searchTerm,
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error
  };
}

// Hook para busca dinâmica de produtos
export function useSearchProducts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce do termo de busca
  const debounceSearch = useCallback((term: string) => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(term);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const search = useCallback((term: string) => {
    setSearchTerm(term);
    debounceSearch(term);
  }, [debounceSearch]);

  const query = useQuery({
    queryKey: ['search-products', debouncedSearchTerm],
    queryFn: () => serviceOrdersService.searchProducts(debouncedSearchTerm || undefined),
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    search,
    searchTerm,
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error
  };
}

// Hook para busca de aeronaves com debounce
export function useSearchAircraft() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const debounceSearch = useCallback((term: string) => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(term);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const search = useCallback((term: string) => {
    setSearchTerm(term);
    debounceSearch(term);
  }, [debounceSearch]);

  const query = useAircraftList(
    debouncedSearchTerm ? { search: debouncedSearchTerm } : undefined,
    {
      enabled: true,
      staleTime: 5 * 60 * 1000, // 5 minutos
    }
  );

  return {
    search,
    searchTerm,
    data: query.data?.data || [],
    isLoading: query.isLoading,
    error: query.error
  };
}

// Hook para dados do formulário de ordem de serviço com busca dinâmica
export function useServiceOrderFormData() {
  const clientsSearch = useSearchClients();
  const usersSearch = useSearchUsers();
  const servicesSearch = useSearchServices();
  const productsSearch = useSearchProducts();
  const aircraftSearch = useSearchAircraft();
  // console.log('servicesSearch', servicesSearch);
  
  return {
    // Dados para autocomplete
    clients: clientsSearch.data,
    users: usersSearch.data,
    services: servicesSearch.data,
    products: productsSearch.data,
    aircraft: aircraftSearch.data,
    
    // Estados de loading
    isLoadingClients: clientsSearch.isLoading,
    isLoadingUsers: usersSearch.isLoading,
    isLoadingServices: servicesSearch.isLoading,
    isLoadingProducts: productsSearch.isLoading,
    isLoadingAircraft: aircraftSearch.isLoading,
    isLoading: clientsSearch.isLoading || usersSearch.isLoading || servicesSearch.isLoading || productsSearch.isLoading || aircraftSearch.isLoading,
    
    // Funções de busca
    searchClients: clientsSearch.search,
    searchUsers: usersSearch.search,
    searchServices: servicesSearch.search,
    searchProducts: productsSearch.search,
    searchAircraft: aircraftSearch.search,
    
    // Termos de busca atuais
    clientSearchTerm: clientsSearch.searchTerm,
    userSearchTerm: usersSearch.searchTerm,
    serviceSearchTerm: servicesSearch.searchTerm,
    productSearchTerm: productsSearch.searchTerm,
    aircraftSearchTerm: aircraftSearch.searchTerm,
    
    // Erros
    error: clientsSearch.error || usersSearch.error || servicesSearch.error || productsSearch.error || aircraftSearch.error
  };
}