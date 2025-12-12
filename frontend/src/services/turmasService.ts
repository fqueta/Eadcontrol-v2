import { GenericApiService } from './GenericApiService';
import { TurmaRecord, TurmaPayload, TurmasListParams } from '@/types/turmas';
import { PaginatedResponse } from '@/types/index';

/**
 * TurmasService — serviço de CRUD para turmas
 * pt-BR: Encapsula operações no endpoint '/turmas'.
 * en-US: Encapsulates operations for the '/turmas' endpoint.
 */
class TurmasService extends GenericApiService<TurmaRecord, TurmaPayload, TurmaPayload> {
  /**
   * constructor
   * pt-BR: Inicializa com o endpoint base.
   * en-US: Initializes with the base endpoint.
   */
  constructor() {
    super('/turmas');
  }

  /**
   * listTurmas
   * pt-BR: Lista turmas com paginação e busca.
   * en-US: Lists classes with pagination and search.
   */
  async listTurmas(params?: TurmasListParams): Promise<PaginatedResponse<TurmaRecord>> {
    return this.list(params);
  }

  /**
   * createTurma
   * pt-BR: Cria uma nova turma.
   * en-US: Creates a new class.
   */
  async createTurma(data: TurmaPayload): Promise<TurmaRecord> {
    return this.create(data);
  }

  /**
   * updateTurma
   * pt-BR: Atualiza uma turma existente.
   * en-US: Updates an existing class.
   */
  async updateTurma(id: string | number, data: TurmaPayload): Promise<TurmaRecord> {
    return this.update(id, data);
  }

  /**
   * deleteTurma
   * pt-BR: Remove uma turma por ID.
   * en-US: Deletes a class by ID.
   */
  async deleteTurma(id: string | number): Promise<void> {
    return this.deleteById(id);
  }
}

/**
 * Instância padrão exportada
 */
export const turmasService = new TurmasService();