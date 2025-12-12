import { PaginatedResponse, ApiResponse, ApiDeleteResponse } from '@/types/index';
import { BaseApiService } from './BaseApiService';
import { EnrollmentRecord, CreateEnrollmentInput, UpdateEnrollmentInput, EnrollmentsListParams } from '@/types/enrollments';

/**
 * EnrollmentsService
 * pt-BR: Serviço para gerenciar matrículas (`/matriculas`).
 * en-US: Service to manage enrollments (`/matriculas`).
 */
class EnrollmentsService extends BaseApiService {
  /**
   * listEnrollments
   * pt-BR: Lista matrículas com paginação e filtros.
   * en-US: Lists enrollments with pagination and filters.
   */
  async listEnrollments(params?: EnrollmentsListParams): Promise<PaginatedResponse<EnrollmentRecord>> {
    /**
     * listEnrollments
     * pt-BR: Garante que o endpoint de listagem inclua `situacao=mat` por padrão,
     *        mesclando com quaisquer filtros/paginação fornecidos.
     * en-US: Ensures the listing endpoint includes `situacao=mat` by default,
     *        merging with any provided filters/pagination.
     */
    // Default to 'mat' but allow callers to override with a provided `situacao`
    const mergedParams = { situacao: 'mat', ...(params || {}) } as EnrollmentsListParams & { situacao?: string };
    const response = await this.get<any>('/matriculas', mergedParams);
    return this.normalizePaginatedResponse<EnrollmentRecord>(response);
  }

  /**
   * getEnrollment
   * pt-BR: Obtém matrícula por ID.
   * en-US: Fetch enrollment by ID.
   */
  async getEnrollment(id: string): Promise<EnrollmentRecord> {
    return this.get<EnrollmentRecord>(`/matriculas/${id}`);
  }

  /**
   * createEnrollment
   * pt-BR: Cria nova matrícula.
   * en-US: Creates a new enrollment.
   */
  async createEnrollment(payload: CreateEnrollmentInput): Promise<EnrollmentRecord> {
    const response = await this.post<ApiResponse<EnrollmentRecord>>('/matriculas', payload);
    return response.data;
  }

  /**
   * updateEnrollment
   * pt-BR: Atualiza matrícula existente.
   * en-US: Updates an existing enrollment.
   */
  async updateEnrollment(id: string, payload: UpdateEnrollmentInput): Promise<EnrollmentRecord> {
    return this.put<EnrollmentRecord>(`/matriculas/${id}`, payload);
  }

  /**
   * deleteEnrollment
   * pt-BR: Exclui matrícula.
   * en-US: Deletes an enrollment.
   */
  async deleteEnrollment(id: string): Promise<ApiDeleteResponse> {
    return super.delete<ApiDeleteResponse>(`/matriculas/${id}`);
  }

  // Compat layer for useGenericApi
  async list(params?: EnrollmentsListParams): Promise<PaginatedResponse<EnrollmentRecord>> {
    return this.listEnrollments(params);
  }
  async getById(id: string): Promise<EnrollmentRecord> {
    return this.getEnrollment(id);
  }
  async create(data: CreateEnrollmentInput): Promise<EnrollmentRecord> {
    return this.createEnrollment(data);
  }
  async update(id: string, data: UpdateEnrollmentInput): Promise<EnrollmentRecord> {
    return this.updateEnrollment(id, data);
  }
  async delete(id: string): Promise<ApiDeleteResponse> {
    return this.deleteEnrollment(id);
  }
}

export const enrollmentsService = new EnrollmentsService();