/**
 * Serviço para operações CRUD de categorias financeiras
 * Estende BaseApiService para operações HTTP padronizadas
 */

import { BaseApiService } from './BaseApiService';
import {
  FinancialCategory,
  CreateFinancialCategoryInput,
  UpdateFinancialCategoryInput,
  FinancialCategoriesResponse,
  FinancialCategoryFilters
} from '../types/financial';

/**
 * Classe de serviço para gerenciamento de categorias financeiras
 * Fornece métodos para operações CRUD e consultas específicas
 */
export class FinancialCategoriesService extends BaseApiService {
  private readonly endpoint = '/financial/categories';

  /**
   * Lista categorias financeiras com filtros e paginação
   * @param filters - Filtros de busca e paginação
   * @returns Promise com lista paginada de categorias financeiras
   */
  async listCategories(filters?: FinancialCategoryFilters): Promise<FinancialCategoriesResponse> {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `${this.endpoint}?${queryString}` : this.endpoint;
    
    return this.get<FinancialCategoriesResponse>(url);
  }

  /**
   * Obtém uma categoria financeira específica por ID
   * @param id - ID da categoria financeira
   * @returns Promise com dados da categoria financeira
   */
  async getCategory(id: string): Promise<FinancialCategory> {
    return this.get<FinancialCategory>(`${this.endpoint}/${id}`);
  }

  /**
   * Cria uma nova categoria financeira
   * @param data - Dados para criação da categoria financeira
   * @returns Promise com categoria financeira criada
   */
  async createCategory(data: CreateFinancialCategoryInput): Promise<FinancialCategory> {
    return this.post<FinancialCategory>(this.endpoint, data);
  }

  /**
   * Atualiza uma categoria financeira existente
   * @param id - ID da categoria financeira
   * @param data - Dados para atualização
   * @returns Promise com categoria financeira atualizada
   */
  async updateCategory(id: string, data: UpdateFinancialCategoryInput): Promise<FinancialCategory> {
    return this.put<FinancialCategory>(`${this.endpoint}/${id}`, data);
  }

  /**
   * Remove uma categoria financeira
   * @param id - ID da categoria financeira
   * @returns Promise void
   */
  async deleteCategory(id: string): Promise<void> {
    return this.delete(`${this.endpoint}/${id}`);
  }

  /**
   * Lista categorias financeiras por tipo (income/expense)
   * @param type - Tipo da categoria (income ou expense)
   * @returns Promise com lista de categorias do tipo especificado
   */
  async getCategoriesByType(type: 'income' | 'expense'): Promise<FinancialCategory[]> {
    const response = await this.get<FinancialCategoriesResponse>(`${this.endpoint}?type=${type}&isActive=true`);
    return response.data;
  }

  /**
   * Lista apenas categorias financeiras ativas
   * @returns Promise com lista de categorias ativas
   */
  async getActiveCategories(): Promise<FinancialCategory[]> {
    const response = await this.get<FinancialCategoriesResponse>(`${this.endpoint}?isActive=true`);
    return response.data;
  }
}

// Instância singleton do serviço
export const financialCategoriesService = new FinancialCategoriesService();