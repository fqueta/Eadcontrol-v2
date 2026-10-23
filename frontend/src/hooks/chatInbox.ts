import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatInboxService } from '@/services/chatInboxService';
import type {
  ChatInboxResponse,
  ChatInboxStats,
  ChatMessage,
  ChatMessagesResponse,
  ChatStartPayload,
  WhatsappInstance,
} from '@/types/whatsapp';

/**
 * Hooks do inbox de atendimento.
 * pt-BR: Conversas com polling leve, mensagens, envio de texto/mídia e controle da IA.
 */

export const chatKeys = {
  all: ['chat-inbox'] as const,
  inbox: (params?: Record<string, any>) => [...chatKeys.all, 'list', params ?? {}] as const,
  messages: (id: number | string) => [...chatKeys.all, 'messages', String(id)] as const,
  instances: () => [...chatKeys.all, 'instances'] as const,
  stats: () => [...chatKeys.all, 'stats'] as const,
};

export function useChatInbox(
  params?: { instance_id?: number | string; status?: string; q?: string; per_page?: number },
  options?: { refetchInterval?: number }
) {
  return useQuery<ChatInboxResponse>({
    queryKey: chatKeys.inbox(params),
    queryFn: () => chatInboxService.inbox(params),
    staleTime: 8 * 1000,
    refetchInterval: options?.refetchInterval ?? 15000,
  });
}

export function useChatMessages(id?: number | string, options?: { refetchInterval?: number }) {
  return useQuery<ChatMessagesResponse>({
    queryKey: chatKeys.messages(id ?? ''),
    queryFn: () => chatInboxService.messages(id as number | string),
    enabled: !!id,
    staleTime: 5 * 1000,
    refetchInterval: options?.refetchInterval ?? 10000,
  });
}

export function useChatInstances() {
  return useQuery<{ data: WhatsappInstance[] }>({
    queryKey: chatKeys.instances(),
    queryFn: () => chatInboxService.instances(),
    staleTime: 60 * 1000,
  });
}

export function useChatStats(options?: { refetchInterval?: number }) {
  return useQuery<{ data: ChatInboxStats }>({
    queryKey: chatKeys.stats(),
    queryFn: () => chatInboxService.stats(),
    staleTime: 30 * 1000,
    refetchInterval: options?.refetchInterval,
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, message }: { id: number | string; message: string }) =>
      chatInboxService.send(id, message),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(variables.id) });
      queryClient.invalidateQueries({ queryKey: [...chatKeys.all, 'list'] });
    },
  });
}

export function useSendChatMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file, message }: { id: number | string; file: File; message?: string }) =>
      chatInboxService.sendMedia(id, file, message ?? ''),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(variables.id) });
      queryClient.invalidateQueries({ queryKey: [...chatKeys.all, 'list'] });
    },
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ChatStartPayload) => chatInboxService.start(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...chatKeys.all, 'list'] });
    },
  });
}

export function useCloseConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => chatInboxService.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...chatKeys.all, 'list'] });
    },
  });
}

export function useToggleConversationAi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, paused }: { id: number | string; paused?: boolean }) =>
      chatInboxService.toggleAi(id, paused),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(variables.id) });
      queryClient.invalidateQueries({ queryKey: [...chatKeys.all, 'list'] });
    },
  });
}

export type { ChatMessage };
