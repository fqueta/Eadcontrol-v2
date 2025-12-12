/**
 * Tipos relacionados a serviços
 */

/**
 * Serviço base
 */
export interface Service {
  id: string;
  name: string;
  description?: string;
  category: string;
  category_id?: string;
  price: number;
  estimatedDuration: number; // em minutos
  unit: string; // hora, dia, etc.
  active: boolean;
  requiresMaterials: boolean;
  skillLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
  created_at?: string;
  updated_at?: string;
}

/**
 * Dados para criar um novo serviço
 */
export interface CreateServiceInput {
  name: string;
  description?: string;
  category: string;
  price: number;
  estimatedDuration: number;
  unit: string;
  active: boolean;
  requiresMaterials: boolean;
  skillLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
}

/**
 * Dados para atualizar um serviço
 */
export interface UpdateServiceInput {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  estimatedDuration?: number;
  unit?: string;
  active?: boolean;
  requiresMaterials?: boolean;
  skillLevel?: 'basic' | 'intermediate' | 'advanced' | 'expert';
}

/**
 * Dados do formulário de serviço
 */
export interface ServiceFormData {
  name: string;
  description: string;
  category: string;
  price: number;
  estimatedDuration: number;
  unit: string;
  active: boolean;
  requiresMaterials: boolean;
  skillLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
}

/**
 * Registro de serviço com metadados adicionais
 */
export interface ServiceRecord extends Service {
  // Campos adicionais que podem vir do backend
}

/**
 * Filtros para busca de serviços
 */
export interface ServiceFilters {
  search?: string;
  category?: string;
  active?: boolean;
  skillLevel?: 'basic' | 'intermediate' | 'advanced' | 'expert';
  requiresMaterials?: boolean;
  priceRange?: {
    min?: number;
    max?: number;
  };
}

/**
 * Categoria de serviço
 */
export interface ServiceCategory {
  id: string;
  name: string;
}

/**
 * Unidade de tempo para serviços
 */
export interface ServiceUnit {
  value: string;
  label: string;
}

/**
 * Níveis de habilidade disponíveis
 */
export const SKILL_LEVELS = [
  { value: 'basic', label: 'Básico' },
  { value: 'intermediate', label: 'Intermediário' },
  { value: 'advanced', label: 'Avançado' },
  { value: 'expert', label: 'Especialista' }
] as const;

/**
 * Unidades de tempo padrão
 */
export const TIME_UNITS = [
  { value: 'minutes', label: 'Minutos' },
  { value: 'hours', label: 'Horas' },
  { value: 'days', label: 'Dias' },
  { value: 'weeks', label: 'Semanas' }
] as const;