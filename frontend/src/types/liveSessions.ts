/**
 * LiveSession — tipos para sessões de aulas ao vivo.
 * pt-BR: Define os contratos de dados para o agendamento de aulas ao vivo.
 * en-US: Data contracts for live class session scheduling.
 */

export type LiveSessionStatus = 'agendado' | 'ao_vivo' | 'encerrado' | 'cancelado';

/** Registro completo retornado pela API */
export interface LiveSessionRecord {
  id: number;
  id_curso: number | null;
  id_turma: number | null;
  titulo: string;
  link: string | null;
  duracao_minutos: number | null;
  inicio: string; // ISO 8601
  fim: string | null;
  descricao: string | null;
  status: LiveSessionStatus;
  cor: string;
  config: Record<string, unknown> | null;
  criado_por: number | null;
  absent_user_ids?: string[];
  created_at: string;
  updated_at: string;
}

/** Payload para criar/atualizar */
export interface LiveSessionPayload {
  id_curso?: number | null;
  id_turma?: number | null;
  titulo: string;
  link?: string | null;
  duracao_minutos?: number | null;
  inicio: string;
  fim?: string | null;
  descricao?: string | null;
  status?: LiveSessionStatus;
  cor?: string;
  config?: Record<string, unknown>;
}

/** Parâmetros de listagem/filtro */
export interface LiveSessionListParams {
  id_curso?: number | string;
  id_turma?: number | string;
  status?: LiveSessionStatus;
  mes?: number;
  ano?: number;
  de?: string;
  ate?: string;
  page?: number;
  per_page?: number;
}
