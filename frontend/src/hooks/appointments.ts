import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsService } from '@/services/appointmentsService';
import type {
  AppointmentPayload,
  AppointmentRecord,
  AppointmentSlot,
  PublicBookingPayload,
  PublicProfessional,
  PublicServiceItem,
} from '@/types/appointments';

/**
 * Hooks de agendamento do salão.
 * pt-BR: Listagem para calendário, CRUD, horários disponíveis e booking público.
 */

export function useAppointments(params?: {
  from?: string;
  to?: string;
  assignedTo?: string;
  status?: string;
  source?: string;
  clientId?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['appointments', params],
    queryFn: () => appointmentsService.listAppointments(params),
    staleTime: 15 * 1000,
  });
}

export function useAppointment(id?: number | string) {
  return useQuery({
    queryKey: ['appointments', 'detail', id],
    queryFn: () => appointmentsService.getById(id as number | string),
    enabled: !!id,
  });
}

export function useCreateAppointment(mutationOptions?: any) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...rest } = mutationOptions ?? {};

  return useMutation({
    mutationFn: (data: AppointmentPayload) => appointmentsService.create(data),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onSuccess?.(data, variables, context);
    },
    onError,
    ...rest,
  });
}

export function useUpdateAppointment(mutationOptions?: any) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...rest } = mutationOptions ?? {};

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<AppointmentPayload> }) =>
      appointmentsService.update(id, data as AppointmentPayload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onSuccess?.(data, variables, context);
    },
    onError,
    ...rest,
  });
}

export function useUpdateAppointmentStatus(mutationOptions?: any) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...rest } = mutationOptions ?? {};

  return useMutation({
    mutationFn: ({ id, status }: { id: number | string; status: string }) =>
      appointmentsService.updateStatus(id, status),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onSuccess?.(data, variables, context);
    },
    onError,
    ...rest,
  });
}

export function useDeleteAppointment(mutationOptions?: any) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...rest } = mutationOptions ?? {};

  return useMutation({
    mutationFn: (id: number | string) => appointmentsService.deleteById(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onSuccess?.(data, variables, context);
    },
    onError,
    ...rest,
  });
}

export function useAvailableSlots(params?: {
  date: string;
  assignedTo?: string;
  serviceId?: number;
  duration?: number;
  open_hour?: number;
  close_hour?: number;
  step_minutes?: number;
}) {
  return useQuery<{ data: AppointmentSlot[]; duration: number }>({
    queryKey: ['appointments-slots', params],
    queryFn: () => appointmentsService.availableSlots(params as any),
    enabled: !!params?.date,
    staleTime: 15 * 1000,
  });
}

/** Serviços disponíveis para a página pública de agendamento */
export function usePublicServices() {
  return useQuery<PublicServiceItem[]>({
    queryKey: ['public-booking-services'],
    queryFn: () => appointmentsService.publicServices(),
    staleTime: 60 * 1000,
  });
}

/** Profissionais disponíveis para a página pública de agendamento */
export function usePublicProfessionals() {
  return useQuery<PublicProfessional[]>({
    queryKey: ['public-booking-professionals'],
    queryFn: () => appointmentsService.publicProfessionals(),
    staleTime: 60 * 1000,
  });
}

/** Horários disponíveis para a página pública de agendamento */
export function usePublicSlots(params?: {
  date: string;
  assignedTo?: string;
  serviceId?: number;
  duration?: number;
}) {
  return useQuery<{ data: AppointmentSlot[]; duration: number }>({
    queryKey: ['public-booking-slots', params],
    queryFn: () => appointmentsService.publicSlots(params as any),
    enabled: !!params?.date,
    staleTime: 15 * 1000,
  });
}

/** Cria agendamento pelo link público */
export function usePublicBooking(mutationOptions?: any) {
  return useMutation({
    mutationFn: (data: PublicBookingPayload) => appointmentsService.publicBooking(data),
    ...mutationOptions,
  });
}