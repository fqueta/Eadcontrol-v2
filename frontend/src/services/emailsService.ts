import { BaseApiService } from './BaseApiService';
import { ApiResponse } from '@/types/index';

/**
 * EmailsService
 * pt-BR: Serviço para endpoints de e-mails (ex.: boas-vindas).
 * en-US: Service for email-related endpoints (e.g., welcome).
 */
class EmailsService extends BaseApiService {
  /**
   * sendWelcome
   * pt-BR: Envia e-mail de boas-vindas via endpoint '/emails/welcome'.
   * en-US: Sends welcome email via '/emails/welcome' endpoint.
   */
  async sendWelcome(data: { name: string; email: string; course_id?: number | string; course_title?: string }): Promise<{ success: boolean; message?: string; data?: any }> {
    const response = await this.post<ApiResponse<any>>('/emails/welcome', data);
    // Algumas APIs retornam diretamente { success, data }, outras usam wrapper { data }
    const payload: any = response?.data ?? response;
    return {
      success: Boolean(payload?.success ?? true),
      message: payload?.message,
      data: payload?.data ?? payload,
    };
  }
}

/**
 * Instância do serviço de e-mails
 */
export const emailsService = new EmailsService();