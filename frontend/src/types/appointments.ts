/**
 * Appointments — tipos do agendamento do salão.
 * pt-BR: Contratos de dados do agendamento (painel + público).
 * en-US: Data contracts for salon appointments (panel + public).
 */

export type AppointmentStatus =
  | 'agendado'
  | 'confirmado'
  | 'em_atendimento'
  | 'concluido'
  | 'nao_compareceu'
  | 'cancelado';

export type AppointmentSource = 'admin' | 'client';

/** Registro completo retornado pela API */
export interface AppointmentRecord {
  id: number;
  clientId: string | null;
  serviceId: number | null;
  serviceOrderId: number | null;
  serviceName: string | null;
  assignedTo: string | null;
  assignedName: string | null;
  title: string | null;
  start: string; // ISO 8601
  end: string | null;
  duration: number | null;
  status: AppointmentStatus;
  source: AppointmentSource;
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  color: string | null;
  notes: string | null;
  token: string | null;
}

/** Payload para criar/atualizar pelo painel */
export interface AppointmentPayload {
  title?: string;
  clientId?: string | null;
  serviceId?: number | null;
  assignedTo?: string | null;
  start: string;
  duration?: number;
  status?: AppointmentStatus;
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  color?: string;
  notes?: string;
  /** pt-BR: Quando verdadeiro, gera uma Ordem de Serviço vinculada ao salvar. */
  generateServiceOrder?: boolean;
}

/** Parâmetros de listagem (calendário) */
export interface AppointmentListParams {
  from?: string;
  to?: string;
  assignedTo?: string;
  status?: AppointmentStatus;
  source?: AppointmentSource;
  clientId?: string;
  search?: string;
}

/** Slot de horário disponível */
export interface AppointmentSlot {
  start: string;
  end: string;
}

/** Serviço disponível para agendamento público */
export interface PublicServiceItem {
  id: number;
  name: string;
  description: string | null;
  price: number | null;
  duration: number;
}

/** Profissional disponível para agendamento público */
export interface PublicProfessional {
  id: string;
  name: string;
  /** pt-BR: true se a agenda está liberada para o agendamento público genérico. */
  public?: boolean;
}

/** Payload público de agendamento do cliente */
export interface PublicBookingPayload {
  serviceId?: number | null;
  assignedTo?: string | null;
  start: string;
  duration?: number;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  notes?: string;
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  em_atendimento: 'Em atendimento',
  concluido: 'Concluído',
  nao_compareceu: 'Não compareceu',
  cancelado: 'Cancelado',
};

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  agendado: '#8b5cf6',
  confirmado: '#0ea5e9',
  em_atendimento: '#f59e0b',
  concluido: '#10b981',
  nao_compareceu: '#64748b',
  cancelado: '#ef4444',
};