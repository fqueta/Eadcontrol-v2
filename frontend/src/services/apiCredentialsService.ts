import { BaseApiService } from './BaseApiService';
import { ApiCredential, PaginatedResponse } from '@/types';

class ApiCredentialsService extends BaseApiService {
  constructor() {
    super();
  }

  public async list(params?: any): Promise<PaginatedResponse<ApiCredential>> {
    return this.get<PaginatedResponse<ApiCredential>>('/api-credentials', params);
  }

  public async getOne(id: number): Promise<ApiCredential> {
    return this.get<ApiCredential>(`/api-credentials/${id}`);
  }

  public async create(data: any): Promise<ApiCredential> {
    return this.post<ApiCredential>('/api-credentials', data);
  }

  public async update(id: number, data: any): Promise<ApiCredential> {
    return this.put<ApiCredential>(`/api-credentials/${id}`, data);
  }

  public async destroy(id: number): Promise<void> {
    return this.delete<void>(`/api-credentials/${id}`);
  }

  public async trash(params?: any): Promise<PaginatedResponse<ApiCredential>> {
    return this.get<PaginatedResponse<ApiCredential>>('/api-credentials/trash/list', params);
  }

  public async restore(id: number): Promise<void> {
    return this.put<void>(`/api-credentials/${id}/restore`);
  }

  public async forceDelete(id: number): Promise<void> {
    return this.delete<void>(`/api-credentials/${id}/force`);
  }
}

export const apiCredentialsService = new ApiCredentialsService();
