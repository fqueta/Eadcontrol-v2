/**
 * Tipos relacionados a produtos
 */
/**
 * Produto base
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  points: number;
  category: string;
  image: string;
  rating: number;
  reviews: number;
  availability: 'available' | 'limited' | 'unavailable';
  terms: string[];
  validUntil?: string;
  stock: number;
}

/**
 * Dados para criar um novo produto
 */
export interface CreateProductInput {
  name: string;
  description?: string;
  category: string;
  salePrice: number;
  costPrice: number;
  stock: number;
  unit: string;
  active: boolean;
  image?: string;
  points: number;
  rating?: number;
  reviews?: number;
  availability: 'available' | 'limited' | 'unavailable';
  terms: string[];
  validUntil?: string;
}

/**
 * Dados para atualizar um produto
 */
export interface UpdateProductInput {
  name?: string;
  description?: string;
  category?: string;
  salePrice?: number;
  costPrice?: number;
  stock?: number;
  unit?: string;
  active?: boolean;
  image?: string;
  points?: number;
  rating?: number;
  reviews?: number;
  availability?: 'available' | 'limited' | 'unavailable';
  terms?: string[];
  validUntil?: string;
}

/**
 * Registro de produto (usado em listagens)
 */
export interface ProductRecord extends Product {
  // Campos adicionais que podem vir da API
}

/**
 * Filtros para busca de produtos
 */
export interface ProductFilters {
  search?: string;
  category?: string;
  active?: boolean;
  lowStock?: boolean;
}

/**
 * Categoria de produto
 */
export interface ProductCategory {
  id: string;
  name: string;
}

/**
 * Unidade de medida
 */
export interface ProductUnit {
  value: string;
  label: string;
}

/**
 * Resposta do resgate de produto
 */
export interface ProductRedemptionResponse {
  redemption_id: number;
  product_name: string;
  quantity: number;
  points_used: number;
  remaining_points: number;
  status: string;
  estimated_delivery: string;
}
/**
 * Propriedades do componente PointsStore
 */
export interface PointsStoreProps {
  linkLoja: string;
}
