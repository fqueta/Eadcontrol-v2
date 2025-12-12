/**
 * Tipos TypeScript para o módulo de categorias
 */

// Tipo base para categoria
export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string; // ID da categoria pai
  parent?: Category; // Categoria pai populada
  children?: Category[]; // Subcategorias
  entidade: string; // Entidade da categoria (servicos, produtos, financeiro)
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

// Tipo para criação de categoria
export interface CreateCategoryInput {
  name: string;
  description?: string;
  parentId?: string;
  entidade: string;
  active?: boolean;
}

// Tipo para atualização de categoria
export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  parentId?: string;
  entidade?: string;
  active?: boolean;
}

// Tipo para resposta da API com paginação
export interface CategoriesResponse {
  data: Category[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Tipo para filtros de busca
export interface CategoryFilters {
  search?: string;
  parentId?: string;
  entidade?: string;
  active?: boolean;
  page?: number;
  limit?: number;
}

// Tipo para dados do formulário
export interface CategoryFormData {
  name: string;
  description: string;
  parentId: string;
  entidade: string;
  active: boolean;
}

// Tipo para opção de select (categoria pai)
export interface CategoryOption {
  value: string;
  label: string;
  disabled?: boolean;
}