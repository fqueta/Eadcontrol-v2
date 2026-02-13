import { GenericApiService } from "@/services/GenericApiService";
import { ApiResponse } from "@/types";

export interface Page {
  id: string | number;
  title: string;
  content?: string;
  slug: string;
  active: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePageInput {
  name: string;
  content?: string;
  active?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdatePageInput {
  name?: string;
  content?: string;
  active?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

class PagesService extends GenericApiService<Page, CreatePageInput, UpdatePageInput> {
  constructor() {
    super("/pages");
  }
  async delete(id: string | number): Promise<void> {
    await this.deleteById(id);
  }
  async getPublicBySlug(slug: string): Promise<ApiResponse<Page>> {
    return this.customGet<ApiResponse<Page>>(`/public/${slug}`);
  }
}

export const pagesService = new PagesService();
