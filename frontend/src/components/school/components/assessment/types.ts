import React from 'react';

export interface QuizOption {
  id?: string | number;
  texto: string;
  correta: boolean;
}

export interface QuizQuestionData {
  id?: string | number;
  tipo_pergunta: 'multipla_escolha' | 'verdadeiro_falso' | string;
  enunciado: string;
  pontos: number;
  opcoes?: QuizOption[];
  resposta_correta?: 'verdadeiro' | 'falso' | string;
}

export interface QuizConfigData {
  nota_minima?: number;
  tentativas?: number;
  time_limit?: number;
  mostrar_respostas?: boolean;
  mostrar_correcao?: boolean;
}

export interface QuestionEditorProps {
  question: QuizQuestionData;
  questionIndex: number;
  onUpdateField: (field: keyof QuizQuestionData, value: any) => void;
  onUpdateOption: (optionIndex: number, field: keyof QuizOption, value: any) => void;
  onAddOption: () => void;
  onRemoveOption: (optionIndex: number) => void;
}

/**
 * QuestionStrategy (Strategy Pattern)
 * pt-BR: Interface que cada tipo de questão (Múltipla Escolha, V/F, etc.) implementa.
 * en-US: Interface that each question type implements.
 */
export interface QuestionStrategy {
  type: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  createDefault: () => QuizQuestionData;
  renderEditor: (props: QuestionEditorProps) => React.ReactNode;
  renderSummary: (question: QuizQuestionData) => React.ReactNode;
}
