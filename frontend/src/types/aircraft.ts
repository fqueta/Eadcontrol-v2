import { Client } from './index';

/**
 * Interface para aeronave
 */
export interface Aircraft {
  id: string;
  client_id: string;
  client?: Client;
  matricula: string;
  config?: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Tipo para registro de aeronave (alias para Aircraft)
 */
export type AircraftRecord = Aircraft;

/**
 * Interface para criação de aeronave
 */
export interface CreateAircraftInput {
  client_id: string;
  matricula: string;
  config?: string;
  description?: string;
  active?: boolean;
}

/**
 * Interface para atualização de aeronave
 */
export interface UpdateAircraftInput {
  client_id?: string;
  matricula?: string;
  config?: string;
  description?: string;
  active?: boolean;
}

/**
 * Interface para parâmetros de listagem de aeronaves
 */
export interface AircraftListParams {
  search?: string;
  client_id?: string;
  page?: number;
  per_page?: number;
  /**
   * pt-BR: Filtrar por status ativo/inativo. Se omitido, retorna todos.
   * en-US: Filter by active/inactive status. When omitted, returns all.
   */
  active?: boolean;
}