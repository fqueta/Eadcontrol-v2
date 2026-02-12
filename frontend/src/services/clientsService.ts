import { 
  ClientRecord, 
  CreateClientInput, 
  UpdateClientInput, 
  ClientsListParams,  
} from '@/types/clients';
import { PaginatedResponse, ApiDeleteResponse, ApiResponse } from '@/types/index';
import { BaseApiService } from './BaseApiService';
import { CreateClientAttendanceInput } from '@/types/attendance';

/**
 * Serviço para gerenciamento de clientes
 * Estende BaseApiService para reutilizar funcionalidades comuns
 */
class ClientsService extends BaseApiService {
  /**
   * Lista clientes com parâmetros de filtro
   * @param params - Parâmetros de listagem
   */
  async listClients(params?: ClientsListParams): Promise<PaginatedResponse<ClientRecord>> {
    const response = await this.get<any>('/clients', params);
    return this.normalizePaginatedResponse<ClientRecord>(response);
  }

  /**
   * Obtém cliente por ID
   * @param id - ID do cliente
   */
  async getClient(id: string): Promise<ClientRecord> {
    return this.get<ClientRecord>(`/clients/${id}`);
  }

  /**
   * Cria novo cliente
   * @param payload - Dados do cliente
   *
   * Observação:
   * - A API retorna um envelope `{ data, message, status }`.
   * - Este método agora descompacta e retorna somente `response.data` para
   *   manter consistência com outros serviços e evitar `undefined` no front.
   *
   * Nota técnica (Windows/VSCode): facilita usar diretamente propriedades
   * como `created.name` ao exibir toasts e atualizar estados locais.
   */
  async createClient(payload: CreateClientInput): Promise<ClientRecord> {
    const response = await this.post<ApiResponse<ClientRecord>>('/clients', payload);
    return response.data;
  }

  /**
   * Atualiza cliente existente
   * @param id - ID do cliente
   * @param payload - Dados atualizados
   */
  async updateClient(id: string, payload: UpdateClientInput): Promise<ClientRecord> {
    return this.put<ClientRecord>(`/clients/${id}`, payload);
  }

  /**
   * Exclui cliente
   * @param id - ID do cliente
   */
  async deleteClient(id: string): Promise<ApiDeleteResponse> {
    return super.delete<ApiDeleteResponse>(`/clients/${id}`);
  }

  /**
   * Restaura um cliente excluído (soft delete)
   * Executa PATCH em `/clients/{id}/restore`.
   * @param id - ID do cliente a restaurar
   * @returns Registro do cliente restaurado
   */
  async restoreClient(id: string): Promise<ClientRecord> {
    const response = await this.put<ClientRecord>(`/clients/${id}/restore`, {});
    return response;
  }

  // Métodos para compatibilidade com o hook genérico
  async list(params?: ClientsListParams): Promise<PaginatedResponse<ClientRecord>> {
    return this.listClients(params);
  }

  async getById(id: string): Promise<ClientRecord> {
    return this.getClient(id);
  }

  async create(data: CreateClientInput): Promise<ClientRecord> {
    return this.createClient(data);
  }

  async update(id: string, data: UpdateClientInput): Promise<ClientRecord> {
    return this.updateClient(id, data);
  }

  async delete(id: string): Promise<ApiDeleteResponse> {
    return this.deleteClient(id);
  }
  
  /**
   * Método de conveniência para restauração, mantendo consistência com a API de serviço
   * @param id - ID do cliente
   */
  async restore(id: string): Promise<ClientRecord> {
    return this.restoreClient(id);
  }

  /**
   * registerAttendance
   * pt-BR: Registra um atendimento para o cliente via API.
   * en-US: Registers an attendance for a client via API.
   */
  async registerAttendance(clientId: string, payload: CreateClientAttendanceInput): Promise<any> {
    return this.post<any>(`/clients/${clientId}/attendances`, payload);
  }

  /**
   * Exclui cliente permanentemente (force delete)
   * @param id - ID do cliente
   */
  async forceDeleteClient(id: string): Promise<ApiDeleteResponse> {
    return super.delete<ApiDeleteResponse>(`/clients/${id}/force`);
  }
}

export const clientsService = new ClientsService();