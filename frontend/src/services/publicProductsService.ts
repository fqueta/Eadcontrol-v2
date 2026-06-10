import { GenericApiService } from './GenericApiService';
import { PaginatedResponse } from '@/types/index';

export interface PublicProduct {
  id: string;
  name: string;
  description: string;
  slug: string;
  active: boolean;
  category: string;
  costPrice: string;
  salePrice: string;
  stock: number;
  image: string | null;
  categoryData: { id: string; name: string } | null;
  unitData: { value: string; label: string } | null;
  unit: string | null;
  created_at: string;
  updated_at: string;
}

class PublicProductsService extends GenericApiService<PublicProduct, any, any> {
  constructor() {
    super('/public/products');
  }

  async listPublicProducts(params?: {
    page?: number;
    per_page?: number;
    category?: string;
    search?: string;
    ids?: string;
  }): Promise<PaginatedResponse<PublicProduct>> {
    const response = await this.list(params);
    return this.normalizePaginatedResponse<PublicProduct>(response);
  }

  async getProductBySlug(slug: string): Promise<PublicProduct> {
    const response = await this.customGet<any>(`/by-slug/${slug}`);
    const normalized = (response && typeof response === 'object' && 'data' in response)
      ? (response.data as PublicProduct)
      : (response as PublicProduct);
    return normalized;
  }
}

export const publicProductsService = new PublicProductsService();
