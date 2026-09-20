import api from '@/lib/axios';
import type { MediaFile, MediaStats, MediaScanResult, ShareTokenResult, DownloadResult } from '@/types/media';

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
      const response = await api.get(`/api-credentials/by-slug/${slug}`);
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
    const response = await api.post(`/integrations/test/${slug}`, { config });
    return response.data;
  },

  /**
   * Gera URL pré-assinada para upload direto de arquivo ao Cloudflare R2
   */
  async getR2PresignedUploadUrl(filename: string, contentType: string, folder = 'videos') {
    const response = await api.post('/integrations/r2/presign', {
      filename,
      mime_type: contentType,
      content_type: contentType,
      folder,
    });
    return response.data;
  },

  /**
   * Exclui um arquivo de vídeo do armazenamento Cloudflare R2 / Ead Control
   */
  async deleteR2File(pathOrUrl: string) {
    const response = await api.delete('/integrations/r2/delete', {
      data: { path: pathOrUrl, url: pathOrUrl },
    });
    return response.data;
  },

  /**
   * Solicita transcodificação do vídeo MP4 para streaming HLS adaptativo (.m3u8 + .ts)
   */
  async requestVideoTranscode(data: { path: string; activity_id?: number; sync?: boolean; media_file_id?: number }) {
    const response = await api.post('/integrations/media/transcode', data);
    return response.data;
  },

  /**
   * Consulta o status da transcodificação HLS de um vídeo
   */
  async checkTranscodeStatus(pathOrUrl: string) {
    const response = await api.get('/integrations/media/transcode/status', {
      params: { path: pathOrUrl, url: pathOrUrl },
    });
    return response.data;
  },

  // ── Mediateca ──────────────────────────────────────────────────────────

  /**
   * Lista os vídeos da Mediateca com filtros e paginação
   */
  async listMediaFiles(params?: {
    status?: string;
    orphans?: boolean;
    search?: string;
    page?: number;
    per_page?: number;
  }) {
    const response = await api.get('/media-files', { params });
    return response.data as { data: MediaFile[]; meta: any };
  },

  /**
   * Retorna estatísticas da Mediateca
   */
  async getMediaStats(): Promise<MediaStats> {
    const response = await api.get('/media-files/stats');
    return response.data;
  },

  /**
   * Varre o Cloudflare R2 em busca de vídeos não registrados
   */
  async scanR2(): Promise<MediaScanResult> {
    const response = await api.post('/media-files/scan');
    return response.data;
  },

  /**
   * Exclui um vídeo da Mediateca e do R2
   */
  async deleteMediaFile(id: number) {
    const response = await api.delete(`/media-files/${id}`);
    return response.data;
  },

  /**
   * Atualiza configurações de um vídeo (ex: allow_download)
   */
  async updateMediaFile(id: number, data: { allow_download?: boolean; original_name?: string }) {
    const response = await api.put(`/media-files/${id}`, data);
    return response.data;
  },

  /**
   * Vincula um vídeo existente a uma atividade
   */
  async linkMediaFile(id: number, activityId: number | null) {
    const response = await api.post(`/media-files/${id}/link`, { activity_id: activityId });
    return response.data;
  },

  /**
   * Gera link de compartilhamento protegido (player público estilo Vimeo)
   */
  async generateShareToken(
    id: number,
    options?: { expires_hours?: number; allowed_domains?: string[] }
  ): Promise<ShareTokenResult> {
    const response = await api.post(`/media-files/${id}/share`, options ?? {});
    return response.data;
  },

  /**
   * Gera URL temporária de download (5 min) para um vídeo com download habilitado
   */
  async requestDownload(id: number): Promise<DownloadResult> {
    const response = await api.post(`/media-files/${id}/download`);
    return response.data;
  },
};

