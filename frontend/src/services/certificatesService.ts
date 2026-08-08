import { BaseApiService } from '@/services/BaseApiService';

/**
 * CertificatesService
 * pt-BR: Serviço para gerenciar modelo de certificado e validação.
 * en-US: Service to manage certificate template and validation.
 */
class CertificatesService extends BaseApiService {
  /**
   * getTemplate
   * pt-BR: Obtém o modelo de certificado do backend.
   * en-US: Fetches certificate template from backend.
   */
  async getTemplate(): Promise<any> {
    return this.get<any>('/certificates/template');
  }

  /**
   * saveTemplate
   * pt-BR: Salva/atualiza o modelo de certificado no backend.
   * en-US: Saves/updates certificate template in backend.
   */
  async saveTemplate(payload: any): Promise<any> {
    return this.put<any>('/certificates/template', payload);
  }

  /**
   * getTemplateForEnrollment
   * pt-BR: Obtém o modelo de certificado resolvido para uma matrícula
   *        específica (considerando a turma da matrícula).
   * en-US: Fetches the certificate template resolved for a specific
   *        enrollment (taking the enrollment class into account).
   */
  async getTemplateForEnrollment(enrollmentId: string | number): Promise<any> {
    return this.get<any>(`/certificates/template/${encodeURIComponent(String(enrollmentId))}`);
  }

  /**
   * getModels
   * pt-BR: Lista todos os modelos de certificado (globais e por turma).
   * en-US: Lists all certificate models (global and per class).
   */
  async getModels(): Promise<any> {
    return this.get<any>('/certificates/models');
  }

  /**
   * createModel
   * pt-BR: Cria um novo modelo de certificado.
   * en-US: Creates a new certificate model.
   */
  async createModel(payload: { name: string; id_turma?: number | null; config?: any; ativo?: string }): Promise<any> {
    return this.post<any>('/certificates/models', payload);
  }

  /**
   * updateModel
   * pt-BR: Atualiza um modelo de certificado existente.
   * en-US: Updates an existing certificate model.
   */
  async updateModel(id: string | number, payload: { name?: string; id_turma?: number | null; config?: any; ativo?: string }): Promise<any> {
    return this.put<any>(`/certificates/models/${encodeURIComponent(String(id))}`, payload);
  }

  /**
   * deleteModel
   * pt-BR: Exclui um modelo de certificado.
   * en-US: Deletes a certificate model.
   */
  async deleteModel(id: string | number): Promise<any> {
    return this.delete<any>(`/certificates/models/${encodeURIComponent(String(id))}`);
  }

  /**
   * getBackgrounds
   * pt-BR: Lista todas as imagens de fundo da galeria de certificados.
   * en-US: Lists all background images in the certificate gallery.
   */
  async getBackgrounds(): Promise<any> {
    return this.get<any>('/certificates/backgrounds');
  }

  /**
   * createBackground
   * pt-BR: Adiciona uma imagem de fundo à galeria.
   * en-US: Adds a background image to the gallery.
   */
  async createBackground(payload: { name?: string; url: string; ativo?: string }): Promise<any> {
    return this.post<any>('/certificates/backgrounds', payload);
  }

  /**
   * deleteBackground
   * pt-BR: Remove uma imagem de fundo da galeria.
   * en-US: Removes a background image from the gallery.
   */
  async deleteBackground(id: string | number): Promise<any> {
    return this.delete<any>(`/certificates/backgrounds/${encodeURIComponent(String(id))}`);
  }

  /**
   * validateCertificate
   * pt-BR: Valida certificado por ID de matrícula.
   * en-US: Validates certificate by enrollment id.
   */
  async validateCertificate(enrollmentId: string | number, hash?: string): Promise<any> {
    const h = hash ? `/${encodeURIComponent(hash)}` : '';
    return this.get<any>(`/certificates/validate/${encodeURIComponent(String(enrollmentId))}${h}`);
  }

  async generatePdf(enrollmentId: string | number): Promise<Blob> {
    const url = `${this.API_BASE_URL}/certificates/generate/${encodeURIComponent(String(enrollmentId))}`;
    console.log(`[CertificatesService] Requesting PDF from: ${url}`);
    const headers = this.getHeaders();
    (headers as any)['Accept'] = 'application/pdf';
    console.log(`[CertificatesService] Headers:`, headers);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      // If the response is HTML, it's likely a server error page
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error(`Erro no servidor (Status ${response.status}). O servidor retornou uma página HTML em vez de um PDF.`);
      }
      throw new Error(text || `Falha ao gerar certificado (Status ${response.status})`);
    }
    return response.blob();
  }
}

export const certificatesService = new CertificatesService();
