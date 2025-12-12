/**
 * Serviço para operações CRUD de categorias
 * Estende BaseApiService para operações HTTP padronizadas
 */

import { BaseApiService } from './BaseApiService';
import {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoriesResponse,
  CategoryFilters
} from '../types/categories';

/**
 * Classe de serviço para gerenciamento de categorias
 * Fornece métodos para operações CRUD e consultas específicas
 */
export class CategoriesService extends BaseApiService {
  private readonly endpoint = '/categories';

  /**
   * Lista categorias com filtros e paginação
   * @param filters - Filtros de busca e paginação
   * @returns Promise com lista paginada de categorias
   */
  async listCategories(filters?: CategoryFilters): Promise<CategoriesResponse> {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.parentId) params.append('parentId', filters.parentId);
    if (filters?.entidade) params.append('entidade', filters.entidade);
    if (filters?.active !== undefined) params.append('active', filters.active.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `${this.endpoint}?${queryString}` : this.endpoint;
    
    return this.get<CategoriesResponse>(url);
  }

  /**
   * Obtém uma categoria específica por ID
   * @param id - ID da categoria
   * @returns Promise com dados da categoria
   */
  async getCategory(id: string): Promise<Category> {
    return this.get<Category>(`${this.endpoint}/${id}`);
  }

  /**
   * Cria uma nova categoria
   * @param data - Dados da categoria a ser criada
   * @returns Promise com categoria criada
   */
  async createCategory(data: CreateCategoryInput): Promise<Category> {
    return this.post<Category>(this.endpoint, data);
  }

  /**
   * Atualiza uma categoria existente
   * @param id - ID da categoria
   * @param data - Dados atualizados da categoria
   * @returns Promise com categoria atualizada
   */
  async updateCategory(id: string, data: UpdateCategoryInput): Promise<Category> {
    return this.put<Category>(`${this.endpoint}/${id}`, data);
  }

  /**
   * Exclui uma categoria
   * @param id - ID da categoria a ser excluída
   * @returns Promise void
   */
  async deleteCategory(id: string): Promise<void> {
    return this.delete(`${this.endpoint}/${id}`);
  }

  /**
   * Lista todas as categorias principais (sem pai) para seleção
   * @returns Promise com lista de categorias principais
   */
  async listParentCategories(): Promise<Category[]> {
    const response = await this.get<CategoriesResponse>(`${this.endpoint}?parentId=null&active=true&limit=1000`);
    return response.data;
  }

  /**
   * Lista subcategorias de uma categoria específica
   * @param parentId - ID da categoria pai
   * @returns Promise com lista de subcategorias
   */
  async listSubcategories(parentId: string): Promise<Category[]> {
    const response = await this.get<CategoriesResponse>(`${this.endpoint}?parentId=${parentId}&active=true`);
    return response.data;
  }

  // Métodos genéricos para compatibilidade com useGenericApi
  async list(params?: any) {
    return this.listCategories(params);
  }

  async getById(id: string) {
    return this.getCategory(id);
  }

  async create(data: CreateCategoryInput) {
    return this.createCategory(data);
  }

  async update(id: string, data: UpdateCategoryInput) {
    return this.updateCategory(id, data);
  }

  async remove(id: string) {
    return this.deleteCategory(id);
  }
}

// Instância singleton do serviço
export const categoriesService = new CategoriesService();