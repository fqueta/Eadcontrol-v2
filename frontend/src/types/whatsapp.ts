/**
 * WhatsApp / Atendimento — tipos de conexões, conversas e mensagens.
 * pt-BR: Contratos usados pelo painel (Evolution GO e inbox estilo WhatsApp Web).
 */

import type { AiAgent } from './ai';

export type WhatsappInstanceStatus = 'connected' | 'connecting' | 'disconnected';

export interface WhatsappInstance {
  id: number;
  display_name: string;
  instance_name: string;
  instance_id?: string | null;
  phone_number?: string | null;
  status: WhatsappInstanceStatus;
  provider: string;
  qr_code?: string | null;
  webhook_url?: string | null;
  last_error?: string | null;
  connected_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  settings?: Record<string, any> | null;
  agents?: AiAgent[];
  open_conversations_count?: number;
}

export interface WhatsappInstancesResponse {
  data: WhatsappInstance[];
  meta?: {
    max_instances: number;
    provider: string;
    configured: boolean;
  };
}

/** Preferências de alertas administrativos enviados por WhatsApp. */
export interface WhatsappNotificationSettings {
  enabled: boolean;
  instance_id: number | null;
  recipients: string[];
  recipients_raw: string;
  events: string[];
}

export interface WhatsappNotificationEvent {
  key: string;
  label: string;
}

export interface WhatsappNotificationSettingsResponse {
  data: WhatsappNotificationSettings;
  instances: Array<Pick<WhatsappInstance, 'id' | 'display_name' | 'phone_number' | 'status'>>;
  events: WhatsappNotificationEvent[];
}

export type ChatConversationStatus = 'active' | 'closed' | 'transferred';

export interface ChatConversation {
  id: number;
  public_code: string;
  ai_agent_id?: number | null;
  whatsapp_instance_id: number;
  contact_phone: string;
  contact_lid?: string | null;
  contact_name?: string | null;
  status: ChatConversationStatus;
  transferred_to?: string | null;
  metadata?: Record<string, any> | null;
  last_message_at?: string | null;
  closed_at?: string | null;
  created_at?: string | null;
  whatsapp_instance?: WhatsappInstance | null;
  whatsappInstance?: WhatsappInstance | null;
  agent?: AiAgent | null;
  last_message?: string | null;
  last_role?: ChatMessageRole | null;
  unread_count?: number;
  ai_paused?: boolean;
}

export type ChatMessageRole = 'user' | 'assistant' | 'system' | 'human_agent';

export interface ChatMedia {
  path?: string;
  url?: string;
  type?: 'image' | 'audio' | 'video' | 'document' | string;
  mime?: string;
  size?: number;
  name?: string | null;
  placeholder?: string | null;
  transcription?: string;
}

export interface ChatMessage {
  id: number;
  ai_conversation_id: number;
  role: ChatMessageRole;
  content: string | null;
  tokens_used?: number;
  metadata?: {
    channel?: string;
    provider?: string;
    model?: string;
    media?: ChatMedia | null;
    send_error?: string;
    error?: string;
    sent_by_user_id?: string;
    push_name?: string;
    message_type?: string;
    [key: string]: any;
  } | null;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessagesResponse {
  data: ChatMessage[];
  conversation: ChatConversation;
  meta: {
    current_page: number;
    last_page: number;
    total: number;
    ai_paused: boolean;
  };
}

export interface ChatInboxResponse {
  data: ChatConversation[];
}

export interface ChatInboxStats {
  open: number;
  waiting: number;
  closed: number;
  instances: number;
}

export interface ChatStartPayload {
  whatsapp_instance_id: number;
  phone: string;
  message: string;
  contact_name?: string;
}
