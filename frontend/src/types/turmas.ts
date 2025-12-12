/**
 * Turmas Types
 * pt-BR: Tipos da entidade Turma baseados no migration Laravel compartilhado.
 * en-US: Turma entity types based on the provided Laravel migration.
 */

// Enum comum para flags 's'/'n'
export type SimNao = 's' | 'n';

/**
 * TurmaRecord
 * pt-BR: Representa um registro completo retornado pela API.
 * en-US: Represents a full record returned by the API.
 */
export interface TurmaRecord {
  id: number;
  token: string;
  id_curso: number;

  // Campos principais
  nome?: string | null;
  inicio?: string | null; // ISO date string (YYYY-MM-DD)
  fim?: string | null; // ISO date string (YYYY-MM-DD)
  professor: number;

  // Pagamento e valores
  Pgto?: string | null;
  Valor?: number | null;
  Matricula?: number | null;

  // Horários
  hora_inicio?: string | null; // HH:mm:ss
  hora_fim?: string | null; // HH:mm:ss

  // Duração
  duracao?: number | null;
  unidade_duracao: string;

  // Dias da semana
  dia1: SimNao;
  dia2: SimNao;
  dia3: SimNao;
  dia4: SimNao;
  dia5: SimNao;
  dia6: SimNao;
  dia7: SimNao;

  // Horário definido
  TemHorario: SimNao;

  // Quadro e metadata
  Quadro: string;

  // Autor e flags
  autor: number;
  ativo: SimNao;

  // Ordenação e datas
  ordenar: number;
  data: string; // datetime
  atualiza: string; // datetime

  // Campos adicionais
  CodGrade?: number | null;
  Cidade?: string | null;
  QuemseDestina?: string | null;
  Novo?: string | null; // char(1)
  obs?: string | null;

  // Lixeira e registros
  excluido: 'n' | 's';
  reg_excluido: string;
  deletado: 'n' | 's';
  reg_deletado: string;

  // Capacidade
  max_alunos: number;
  min_alunos: number;

  // Configuração
  config?: any | null;

  // Timestamps modernos
  created_at?: string;
  updated_at?: string;
}

/**
 * TurmaPayload
 * pt-BR: Payload para criação/atualização; segue nomes de colunas da API.
 * en-US: Payload for create/update; follows API column names.
 */
export interface TurmaPayload {
  token: string;
  id_curso: number;

  nome?: string | null;
  inicio?: string | null; // YYYY-MM-DD
  fim?: string | null; // YYYY-MM-DD
  professor: number;

  Pgto?: string | null;
  Valor?: number | null;
  Matricula?: number | null;

  hora_inicio?: string | null; // HH:mm:ss
  hora_fim?: string | null; // HH:mm:ss

  duracao?: number | null;
  unidade_duracao: string;

  dia1?: SimNao;
  dia2?: SimNao;
  dia3?: SimNao;
  dia4?: SimNao;
  dia5?: SimNao;
  dia6?: SimNao;
  dia7?: SimNao;

  TemHorario?: SimNao;

  Quadro?: string | null;
  autor: number;
  ativo: SimNao;

  ordenar?: number | null;
  data?: string | null;
  atualiza?: string | null;

  CodGrade?: number | null;
  Cidade?: string | null;
  QuemseDestina?: string | null;
  Novo?: string | null;
  obs?: string | null;

  excluido?: 'n' | 's';
  reg_excluido?: string | null;
  deletado?: 'n' | 's';
  reg_deletado?: string | null;

  max_alunos?: number | null;
  min_alunos?: number | null;

  config?: any | null;
}

/**
 * TurmasListParams
 * pt-BR: Parâmetros de listagem com paginação e busca.
 * en-US: Listing params with pagination and search.
 */
export interface TurmasListParams {
  page?: number;
  per_page?: number;
  search?: string;
  /**
   * id_curso
   * pt-BR: Filtra turmas pelo ID do curso.
   * en-US: Filters classes by course ID.
   */
  id_curso?: number;
}