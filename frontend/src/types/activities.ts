/**
 * activities.ts — Tipos para Atividades
 * pt-BR: Define os tipos do payload e registro de atividades.
 * en-US: Defines payload and record types for activities.
 */

export type ActivityType = 'video' | 'apostila' | 'avaliacao' | '';

export interface ActivityPayload {
  title: string;
  name: string;
  type_duration: 'seg' | 'min' | 'hrs' | '';
  type_activities: ActivityType;
  duration: string; // armazenado como string numérica
  content: string; // link de vídeo, texto, URL de arquivo ou JSON de questões
  description: string;
  active: boolean; // envia true/false para API
}

export interface ActivityRecord extends Omit<ActivityPayload, 'active'> {
  id: string | number;
  // Aceita formatações diversas vindas do backend
  active: boolean | 's' | 'n' | '' | 1 | 0;
}