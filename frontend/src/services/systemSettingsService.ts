import { BaseApiService } from './BaseApiService';
import { ApiResponse } from '@/types/index';

/**
 * Interface para configurações avançadas do sistema
 */
export interface AdvancedSystemSettings {
  // Configurações com Switch
  enableApiLogging: boolean;
  enableCaching: boolean;
  enableCompression: boolean;
  enableSslRedirect: boolean;
  
  // Configurações com Select
  logLevel: string;
  cacheDriver: string;
  sessionDriver: string;
  queueDriver: string;
  
  // Configurações com Input
  maxFileSize: string;
  sessionTimeout: string;
  apiRateLimit: string;
  maxConnections: string;
  backupRetention: string;
  url_api_aeroclube: string;
  token_api_aeroclube: string;
}

/**
 * Serviço para gerenciar configurações do sistema
 * Estende BaseApiService para reutilizar funcionalidades comuns
 */
class SystemSettingsService extends BaseApiService {
  private readonly endpoint = '/options/all';

  /**
   * Salva as configurações avançadas do sistema
   * @param settings - Configurações avançadas para salvar
   */
  async saveAdvancedSettings(settings: AdvancedSystemSettings): Promise<void> {
    await this.post<ApiResponse<void>>(this.endpoint, settings);
  }

  /**
   * Obtém as configurações avançadas do sistema
   */
  async getAdvancedSettings(endpoint : string | null): Promise<AdvancedSystemSettings> {
    const response = await this.get<ApiResponse<AdvancedSystemSettings>>(endpoint || this.endpoint);
    return response.data;
  }
}

// Instância singleton do serviço
export const systemSettingsService = new SystemSettingsService();