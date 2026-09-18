import api from '@/lib/axios';

export interface IntegrationTestResponse {
  success: boolean;
  message: string;
  data?: any;
}

export const integrationsService = {
  /**
   * Busca credencial específica por slug (ex: 'cloudflare-r2', 'vimeo', 'asaas')
   */
  async getCredentialBySlug(slug: string) {
    try {
      const response = await api.get(`/api/v1/api-credentials/by-slug/${slug}`);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return { exists: false, data: null };
      }
      throw error;
    }
  },

  /**
   * Executa teste de conexão em tempo real para a integração selecionada
   */
  async testIntegration(slug: string, config?: Record<string, any>): Promise<IntegrationTestResponse> {
    const response = await api.post(`/api/v1/integrations/test/${slug}`, { config });
    return response.data;
  },

  /**
   * Gera URL pré-assinada para upload direto de arquivo ao Cloudflare R2
   */
  async getR2PresignedUploadUrl(filename: string, contentType: string, folder = 'videos') {
    const response = await api.post('/api/v1/integrations/r2/presign', {
      filename,
      content_type: contentType,
      folder,
    });
    return response.data;
  },
};
