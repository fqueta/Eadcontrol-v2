/**
 * AttendanceLog type
 * pt-BR: Tipo para registro de atendimento do cliente.
 * en-US: Type for client attendance/service log entry.
 */
export interface AttendanceLog {
  /**
   * pt-BR: ID único do registro.
   * en-US: Unique entry ID.
   */
  id: string;

  /**
   * pt-BR: ID do cliente relacionado ao atendimento.
   * en-US: Related client ID.
   */
  clientId: string;

  /**
   * pt-BR: Data/hora ISO do registro.
   * en-US: ISO datetime string of the log entry.
   */
  timestamp: string;

  /**
   * pt-BR: Observação opcional sobre o atendimento prestado.
   * en-US: Optional observation/note about the provided service.
   */
  observation?: string;

  /**
   * pt-BR: Identificador do usuário/atendente (opcional).
   * en-US: Agent/user identifier (optional).
   */
  agentId?: string;
}

/**
 * pt-BR: Estrutura retornada ao criar um novo registro de atendimento.
 * en-US: Structure returned when creating a new attendance log.
 */
export interface CreateAttendanceInput {
  clientId: string;
  observation?: string;
  agentId?: string;
}

/**
 * CreateClientAttendanceInput
 * pt-BR: Payload aceito pela API para registrar atendimento do cliente.
 * en-US: API-accepted payload to register a client attendance.
 */
export interface CreateClientAttendanceInput {
  /**
   * pt-BR: Canal do atendimento (ex.: 'email', 'phone', 'chat', 'whatsapp').
   * en-US: Service channel (e.g., 'email', 'phone', 'chat', 'whatsapp').
   */
  channel: string;

  /**
   * pt-BR: Observação opcional inserida pelo atendente.
   * en-US: Optional note entered by the agent.
   */
  observation?: string;

  /**
   * pt-BR: Metadados opcionais do atendimento.
   * en-US: Optional attendance metadata.
   */
  metadata?: {
    duration?: number;
    tags?: string[];
    [key: string]: any;
  };

  /**
   * pt-BR: Funil relacionado ao atendimento. Quando presente, permite opcionalmente
   *        atualizar a etapa do cliente no mesmo envio.
   * en-US: Funnel related to the attendance. When present, optionally allows
   *        updating the client's stage within the same request.
   */
  funnelId?: string;

  /**
   * pt-BR: Etapa alvo dentro do funil selecionado. Envie o `stage_id` atual
   *        ou a nova etapa para efetivar a mudança.
   * en-US: Target stage within the selected funnel. Send the current `stage_id`
   *        or the new stage to apply the change.
   */
  stage_id?: string;
}