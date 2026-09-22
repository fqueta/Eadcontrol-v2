import React from 'react';
import { ToggleLeft, CheckCircle2, XCircle } from 'lucide-react';
import { QuestionStrategy, QuestionEditorProps, QuizQuestionData } from '../types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/RichTextEditor';

const generateId = () => Math.random().toString(36).substring(2, 9);

export const TrueFalseStrategy: QuestionStrategy = {
  type: 'verdadeiro_falso',
  label: 'Questão Verdadeiro ou Falso',
  shortLabel: 'Verdadeiro ou Falso',
  description: 'O aluno julga se a afirmação é verdadeira ou falsa.',
  icon: ToggleLeft,

  createDefault: (): QuizQuestionData => ({
    id: generateId(),
    tipo_pergunta: 'verdadeiro_falso',
    enunciado: '',
    pontos: 1,
    resposta_correta: 'verdadeiro',
  }),

  renderEditor: ({
    question,
    onUpdateField,
  }: QuestionEditorProps) => {
    const isVerdadeiro = (question.resposta_correta || 'verdadeiro') === 'verdadeiro';

    return (
      <div className="space-y-4">
        {/* Enunciado */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Afirmação a ser Julgada</span>
            <span className="text-[10px] lowercase font-normal text-muted-foreground/70">formate com negrito ou itálico</span>
          </Label>
          <div className="min-h-[90px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-background">
            <RichTextEditor
              value={question.enunciado || ''}
              onChange={(html) => onUpdateField('enunciado', html)}
              placeholder="Digite a afirmação que o aluno deve julgar como Verdadeira ou Falsa..."
            />
          </div>
        </div>

        {/* Pontuação & Gabarito */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/60 items-center">
          <div className="flex items-center gap-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pontos da Questão:</Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              className="h-8 w-24 text-center font-bold text-xs rounded-lg"
              value={question.pontos ?? 1}
              onChange={(e) => onUpdateField('pontos', Number(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Gabarito Correto:
            </Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdateField('resposta_correta', 'verdadeiro')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isVerdadeiro
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                    : 'bg-background hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 text-muted-foreground'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" /> Verdadeiro
              </button>

              <button
                type="button"
                onClick={() => onUpdateField('resposta_correta', 'falso')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  !isVerdadeiro
                    ? 'bg-red-500 text-white border-red-600 shadow-sm'
                    : 'bg-background hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 text-muted-foreground'
                }`}
              >
                <XCircle className="h-4 w-4" /> Falso
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },

  renderSummary: (question: QuizQuestionData) => {
    const isV = (question.resposta_correta || 'verdadeiro') === 'verdadeiro';
    return (
      <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <span>Gabarito:</span>
        <span className={`font-bold ${isV ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
          {isV ? 'Verdadeiro' : 'Falso'}
        </span>
      </span>
    );
  },
};
