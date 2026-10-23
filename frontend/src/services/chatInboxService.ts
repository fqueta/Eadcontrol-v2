import { BaseApiService } from './BaseApiService';
import type {
  ChatConversation,
  ChatInboxResponse,
  ChatInboxStats,
  ChatMessage,
  ChatMessagesResponse,
  ChatStartPayload,
  WhatsappInstance,
} from '@/types/whatsapp';

/**
 * ChatInboxService
 * pt-BR: Inbox estilo WhatsApp Web — conversas, mensagens, envio de texto/mídia.
 */
class ChatInboxService extends BaseApiService {
  async inbox(params?: { instance_id?: number | string; status?: string; q?: string; per_page?: number }): Promise<ChatInboxResponse> {
    return this.get<ChatInboxResponse>('/chat/inbox', params);
  }

  async messages(id: number | string, params?: { per_page?: number }): Promise<ChatMessagesResponse> {
    return this.get<ChatMessagesResponse>(`/chat/conversations/${id}/messages`, params);
  }

  async send(id: number | string, message: string): Promise<{ message: string; data: ChatMessage }> {
    return this.post<{ message: string; data: ChatMessage }>(`/chat/conversations/${id}/send`, { message });
  }

  async sendMedia(id: number | string, file: File, message = ''): Promise<{ message: string; data: ChatMessage }> {
    const formData = new FormData();
    formData.append('file', file);

    if (message) {
      formData.append('message', message);
    }

    return this.postFormData<{ message: string; data: ChatMessage }>(`/chat/conversations/${id}/send-media`, formData);
  }

  async start(payload: ChatStartPayload): Promise<{ message: string; data: ChatConversation }> {
    return this.post<{ message: string; data: ChatConversation }>('/chat/start', payload);
  }

  async close(id: number | string): Promise<{ message: string; data: ChatConversation }> {
    return this.post<{ message: string; data: ChatConversation }>(`/chat/conversations/${id}/close`);
  }

  async toggleAi(id: number | string, paused?: boolean): Promise<{ message: string; ai_paused: boolean }> {
    return this.post<{ message: string; ai_paused: boolean }>(`/chat/conversations/${id}/toggle-ai`, {
      paused,
    });
  }

  async instances(): Promise<{ data: WhatsappInstance[] }> {
    return this.get<{ data: WhatsappInstance[] }>('/chat/instances');
  }

  async stats(): Promise<{ data: ChatInboxStats }> {
    return this.get<{ data: ChatInboxStats }>('/chat/stats');
  }
}

export const chatInboxService = new ChatInboxService();
export default chatInboxService;
