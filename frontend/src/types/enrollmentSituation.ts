/**
 * Enrollment Situation Types
 * pt-BR: Tipos e payloads para Situações de Matrícula.
 * en-US: Types and payloads for Enrollment Situations.
 */

/**
 * EnrollmentSituation
 * pt-BR: Representa uma situação de matrícula retornada pela API.
 * en-US: Represents an enrollment situation returned by the API.
 */
export interface EnrollmentSituation {
  id: number | string;
  name: string;
  description?: string | null;
  ativo: 's' | 'n';
  /**
   * pt-BR: Campos adicionais podem existir dependendo da API.
   * en-US: Additional fields may exist depending on the API.
   */
  [key: string]: any;
}

/**
 * EnrollmentSituationCreatePayload
 * pt-BR: Payload para criação de situação de matrícula.
 * en-US: Payload for creating an enrollment situation.
 */
export interface EnrollmentSituationCreatePayload {
  name: string;
  description?: string;
  ativo: 's' | 'n';
}

/**
 * EnrollmentSituationUpdatePayload
 * pt-BR: Payload para atualização de situação de matrícula.
 * en-US: Payload for updating an enrollment situation.
 */
export interface EnrollmentSituationUpdatePayload {
  name?: string;
  description?: string | null;
  ativo?: 's' | 'n';
}

/**
 * EnrollmentSituationListParams
 * pt-BR: Parâmetros de listagem com paginação e busca.
 * en-US: Listing params with pagination and search.
 */
export interface EnrollmentSituationListParams {
  page?: number;
  per_page?: number;
  search?: string;
  order?: 'asc' | 'desc';
  sort?: string;
}