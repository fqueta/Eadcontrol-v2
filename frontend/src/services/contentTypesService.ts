import { GenericApiService } from "@/services/GenericApiService";

export interface ContentTypeItem {
  id: string | number;
  name: string;
  description?: string;
  slug: string;
  active: boolean;
  kind: string;
  config?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface CreateContentTypeInput {
  name: string;
  description?: string;
  active?: boolean;
  kind: string;
  config?: Record<string, any>;
}

export interface UpdateContentTypeInput {
  name?: string;
  description?: string;
  active?: boolean;
  kind?: string;
  config?: Record<string, any>;
}

class ContentTypesService extends GenericApiService<ContentTypeItem, CreateContentTypeInput, UpdateContentTypeInput> {
  constructor() {
    super("/content-types");
  }
}

export const contentTypesService = new ContentTypesService();
