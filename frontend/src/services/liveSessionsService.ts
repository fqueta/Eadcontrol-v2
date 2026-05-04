import { GenericApiService } from './GenericApiService';
import type { LiveSessionRecord, LiveSessionPayload, LiveSessionListParams } from '@/types/liveSessions';
import type { PaginatedResponse } from '@/types/index';

/**
 * LiveSessionsService — serviço CRUD para sessões ao vivo.
 * pt-BR: Encapsula operações no endpoint '/live-sessions'.
 * en-US: Encapsulates operations for the '/live-sessions' endpoint.
 */
class LiveSessionsService extends GenericApiService<LiveSessionRecord, LiveSessionPayload, LiveSessionPayload> {
  constructor() {
    super('/live-sessions');
  }

  /**
   * listSessions — Lista sessões com filtros para calendário.
   * en-US: List sessions with optional filters (course, class, date range, month).
   */
  async listSessions(params?: LiveSessionListParams): Promise<PaginatedResponse<LiveSessionRecord>> {
    return this.list(params as any);
  }

  /**
   * createSession — Cria uma nova sessão ao vivo.
   * en-US: Create a new live session.
   */
  async createSession(data: LiveSessionPayload): Promise<LiveSessionRecord> {
    return this.create(data);
  }

  /**
   * updateSession — Atualiza uma sessão existente.
   * en-US: Update an existing live session.
   */
  async updateSession(id: number | string, data: Partial<LiveSessionPayload>): Promise<LiveSessionRecord> {
    return this.update(id, data as LiveSessionPayload);
  }

  /**
   * deleteSession — Remove uma sessão por ID.
   * en-US: Delete a live session by ID.
   */
  async deleteSession(id: number | string): Promise<void> {
    return this.deleteById(id);
  }

  /**
   * cloneSessions — Clona sessões de uma turma para outra.
   * en-US: Clone sessions from one class group to another.
   */
  async cloneSessions(data: { from_turma_id: number; to_turma_id: number; base_date: string }): Promise<{ message: string }> {
    return this.customPost<{ message: string }>('/clone', data);
  }

  /**
   * syncAbsences — Sincroniza a lista de alunos faltantes.
   * en-US: Synchronize the list of absent students.
   */
  async syncAbsences(id: number | string, absent_user_ids: string[]): Promise<{ message: string; data: LiveSessionRecord }> {
    return this.customPut<{ message: string; data: LiveSessionRecord }>(`/${id}/absences`, { absent_user_ids });
  }
}

/** Instância padrão exportada */
export const liveSessionsService = new LiveSessionsService();
