import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { whatsappService } from '@/services/whatsappService';
import type {
  WhatsappInstance,
  WhatsappInstancesResponse,
  WhatsappNotificationSettingsResponse,
} from '@/types/whatsapp';

/**
 * Hooks das conexões WhatsApp (Evolution GO).
 * pt-BR: Lista, criação, conexão (QR/pareamento) e status das instâncias.
 */

export const whatsappKeys = {
  all: ['whatsapp-instances'] as const,
  list: () => [...whatsappKeys.all, 'list'] as const,
  detail: (id: number | string) => [...whatsappKeys.all, 'detail', String(id)] as const,
  notifications: () => [...whatsappKeys.all, 'notifications'] as const,
};

export function useWhatsappInstances(options?: { refetchInterval?: number }) {
  return useQuery<WhatsappInstancesResponse>({
    queryKey: whatsappKeys.list(),
    queryFn: () => whatsappService.list(),
    staleTime: 15 * 1000,
    refetchInterval: options?.refetchInterval,
  });
}

export function useWhatsappInstance(id?: number | string) {
  return useQuery<{ data: WhatsappInstance }>({
    queryKey: whatsappKeys.detail(id ?? ''),
    queryFn: () => whatsappService.show(id as number | string),
    enabled: !!id,
    staleTime: 10 * 1000,
  });
}

export function useCreateWhatsappInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { display_name: string; phone_number?: string }) => whatsappService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.all });
    },
  });
}

export function useConnectWhatsappInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => whatsappService.connect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.all });
    },
  });
}

export function usePairWhatsappInstance() {
  return useMutation({
    mutationFn: ({ id, phone }: { id: number | string; phone: string }) => whatsappService.pair(id, phone),
  });
}

export function useDisconnectWhatsappInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => whatsappService.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.all });
    },
  });
}

export function useReconnectWhatsappInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => whatsappService.reconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.all });
    },
  });
}

export function useDeleteWhatsappInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => whatsappService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.all });
    },
  });
}

export function useToggleInstanceAi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: number | string; isActive?: boolean }) =>
      whatsappService.toggleAi(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.all });
    },
  });
}

export function useSendWhatsappMessage() {
  return useMutation({
    mutationFn: ({ id, phone, message }: { id: number | string; phone: string; message: string }) =>
      whatsappService.sendMessage(id, { phone, message }),
  });
}

export function useWhatsappNotificationSettings() {
  return useQuery<WhatsappNotificationSettingsResponse>({
    queryKey: whatsappKeys.notifications(),
    queryFn: () => whatsappService.notificationSettings(),
    staleTime: 30 * 1000,
  });
}

export function useUpdateWhatsappNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      enabled: boolean;
      instance_id?: number | null;
      recipients?: string;
      events?: string[];
    }) => whatsappService.updateNotificationSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.notifications() });
    },
  });
}

export function useTestWhatsappNotification() {
  return useMutation({
    mutationFn: (phone?: string) => whatsappService.testNotification(phone ? { phone } : {}),
  });
}
