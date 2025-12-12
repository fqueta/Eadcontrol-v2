import { GenericApiService } from './GenericApiService';
import { PaginatedResponse } from '@/types/index';
import {
  FunnelRecord,
  StageRecord,
  CreateFunnelInput,
  UpdateFunnelInput,
  CreateStageInput,
  UpdateStageInput,
  FunnelsListParams,
  StagesListParams
} from '@/types/pipelines';

/**
 * FunnelsService — Serviço para Funis e Etapas
 * pt-BR: Implementa CRUD de funis e operações aninhadas para etapas.
 * en-US: Implements funnels CRUD and nested stage operations.
 */
class FunnelsService extends GenericApiService<
  FunnelRecord,
  CreateFunnelInput,
  UpdateFunnelInput
> {
  constructor() {
    // Endpoint base para funis
    super('/funnels');
  }

  /**
   * Listar funis
   * pt-BR: Lista funis com paginação e filtros.
   * en-US: Lists funnels with pagination and filters.
   */
  async listFunnels(params?: FunnelsListParams): Promise<PaginatedResponse<FunnelRecord>> {
    return this.list(params);
  }

  /**
   * Obter funil por ID
   */
  async getFunnel(id: string): Promise<FunnelRecord> {
    return this.getById(id);
  }

  /**
   * Criar funil
   */
  async createFunnel(data: CreateFunnelInput): Promise<FunnelRecord> {
    return this.create(data);
  }

  /**
   * Atualizar funil
   */
  async updateFunnel(id: string, data: UpdateFunnelInput): Promise<FunnelRecord> {
    return this.update(id, data);
  }

  /**
   * Excluir funil
   */
  async deleteFunnel(id: string): Promise<void> {
    return this.deleteById(id);
  }

  /**
   * Reordenar funis
   * pt-BR: Persiste a ordem dos funis enviando a lista de IDs na nova ordem.
   * en-US: Persists funnels order by sending the IDs in the new order.
   */
  async reorderFunnels(idsInOrder: string[]): Promise<void> {
    await this.customPut('/reorder', { ids: idsInOrder });
  }

  /**
   * Listar etapas de um funil
   * pt-BR: Busca etapas usando endpoint aninhado `/funnels/:id/stages`.
   * en-US: Fetch stages via nested endpoint `/funnels/:id/stages`.
   */
  async listStages(funnelId: string, params?: StagesListParams): Promise<PaginatedResponse<StageRecord>> {
    const response = await this.customGet<PaginatedResponse<StageRecord>>(`/${funnelId}/stages`, params);
    return response;
  }

  /**
   * Criar etapa em um funil
   */
  async createStage(funnelId: string, data: CreateStageInput): Promise<StageRecord> {
    /**
     * pt-BR: Cria etapa usando endpoint plano `/stages` e inclui `funnel_id` no payload.
     * en-US: Creates stage via flat endpoint `/stages` and includes `funnel_id` in payload.
     */
    const payload: CreateStageInput = { ...data, funnel_id: funnelId };
    // Algumas APIs retornam `{ stage }`, outras `{ data }`; normalizamos para StageRecord
    const response = await this.post<any>(`/stages`, payload);
    const stage = (response?.data ?? response?.stage ?? response) as StageRecord;
    return stage;
  }

  /**
   * Atualizar etapa de um funil
   */
  async updateStage(funnelId: string, stageId: string, data: UpdateStageInput): Promise<StageRecord> {
    /**
     * pt-BR: Atualiza etapa usando endpoint plano `/stages/:id` (PUT/PATCH) e envia `funnel_id` no payload.
     * en-US: Updates stage using flat endpoint `/stages/:id` (PUT/PATCH) and includes `funnel_id` in payload.
     */
    const payload: UpdateStageInput = { ...data, funnel_id: funnelId };
    // Usamos PATCH para atualizações parciais; o backend também aceita PUT.
    const response = await this.patch<any>(`/stages/${stageId}`, payload);
    // Normaliza diferentes formatos de resposta (ex.: `{ stage }` ou `{ data }`)
    const stage = (response?.data ?? response?.stage ?? response) as StageRecord;
    return stage;
  }

  /**
   * Excluir etapa de um funil
   */
  async deleteStage(funnelId: string, stageId: string): Promise<void> {
    /**
     * pt-BR: Exclui etapa usando endpoint plano `/stages/:id`.
     * en-US: Deletes stage via flat endpoint `/stages/:id`.
     */
    await this.delete<void>(`/stages/${stageId}`);
  }

  /**
   * Reordenar etapas de um funil
   * pt-BR: Persiste a nova ordem das etapas enviando lista de IDs.
   * en-US: Persists stages order by sending ordered list of IDs.
   */
  async reorderStages(funnelId: string, idsInOrder: string[]): Promise<void> {
    await this.customPut(`/${funnelId}/stages/reorder`, { ids: idsInOrder });
  }
}

/**
 * Instância exportada do serviço de funis
 */
export const funnelsService = new FunnelsService();

export type FunnelListParams = FunnelsListParams;
export type StageListParams = StagesListParams;