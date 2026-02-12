import { BaseApiService } from './BaseApiService';

/**
 * PublicEnrollmentService
 * pt-BR: Serviço para endpoints públicos de matrícula/interesse.
 * en-US: Service for public enrollment/interest endpoints.
 */
class PublicEnrollmentService extends BaseApiService {
  /**
   * registerInterest
   * pt-BR: Registra interesse público com dados mínimos.
   * en-US: Registers public interest with minimal data.
   */
  async registerInterest(payload: {
    institution: string;
    name: string;
    email: string;
    phone?: string;
    id_curso?: number;
    id_turma?: number;
    // Security fields
    captcha_token?: string;
    captcha_action?: string;
    form_rendered_at?: number;
    hp_field?: string;
  }): Promise<any> {
    const resp = await this.post<any>('/matriculas/interested', payload);
    return resp.data || resp;
  }

  /**
   * registerAndEnroll
   * pt-BR: Registra um cliente (usuário) e cria matrícula no curso informado.
   *        Endpoint: POST `/clients/matricula` (tenant público).
   * en-US: Registers a client (user) and creates enrollment in the given course.
   *        Endpoint: POST `/clients/matricula` (public tenant).
   */
  async registerAndEnroll(payload: {
    institution: string;
    name: string;
    email: string;
    password: string;
    phone?: string;
    id_curso: number;
    id_turma?: number;
    privacyAccepted?: boolean;
    termsAccepted?: boolean;
    invite_token?: string;
    // Security fields
    captcha_token?: string;
    captcha_action?: string;
    form_rendered_at?: number;
    hp_field?: string;
  }): Promise<any> {
    const resp = await this.post<any>('/clients/matricula', payload);
    return resp.data || resp;
  }
}

export const publicEnrollmentService = new PublicEnrollmentService();