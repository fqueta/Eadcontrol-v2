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
   * validateCertificate
   * pt-BR: Valida certificado por ID de matrícula.
   * en-US: Validates certificate by enrollment id.
   */
  async validateCertificate(enrollmentId: string | number): Promise<any> {
    return this.get<any>(`/certificates/validate/${encodeURIComponent(String(enrollmentId))}`);
  }

  async generatePdf(enrollmentId: string | number): Promise<Blob> {
    const url = `${this.API_BASE_URL}/certificates/generate/${encodeURIComponent(String(enrollmentId))}`;
    const headers = this.getHeaders();
    (headers as any)['Accept'] = 'application/pdf';
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text || 'Falha ao gerar certificado');
    }
    return response.blob();
  }
}

export const certificatesService = new CertificatesService();
