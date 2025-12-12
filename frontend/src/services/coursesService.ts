import { GenericApiService } from './GenericApiService';
import { CourseRecord, CoursePayload, CoursesListParams } from '@/types/courses';
import { PaginatedResponse } from '@/types/index';

/**
 * CoursesService — serviço de CRUD para cursos
 * pt-BR: Encapsula operações no endpoint '/courses'.
 * en-US: Encapsulates operations for the '/courses' endpoint.
 */
class CoursesService extends GenericApiService<CourseRecord, CoursePayload, CoursePayload> {
  /**
   * Construtor
   * pt-BR: Inicializa com o endpoint base.
   * en-US: Initializes with the base endpoint.
   */
  constructor() {
    // Define endpoint base de cursos conforme requisito do backend
    // Sets base courses endpoint according to backend requirement
    super('/courses');
  }

  /**
   * Lista cursos com paginação e busca
   * pt-BR: Retorna resposta paginada de cursos.
   * en-US: Returns a paginated list of courses.
   */
  async listCourses(params?: CoursesListParams): Promise<PaginatedResponse<CourseRecord>> {
    return this.list(params);
  }

  /**
   * Cria um curso
   * pt-BR: Envia payload completo conforme tipos definidos.
   * en-US: Sends the full payload according to defined types.
   */
  async createCourse(data: CoursePayload): Promise<CourseRecord> {
    /**
     * mapDescriptionAlias
     * pt-BR: Garante compatibilidade mapeando `descricao` (UI) para `descricao_curso` (API) e
     *        removendo o alias antes do envio.
     * en-US: Ensures compatibility by mapping `descricao` (UI) to `descricao_curso` (API) and
     *        removing the alias before sending.
     */
    const payload: CoursePayload = { ...data } as CoursePayload;
    if ((payload as any).descricao && !(payload as any).descricao_curso) {
      (payload as any).descricao_curso = (payload as any).descricao;
    }
    delete (payload as any).descricao;
    return this.create(payload);
  }

  /**
   * Atualiza um curso existente
   */
  async updateCourse(id: string | number, data: CoursePayload): Promise<CourseRecord> {
    /**
     * mapDescriptionAlias
     * pt-BR: Garante compatibilidade mapeando `descricao` (UI) para `descricao_curso` (API) e
     *        removendo o alias antes do envio.
     * en-US: Ensures compatibility by mapping `descricao` (UI) to `descricao_curso` (API) and
     *        removing the alias before sending.
     */
    const payload: CoursePayload = { ...data } as CoursePayload;
    if ((payload as any).descricao && !(payload as any).descricao_curso) {
      (payload as any).descricao_curso = (payload as any).descricao;
    }
    delete (payload as any).descricao;
    return this.update(id, payload);
  }

  /**
   * Remove um curso por ID
   */
  async deleteCourse(id: string | number): Promise<void> {
    return this.deleteById(id);
  }

  /**
   * uploadCover
   * pt-BR: Faz upload da imagem de capa do curso e retorna metadados/URL.
   * en-US: Uploads the course cover image and returns metadata/URL.
   *
   * Observações:
   * - Usa POST com FormData para enviar o arquivo da imagem.
   * - Se `courseId` for informado, usa um endpoint aninhado `/courses/:id/upload-cover`.
   * - Caso contrário, utiliza `/courses/upload-cover`.
   * - Retorna o payload do backend, tipicamente contendo a propriedade `url`.
   */
  async uploadCover(
    file: File,
    opts?: { courseId?: string | number; extra?: Record<string, any> }
  ): Promise<any> {
    const form = new FormData();
    form.append('file', file);
    if (opts?.extra) {
      Object.entries(opts.extra).forEach(([k, v]) => form.append(k, String(v)));
    }

    if (opts?.courseId !== undefined && opts.courseId !== null && opts.courseId !== '') {
      return this.customPostFormData(`/${opts.courseId}/upload-cover`, form);
    }
    return this.customPostFormData('/upload-cover', form);
  }

  /**
   * getBySlug
   * pt-BR: Obtém detalhes do curso privado usando slug no endpoint `/courses/:slug`.
   * en-US: Fetches private course details using slug at `/courses/:slug`.
   */
  async getBySlug(slug: string): Promise<CourseRecord> {
    // Alguns backends resolvem ID ou slug no mesmo endpoint.
    // Some backends resolve ID or slug on the same endpoint.
    const response = await this.get<any>(`${this.getEndpoint()}/${slug}`);
    const normalized = (response && typeof response === 'object' && 'data' in response)
      ? (response.data as CourseRecord)
      : (response as CourseRecord);
    return normalized;
  }
}

/**
 * Instância padrão exportada
 */
export const coursesService = new CoursesService();