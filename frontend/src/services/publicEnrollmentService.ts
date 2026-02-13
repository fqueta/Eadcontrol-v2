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
    institution?: string;
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
    // Security fields (Math Challenge)
    challenge_a?: number;
    challenge_b?: number;
    challenge_answer?: number;
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
    institution?: string;
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
    // Security fields (Math Challenge)
    challenge_a?: number;
    challenge_b?: number;
    challenge_answer?: number;
    form_rendered_at?: number;
    hp_field?: string;
  }): Promise<any> {
    const resp = await this.post<any>('/clients/matricula', payload);
    return resp.data || resp;
  }

  /**
   * checkEmail
   * pt-BR: Verifica se o e-mail já existe na base.
   * en-US: Checks if the email already exists in the database.
   */
  async checkEmail(email: string): Promise<{ exists: boolean; valid?: boolean }> {
    const resp = await this.post<{ exists: boolean; valid?: boolean }>('/public/check-email', { email });
    return (resp as any).data || resp;
  }
}

export const publicEnrollmentService = new PublicEnrollmentService();