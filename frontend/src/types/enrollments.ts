/**
 * Enrollment types
 * pt-BR: Tipos para registros de matrículas, filtros e payloads mínimos.
 * en-US: Types for enrollment records, filters and minimal payloads.
 */
export interface EnrollmentRecord {
  /**
   * Unique identifier
   * pt-BR: Identificador único da matrícula.
   * en-US: Unique identifier for the enrollment.
   */
  id: string;
  /**
   * Display name
   * pt-BR: Nome exibido, pode ser do aluno ou descrição da matrícula.
   * en-US: Display name, may be student name or enrollment description.
   */
  name?: string;
  /**
   * Student name (optional)
   * pt-BR: Nome do aluno (se disponível no payload da API).
   * en-US: Student name (if available from API payload).
   */
  student_name?: string;
  /**
   * Course name (optional)
   * pt-BR: Nome do curso associado.
   * en-US: Associated course name.
   */
  course_name?: string;
  /**
   * Status string
   * pt-BR: Status textual da matrícula.
   * en-US: Textual enrollment status.
   */
  status?: string;
  /**
   * Amount in BRL
   * pt-BR: Valor em BRL (se disponível).
   * en-US: Amount in BRL (if available).
   */
  amount_brl?: number;
  /**
   * Arbitrary preferences
   * pt-BR: Campo genérico para metadados vindos da API.
   * en-US: Generic field for API-provided metadata.
   */
  preferencias?: any;
  /**
   * Configuration
   * pt-BR: Configurações, incluindo possíveis `funnelId` e `stage_id`.
   * en-US: Configuration, including possible `funnelId` and `stage_id`.
   */
  config?: { funnelId?: string | number | null; stage_id?: string | number | null; [key: string]: any };
  /**
   * Expiration date
   * pt-BR: Data de validade de acesso ao conteúdo.
   * en-US: Content access expiration date.
   */
  validade_acesso?: string | null;
  /**
   * Generic index signature
   * pt-BR: Permite campos adicionais sem quebrar o TypeScript.
   * en-US: Allows additional fields without breaking TypeScript.
   */
  [key: string]: any;
}

export interface CreateEnrollmentInput {
  name: string;
  student_id?: string;
  course_id?: string;
  amount_brl?: number;
  config?: { funnelId?: string | number | null; stage_id?: string | number | null; [key: string]: any };
  validade_acesso?: string | null;
}

export interface UpdateEnrollmentInput extends Partial<CreateEnrollmentInput> {}

export interface EnrollmentsListParams {
  /**
   * Pagination and filters
   * pt-BR: Parâmetros de paginação e filtros.
   * en-US: Pagination parameters and filters.
   */
  page?: number;
  per_page?: number;
  search?: string;
  sort?: string;
  [key: string]: any;
}