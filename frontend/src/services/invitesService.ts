import { BaseApiService } from './BaseApiService';
import type { PaginatedResponse } from '@/types';

/**
 * InvitesService
 * pt-BR: Serviço para endpoints de convites (admin autenticado).
 * en-US: Service for invite endpoints (authenticated admin).
 */
class InvitesService extends BaseApiService {
  /**
   * list
   * pt-BR: Lista convites com paginação.
   * en-US: Lists invites with pagination.
   */
  async list<T = any>(params?: Record<string, any>): Promise<PaginatedResponse<T>> {
    const resp = await this.get<any>('/invites', params);
    // Normaliza para sempre retornar { data, current_page, last_page, per_page, total }
    // Ensures consistent paginated shape for consumers like React Query tables.
    return this.normalizePaginatedResponse<T>(resp);
  }

  /**
   * create
   * pt-BR: Cria um novo link de convite.
   * en-US: Creates a new invite link.
   */
  async create(payload: {
    nome: string;
    id_curso: number;
    total_convites: number;
    validade?: string;
  }): Promise<any> {
    const resp = await this.post<any>('/invites', payload);
    return resp.data || resp;
  }

  /**
   * show
   * pt-BR: Obtém detalhes de um convite.
   * en-US: Gets details of an invite.
   */
  async show(id: number): Promise<any> {
    const resp = await this.get<any>(`/invites/${id}`);
    return resp.data || resp;
  }

  /**
   * update
   * pt-BR: Atualiza um convite existente.
   * en-US: Updates an existing invite.
   */
  async update(id: number, payload: {
    nome?: string;
    id_curso?: number;
    total_convites?: number;
    validade?: string;
  }): Promise<any> {
    const resp = await this.put<any>(`/invites/${id}`, payload);
    return resp.data || resp;
  }

  /**
   * destroy
   * pt-BR: Exclui um convite.
   * en-US: Deletes an invite.
   */
  async destroy(id: number): Promise<any> {
    const resp = await this.delete<any>(`/invites/${id}`);
    return resp.data || resp;
  }
}

export const invitesService = new InvitesService();