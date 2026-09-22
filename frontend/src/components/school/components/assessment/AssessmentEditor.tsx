import React, { useState, useRef } from 'react';
import {
  ListChecks,
  Sliders,
  FileText,
  Plus,
  GripVertical,
  ChevronDown,
  ChevronUp,
  X,
  Maximize2,
  Minimize2,
  CheckSquare,
  HelpCircle,
  Eye,
  CheckCircle2,
  RotateCcw,
  Clock,
  Award,
  Layers,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { QuizConfigData, QuizQuestionData } from './types';
import { getQuestionStrategy } from './strategies/registry';

export interface AssessmentEditorProps {
  activityTitle?: string;
  activityIndex: number;
  moduleIndex: number;
  description?: string;
  onDescriptionChange: (html: string) => void;
  quizConfig?: QuizConfigData;
  onUpdateQuizConfig: (field: string, val: any) => void;
  questions: QuizQuestionData[];
  onAddQuestion: (type: 'multipla_escolha' | 'verdadeiro_falso') => void;
  onRemoveQuestion: (qIdx: number) => void;
  onMoveQuestion: (fromIdx: number, toIdx: number) => void;
  onUpdateQuestion: (qIdx: number, field: keyof QuizQuestionData, val: any) => void;
  onUpdateOption: (qIdx: number, optIdx: number, field: string, val: any) => void;
  onAddOption: (qIdx: number) => void;
  onRemoveOption: (qIdx: number, optIdx: number) => void;
}

export function AssessmentEditor({
  activityTitle = 'Avaliação',
  activityIndex,
  moduleIndex,
  description = '',
  onDescriptionChange,
  quizConfig = {},
  onUpdateQuizConfig,
  questions = [],
  onAddQuestion,
  onRemoveQuestion,
  onMoveQuestion,
  onUpdateQuestion,
  onUpdateOption,
  onAddOption,
  onRemoveOption,
}: AssessmentEditorProps) {
  const [subTab, setSubTab] = useState<string>('questoes');
  const [dragQuestionIdx, setDragQuestionIdx] = useState<number | null>(null);
  const [collapsedQuestions, setCollapsedQuestions] = useState<Record<number, boolean>>({});
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const toggleQuestionCollapse = (qIdx: number) => {
    setCollapsedQuestions((prev) => ({ ...prev, [qIdx]: !prev[qIdx] }));
  };

  const collapseAll = () => {
    const next: Record<number, boolean> = {};
    questions.forEach((_, idx) => {
      next[idx] = true;
    });
    setCollapsedQuestions(next);
  };

  const expandAll = () => {
    setCollapsedQuestions({});
  };

  const scrollToQuestion = (qIdx: number) => {
    setCollapsedQuestions((prev) => ({ ...prev, [qIdx]: false }));
    setTimeout(() => {
      const el = questionRefs.current[qIdx];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.pontos) || 0), 0);

  const [highlightedQuestionIdx, setHighlightedQuestionIdx] = useState<number | null>(null);

  const handleAddQuestionAndScroll = (type: 'multipla_escolha' | 'verdadeiro_falso') => {
    setSubTab('questoes');
    const newIdx = questions.length;
    onAddQuestion(type);

    // Garante que o novo card venha expandido e com destaque visual
    setCollapsedQuestions((prev) => ({ ...prev, [newIdx]: false }));
    setHighlightedQuestionIdx(newIdx);

    // Rola a tela suavemente para centralizar o novo card adicionado
    setTimeout(() => {
      const el = questionRefs.current[newIdx];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    // Remove o efeito de brilho/destaque temporário após 2.5 segundos
    setTimeout(() => {
      setHighlightedQuestionIdx(null);
    }, 2500);
  };

  /**
   * Conteúdo principal do editor (reutilizado no modo inline e no modo tela cheia)
   */
  const renderEditorContent = (isDialog: boolean = false) => (
    <div className={`space-y-4 ${isDialog ? 'p-6 overflow-y-auto max-h-[calc(92vh-100px)]' : ''}`}>
      {/* Sub-abas da Avaliação */}
      <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
          <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl h-auto flex flex-wrap gap-1">
            <TabsTrigger
              value="questoes"
              className="rounded-lg py-1.5 px-3.5 text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-xs flex items-center gap-2"
            >
              <ListChecks className="h-3.5 w-3.5" />
              Questões da Prova
              <Badge variant="secondary" className="rounded-md px-1.5 py-0 text-[10px] font-black ml-0.5">
                {questions.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="regras"
              className="rounded-lg py-1.5 px-3.5 text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-xs flex items-center gap-2"
            >
              <Sliders className="h-3.5 w-3.5" />
              Critérios & Aprovação
              {quizConfig.nota_minima && (
                <span className="text-[10px] opacity-70">({quizConfig.nota_minima}%)</span>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="instrucoes"
              className="rounded-lg py-1.5 px-3.5 text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-xs flex items-center gap-2"
            >
              <FileText className="h-3.5 w-3.5" />
              Instruções ao Aluno
            </TabsTrigger>
          </TabsList>

          {/* Botão de Modo Focado (apenas no modo normal inline) */}
          {!isDialog && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(true)}
              className="h-8 rounded-lg text-xs font-bold text-primary hover:bg-primary/5 hover:text-primary border-primary/20 gap-1.5 shadow-xs transition-all"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Modo Focado (Tela Cheia)
            </Button>
          )}
        </div>

        {/* ---------------- ABA 1: QUESTÕES DA PROVA ---------------- */}
        <TabsContent value="questoes" className="space-y-4 pt-2">
          {/* Barra de Ações Rápidas & Navegador de Questões */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
            {/* Lado esquerdo: pílulas de navegação rápida */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
                <Layers className="h-3 w-3" /> Questões:
              </span>
              {questions.length === 0 ? (
                <span className="text-xs text-muted-foreground italic">Nenhuma questão criada ainda</span>
              ) : (
                questions.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => scrollToQuestion(idx)}
                    className="h-6 min-w-7 px-1.5 rounded-md text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all cursor-pointer shadow-2xs"
                    title={`Rolar para a Pergunta ${idx + 1}`}
                  >
                    Q{idx + 1}
                  </button>
                ))
              )}

              {questions.length > 0 && (
                <Badge variant="outline" className="ml-2 text-[10px] font-bold h-6 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
                  <Award className="h-3 w-3 mr-1 text-amber-500" />
                  Total: {totalPoints} {totalPoints === 1 ? 'pt' : 'pts'}
                </Badge>
              )}
            </div>

            {/* Lado direito: botões de adicionar e expandir/recolher */}
            <div className="flex items-center gap-2 flex-wrap">
              {questions.length > 1 && (
                <div className="flex items-center border rounded-lg overflow-hidden h-8 bg-background mr-1 text-xs">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="px-2 py-1 hover:bg-muted text-muted-foreground hover:text-foreground font-semibold transition-colors"
                  >
                    Expandir
                  </button>
                  <span className="w-px h-4 bg-border" />
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="px-2 py-1 hover:bg-muted text-muted-foreground hover:text-foreground font-semibold transition-colors"
                  >
                    Recolher
                  </button>
                </div>
              )}

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 font-bold text-xs bg-background hover:bg-primary/5 hover:text-primary border-primary/30 transition-all gap-1.5 shadow-xs"
                onClick={() => handleAddQuestionAndScroll('multipla_escolha')}
              >
                <Plus className="h-3.5 w-3.5" /> Múltipla Escolha
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 font-bold text-xs bg-background hover:bg-primary/5 hover:text-primary border-primary/30 transition-all gap-1.5 shadow-xs"
                onClick={() => handleAddQuestionAndScroll('verdadeiro_falso')}
              >
                <Plus className="h-3.5 w-3.5" /> V ou F
              </Button>
            </div>
          </div>

          {/* Estado Vazio */}
          {questions.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-muted/10 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <CheckSquare className="h-6 w-6 text-primary/70" />
              </div>
              <h5 className="text-sm font-bold text-foreground mb-1">Nenhuma questão avaliativa adicionada</h5>
              <p className="text-xs text-muted-foreground mb-4 max-w-sm">
                Adicione perguntas de múltipla escolha ou verdadeiro/falso para montar a prova ou lista de exercícios.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="font-bold text-xs gap-1.5"
                  onClick={() => handleAddQuestionAndScroll('multipla_escolha')}
                >
                  <Plus className="h-3.5 w-3.5" /> Criar 1ª Questão (Múltipla Escolha)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="font-bold text-xs gap-1.5"
                  onClick={() => handleAddQuestionAndScroll('verdadeiro_falso')}
                >
                  <Plus className="h-3.5 w-3.5" /> Criar Verdadeiro ou Falso
                </Button>
              </div>
            </div>
          )}

          {/* Lista de Questões com Alto Contraste Visual e Delimitação */}
          <div className="space-y-6 bg-slate-100/70 dark:bg-slate-950/40 p-3 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            {questions.map((q, qIdx) => {
              const strategy = getQuestionStrategy(q.tipo_pergunta || 'multipla_escolha');
              const IconComp = strategy.icon;
              const isCollapsed = Boolean(collapsedQuestions[qIdx]);
              const isHighlighted = highlightedQuestionIdx === qIdx;

              return (
                <div
                  key={q.id || qIdx}
                  ref={(el) => {
                    questionRefs.current[qIdx] = el;
                  }}
                  className={`border-2 rounded-2xl bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 overflow-hidden ${
                    q.tipo_pergunta === 'multipla_escolha'
                      ? 'border-l-[6px] border-l-indigo-500 dark:border-l-indigo-400'
                      : 'border-l-[6px] border-l-purple-500 dark:border-l-purple-400'
                  } ${
                    isHighlighted
                      ? 'border-primary ring-4 ring-primary/25 shadow-xl scale-[1.008]'
                      : 'border-slate-200/90 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'
                  }`}
                  draggable
                  onDragStart={() => setDragQuestionIdx(qIdx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragQuestionIdx !== null && dragQuestionIdx !== qIdx) {
                      onMoveQuestion(dragQuestionIdx, qIdx);
                      setDragQuestionIdx(null);
                    }
                  }}
                >
                  {/* Cabeçalho do Card da Pergunta com Alto Contraste */}
                  <div
                    className="flex items-center justify-between px-4 py-3 bg-slate-100/90 dark:bg-slate-800/90 border-b-2 border-slate-200 dark:border-slate-700/80 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-750 transition-colors group/qh"
                    onClick={() => toggleQuestionCollapse(qIdx)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Drag Handle */}
                      <div
                        className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground p-1 transition-colors rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={() => setDragQuestionIdx(qIdx)}
                        title="Arraste para reordenar"
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>

                      {isCollapsed ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-primary" />
                      )}

                      {/* Question Number Badge de Alto Impacto */}
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black text-xs px-2.5 py-0.5 rounded-lg shadow-2xs tracking-wide">
                          Q{qIdx + 1}
                        </span>
                        <span className="text-xs font-black text-foreground uppercase tracking-wider">
                          Questão {qIdx + 1}
                        </span>
                      </div>

                      {/* Question Type Badge Colorido */}
                      <Badge
                        variant="secondary"
                        className={`text-[10px] h-5 px-2 font-black gap-1 border ${
                          q.tipo_pergunta === 'multipla_escolha'
                            ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                            : 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                        }`}
                      >
                        <IconComp className="h-3 w-3" />
                        {strategy.shortLabel}
                      </Badge>

                      <Badge
                        variant="outline"
                        className="text-[10px] h-5 px-2 font-bold border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-foreground"
                      >
                        {q.pontos ?? 1} {(q.pontos ?? 1) === 1 ? 'ponto' : 'pontos'}
                      </Badge>

                      {/* Resumo quando colapsada */}
                      {isCollapsed && (
                        <div className="hidden md:flex items-center gap-2 ml-2 flex-1 min-w-0 overflow-hidden">
                          <span className="text-xs text-muted-foreground truncate max-w-[320px]">
                            {q.enunciado ? q.enunciado.replace(/<[^>]*>?/gm, '') : '(Sem enunciado)'}
                          </span>
                          <span className="text-muted-foreground/40">•</span>
                          {strategy.renderSummary(q)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        onClick={() => {
                          if (window.confirm(`Excluir a Questão ${qIdx + 1}?`)) {
                            onRemoveQuestion(qIdx);
                          }
                        }}
                        title="Excluir questão"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Corpo do Card da Pergunta */}
                  {!isCollapsed && (
                    <div>
                      <div className="p-5 bg-white dark:bg-slate-900 animate-in fade-in-50 duration-200">
                        {strategy.renderEditor({
                          question: q,
                          questionIndex: qIdx,
                          onUpdateField: (field, val) => onUpdateQuestion(qIdx, field, val),
                          onUpdateOption: (optIdx, field, val) => onUpdateOption(qIdx, optIdx, field, val),
                          onAddOption: () => onAddOption(qIdx),
                          onRemoveOption: (optIdx) => onRemoveOption(qIdx, optIdx),
                        })}
                      </div>

                      {/* Rodapé delimitador visual da Questão */}
                      <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-t-2 border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-semibold text-[11px] text-muted-foreground/80 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-indigo-500" />
                          Fim da Questão {qIdx + 1} ({q.pontos ?? 1} {(q.pontos ?? 1) === 1 ? 'ponto' : 'pontos'})
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleQuestionCollapse(qIdx)}
                          className="text-[11px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                        >
                          Recolher Questão <ChevronUp className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ---------------- ABA 2: CRITÉRIOS & APROVAÇÃO ---------------- */}
        <TabsContent value="regras" className="space-y-4 pt-2">
          <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10 shadow-xs relative">
            <h5 className="text-xs font-black uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
              <Sliders className="h-4 w-4" />
              Regras da Avaliação & Critérios de Aprovação
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 bg-background p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Nota Mínima para Aprovação</span>
                  <span className="text-primary font-black">{quizConfig.nota_minima ?? 70}%</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="h-9 bg-background font-bold text-center border text-sm rounded-lg"
                    placeholder="70"
                    value={quizConfig.nota_minima ?? ''}
                    onChange={(e) => onUpdateQuizConfig('nota_minima', Number(e.target.value) || 0)}
                  />
                  <span className="text-xs font-bold text-muted-foreground">%</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Ex: 70 significa que o aluno precisa acertar 70% das questões.</p>
              </div>

              <div className="space-y-1.5 bg-background p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Tentativas Permitidas</span>
                  <span className="text-primary font-black">{quizConfig.tentativas ? `${quizConfig.tentativas}x` : 'Ilimitadas'}</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  className="h-9 bg-background font-bold text-center border text-sm rounded-lg"
                  placeholder="3 (ou 0 para ilimitadas)"
                  value={quizConfig.tentativas ?? ''}
                  onChange={(e) => onUpdateQuizConfig('tentativas', Number(e.target.value) || 0)}
                />
                <p className="text-[10px] text-muted-foreground">Número de vezes que o aluno pode refazer a avaliação.</p>
              </div>

              <div className="space-y-1.5 bg-background p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Tempo Limite</span>
                  <span className="text-primary font-black">{quizConfig.time_limit ? `${quizConfig.time_limit} min` : 'Sem limite'}</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    className="h-9 bg-background font-bold text-center border text-sm rounded-lg"
                    placeholder="0 (sem tempo limite)"
                    value={quizConfig.time_limit ?? ''}
                    onChange={(e) => onUpdateQuizConfig('time_limit', Number(e.target.value) || 0)}
                  />
                  <span className="text-xs font-bold text-muted-foreground">min</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Cronômetro regressivo. 0 = tempo livre.</p>
              </div>
            </div>

            {/* Toggles de Gabarito e Feedback */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-primary/10">
              <div className="flex items-center justify-between bg-background p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div className="space-y-0.5 pr-2">
                  <Label className="text-xs font-bold text-foreground">Exibir Gabarito ao Aluno</Label>
                  <p className="text-[10px] text-muted-foreground">Mostra as respostas corretas após finalizar o teste.</p>
                </div>
                <Switch
                  checked={Boolean(quizConfig.mostrar_respostas)}
                  onCheckedChange={(c) => onUpdateQuizConfig('mostrar_respostas', c)}
                />
              </div>

              <div className="flex items-center justify-between bg-background p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div className="space-y-0.5 pr-2">
                  <Label className="text-xs font-bold text-foreground">Exibir Correção & Pontuação</Label>
                  <p className="text-[10px] text-muted-foreground">Exibe feedback detalhado de quais perguntas o aluno acertou ou errou.</p>
                </div>
                <Switch
                  checked={Boolean(quizConfig.mostrar_correcao)}
                  onCheckedChange={(c) => onUpdateQuizConfig('mostrar_correcao', c)}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ---------------- ABA 3: INSTRUÇÕES AO ALUNO ---------------- */}
        <TabsContent value="instrucoes" className="space-y-3 pt-2">
          <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Orientações da Prova (Visível ao Aluno antes de iniciar)
              </Label>
              <span className="text-[10px] text-muted-foreground">Instrua sobre duração, regras e consulta</span>
            </div>
            <div className="min-h-[160px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-background">
              <RichTextEditor
                value={description}
                onChange={onDescriptionChange}
                placeholder="Exemplo: Leia cada enunciado com atenção antes de responder. Você tem 3 tentativas para atingir a nota mínima de 70%..."
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <div className="w-full">
      {/* Visualização Inline padrão */}
      {renderEditorContent(false)}

      {/* Modo Focado (Tela Cheia) */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[96vw] w-full h-[92vh] p-0 overflow-hidden flex flex-col rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-background">
          <DialogHeader className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
            <div>
              <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                Modo Focado: {activityTitle || 'Edição da Avaliação'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Módulo #{moduleIndex + 1} • {questions.length} {questions.length === 1 ? 'questão' : 'questões'} • Total: {totalPoints} pts
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="h-8 rounded-lg font-bold text-xs gap-1.5 shadow-sm"
              >
                <Minimize2 className="h-3.5 w-3.5" /> Concluir e Voltar
              </Button>
            </div>
          </DialogHeader>

          {renderEditorContent(true)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
