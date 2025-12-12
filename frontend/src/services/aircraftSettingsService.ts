import { GenericApiService } from './GenericApiService';
import { AircraftSettingsPayload, AircraftSettingsResponse } from '@/types/aircraftSettings';

/**
 * AircraftSettingsService — serviço para configurações/cadastro de aeronaves
 * pt-BR: Usa GenericApiService para enviar o payload completo das aeronaves.
 * en-US: Uses GenericApiService to send full aircraft settings payload.
 */
class AircraftSettingsService extends GenericApiService<AircraftSettingsPayload> {
  /**
   * pt-BR: Inicializa o serviço com endpoint padrão '/aeronaves'.
   * en-US: Initializes the service with default endpoint '/aeronaves'.
   */
  constructor() {
    super('/aeronaves');
  }

  /**
   * saveSettings — cria uma aeronave com config completa
   * pt-BR: Envia o payload completo para criação.
   * en-US: Sends the complete payload for creation.
   */
  async saveSettings(data: AircraftSettingsPayload): Promise<AircraftSettingsResponse> {
    // Nota: use customPost('') caso o backend exija endpoint raiz em POST.
    return this.customPost<AircraftSettingsResponse>('', data);
  }

  /**
   * updateSettings — atualiza uma aeronave existente
   * pt-BR: Atualiza pelo id com o payload completo.
   * en-US: Updates by id using the full payload.
   */
  async updateSettings(id: string | number, data: AircraftSettingsPayload): Promise<AircraftSettingsResponse> {
    return this.customPut<AircraftSettingsResponse>(`/${id}`, data);
  }

  /**
   * deleteById — remove aeronave pelo id
   * pt-BR: Exclui o registro pelo id.
   * en-US: Deletes record by id.
   */
  async deleteById(id: string | number): Promise<AircraftSettingsResponse> {
    return this.customDelete<AircraftSettingsResponse>(`/${id}`);
  }
}

/**
 * Instância singleton para uso no app
 */
export const aircraftSettingsService = new AircraftSettingsService();