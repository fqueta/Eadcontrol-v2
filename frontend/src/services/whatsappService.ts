import { BaseApiService } from './BaseApiService';
import type {
  WhatsappInstance,
  WhatsappInstancesResponse,
  WhatsappNotificationSettings,
  WhatsappNotificationSettingsResponse,
} from '@/types/whatsapp';

/**
 * WhatsAppService
 * pt-BR: Conexões Evolution GO (instâncias, QR Code, pareamento e envio).
 */
class WhatsappService extends BaseApiService {
  async list(): Promise<WhatsappInstancesResponse> {
    return this.get<WhatsappInstancesResponse>('/whatsapp/instances');
  }

  async show(id: number | string): Promise<{ data: WhatsappInstance }> {
    return this.get<{ data: WhatsappInstance }>(`/whatsapp/instances/${id}`);
  }

  async create(payload: { display_name: string; phone_number?: string }): Promise<{ message: string; instance: WhatsappInstance }> {
    return this.post<{ message: string; instance: WhatsappInstance }>('/whatsapp/instances', payload);
  }

  async connect(id: number | string): Promise<{ message: string; instance: WhatsappInstance; qr_code?: string | null; status: string }> {
    return this.post<{ message: string; instance: WhatsappInstance; qr_code?: string | null; status: string }>(
      `/whatsapp/instances/${id}/connect`
    );
  }

  async pair(id: number | string, phone: string): Promise<{ message: string; data: any }> {
    return this.post<{ message: string; data: any }>(`/whatsapp/instances/${id}/pair`, { phone });
  }

  async status(id: number | string): Promise<{ status: string; instance: WhatsappInstance }> {
    return this.get<{ status: string; instance: WhatsappInstance }>(`/whatsapp/instances/${id}/status`);
  }

  async disconnect(id: number | string): Promise<{ message: string; instance: WhatsappInstance }> {
    return this.post<{ message: string; instance: WhatsappInstance }>(`/whatsapp/instances/${id}/disconnect`);
  }

  async reconnect(id: number | string): Promise<{ status: string; instance: WhatsappInstance }> {
    return this.post<{ status: string; instance: WhatsappInstance }>(`/whatsapp/instances/${id}/reconnect`);
  }

  async remove(id: number | string): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/whatsapp/instances/${id}`);
  }

  async sendMessage(id: number | string, payload: { phone: string; message: string }): Promise<{ message: string; sent: number }> {
    return this.post<{ message: string; sent: number }>(`/whatsapp/instances/${id}/send-message`, payload);
  }

  async toggleAi(id: number | string, isActive?: boolean): Promise<{ message: string }> {
    return this.post<{ message: string }>(`/whatsapp/instances/${id}/toggle-ai`, {
      is_active: isActive,
    });
  }

  async notificationSettings(): Promise<WhatsappNotificationSettingsResponse> {
    return this.get<WhatsappNotificationSettingsResponse>('/whatsapp/notifications/settings');
  }

  async updateNotificationSettings(payload: {
    enabled: boolean;
    instance_id?: number | null;
    recipients?: string;
    events?: string[];
  }): Promise<{ message: string; data: WhatsappNotificationSettings }> {
    return this.put<{ message: string; data: WhatsappNotificationSettings }>(
      '/whatsapp/notifications/settings',
      payload
    );
  }

  async testNotification(payload?: { phone?: string }): Promise<{ message: string; sent: number }> {
    return this.post<{ message: string; sent: number }>('/whatsapp/notifications/test', payload ?? {});
  }
}

export const whatsappService = new WhatsappService();
export default whatsappService;
