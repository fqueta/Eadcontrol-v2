import { GenericApiService } from './GenericApiService';
import { PaginatedResponse } from '@/types/index';
import {
  EnrollmentSituation,
  EnrollmentSituationCreatePayload,
  EnrollmentSituationUpdatePayload,
  EnrollmentSituationListParams,
} from '@/types/enrollmentSituation';

/**
 * EnrollmentSituationsService — CRUD service for enrollment situations
 * pt-BR: Serviço de CRUD para Situações de Matrícula no endpoint '/situacoes-matricula'.
 * en-US: CRUD service for Enrollment Situations at '/situacoes-matricula'.
 */
class EnrollmentSituationsService extends GenericApiService<
  EnrollmentSituation,
  EnrollmentSituationCreatePayload,
  EnrollmentSituationUpdatePayload
> {
  /**
   * constructor
   * pt-BR: Inicializa com o endpoint '/situacoes-matricula'.
   * en-US: Initializes with the '/situacoes-matricula' endpoint.
   */
  constructor() {
    super('/situacoes-matricula');
  }

  /**
   * listSituations
   * pt-BR: Lista situações com paginação e busca.
   * en-US: Lists situations with pagination and search.
   */
  async listSituations(
    params?: EnrollmentSituationListParams
  ): Promise<PaginatedResponse<EnrollmentSituation>> {
    return this.list(params);
  }

  /**
   * createSituation
   * pt-BR: Cria uma nova situação de matrícula.
   * en-US: Creates a new enrollment situation.
   */
  async createSituation(
    data: EnrollmentSituationCreatePayload
  ): Promise<EnrollmentSituation> {
    return this.create(data);
  }

  /**
   * updateSituation
   * pt-BR: Atualiza uma situação existente.
   * en-US: Updates an existing situation.
   */
  async updateSituation(
    id: string | number,
    data: EnrollmentSituationUpdatePayload
  ): Promise<EnrollmentSituation> {
    return this.update(id, data);
  }

  /**
   * deleteSituation
   * pt-BR: Exclui uma situação por ID.
   * en-US: Deletes a situation by ID.
   */
  async deleteSituation(id: string | number): Promise<void> {
    return this.deleteById(id);
  }
}

/**
 * Default exported instance
 * pt-BR: Instância padrão para uso nos hooks e páginas.
 * en-US: Default instance for hooks and pages.
 */
export const enrollmentSituationsService = new EnrollmentSituationsService();