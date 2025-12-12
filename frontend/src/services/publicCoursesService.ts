import { GenericApiService } from './GenericApiService';
import { CourseRecord, CoursesListParams } from '@/types/courses';
import { PaginatedResponse } from '@/types/index';

/**
 * PublicCoursesService
 * pt-BR: Serviço para listagem pública de cursos via endpoint `/cursos/public`.
 * en-US: Service for public courses listing through `/cursos/public` endpoint.
 */
class PublicCoursesService extends GenericApiService<CourseRecord, any, any> {
  /**
   * constructor
   * pt-BR: Inicializa com o endpoint base `/cursos`.
   * en-US: Initializes with base endpoint `/cursos`.
   */
  constructor() {
    super('/cursos');
  }

  /**
   * listPublicCourses
   * pt-BR: Lista cursos públicos a partir de `/cursos/public`, normalizando paginação
   *        e aplicando filtros padrão: `ativo='s'`, `publicar='s'`, `excluido='n'`.
   * en-US: Lists public courses from `/cursos/public`, normalizing pagination
   *        and applying default filters: `ativo='s'`, `publicar='s'`, `excluido='n'`.
   */
  async listPublicCourses(params?: CoursesListParams): Promise<PaginatedResponse<CourseRecord>> {
    // Merge default filters with provided params; callers can override if needed
    const mergedParams = {
      ativo: 's',
      publicar: 's',
      excluido: 'n',
      ...(params || {}),
    } as CoursesListParams & { ativo: 's' | 'n'; publicar: 's' | 'n'; excluido: 'n' | 's' };

    const response = await this.customGet<any>('/public', mergedParams);
    return this.normalizePaginatedResponse<CourseRecord>(response);
  }

  /**
   * getBySlug
   * pt-BR: Obtém detalhes do curso público via slug em `/cursos/public/by-slug/{slug}`.
   * en-US: Gets public course details by slug at `/cursos/public/by-slug/{slug}`.
   */
  async getBySlug(slug: string): Promise<CourseRecord | any> {
    // Endpoint público por slug explícito
    // Public endpoint using explicit by-slug path
    const response = await this.customGet<any>(`/public/by-slug/${slug}`);
    const normalized = (response && typeof response === 'object' && 'data' in response)
      ? (response.data as CourseRecord)
      : (response as CourseRecord);
    return normalized;
  }

  /**
   * getById
   * pt-BR: Obtém detalhes do curso público via ID em `/cursos/public/by-id/{id}`.
   *        Útil como fallback quando uma matrícula possui apenas o ID do curso.
   * en-US: Gets public course details by ID at `/cursos/public/by-id/{id}`.
   *        Useful as a fallback when an enrollment only has the course ID.
   */
  async getById(id: string | number): Promise<CourseRecord | any> {
    const response = await this.customGet<any>(`/public/by-id/${id}`);
    const normalized = (response && typeof response === 'object' && 'data' in response)
      ? (response.data as CourseRecord)
      : (response as CourseRecord);
    return normalized;
  }
}

/**
 * Instância padrão exportada
 * pt-BR: Usada para consultas públicas de cursos.
 * en-US: Used for public course queries.
 */
export const publicCoursesService = new PublicCoursesService();