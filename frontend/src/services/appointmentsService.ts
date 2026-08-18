import { GenericApiService } from './GenericApiService';
import type {
  AppointmentPayload,
  AppointmentRecord,
  AppointmentSlot,
  PublicBookingPayload,
  PublicProfessional,
  PublicServiceItem,
} from '@/types/appointments';

/**
 * AppointmentsService — agendamentos do salão.
 * pt-BR: Encapsula o CRUD de agendamentos, horários disponíveis e agendamento público.
 */
class AppointmentsService extends GenericApiService<AppointmentRecord, AppointmentPayload, AppointmentPayload> {
  constructor() {
    super('/appointments');
  }

  /** Lista agendamentos com filtros (calendário) */
  async listAppointments(params?: {
    from?: string;
    to?: string;
    assignedTo?: string;
    status?: string;
    source?: string;
    clientId?: string;
    search?: string;
  }): Promise<{ data: AppointmentRecord[] }> {
    const { assignedTo, clientId, ...rest } = params ?? {};
    const response = await this.get<{ data: AppointmentRecord[] }>('/appointments', {
      ...rest,
      ...(assignedTo ? { assigned_to: assignedTo } : {}),
      ...(clientId ? { client_id: clientId } : {}),
    });
    return response ?? { data: [] };
  }

  /** Atualiza o status respeitando a state machine */
  async updateStatus(id: number | string, status: string): Promise<AppointmentRecord> {
    const response = await this.patch<{ data: AppointmentRecord }>(`/appointments/${id}/status`, { status });
    return response?.data ?? (response as unknown as AppointmentRecord);
  }

  /** Horários disponíveis (painel) */
  async availableSlots(params: {
    date: string;
    assignedTo?: string;
    serviceId?: number;
    duration?: number;
    open_hour?: number;
    close_hour?: number;
    step_minutes?: number;
  }): Promise<{ data: AppointmentSlot[]; duration: number }> {
    const response = await this.get<{ data: AppointmentSlot[]; duration: number }>('/appointments/available/slots', params);
    return response ?? { data: [], duration: 30 };
  }

  /** Serviços disponíveis para agendamento público */
  async publicServices(): Promise<PublicServiceItem[]> {
    const response = await this.get<{ data: PublicServiceItem[] }>('/public/booking/services');
    return response?.data ?? [];
  }

  /** Profissionais disponíveis para agendamento público */
  async publicProfessionals(): Promise<PublicProfessional[]> {
    const response = await this.get<{ data: PublicProfessional[] }>('/public/booking/professionals');
    return response?.data ?? [];
  }

  /** Horários disponíveis (público) */
  async publicSlots(params: {
    date: string;
    assignedTo?: string;
    serviceId?: number;
    duration?: number;
    open_hour?: number;
    close_hour?: number;
    step_minutes?: number;
  }): Promise<{ data: AppointmentSlot[]; duration: number }> {
    const response = await this.get<{ data: AppointmentSlot[]; duration: number }>('/public/booking/slots', params);
    return response ?? { data: [], duration: 30 };
  }

  /** Cria agendamento pelo link público do cliente */
  async publicBooking(data: PublicBookingPayload): Promise<AppointmentRecord> {
    const response = await this.post<{ data: AppointmentRecord }>('/public/booking', data);
    return response?.data ?? (response as unknown as AppointmentRecord);
  }
}

/**
 * Instância padrão exportada
 */
export const appointmentsService = new AppointmentsService();