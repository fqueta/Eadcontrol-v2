import { BaseApiService } from './BaseApiService';
import { Aircraft, CreateAircraftInput, UpdateAircraftInput, AircraftListParams } from '@/types/aircraft';
import { ApiResponse, PaginatedResponse } from '@/types/index';

/**
 * Serviço para gerenciar aeronaves
 * Estende BaseApiService para reutilizar funcionalidades comuns
 */
class AircraftService extends BaseApiService {
  /**
   * pt-BR: Endpoint atualizado para o recurso de aeronaves.
   * en-US: Updated endpoint for aircraft resource.
   */
  private readonly endpoint = '/aeronaves';

  /**
   * Lista todas as aeronaves com paginação e filtros
   * @param params - Parâmetros de filtro e paginação
   */
  async listAircraft(params?: AircraftListParams): Promise<PaginatedResponse<Aircraft>> {
    // Adiciona o parâmetro include para carregar o relacionamento com o cliente
    const queryParams = {
      ...params,
      include: 'client'
    };
    const response = await this.get<any>(this.endpoint, queryParams);
    return this.normalizePaginatedResponse<Aircraft>(response);
  }

  /**
   * Obtém uma aeronave por ID
   * @param id - ID da aeronave
   */
  async getAircraft(id: string): Promise<Aircraft> {
    const response = await this.get<ApiResponse<Aircraft>>(`${this.endpoint}/${id}`, { include: 'client' });
    return response.data;
  }

  /**
   * Cria uma nova aeronave
   * @param data - Dados da aeronave
   */
  async createAircraft(data: CreateAircraftInput): Promise<Aircraft> {
    const response = await this.post<ApiResponse<Aircraft>>(this.endpoint, data);
    return response.data;
  }

  /**
   * Atualiza uma aeronave existente
   * @param id - ID da aeronave
   * @param data - Dados para atualização
   */
  async updateAircraft(id: string, data: UpdateAircraftInput): Promise<Aircraft> {
    const response = await this.put<ApiResponse<Aircraft>>(`${this.endpoint}/${id}`, data);
    return response.data;
  }

  /**
   * Exclui uma aeronave
   * @param id - ID da aeronave
   */
  async deleteAircraft(id: string): Promise<void> {
    await this.delete<void>(`${this.endpoint}/${id}`);
  }

  // Métodos genéricos para compatibilidade com useGenericApi
  async list(params?: AircraftListParams): Promise<PaginatedResponse<Aircraft>> {
    return this.listAircraft(params);
  }

  async getById(id: string): Promise<Aircraft> {
    return this.getAircraft(id);
  }

  async create(data: CreateAircraftInput): Promise<Aircraft> {
    return this.createAircraft(data);
  }

  async update(id: string, data: UpdateAircraftInput): Promise<Aircraft> {
    return this.updateAircraft(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.deleteAircraft(id);
  }
}

// Exporta uma instância do serviço
export const aircraftService = new AircraftService();