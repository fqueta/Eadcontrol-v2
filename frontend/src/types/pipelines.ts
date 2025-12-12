import { PaginatedResponse } from '@/types/index';

/**
 * Tipos de Funis e Etapas
 * pt-BR: Define os tipos para gestão de funis (pipelines) e suas etapas.
 * en-US: Defines types for funnels (pipelines) and their stages management.
 */

// Funil (Pipeline)
export interface FunnelRecord {
  id: string;
  name: string;
  description?: string | null;
  /**
   * pt-BR: Cor do funil em hexadecimal (ex.: #3b82f6)
   * en-US: Funnel color in hexadecimal (e.g., #3b82f6)
   */
  color?: string;
  /**
   * pt-BR: Status de atividade do funil (novo campo)
   * en-US: Funnel activity status (new field)
   */
  isActive?: boolean;
  /**
   * pt-BR: Configurações adicionais do funil em JSON
   * en-US: Additional funnel settings as JSON
   */
  settings?: FunnelSettings | null;
  /**
   * pt-BR: Campo legado para compatibilidade (será substituído por isActive)
   * en-US: Legacy field for compatibility (to be replaced by isActive)
   */
  active?: boolean;
  order?: number; // posição do funil na lista
  created_at?: string;
  updated_at?: string;
}

// Etapa dentro de um Funil
export interface StageRecord {
  id: string;
  funnel_id: string;
  name: string;
  description?: string | null;
  order?: number; // posição da etapa no funil
  probability?: number; // probabilidade de ganho (0-100)
  /**
   * pt-BR: Cor da etapa em hexadecimal (ex.: #3b82f6)
   * en-US: Stage color in hexadecimal (e.g., #3b82f6)
   */
  color?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Inputs para criação/atualização
export interface CreateFunnelInput {
  name: string;
  description?: string | null;
  /**
   * pt-BR: Cor do funil (hexadecimal)
   * en-US: Funnel color (hexadecimal)
   */
  color?: string;
  /**
   * pt-BR: Status de atividade
   * en-US: Activity status
   */
  isActive?: boolean;
  /**
   * pt-BR: Configurações adicionais em JSON
   * en-US: Additional settings as JSON
   */
  settings?: FunnelSettings | null;
  // Compatibilidade: ainda aceita 'active' durante transição
  active?: boolean;
  order?: number;
}

export interface UpdateFunnelInput {
  name?: string;
  description?: string | null;
  /**
   * pt-BR: Cor do funil (hexadecimal)
   * en-US: Funnel color (hexadecimal)
   */
  color?: string;
  /**
   * pt-BR: Status de atividade
   * en-US: Activity status
   */
  isActive?: boolean;
  /**
   * pt-BR: Configurações adicionais em JSON
   * en-US: Additional settings as JSON
   */
  settings?: FunnelSettings | null;
  // Compatibilidade: ainda aceita 'active' durante transição
  active?: boolean;
  order?: number;
}

export interface CreateStageInput {
  name: string;
  description?: string | null;
  order?: number;
  probability?: number;
  /** Cor opcional da etapa (hex) */
  color?: string;
  active?: boolean;
  /**
   * pt-BR: ID do funil ao qual a etapa pertence (necessário para endpoint plano de criação).
   * en-US: Funnel ID the stage belongs to (required for flat create endpoint).
   */
  funnel_id?: string;
}

export interface UpdateStageInput {
  name?: string;
  description?: string | null;
  order?: number;
  probability?: number;
  /** Cor opcional da etapa (hex) */
  color?: string;
  active?: boolean;
  /**
   * pt-BR: ID do funil ao qual a etapa pertence (necessário para novo endpoint plano).
   * en-US: Funnel ID the stage belongs to (required for new flat endpoint).
   */
  funnel_id?: string;
}

// List params
export interface FunnelsListParams {
  page?: number;
  per_page?: number;
  search?: string;
  active?: boolean;
}

export interface StagesListParams {
  page?: number;
  per_page?: number;
  search?: string;
  funnel_id?: string;
  active?: boolean;
}

// Responses
export type FunnelsResponse = PaginatedResponse<FunnelRecord>;
export type StagesResponse = PaginatedResponse<StageRecord>;
/**
 * FunnelSettings
 * pt-BR: Configurações estruturadas do funil.
 * en-US: Structured funnel settings.
 */
export interface FunnelSettings {
  /** pt-BR: Avança automaticamente a etapa em certas ações; en-US: Auto advance stage */
  autoAdvance?: boolean;
  /** pt-BR: Requer aprovação para mudanças; en-US: Requires approval for changes */
  requiresApproval?: boolean;
  /** pt-BR: Habilita notificações; en-US: Enable notifications */
  notificationEnabled?: boolean;
  /**
   * pt-BR: Área do funil (vendas ou atendimento)
   * en-US: Funnel area (sales or support)
   */
  place?: 'vendas' | 'atendimento';
}