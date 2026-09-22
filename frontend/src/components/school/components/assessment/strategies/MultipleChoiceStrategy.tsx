import React from 'react';
import { ListChecks, Plus, X, CheckCircle2 } from 'lucide-react';
import { QuestionStrategy, QuestionEditorProps, QuizQuestionData } from '../types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/ui/RichTextEditor';

const generateId = () => Math.random().toString(36).substring(2, 9);

export const MultipleChoiceStrategy: QuestionStrategy = {
  type: 'multipla_escolha',
  label: 'Questão Múltipla Escolha',
  shortLabel: 'Múltipla Escolha',
  description: 'O aluno seleciona uma alternativa correta entre várias opções.',
  icon: ListChecks,

  createDefault: (): QuizQuestionData => ({
    id: generateId(),
    tipo_pergunta: 'multipla_escolha',
    enunciado: '',
    pontos: 1,
    opcoes: [
      { id: generateId(), texto: '', correta: true },
      { id: generateId(), texto: '', correta: false },
      { id: generateId(), texto: '', correta: false },
      { id: generateId(), texto: '', correta: false },
    ],
  }),

  renderEditor: ({
    question,
    questionIndex,
    onUpdateField,
    onUpdateOption,
    onAddOption,
    onRemoveOption,
  }: QuestionEditorProps) => {
    const opcoes = question.opcoes || [];

    return (
      <div className="space-y-4">
        {/* Enunciado */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Enunciado da Pergunta</span>
            <span className="text-[10px] lowercase font-normal text-muted-foreground/70">formate com negrito, listas ou itálico</span>
          </Label>
          <div className="min-h-[90px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-background">
            <RichTextEditor
              value={question.enunciado || ''}
              onChange={(html) => onUpdateField('enunciado', html)}
              placeholder="Digite a questão avaliativa..."
            />
          </div>
        </div>

        {/* Pontuação */}
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

        {/* Alternativas */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Alternativas de Resposta <span className="text-primary/70 font-normal">({opcoes.length})</span>
            </Label>
            <span className="text-[11px] text-muted-foreground italic">Marque a bolinha da resposta correta</span>
          </div>

          <div className="space-y-2">
            {opcoes.map((opt, optIdx) => {
              const letter = String.fromCharCode(65 + optIdx); // A, B, C, D...
              return (
                <div
                  key={opt.id || optIdx}
                  className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all ${
                    opt.correta
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-xs'
                      : 'bg-background hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <label className="flex items-center gap-1.5 cursor-pointer pl-1">
                    <input
                      type="radio"
                      name={`mc-correct-${questionIndex}-${question.id}`}
                      checked={Boolean(opt.correta)}
                      onChange={() => onUpdateOption(optIdx, 'correta', true)}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                    />
                    <span className={`text-xs font-black w-5 text-center ${opt.correta ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                      {letter})
                    </span>
                  </label>

                  <Input
                    className="h-8 flex-1 text-xs border-transparent bg-transparent hover:border-input focus:bg-background focus:border-input transition-all"
                    value={opt.texto || ''}
                    onChange={(e) => onUpdateOption(optIdx, 'texto', e.target.value)}
                    placeholder={`Texto da alternativa ${letter}...`}
                  />

                  {opt.correta && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md hidden sm:inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Correta
                    </span>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={opcoes.length <= 2}
                    className="h-7 w-7 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    onClick={() => onRemoveOption(optIdx)}
                    title="Remover alternativa"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>

          {opcoes.length < 8 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold rounded-lg hover:bg-primary/5 hover:text-primary border-dashed gap-1.5 mt-1"
              onClick={onAddOption}
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar Alternativa
            </Button>
          )}
        </div>
      </div>
    );
  },

  renderSummary: (question: QuizQuestionData) => {
    const opcoes = question.opcoes || [];
    const corretaIdx = opcoes.findIndex((o) => o.correta);
    const corretaLetter = corretaIdx >= 0 ? String.fromCharCode(65 + corretaIdx) : '?';
    return (
      <span className="text-[11px] text-muted-foreground flex items-center gap-2">
        <span>{opcoes.length} alternativas</span>
        <span className="text-muted-foreground/40">•</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Correta: {corretaLetter}</span>
      </span>
    );
  },
};
