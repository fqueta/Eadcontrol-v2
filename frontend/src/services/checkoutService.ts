import { BaseApiService } from './BaseApiService';

class CheckoutService extends BaseApiService {
  /**
   * createCheckoutSession
   * pt-BR: Cria uma sessão de checkout para o curso especificado usando o provedor.
   * en-US: Creates a checkout session for the specified course using the provider.
   */
  async createCheckoutSession(provider: string, payload: {
    course_id: number;
    name?: string;
    email?: string;
    phone?: string;
  }): Promise<{ url: string }> {
    const resp: any = await this.post<any>(`/checkout/${provider}`, payload); // Changed from public to protected
    return resp.data || resp;
  }
}

export const checkoutService = new CheckoutService();
