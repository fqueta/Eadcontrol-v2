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
    super('/public/cursos');
  }

  /**
   * listPublicCourses
   * pt-BR: Lista cursos públicos a partir de '/public/cursos', normalizando paginação
   *        e aplicando filtros padrão: `ativo='s'`, `publicar='s'`, `excluido='n'`.
   * en-US: Lists public courses from '/public/cursos', normalizing pagination
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

    const response = await this.list(mergedParams);
    return this.normalizePaginatedResponse<CourseRecord>(response);
  }

  /**
   * getBySlug
   * pt-BR: Obtém detalhes do curso público via slug em '/public/cursos/by-slug/{slug}'.
   * en-US: Gets public course details by slug at '/public/cursos/by-slug/{slug}'.
   */
  async getBySlug(slug: string): Promise<CourseRecord | any> {
    const response = await this.customGet<any>(`/by-slug/${slug}`);
    const normalized = (response && typeof response === 'object' && 'data' in response)
      ? (response.data as CourseRecord)
      : (response as CourseRecord);
    return normalized;
  }

  /**
   * getById
   * pt-BR: Obtém detalhes do curso público via ID em '/public/cursos/by-id/{id}'.
   * en-US: Gets public course details by ID at '/public/cursos/by-id/{id}'.
   */
  async getById(id: string | number): Promise<CourseRecord | any> {
    const response = await this.customGet<any>(`/by-id/${id}`);
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