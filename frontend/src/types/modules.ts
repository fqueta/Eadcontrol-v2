/**
 * modules.ts — Tipos para Módulos
 * pt-BR: Define os tipos do payload e registro de módulos.
 * en-US: Defines payload and record types for modules.
 */

export interface ModulePayload {
  title: string;
  name: string;
  tipo_duracao: 'seg' | 'min' | 'hrs' | '';
  duration: string; // armazenado como string numérica
  content: string;
  description: string;
  active: boolean; // envia true/false para API
}

export interface ModuleRecord extends Omit<ModulePayload, 'active'> {
  id: string | number;
  // Aceita formatações diversas vindas do backend
  active: boolean | 's' | 'n' | '' | 1 | 0;
}