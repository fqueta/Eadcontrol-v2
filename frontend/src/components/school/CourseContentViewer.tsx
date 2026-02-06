import React, { useMemo, useState, useEffect, useRef, useDeferredValue, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
 import { Play, FileText, Link as LinkIcon, Check, Folder, Loader2, Clock, Star, ChevronDown, ChevronUp, GraduationCap, ChevronLeft, ChevronRight, Search, Circle, CircleCheck, AlertCircle, XCircle } from 'lucide-react';
import { progressService } from '@/services/progressService';
import { useToast } from '@/hooks/use-toast';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import commentsService from '@/services/commentsService';
import { certificatesService } from '@/services/certificatesService';
import { QuizGradeDetail } from './components/QuizGradeDetail';

/**
 * VideoDescriptionToggle
 * pt-BR: Componente que mantém a descrição de vídeo oculta por padrão e
 *        permite ao usuário alternar sua visualização.
 * en-US: Component that keeps video description hidden by default and lets
 *        the user toggle its visibility.
 */
/**
 * VideoDescriptionToggle (memoized)
 * pt-BR: Componente memoizado para evitar re-render quando `html` não muda.
 * en-US: Memoized component to avoid re-render when `html` does not change.
 */
function VideoDescriptionToggleBase({ html }: { html: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        {open ? 'Ocultar descrição' : 'Mostrar descrição'}
      </Button>
      {open && (
        <div
          className="prose prose-sm max-w-none text-muted-foreground mt-2"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
const VideoDescriptionToggle = memo(VideoDescriptionToggleBase);

/**
 * StarRating
 * pt-BR: Componente simples de avaliação por estrelas (1 a 5).
 * en-US: Simple star rating component (1 to 5).
 */
function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const set = (n: number) => onChange(n);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" className="p-0" onClick={() => set(n)} aria-label={`Rate ${n}`}>
          <Star className={`h-4 w-4 ${n <= value ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
        </button>
      ))}
    </div>
  );
}

/**
 * QuizViewer
 * pt-BR: Componente para exibir e processar o quiz para o aluno.
 * en-US: Component to display and process the quiz for the student.
 */
interface QuizViewerProps {
  activity: any;
  onComplete: (score: number) => void;
  initialState?: any;
  onProgressUpdate?: (state: any) => void;
}

function QuizViewer({
  activity,
  onComplete,
  initialState,
  onProgressUpdate
}: QuizViewerProps) {
  const [currentStep, setCurrentStep] = useState<'intro' | 'playing' | 'result'>('intro');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const questions = (activity?.quiz_questions || []) as any[];
  const config = activity?.quiz_config || {};
  const currentQuestion = questions[currentQuestionIdx];

  // Restore state on mount
  useEffect(() => {
    if (initialState) {
        if (initialState.answers) setAnswers(initialState.answers);
        if (typeof initialState.currentQuestionIdx === 'number') setCurrentQuestionIdx(initialState.currentQuestionIdx);
        if (typeof initialState.timeRemaining === 'number') setTimeRemaining(initialState.timeRemaining);
        
        // If we have progress, jump to playing
        if (initialState.answers && Object.keys(initialState.answers).length > 0) {
            setCurrentStep('playing');
        }
    }
  }, [initialState]);

  // Refs for auto-saving on exit
  const stateRef = useRef({ answers, currentQuestionIdx, timeRemaining });
  useEffect(() => {
    stateRef.current = { answers, currentQuestionIdx, timeRemaining };
  }, [answers, currentQuestionIdx, timeRemaining]);

  // LocalStorage key helper
  const getStorageKey = () => `quiz_temp_${activity?.id}_${activity?._moduleIndex}`;

  // Restore state on mount (Merge initialState + LocalStorage if needed)
  useEffect(() => {
    let restoredTimer = null;
    try {
        const local = localStorage.getItem(getStorageKey());
        if (local) {
            const parsed = JSON.parse(local);
            if (parsed && typeof parsed.timeRemaining === 'number') {
                restoredTimer = parsed.timeRemaining;
            }
        }
    } catch {}

    if (initialState) {
        let savedAnswers = {};
        if (initialState.answers) {
            savedAnswers = initialState.answers;
            setAnswers(savedAnswers);
        }
        
        // Calculate correct resume index: skip answered questions
        let resumeIdx = typeof initialState.currentQuestionIdx === 'number' ? initialState.currentQuestionIdx : 0;
        
        // If the saved index is already answered, move forward
        // This handles the case where we saved on "Next" (saving current answered q) but didn't save the new index yet.
        while (resumeIdx < questions.length && (savedAnswers as any)[questions[resumeIdx]?.id || resumeIdx]) {
            resumeIdx++;
        }
        // Ensure we don't go out of bounds (though if all answered, maybe we should show result? For now stay at last)
        if (resumeIdx >= questions.length && questions.length > 0) {
             resumeIdx = questions.length - 1;
             // If completely finished, maybe we should be in result? 
             // But the user might want to review or submit. 
             // For now, let's just cap at last question.
        }
        
        setCurrentQuestionIdx(resumeIdx);
        
        // Timer preference: saved DB time vs Restored Timer
        const dbTime = initialState.timeRemaining;
        if (typeof dbTime === 'number' && dbTime > 0) {
             setTimeRemaining(dbTime);
        } else if (restoredTimer !== null) {
             setTimeRemaining(restoredTimer);
        }

        // If we have progress, jump to playing
        if (Object.keys(savedAnswers).length > 0) {
            setCurrentStep('playing');
        }
    }
  }, [initialState]);

  // Save to DB helper
  const saveToDb = () => {
      if (onProgressUpdate) {
          onProgressUpdate({
              answers: stateRef.current.answers,
              currentQuestionIdx: stateRef.current.currentQuestionIdx,
              timeRemaining: stateRef.current.timeRemaining,
              timestamp: Date.now()
          });
      }
      // Also clear local storage if finished? No, only on complete.
  };

  // Timer Effect: Update State + LocalStorage
  useEffect(() => {
    if (currentStep === 'playing' && timeRemaining !== null) {
      if (timeRemaining <= 0) {
        handleNext(true); 
        return;
      }

      const timerId = setInterval(() => {
        setTimeRemaining((prev) => {
            const next = prev !== null ? prev - 1 : null;
            // Write to localStorage
            try {
               localStorage.setItem(getStorageKey(), JSON.stringify({ timeRemaining: next, timestamp: Date.now() }));
            } catch {}
            return next;
        });
      }, 1000);

      return () => clearInterval(timerId);
    }
  }, [currentStep, timeRemaining]);

  // Save on Unmount (Exit)
  useEffect(() => {
      return () => {
          // Only save if playing
          if (currentStep === 'playing') {
              saveToDb();
          }
      };
  }, [currentStep]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleStart = () => {
    // If we have saved state, deciding to "Restart" should probably wipe it?
    // For now, let's assume Start means fresh start unless we already restored.
    // Ideally, if 'playing' was set by restore, we are already started.
    // If user clicks "Start Quiz" manually, it wipes state.
    setAnswers({});
    setCurrentQuestionIdx(0);
    setCurrentStep('playing');
    setShowFeedback(false);
    if (config.time_limit && config.time_limit > 0) {
        setTimeRemaining(config.time_limit * 60);
    } else {
        setTimeRemaining(null);
    }
  };

  const handleSelectOption = (questionId: number, optionId: number | string) => {
    if (showFeedback) return; // Prevent changing answer while showing feedback
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const calculateScore = () => {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      const answer = answers[q.id || idx];
      if (q.tipo_pergunta === 'multipla_escolha') {
        const correctOpt = q.opcoes?.find((o: any) => o.correta === true || o.correta === 's');
        if (correctOpt && String(correctOpt.id) === String(answer)) {
          correctCount++;
        }
      } else if (q.tipo_pergunta === 'verdadeiro_falso') {
        if (String(q.resposta_correta) === String(answer)) {
          correctCount++;
        }
      }
    });
    return (correctCount / questions.length) * 100;
  };

  const handleNext = (forceFinish = false) => {
    // Flag logic starts below

    const isShowAnswersEnabled = config.show_answers === true || config.show_answers === 's' || config.show_answers === 'true' || config.show_answers === 1;
    // pt-BR: Nova flag para mostrar correção imediata
    // en-US: New flag for immediate correction
    const isCorrectionEnabled = config.mostrar_correcao === true;

    if (!forceFinish && (isShowAnswersEnabled || isCorrectionEnabled) && !showFeedback) {
      setShowFeedback(true);
      return;
    }

    // Verify answer (checkpoint) -> Save to DB
    saveToDb();

    setShowFeedback(false);
    if (!forceFinish && currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      setCurrentStep('result');
      const score = calculateScore();
      onComplete(score);
      // Clear local storage on finish
      try { localStorage.removeItem(getStorageKey()); } catch {}
    }
  };


  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Este quiz não possui perguntas.</h3>
      </div>
    );
  }

  if (currentStep === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
        <div className="bg-primary/10 p-4 rounded-full">
          <FileText className="h-12 w-12 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{activity.titulo || 'Quiz'}</h2>
          <p className="text-muted-foreground mt-2 max-w-md">
            {activity.descricao || 'Responda às perguntas para testar seus conhecimentos e completar a atividade.'}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-1">
            <Badge variant="outline">{questions.length} Questões</Badge>
          </div>
          {config.min_score && (
            <div className="flex items-center gap-1">
              <Badge variant="outline">Mínimo: {config.min_score}%</Badge>
            </div>
          )}
          {config.time_limit > 0 && (
             <div className="flex items-center gap-1">
               <Badge variant="outline" className="gap-1">
                 <Clock className="h-3 w-3" /> {config.time_limit} min
               </Badge>
             </div>
          )}
        </div>
        <Button onClick={handleStart} size="lg" className="w-full max-w-xs">
          Iniciar Quiz
        </Button>
      </div>
    );
  }

  if (currentStep === 'result') {
    const score = calculateScore();
    const isPassed = score >= (Number(config.min_score) || 0);

    return (
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className={`p-4 rounded-full ${isPassed ? 'bg-green-100' : 'bg-red-100'}`}>
          {isPassed ? (
            <CircleCheck className="h-16 w-16 text-green-600" />
          ) : (
            <XCircle className="h-16 w-16 text-red-600" />
          )}
        </div>
        <div>
          <h2 className="text-3xl font-bold">{isPassed ? 'Parabéns!' : 'Não foi desta vez.'}</h2>
          <p className="text-muted-foreground mt-2">
            Você atingiu <strong>{Math.round(score)}%</strong> de aproveitamento.
          </p>
        </div>
        
        {!isPassed && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
            É necessário atingir pelo menos {config.min_score}% para ser aprovado.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Button onClick={handleStart} variant="outline" className="flex-1">
            Tentar Novamente
          </Button>
          {isPassed && (
            <Button onClick={() => window.location.reload()} className="flex-1">
              Continuar
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-6 max-w-3xl mx-auto">
      {/* Quiz Progress & Timer */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
          <span>Pergunta {currentQuestionIdx + 1} de {questions.length}</span>
          <div className="flex items-center gap-3">
             {timeRemaining !== null && (
               <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${timeRemaining < 60 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-muted/50 text-foreground'}`}>
                 <Clock className="h-3.5 w-3.5" />
                 <span className="font-mono text-sm">{formatTime(timeRemaining)}</span>
               </div>
             )}
             <span>{Math.round(((currentQuestionIdx) / questions.length) * 100)}%</span>
          </div>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300" 
            style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }} 
          />
        </div>
      </div>

      {/* Correction Feedback Banner */}
      {showFeedback && config.mostrar_correcao === true && (
        <div className={`p-4 rounded-lg border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${
           (() => {
             const answer = answers[currentQuestion.id || currentQuestionIdx];
             let isCorrect = false;
             if (currentQuestion.tipo_pergunta === 'multipla_escolha') {
               const correctOpt = (currentQuestion.opcoes || []).find((o: any) => o.correta === true || o.correta === 's');
               isCorrect = correctOpt && String(correctOpt.id) === String(answer);
             } else {
               isCorrect = String(currentQuestion.resposta_correta) === String(answer);
             }
             return isCorrect ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800';
           })()
        }`}>
          {(() => {
             const answer = answers[currentQuestion.id || currentQuestionIdx];
             let isCorrect = false;
             if (currentQuestion.tipo_pergunta === 'multipla_escolha') {
               const correctOpt = (currentQuestion.opcoes || []).find((o: any) => o.correta === true || o.correta === 's');
               isCorrect = correctOpt && String(correctOpt.id) === String(answer);
             } else {
               isCorrect = String(currentQuestion.resposta_correta) === String(answer);
             }
             return isCorrect ? (
                <>
                  <CircleCheck className="h-5 w-5 shrink-0 mt-0.5 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-sm">A resposta está correta!</h4>
                    <p className="text-xs mt-1 text-green-700">Muito bem, você acertou esta questão.</p>
                  </div>
                </>
             ) : (
                <>
                  <XCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
                  <div>
                    <h4 className="font-semibold text-sm">Resposta incorreta</h4>
                    <p className="text-xs mt-1 text-red-700">Revise o conteúdo e tente novamente.</p>
                  </div>
                </>
             );
          })()}
        </div>
      )}

      {/* Question */}
      <div className="space-y-6">
        <div className="space-y-4">
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
            {currentQuestion.tipo_pergunta === 'multipla_escolha' ? 'Múltipla Escolha' : 'Verdadeiro ou Falso'}
          </Badge>
          <h3 className="text-lg md:text-xl font-semibold leading-relaxed">
            {currentQuestion.enunciado}
          </h3>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.tipo_pergunta === 'multipla_escolha' ? (
            (currentQuestion.opcoes || []).map((opt: any, oIdx: number) => {
              const isSelected = String(answers[currentQuestion.id || currentQuestionIdx]) === String(opt.id);
              const isCorrect = opt.correta === true || opt.correta === 's';
              
              let variantClass = 'border-muted hover:border-primary/50 hover:bg-muted/50';
              let iconClass = 'border-muted-foreground/30 group-hover:border-primary/50';
              
              if (showFeedback) {
                if (isCorrect) {
                  variantClass = 'border-green-500 bg-green-50 hover:bg-green-50 cursor-default';
                  iconClass = 'border-green-500 bg-green-500 text-white';
                } else if (isSelected) {
                  variantClass = 'border-red-500 bg-red-50 hover:bg-red-50 cursor-default';
                  iconClass = 'border-red-500 bg-red-500 text-white';
                } else {
                   variantClass = 'border-muted opacity-50 cursor-default';
                }
              } else if (isSelected) {
                variantClass = 'border-primary bg-primary/5 shadow-sm';
                iconClass = 'border-primary bg-primary text-white';
              }

              return (
                <button
                  key={opt.id || oIdx}
                  onClick={() => handleSelectOption(currentQuestion.id || currentQuestionIdx, opt.id)}
                  disabled={showFeedback}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 group ${variantClass}`}
                >
                  <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${iconClass}`}>
                    {showFeedback ? (
                      isCorrect ? <Check className="h-3 w-3" /> : (isSelected ? <XCircle className="h-3 w-3" /> : (isSelected && <div className="w-2 h-2 rounded-full bg-white" />))
                    ) : (
                      isSelected && <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span className={`text-sm md:text-base ${isSelected || (showFeedback && isCorrect) ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                    {opt.texto}
                  </span>
                </button>
              );
            })
          ) : (
            ['verdadeiro', 'falso'].map((val) => {
              const isSelected = String(answers[currentQuestion.id || currentQuestionIdx]) === val;
              const isCorrect = String(currentQuestion.resposta_correta) === val;

              let variantClass = 'border-muted hover:border-primary/50 hover:bg-muted/50';
              let iconClass = 'border-muted-foreground/30 group-hover:border-primary/50';
              
              if (showFeedback) {
                if (isCorrect) {
                   variantClass = 'border-green-500 bg-green-50 hover:bg-green-50 cursor-default';
                   iconClass = 'border-green-500 bg-green-500 text-white';
                } else if (isSelected) {
                   variantClass = 'border-red-500 bg-red-50 hover:bg-red-50 cursor-default';
                   iconClass = 'border-red-500 bg-red-500 text-white';
                } else {
                   variantClass = 'border-muted opacity-50 cursor-default';
                }
              } else if (isSelected) {
                variantClass = 'border-primary bg-primary/5 shadow-sm';
                iconClass = 'border-primary bg-primary text-white';
              }

              return (
                <button
                  key={val}
                  onClick={() => handleSelectOption(currentQuestion.id || currentQuestionIdx, val)}
                  disabled={showFeedback}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 group ${variantClass}`}
                >
                  <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${iconClass}`}>
                     {showFeedback ? (
                      isCorrect ? <Check className="h-3 w-3" /> : (isSelected ? <XCircle className="h-3 w-3" /> : (isSelected && <div className="w-2 h-2 rounded-full bg-white" />))
                    ) : (
                      isSelected && <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span className={`text-sm md:text-base capitalize ${isSelected || (showFeedback && isCorrect) ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                    {val}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {showFeedback && currentQuestion.explicacao && (
          <div className="bg-muted/50 p-4 rounded-lg text-sm border border-muted mt-4">
            <h4 className="font-semibold mb-1">Explicação:</h4>
            <div dangerouslySetInnerHTML={{ __html: currentQuestion.explicacao }} />
          </div>
        )}

        {/* Action Button */}
        <div className="pt-4 flex justify-between items-center">
          <Button 
            variant="ghost" 
            onClick={() => setCurrentStep('intro')}
            className="text-muted-foreground"
          >
            Sair do Quiz
          </Button>
          <Button 
            disabled={!answers[currentQuestion.id || currentQuestionIdx]} 
            onClick={() => handleNext()}
            size="lg"
            className="min-w-[140px]"
          >
 
            {showFeedback
              ? (currentQuestionIdx < questions.length - 1 ? 'Próxima Pergunta' : 'Ver Resultados')
              : (showFeedback === false && ((config.show_answers === true || config.show_answers === 's' || config.show_answers === 'true' || config.show_answers === 1) || config.mostrar_correcao === true) 
                  ? 'Verificar Resposta' 
                  : (currentQuestionIdx < questions.length - 1 ? 'Próxima Pergunta' : 'Finalizar Quiz')
                )
            }
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * CourseContentViewer
 * pt-BR: Componente de visualização de conteúdo do curso com barra de busca,
 *        sidebar de atividades e área principal para player/leitura/link.
 * en-US: Course content viewer component with search bar, activities sidebar,
 *        and main area for player/reader/link rendering.
 */
/**
 * CourseContentViewer
 * pt-BR: Visualiza conteúdos do curso. Agora emite callback ao alterar atividade atual.
 * en-US: Renders course contents. Now emits a callback when current activity changes.
 */
/**
 * CourseContentViewer
 * pt-BR: Visualizador de conteúdo do curso; agora aceita `enrollmentId` para envio em progresso.
 * en-US: Course content viewer; now accepts `enrollmentId` to send with progress payloads.
 */
export default function CourseContentViewer({ course, onActivityChange, enrollmentId }: { course: any; onActivityChange?: (activity: any) => void; enrollmentId?: string | number }) {
  /**
   * Router hooks
   * pt-BR: Integra com o roteador para ler e atualizar a URL de cada atividade.
   * en-US: Integrates with the router to read and update the URL per activity.
   */
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  /**
   * collapseInactiveModules
   * pt-BR: Quando ativo, colapsa módulos que não contêm a atividade atual.
   * en-US: When active, collapses modules that do not include the current activity.
   */
  const [collapseInactiveModules, setCollapseInactiveModules] = useState(false);
  /**
   * collapsedModules
   * pt-BR: Controla o recolhimento/expansão por módulo ao clicar no título.
   * en-US: Controls per-module collapse/expand when clicking the module title.
   */
  const [collapsedModules, setCollapsedModules] = useState<Record<number, boolean>>({});
  /**
   * Toast hook
   * pt-BR: Fornece API para mostrar toasts de feedback.
   * en-US: Provides API to show feedback toasts.
   */
  const { toast } = useToast();
  /**
   * curriculumModules
   * pt-BR: Quando há matrícula, guarda os módulos vindos do endpoint consolidado
   *        de currículo com progresso por atividade.
   * en-US: When enrollment exists, stores modules from consolidated curriculum
   *        endpoint with per-activity progress.
   */
  const [curriculumModules, setCurriculumModules] = useState<any[]>([]);

  /**
   * fetchEnrollmentCurriculum
   * pt-BR: Carrega currículo por matrícula e atualiza `curriculumModules`.
   * en-US: Loads curriculum by enrollment and updates `curriculumModules`.
   */
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!enrollmentId) return;
      try {
        const resp = await progressService.getEnrollmentCurriculum(enrollmentId);
        const mods = Array.isArray(resp?.curriculum) ? resp.curriculum : [];
        if (!cancelled) setCurriculumModules(mods);
      } catch {
        // fallback silencioso: mantém módulos do curso
      }
    };
    run();
    return () => { cancelled = true; };
  }, [enrollmentId]);

  /**
   * modules
   * pt-BR: Prefere módulos do currículo por matrícula quando disponíveis; senão,
   *        usa os módulos do curso como antes.
   * en-US: Prefers enrollment curriculum modules when available; otherwise uses
   *        course modules as before.
   */
  const modules: any[] = useMemo(() => {
    if (curriculumModules && curriculumModules.length > 0) return curriculumModules;
    const c = course || {};
    const arr = c?.modulos || c?.modules || [];
    return Array.isArray(arr) ? arr : [];
  }, [course, curriculumModules]);
  // console.log('modules', modules);
  
  /**
   * flatActivities
   * pt-BR: Lista achatada de todas atividades dos módulos para progressão/navegação.
   * en-US: Flattened list of all activities for progression/navigation.
   */
  const flatActivities: any[] = useMemo(() => {
    const all: any[] = [];
    modules.forEach((m: any, mi: number) => {
      const acts: any[] = Array.isArray(m?.atividades || m?.activities) ? (m?.atividades || m?.activities) : [];
      acts.forEach((a: any, ai: number) => {
        all.push({ ...a, _moduleIndex: mi, _activityIndex: ai });
      });
    });
    return all;
  }, [modules]);

  /**
   * searchTerm
   * pt-BR: Filtro por título/nome de atividade.
   * en-US: Filter by activity title/name.
   */
  const [searchTerm, setSearchTerm] = useState('');
  /**
   * deferredSearchTerm
   * pt-BR: Valor adiado da busca para reduzir renders durante digitação.
   * en-US: Deferred search value to reduce renders while typing.
   */
  const deferredSearchTerm = useDeferredValue(searchTerm);

  /**
   * filteredActivities
   * pt-BR: Lista achatada filtrada conforme busca.
   * en-US: Filtered flattened activities according to search.
   */
  const filteredActivities = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return flatActivities;
    return flatActivities.filter((a: any) => {
      const title = String(a?.titulo || a?.title || a?.name || '').toLowerCase();
      const moduleTitle = String(modules[a._moduleIndex]?.titulo || modules[a._moduleIndex]?.title || modules[a._moduleIndex]?.name || '').toLowerCase();
      return title.includes(term) || moduleTitle.includes(term);
    });
  }, [flatActivities, modules, deferredSearchTerm]);

  /**
   * currentIndex
   * pt-BR: Índice atual na lista filtrada.
   * en-US: Current index in the filtered list.
   */
  const [currentIndex, setCurrentIndex] = useState(0);

  /**
   * completedIds
   * pt-BR: IDs de atividades concluídas; carrega de localStorage e API.
   * en-US: Completed activity IDs; loads from localStorage and API.
   */
  const courseId = course?.id ?? course?.course_id ?? course?.token ?? 'course';
  const storageKey = `course_completed_${courseId}`;
  const [completedIds, setCompletedIds] = useState<Set<string | number>>(new Set());
  /**
   * progressLoading
   * pt-BR: Indica se o progresso está sendo sincronizado com o servidor.
   * en-US: Indicates whether progress is being synchronized with the server.
   */
  const [progressLoading, setProgressLoading] = useState<boolean>(true);
  /**
   * progressMap
   * pt-BR: Mapa de progresso por atividade (seconds/completed) vindo da API.
   * en-US: Per-activity progress map (seconds/completed) from API.
   */
  const [progressMap, setProgressMap] = useState<Record<string, { seconds: number; completed: boolean }>>({});
  /**
   * lastCompletedId / nextActivityId
   * pt-BR: Última concluída e próxima atividade sugerida pela API.
   * en-US: Last completed and next suggested activity from API.
   */
  const [lastCompletedId, setLastCompletedId] = useState<string | number | undefined>(undefined);
  const [nextActivityId, setNextActivityId] = useState<string | number | undefined>(undefined);
  /**
   * lastProgressRef
   * pt-BR: Mantém último progresso retornado pela API para retomada (atividade/segundos).
   * en-US: Holds last progress returned by the API for resume (activity/seconds).
   */
  const lastProgressRef = useRef<{ activityId?: string | number; moduleId?: string | number; seconds?: number }>({});
  /**
   * playbackExists
   * pt-BR: Indica, via API, se há posição salva para a atividade atual.
   * en-US: Indicates, via API, whether there is a saved position for the current activity.
   */
  const [playbackExists, setPlaybackExists] = useState<boolean>(false);
  /**
   * autoSelectOnceRef
   * pt-BR: Evita redefinir a seleção inicial repetidamente após sincronizações.
   * en-US: Prevents redefining initial selection repeatedly after syncs.
   */
  const autoSelectOnceRef = useRef<boolean>(false);
  /**
   * selectionIntentRef
   * pt-BR: Guarda a intenção da seleção atual: 'user' quando o usuário
   *        clicou diretamente em uma atividade concluída para revisar;
   *        'auto' quando a seleção foi definida automaticamente (inicial,
   *        navegação Próximo/Anterior, busca, etc.). Usado para manter o
   *        auto-skip ativo apenas em seleções automáticas.
   * en-US: Holds the intent of the current selection: 'user' when the user
   *        explicitly clicked a completed activity to review; 'auto' when the
   *        selection was set automatically (initial, Next/Previous, search,
   *        etc.). Used to keep auto-skip active only on automatic selections.
   */
  const selectionIntentRef = useRef<'user' | 'auto'>('auto');
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [mobileSearchOpen, setMobileSearchOpen] = useState<boolean>(false);
  const [showGrades, setShowGrades] = useState<boolean>(false);
  /**
   * generatingCert
   * pt-BR: Estado de geração de certificado (PDF) para feedback no botão.
   * en-US: Certificate (PDF) generation state for button feedback.
   */
  const [generatingCert, setGeneratingCert] = useState<boolean>(false);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  /**
   * fetchCurriculum
   * pt-BR: Sincroniza o currículo e progresso com o backend.
   * en-US: Syncs curriculum and progress with backend.
   */
  const fetchCurriculum = async () => {
    setProgressLoading(true);
    try {
      const cur = await progressService.getEnrollmentCurriculum(enrollmentId);
      const curriculum = Array.isArray((cur as any)?.curriculum) ? (cur as any).curriculum : [];
      const allActivities: any[] = [];
      curriculum.forEach((m: any) => {
        const arr = Array.isArray(m?.atividades) ? m.atividades : [];
        arr.forEach((a: any) => allActivities.push(a));
      });
      // completed_ids
      const apiIds = allActivities
        .filter((a) => Boolean(a?.completed))
        .map((a) => String(a?.id ?? a?.activity_id))
        .filter((sid) => !!sid);
      setCompletedIds(new Set(apiIds));
      try { localStorage.setItem(storageKey, JSON.stringify(apiIds)); } catch {}
      // progressMap
      const pm: Record<string, { seconds: number; completed: boolean }> = {};
      allActivities.forEach((a) => {
        const aid = a?.id ?? a?.activity_id;
        if (aid !== undefined && aid !== null) {
          const sid = String(aid);
          const secs = Number(a?.seconds ?? a?.config?.seconds ?? 0) || 0;
          const done = Boolean(a?.completed ?? a?.config?.completed);
          pm[sid] = { seconds: secs, completed: done };
          try {
            const posKey = positionKey(courseId, sid);
            if (done) {
              localStorage.removeItem(posKey);
            } else if (secs > 0) {
              localStorage.setItem(posKey, String(Math.floor(secs)));
            }
          } catch {}
        }
      });
      setProgressMap(pm);
      // lastCompletedId: último concluído pela ordem de updated_at ou ordem natural
      let lastCompletedId: string | number | undefined = undefined;
      try {
        const completedOrdered = allActivities
          .filter((a) => Boolean(a?.completed))
          .sort((a, b) => {
            const ta = a?.updated_at ? Date.parse(a.updated_at) : -Infinity;
            const tb = b?.updated_at ? Date.parse(b.updated_at) : -Infinity;
            return tb - ta; // desc
          });
        lastCompletedId = completedOrdered[0]?.id ?? completedOrdered[0]?.activity_id;
      } catch {}
      if (lastCompletedId !== undefined && lastCompletedId !== null) setLastCompletedId(lastCompletedId);
      // Seleção inicial (uma vez): 1) needs_resume; 2) primeiro não concluído
      if (!autoSelectOnceRef.current) {
        const completedSet = new Set(apiIds);
        let pickIndex = -1;
        // 1) primeira atividade com needs_resume e não concluída
        for (let i = 0; i < filteredActivities.length; i++) {
          const a = filteredActivities[i];
          const id = a?.id ?? a?.activity_id ?? `${a?._moduleIndex}-${a?._activityIndex}`;
          const sid = String(id);
          const pmItem = progressMap[sid];
          const needsResume = pmItem ? (pmItem.seconds > 0 && !pmItem.completed) : false;
          const isDone = completedSet.has(sid);
          if (needsResume && !isDone) { pickIndex = i; break; }
        }
        // 2) primeira não concluída
        if (pickIndex < 0) {
          for (let i = 0; i < filteredActivities.length; i++) {
            const a = filteredActivities[i];
            const id = a?.id ?? a?.activity_id ?? `${a?._moduleIndex}-${a?._activityIndex}`;
            if (!completedSet.has(String(id))) { pickIndex = i; break; }
          }
        }
        if (pickIndex >= 0) {
          selectionIntentRef.current = 'auto';
          setCurrentIndex(pickIndex);
        }
        autoSelectOnceRef.current = true;
      }
    } catch {}
    finally {
      setProgressLoading(false);
    }
  };

  /**
   * currentActivity
   * pt-BR: Atividade selecionada para exibição.
   * en-US: Selected activity to render.
   */
  const currentActivity = filteredActivities[currentIndex];

  /**
   * currentActivityKeyForComments
   * pt-BR: ID estável da atividade atual para listar e publicar comentários.
   * en-US: Stable ID for current activity to list and post comments.
   */
  const currentActivityKeyForComments = useMemo(() => {
    const a: any = currentActivity;
    if (!a) return '';
    return String((a?.id ?? a?.activity_id ?? `${a?._moduleIndex}-${a?._activityIndex}`));
  }, [currentActivity]);

  /**
   * Comentários: estado local e integração com API
   * pt-BR: Min/máx de caracteres, rascunho e avaliação por estrelas.
   * en-US: Min/max characters, draft text and star rating.
   */
  const COMMENT_MIN = 3;
  const COMMENT_MAX = 500;
  const [draft, setDraft] = useState('');
  const [rating, setRating] = useState<number>(0);
  const queryClient = useQueryClient();

  /**
   * commentsQuery
   * pt-BR: Busca comentários aprovados para a atividade atual.
   * en-US: Fetch approved comments for the current activity.
   */
  const commentsQuery = useQuery({
    queryKey: ['activity-comments', currentActivityKeyForComments],
    enabled: Boolean(currentActivityKeyForComments),
    queryFn: async () => {
      if (!currentActivityKeyForComments) return [] as any[];
      const res = await commentsService.listForActivity(currentActivityKeyForComments);
      return Array.isArray(res) ? res : (res as any)?.data ?? [];
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  /**
   * createMutation
   * pt-BR: Envia novo comentário para moderação.
   * en-US: Submit a new comment for moderation.
   */
  const createMutation = useMutation({
    mutationFn: async (text: string) => {
      return commentsService.createComment({
        target_type: 'activity',
        target_id: currentActivityKeyForComments,
        body: text,
        rating: rating,
      });
    },
    onSuccess: () => {
      toast({ title: 'Comentário enviado', description: 'Seu comentário foi enviado para moderação.' });
      setDraft('');
      setRating(0);
      queryClient.invalidateQueries({ queryKey: ['activity-comments', currentActivityKeyForComments] });
    },
    onError: () => {
      toast({ title: 'Falha ao enviar', description: 'Não foi possível enviar seu comentário.', variant: 'destructive' } as any);
    },
  });

  /**
   * readingRemaining
   * pt-BR: Segundos restantes para concluir atividades de leitura/arquivo.
   * en-US: Remaining seconds to complete reading/file activities.
   */
  const [readingRemaining, setReadingRemaining] = useState<number>(0);
  
  // (perf) evita logs em produção
  /**
   * syncActivityUrl effect
   * pt-BR: Atualiza `?activity=<id>` na URL quando a atividade atual muda.
   * en-US: Updates `?activity=<id>` in the URL when the current activity changes.
   */
  useEffect(() => {
    if (!currentActivity) return;
    try {
      const params = new URLSearchParams(location.search);
      const id = getActivityId(currentActivity, currentActivity?._moduleIndex, currentActivity?._activityIndex);
      const sid = String(id);
      if (params.get('activity') !== sid) {
        params.set('activity', sid);
        navigate({ search: `?${params.toString()}` }, { replace: true });
      }
    } catch {}
  }, [currentActivity, location.search, navigate]);
  /**
   * onActivityChange effect
   * pt-BR: Notifica o pai quando a atividade atual muda.
   * en-US: Notifies parent when current activity changes.
   */
  useEffect(() => {
    if (onActivityChange && currentActivity) {
      try {
        onActivityChange(currentActivity);
      } catch {}
    }
  }, [currentActivity, onActivityChange]);

  /**
   * progressText
   * pt-BR: Texto de progresso tipo "X of Y items".
   * en-US: Progress text like "X of Y items".
   */
  const progressText = useMemo(() => {
    // pt-BR: "X de Y itens" para o indicador de progresso
    // en-US: "X of Y items" for the progress indicator
    return `${Math.min(currentIndex + 1, filteredActivities.length)} de ${filteredActivities.length} itens`;
  }, [currentIndex, filteredActivities.length]);

  /**
   * courseTotalLabel
   * pt-BR: Duração total do curso somando atividades/módulos.
   * en-US: Course total duration summing activities/modules.
   */
  const courseTotalLabel = useMemo(() => {
    const total = modules.reduce((acc, m) => acc + getModuleTotalSeconds(m), 0);
    return total ? `Total ${formatDuration(total)}` : '';
  }, [modules]);

  /**
   * Duration helpers
   * pt-BR: Converte valores em segundos e formata como "xh ym".
   * en-US: Converts values to seconds and formats as "xh ym".
   */
  function toSeconds(val: any, unit: string) {
    const v = Number(val || 0);
    const u = String(unit || '').toLowerCase();
    if (!v) return 0;
    if (u.includes('seg')) return v;
    if (u.includes('min')) return v * 60;
    if (u.includes('h')) return v * 3600;
    return v;
  }
  /**
   * formatDuration
   * pt-BR: Formata segundos para o padrão fixo "hh:mm:ss" (zero à esquerda).
   * en-US: Formats seconds to fixed "hh:mm:ss" (zero-padded).
   */
  function formatDuration(seconds: number) {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(ss)}`;
  }

  /**
   * Reply state (WordPress-like)
   * pt-BR: Rascunhos e visibilidade de respostas por comentário + profundidade máxima.
   * en-US: Per-comment reply drafts and visibility + maximum nested depth.
   */
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyVisible, setReplyVisible] = useState<Record<string, boolean>>({});
  const MAX_REPLY_DEPTH = 3;

  /**
   * replyMutation
   * pt-BR: Envia resposta do aluno vinculada ao `parent_id` sem avaliação.
   * en-US: Submits a student reply linked to `parent_id` without rating.
   */
  const replyMutation = useMutation({
    mutationFn: async (vars: { parentId: number | string; body: string }) => {
      return commentsService.createComment({
        target_type: 'activity',
        target_id: currentActivityKeyForComments,
        body: vars.body,
        parent_id: Number(vars.parentId),
        rating: null,
      });
    },
    onSuccess: (_data, vars) => {
      try {
        toast({ title: 'Resposta enviada', description: 'Sua resposta foi enviada para moderação.' });
      } catch {}
      setReplyDrafts((prev) => ({ ...prev, [String(vars.parentId)]: '' }));
      queryClient.invalidateQueries({ queryKey: ['activity-comments', currentActivityKeyForComments] });
    },
    onError: () => {
      try {
        toast({ title: 'Falha ao responder', description: 'Não foi possível enviar sua resposta.', variant: 'destructive' } as any);
      } catch {}
    },
  });

  /**
   * renderCommentItem
   * pt-BR: Renderiza um comentário aprovado com autor, data e avaliação, e exibe suas
   *        respostas aprovadas indentadas em forma de thread.
   * en-US: Renders an approved comment with author, date and rating, and shows its
   *        approved replies indented as a threaded conversation.
   */
  const renderCommentItem = (c: any, depth: number = 0) => {
    const author = String(c?.user_name ?? c?.user?.name ?? c?.user?.nome ?? c?.author ?? 'Aluno').trim();
    const created = c?.created_at ? new Date(String(c.created_at)).toLocaleString() : '';
    const ratingVal = Number(c?.rating ?? 0);
    const replies: any[] = Array.isArray(c?.replies) ? c.replies : [];
    const idStr = String(c?.id ?? '');
    const canReplyHere = depth < MAX_REPLY_DEPTH;
    const replyText = (replyDrafts[idStr] ?? '').slice(0, COMMENT_MAX);

    return (
      <div>
        <div className="rounded border p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{author}{created ? ` • ${created}` : ''}</div>
            {ratingVal > 0 && (
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((n) => (
                  <Star key={n} className={`h-3.5 w-3.5 ${n <= ratingVal ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
                ))}
              </div>
            )}
          </div>
          <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{String(c?.body ?? '')}</div>
          {canReplyHere && (
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Responder</Label>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setReplyVisible((prev) => ({ ...prev, [idStr]: !prev[idStr] }))}
                >
                  {replyVisible[idStr] ? 'Ocultar' : 'Responder'}
                </Button>
              </div>
              {replyVisible[idStr] && (
                <div className="mt-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [idStr]: e.target.value.slice(0, COMMENT_MAX) }))}
                    placeholder="Escreva sua resposta... / Write your reply..."
                    rows={2}
                  />
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{Math.max(0, replyText.trim().length)} / {COMMENT_MAX}</span>
                    <span>mín {COMMENT_MIN}</span>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const text = replyText.trim();
                        if (!text) return;
                        if (text.length < COMMENT_MIN || text.length > COMMENT_MAX) return;
                        replyMutation.mutate({ parentId: idStr, body: text });
                      }}
                      disabled={replyMutation.isPending || replyText.trim().length < COMMENT_MIN}
                    >
                      {replyMutation.isPending ? 'Respondendo...' : 'Enviar resposta'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {Array.isArray(replies) && replies.length > 0 && (
          <div className="mt-2 ml-4 pl-3 border-l">
            {replies.map((r) => (
              <div key={String(r?.id ?? Math.random())} className="mt-2">
                {renderCommentItem(r, depth + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  /**
   * readingUrgencyClass
   * pt-BR: Retorna classes de cor do badge conforme segundos restantes.
   *        <=10s: vermelho; <=60s: amarelo; caso contrário: azul.
   * en-US: Returns badge color classes based on remaining seconds.
   *        <=10s: red; <=60s: yellow; otherwise: blue.
   */
  function readingUrgencyClass(remaining: number) {
    if (remaining <= 10) return 'bg-red-100 text-red-700';
    if (remaining <= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-blue-100 text-blue-700';
  }

  /**
   * getDurationLabel
   * pt-BR: Retorna rótulo de duração baseado em `duracao` e `unidade_duracao`.
   * en-US: Returns duration label using `duracao` and `unidade_duracao`.
   */
  const getDurationLabel = (a: any) => {
    const val = a?.duracao ?? a?.duration ?? '';
    const unit = String(a?.unidade_duracao ?? a?.type_duration ?? '').toLowerCase();
    const secs = toSeconds(val, unit);
    return secs ? formatDuration(secs) : '';
  };

  /**
   * isVideo / isDocument / isLink
   * pt-BR: Helpers para tipo de atividade.
   * en-US: Helpers for activity type.
   */
  /**
   * getType / isVideo / isDocument / isLink
   * pt-BR: Mapeia o tipo de atividade considerando o payload da API (video, arquivo, leitura).
   * en-US: Maps activity type considering API payload (video, arquivo, leitura).
   */
  const getType = (a: any) => String(a?.tipo_atividade || a?.type_activities || a?.tipo || '').toLowerCase();
  const isVideo = (a: any) => getType(a).includes('video');
  const isQuiz = (a: any) => getType(a).includes('quiz') || getType(a).includes('prova');
  const isDocument = (a: any) => {
    const t = getType(a);
    if (t.includes('document') || t.includes('pdf') || t.includes('arquivo')) return true;
    const raw = String(a?.arquivo_url || a?.url || a?.conteudo || a?.content || '').toLowerCase();
    return raw.endsWith('.pdf') || raw.endsWith('.doc') || raw.endsWith('.docx') || raw.endsWith('.txt');
  };
  const isUrlText = (txt?: any) => {
    const s = String(txt || '').trim().toLowerCase();
    return !!s && (/^https?:\/\//.test(s) || s.startsWith('www.'));
  };
  const isLink = (a: any) => {
    const t = getType(a);
    if (t.includes('link')) return true;
    if (t.includes('leitura')) {
      const raw = a?.url || a?.video_url || a?.arquivo_url || a?.conteudo || a?.content || '';
      return isUrlText(raw);
    }
    return false;
  };

  /**
   * sanitizeUrl
   * pt-BR: Remove crases/backticks e espaços excedentes dos campos de URL vindos da API.
   * en-US: Removes backticks and extra spaces from URL-like fields from API.
   */
  const sanitizeUrl = (u?: any) => {
    const s = String(u || '').trim();
    // remove backticks and surrounding spaces
    return s.replace(/^`+|`+$/g, '').trim();
  };

  /**
   * getVideoProvider
   * pt-BR: Detecta provedor do vídeo a partir da URL (youtube, vimeo, mp4, unknown).
   * en-US: Detects video provider from URL (youtube, vimeo, mp4, unknown).
   */
  const getVideoProvider = (u?: string) => {
    const url = String(u || '').toLowerCase();
    if (!url) return 'unknown';
    if (url.includes('youtube.com/watch') || url.includes('youtube.com/embed') || url.includes('youtu.be/')) return 'youtube';
    if (url.includes('vimeo.com/') || url.includes('player.vimeo.com/video/')) return 'vimeo';
    if (url.endsWith('.mp4')) return 'mp4';
    return 'unknown';
  };

  /**
   * getYouTubeIdFromAnyUrl
   * pt-BR: Extrai o ID do YouTube de URLs nos formatos watch/embed/youtu.be.
   * en-US: Extracts YouTube ID from watch/embed/youtu.be URL formats.
   */
  const getYouTubeIdFromAnyUrl = (u?: string) => {
    const url = String(u || '').trim();
    if (!url) return '';
    try {
      if (url.includes('youtube.com/watch')) {
        const idMatch = url.match(/[?&]v=([^&#]+)/);
        return idMatch?.[1] || '';
      }
      if (url.includes('youtube.com/embed/')) {
        const after = url.split('youtube.com/embed/')[1] || '';
        return (after.split('?')[0] || '').trim();
      }
      if (url.includes('youtu.be/')) {
        const after = url.split('youtu.be/')[1] || '';
        return (after.split('?')[0] || '').trim();
      }
    } catch {}
    return '';
  };

  /**
   * toEmbedUrl
   * pt-BR: Converte uma URL de YouTube/Vimeo para a forma de embed.
   * en-US: Converts a YouTube/Vimeo URL to an embeddable URL.
   */
  const toEmbedUrl = (url: string) => {
    const u = sanitizeUrl(url);
    if (!u) return '';
    // YouTube patterns
    if (u.includes('youtube.com/watch')) {
      const idMatch = u.match(/[?&]v=([^&#]+)/);
      const vid = idMatch?.[1];
      if (vid) return `https://www.youtube.com/embed/${vid}`;
    }
    if (u.includes('youtu.be/')) {
      const id = u.split('youtu.be/')[1]?.split('?')[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    // Vimeo pattern
    if (u.includes('vimeo.com/')) {
      const id = u.split('vimeo.com/')[1]?.split('?')[0]?.replace(/[^0-9]/g, '');
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    return u;
  };

  /**
   * getActivityUrl
   * pt-BR: Resolve a URL adequada para a atividade, incluindo embed para vídeos.
   * en-US: Resolves the proper URL for activity, including embed for videos.
   */
  const getActivityUrl = (a: any) => {
    const t = getType(a);
    const base = sanitizeUrl(a?.url || a?.video_url || a?.arquivo_url || a?.conteudo || a?.content || '');
    if (!base) return '';
    if (t.includes('video')) return toEmbedUrl(base);
    return base;
  };

  /**
   * getActivityProvider
   * pt-BR: Determina o provedor do vídeo considerando URL original e de embed.
   * en-US: Determines video provider considering original and embed URL.
   */
  const getActivityProvider = (a: any) => {
    const raw = sanitizeUrl(a?.url || a?.video_url || a?.arquivo_url || a?.conteudo || a?.content || '');
    const embed = getActivityUrl(a);
    const pRaw = getVideoProvider(raw);
    const pEmbed = getVideoProvider(embed);
    return pEmbed !== 'unknown' ? pEmbed : pRaw;
  };

  /**
   * buildVideoEmbedUrlWithApi
   * pt-BR: Ajusta a URL de embed para habilitar APIs (YouTube/Vimeo) com player_id e origin.
   * en-US: Adjusts embed URL to enable APIs (YouTube/Vimeo) with player_id and origin.
   */
  const buildVideoEmbedUrlWithApi = (embedUrl: string, playerId: string) => {
    try {
      const url = new URL(embedUrl, window.location.origin);
      const isYouTube = /youtube\.com\/embed\//.test(url.pathname + url.href);
      const isVimeo = /player\.vimeo\.com\/video\//.test(url.pathname + url.href);
      if (isYouTube) {
        if (!url.searchParams.has('enablejsapi')) url.searchParams.set('enablejsapi', '1');
        if (!url.searchParams.has('origin')) url.searchParams.set('origin', window.location.origin);
      }
      if (isVimeo) {
        if (!url.searchParams.has('api')) url.searchParams.set('api', '1');
        if (!url.searchParams.has('player_id')) url.searchParams.set('player_id', playerId);
      }
      return url.toString();
    } catch {
      // fallback if URL parsing fails
      const sep = embedUrl.includes('?') ? '&' : '?';
      if (embedUrl.includes('youtube.com/embed')) {
        return `${embedUrl}${sep}enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
      }
      if (embedUrl.includes('player.vimeo.com/video')) {
        return `${embedUrl}${sep}api=1&player_id=${encodeURIComponent(playerId)}`;
      }
      return embedUrl;
    }
  };

  /**
   * getActivityId
   * pt-BR: Obtém o identificador único da atividade (fallback no índice).
   * en-US: Gets the unique activity identifier (falls back to index).
   */
/**
 * getActivityId
 * pt-BR: Retorna o identificador único da atividade, normalizando `id`/`activity_id` para string.
 * en-US: Returns the unique activity identifier, normalizing `id`/`activity_id` to string.
 */
const getActivityId = (a: any, mi?: number, ai?: number) => a?.id ?? a?.activity_id ?? `${mi}-${ai}`;

/**
 * htmlEquals / normalizeHtmlForCompare
 * pt-BR: Compara HTMLs ignorando tags e espaços para detectar duplicação.
 * en-US: Compares HTML strings ignoring tags and whitespace to detect duplication.
 */
function normalizeHtmlForCompare(s: string): string {
  const text = String(s || '');
  const stripped = text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  return stripped.replace(/\s+/g, ' ').toLowerCase();
}
function htmlEquals(a: string, b: string): boolean {
  return normalizeHtmlForCompare(a) === normalizeHtmlForCompare(b);
}

  /**
   * loadYouTubeAPI
   * pt-BR: Carrega a API de IFrame do YouTube e retorna uma Promise quando pronta.
   * en-US: Loads YouTube IFrame API and returns a Promise when ready.
   */
  const loadYouTubeAPI = (() => {
    let promise: Promise<void> | null = null;
    return () => {
      if (promise) return promise;
      promise = new Promise<void>((resolve) => {
        if ((window as any).YT && (window as any).YT.Player) return resolve();
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
        (window as any).onYouTubeIframeAPIReady = () => resolve();
      });
      return promise;
    };
  })();

  /**
   * useVideoResume
   * pt-BR: Integra com APIs de YouTube/Vimeo para registrar posição e retomar reprodução.
   * en-US: Integrates with YouTube/Vimeo APIs to record position and resume playback.
   */
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const html5VideoRef = useRef<HTMLVideoElement | null>(null);
  /**
   * youtubeContainerRef
   * pt-BR: Contêiner para inicializar o player do YouTube via API oficial.
   * en-US: Container to initialize the YouTube player via official API.
   */
  const youtubeContainerRef = useRef<HTMLDivElement | null>(null);
  const playerCleanupRef = useRef<() => void>(() => {});
  /**
   * durationRef
   * pt-BR: Armazena a duração total do vídeo atual para envio em `complete`.
   * en-US: Stores total duration of the current video to send in `complete`.
   */
  const durationRef = useRef<number>(0);
  /**
   * endedMarkedRef
   * pt-BR: Garante que a conclusão da atividade de vídeo seja marcada apenas uma vez por término.
   * en-US: Ensures video activity completion is marked only once per end event.
   */
  const endedMarkedRef = useRef<boolean>(false);
  /**
   * activeActivityIdRef
   * pt-BR: Guarda o ID da atividade atualmente ativa para proteger handlers
   *        assíncronos de marcar outra atividade indevidamente.
   * en-US: Stores the currently active activity ID to guard async handlers
   *        from marking a different activity inadvertently.
   */
  const activeActivityIdRef = useRef<any>(null);
  /**
   * startedPlaybackRef
   * pt-BR: Marca se a reprodução já iniciou ao menos uma vez. Usado para evitar
   *        chamadas de salvamento ao abrir a atividade sem ter reproduzido.
   * en-US: Flags whether playback has started at least once. Used to prevent
   *        save requests on activity open before any playback.
   */
  const startedPlaybackRef = useRef<boolean>(false);
  /**
   * getCurrentTimeRef
   * pt-BR: Função corrente para obter a posição atual do player, usada em flush.
   * en-US: Current function to get player's current time, used for flush.
   */
  const getCurrentTimeRef = useRef<() => number>(() => 0);
  /**
   * lastKnownTimeRef
   * pt-BR: Última posição conhecida (útil para Vimeo e fallback postMessage).
   * en-US: Last known position (useful for Vimeo and postMessage fallback).
   */
  const lastKnownTimeRef = useRef<number>(0);
  /* 
   * pt-BR: Função de conclusão movida para o escopo do componente para acesso no JSX.
   * en-US: Completion function moved to component scope for JSX access.
   */
  const markCompleteAndAdvance = async (score?: number) => {
    const a = currentActivity;
    if (!a) return;
    const mi = a._moduleIndex;
    const aid = getActivityId(a, mi, a._activityIndex);
    const cid = courseId;
    
    // pt-BR: Garante que o handler só execute para a atividade ativa.
    // en-US: Ensure handler runs only for the active activity.
    if (String(activeActivityIdRef.current) !== String(aid)) return;
    if (endedMarkedRef.current) return;
    endedMarkedRef.current = true;
    try {
      const id = aid;
      const metaSecs = Math.round(Number(toSeconds(a?.duracao ?? a?.duration, String(a?.unidade_duracao ?? a?.type_duration))) || 0);
      const playerSecs = Math.round(Number(durationRef.current || 0) || 0);
      const secondsPayload = playerSecs || metaSecs || 0;
      const configPayload = score !== undefined ? { score } : {};
      
      setCompletedIds((prev) => {
        const next = new Set(prev as any);
        const sid = String(id);
        if (!next.has(sid)) {
          next.add(sid);
          try { localStorage.setItem(storageKey, JSON.stringify(Array.from(next))); } catch {}
        }
        return next;
      });
      await progressService.toggleActivityCompletion({
        course_id: cid,
        module_id: modules[mi]?.module_id ?? modules[mi]?.id,
        activity_id: id,
        completed: true,
        seconds: secondsPayload,
        id_matricula: enrollmentId,
        config: configPayload
      });
      // pt-BR: Atualiza currículo para refletir nota e conclusão.
      // en-US: Refresh curriculum to reflect grade and completion.
      fetchCurriculum();
    } catch {}
    // pt-BR: Avança para a próxima atividade não concluída (apenas uma vez)
    // en-US: Advance to the next not-completed activity (single jump)
    navigateToNextUncompleted();
  };
  
  const positionKey = (cid: any, aid: any) => `course_video_pos_${cid}_${aid}`;

  useEffect(() => {
    playerCleanupRef.current?.();
    playerCleanupRef.current = () => {};
    const a = currentActivity;
    if (!a) return;
    const mi = a._moduleIndex;
    const ai = a._activityIndex;
    const aid = getActivityId(a, mi, ai);
    const cid = course?.id ?? course?.course_id ?? course?.token ?? 'course';
    // pt-BR: Atualiza guarda de atividade ativa e reseta refs que podem vazar estado.
    // en-US: Update active activity guard and reset refs that may leak state.
    activeActivityIdRef.current = aid;
    durationRef.current = 0;
    lastKnownTimeRef.current = 0;
    getCurrentTimeRef.current = () => 0;
    const savedLocal = Number(localStorage.getItem(positionKey(cid, aid)) || 0) || 0;
    let savedApi = 0;
    let destroyed = false;
    // reset end marker guard when activity changes (qualquer tipo)
    // reset end marker guard when activity changes (any type)
    endedMarkedRef.current = false;
    // pt-BR: Ao trocar de atividade, reseta flag de reprodução iniciada.
    // en-US: When switching activity, reset started playback flag.
    startedPlaybackRef.current = false;
    // pt-BR: Ao trocar de atividade, reseta estado visual de “Retomar”.
    // en-US: When switching activity, reset “Resume” visual state.
    setPlaybackExists(false);

    /**
     * persistPosition
     * pt-BR: Persiste posição localmente e tenta salvar na API.
     * en-US: Persists position locally and attempts to save via API.
     */
    /**
     * persistPosition
     * pt-BR: Persiste posição localmente e envia para API com `id_matricula` quando disponível.
     * en-US: Persists position locally and posts to API with `id_matricula` when available.
     */
    /**
     * persistPosition
     * pt-BR: Persiste posição localmente e envia para API com `id_matricula` quando disponível.
     * en-US: Persists position locally and posts to API with `id_matricula` when available.
     */
    /**
     * persistPosition
     * pt-BR: Persiste posição local (sempre) e envia ao backend de forma controlada
     *        por throttle (intervalo e delta mínimos). Usa flush em eventos críticos.
     * en-US: Persists local position (always) and posts to backend with throttling
     *        (interval and minimal delta). Flushes on critical events.
     */
    const intervalMs = 15000; // throttle interval for periodic sends
    const minDeltaSec = 3;    // minimal movement before sending again
    let lastSentAt = 0;
    let lastSentPosSec = 0;
    let sending = false;

    /**
     * persistPosition
     * pt-BR: Prioriza persistência na API; atualiza localStorage apenas após sucesso
     *        ou como fallback se a API falhar.
     * en-US: Prioritize API persistence; update localStorage only after success
     *        or as a fallback if the API fails.
     */
    const persistPosition = async (seconds: number, force: boolean = false) => {
      const now = Date.now();
      const movedEnough = Math.abs(Math.floor(seconds) - Math.floor(lastSentPosSec)) >= minDeltaSec;
      const intervalPassed = now - lastSentAt >= intervalMs;
      const shouldSend = force || (intervalPassed && movedEnough);
      if (!shouldSend || sending) return;

      try {
        sending = true;
        await progressService.savePlaybackPosition({
          course_id: cid,
          module_id: modules[mi]?.module_id ?? modules[mi]?.id,
          activity_id: aid,
          seconds: Math.floor(seconds),
          id_matricula: enrollmentId,
        });
        lastSentAt = now;
        lastSentPosSec = Math.floor(seconds);
        try { localStorage.setItem(positionKey(cid, aid), String(Math.floor(seconds))); } catch {}
      } catch {
        // Fallback local se API falhar
        try { localStorage.setItem(positionKey(cid, aid), String(Math.floor(seconds))); } catch {}
      } finally {
        sending = false;
      }
    };

    /**
     * saveVideoProgressOnPause
     * pt-BR: Salva o progresso do vídeo especificamente em eventos de pausa.
     *        Executa apenas quando há segundos > 0 e para a atividade ativa.
     *        Usa persistência forçada para garantir envio imediato.
     * en-US: Saves video progress specifically on pause events.
     *        Runs only when seconds > 0 and for the active activity.
     *        Uses forced persistence to ensure immediate posting.
     */
    const saveVideoProgressOnPause = (seconds: number) => {
      try {
        const secs = Math.floor(Number(seconds) || 0);
        if (secs <= 0) return;
        if (String(activeActivityIdRef.current) !== String(aid)) return;
        persistPosition(secs, true);
      } catch {}
    };

    /**
     * markCompleteAndAdvance
     * pt-BR: Marca a atividade atual como concluída e avança para a próxima.
     * en-US: Marks the current activity as completed and advances to the next.
     */
    /**
     * markCompleteAndAdvance
     * pt-BR: Marca a atividade como concluída e avança. Envia `seconds` como
     *        inteiro (Math.round); se a duração do player estiver 0, usa a
     *        duração declarada na atividade (duracao + unidade_duracao).
     * en-US: Marks the activity completed and advances. Sends `seconds` as a
     *        rounded integer; if player duration is 0, falls back to the
     *        activity-declared duration (duracao + unidade_duracao).
     */


    /**
     * markCompleteForReading
     * pt-BR: Marca atividade (leitura/arquivo) como concluída sem avançar, usando
     *        a duração declarada da atividade (se disponível).
     * en-US: Marks reading/file activity as completed without advancing, using
     *        the activity-declared duration (if available).
     */
    /**
     * markCompleteForReading
     * pt-BR: Marca leitura/arquivo como concluída e, após sucesso, mostra um toast
     *        e aguarda um pequeno atraso antes de avançar para a próxima atividade.
     * en-US: Marks reading/file as completed and, upon success, shows a toast
     *        and waits a short delay before advancing to the next activity.
     */
    const markCompleteForReading = async (secondsToSend: number) => {
      // pt-BR: Garante que o handler só execute para a atividade ativa.
      // en-US: Ensure handler runs only for the active activity.
      if (String(activeActivityIdRef.current) !== String(aid)) return;
      if (endedMarkedRef.current) return;
      endedMarkedRef.current = true;
      try {
        const id = aid;
        setCompletedIds((prev) => {
          const next = new Set(prev as any);
          const sid = String(id);
          if (!next.has(sid)) {
            next.add(sid);
            try { localStorage.setItem(storageKey, JSON.stringify(Array.from(next))); } catch {}
          }
          return next;
        });
        await progressService.toggleActivityCompletion({
          course_id: cid,
          module_id: modules[mi]?.module_id ?? modules[mi]?.id,
          activity_id: id,
          completed: true,
          seconds: Math.round(Number(secondsToSend || 0) || 0),
          id_matricula: enrollmentId,
        });
        fetchCurriculum();
        // pt-BR: Feedback visual e pequeno atraso antes de avançar (uma vez),
        //        indo para a próxima NÃO concluída.
        // en-US: Visual feedback and small delay before advancing (single),
        //        going to the next NOT completed.
        toast({ title: 'Concluído', description: 'Avançando para a próxima atividade…' });
        setTimeout(() => {
          navigateToNextUncompleted();
        }, 500);
      } catch {}
    };

    /**
     * initYouTube
     * pt-BR: Inicializa o YT.Player e salva posição a cada segundo enquanto tocando.
     * en-US: Initializes YT.Player and saves position every second while playing.
     */
    /**
     * initYouTube
     * pt-BR: Inicializa o YT.Player em um contêiner <div> usando videoId, com handlers de pausa.
     * en-US: Initializes YT.Player in a <div> container using videoId, with pause handlers.
     */
    const initYouTube = async (container: HTMLDivElement, videoId: string) => {
      await loadYouTubeAPI();
      if (destroyed) return;
      const YT = (window as any).YT;
      const player = new YT.Player(container, {
        videoId,
        playerVars: {
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: async () => {
            try {
              // pt-BR: Inclui id_matricula quando disponível.
              // en-US: Include id_matricula when available.
              const apiRes = await progressService.getPlaybackPosition(cid, aid, enrollmentId);
              savedApi = Number(apiRes?.seconds || 0) || 0;
              // pt-BR: Atualiza flag de “Retomar” baseada na API.
              // en-US: Update “Resume” flag based on API.
              setPlaybackExists(Boolean(apiRes?.exists === true));
            } catch {}
            const lastSecs = String(lastProgressRef.current?.activityId) === String(aid)
              ? Number(lastProgressRef.current?.seconds || 0) || 0
              : 0;
            // pt-BR: Prioriza API > localStorage > último progresso (pedido do usuário).
            // en-US: Prefer API > localStorage > last progress (user request).
            const startAt = savedApi || savedLocal || lastSecs || 0;
            if (startAt > 0) player.seekTo(startAt, true);
            // pt-BR: Tenta obter a duração total quando pronto.
            // en-US: Try to get total duration when ready.
            try { durationRef.current = Number(player.getDuration?.() || 0) || durationRef.current; } catch {}
            // pt-BR: Define função de tempo atual para flush.
            // en-US: Set current time getter for flush.
            getCurrentTimeRef.current = () => { try { return Number(player.getCurrentTime?.() || 0) || 0; } catch { return 0; } };
          },
          onStateChange: (ev: any) => {
            // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
            if (ev?.data === YT.PlayerState.PLAYING) {
              // pt-BR: Não salva periodicamente; apenas em pausa.
              // en-US: Do not save periodically; only on pause.
              // pt-BR: Marca que a reprodução já iniciou para permitir persistência futura.
              // en-US: Mark playback as started to allow future persistence.
              startedPlaybackRef.current = true;
              try { durationRef.current = Number(player.getDuration?.() || 0) || durationRef.current; } catch {}
            } else if (ev?.data === YT.PlayerState.PAUSED) {
              // pt-BR: Ao pausar, envia posição atual para API imediatamente.
              // en-US: On pause, immediately send current position to the API.
              try {
                const t = Number(player.getCurrentTime() || 0) || 0;
                // pt-BR: Usa função dedicada para pausa.
                // en-US: Use dedicated pause function.
                saveVideoProgressOnPause(t);
              } catch {}
            } else if (ev?.data === YT.PlayerState.ENDED) {
              // pt-BR: Ao terminar o vídeo, marcar conclusão no servidor e avançar.
              // en-US: On video end, mark completion on server and advance.
              // pt-BR: Guarda: execute apenas para a atividade ativa.
              // en-US: Guard: run only for the active activity.
              if (String(activeActivityIdRef.current) !== String(aid)) return;
              if (String(activeActivityIdRef.current) !== String(aid)) return;
              markCompleteAndAdvance();
            }
          },
        },
      });
      // Limpeza ao trocar atividade
      const prevCleanup = playerCleanupRef.current;
      playerCleanupRef.current = () => {
        try { player.destroy?.(); } catch {}
        try { prevCleanup?.(); } catch {}
      };
    };

    /**
     * initVimeo
     * pt-BR: Inicializa o player do Vimeo usando o SDK oficial (@vimeo/player),
     *        retomando posição, salvando progresso e avançando ao término.
     * en-US: Initializes Vimeo player using the official SDK (@vimeo/player),
     *        resuming position, saving progress, and auto-advancing on end.
     */
    const initVimeo = async (el: HTMLIFrameElement) => {
      try {
        const PlayerMod = await import('@vimeo/player');
        const Player = PlayerMod.default as any;
        const player = new Player(el);
        // pt-BR: Define função de tempo atual baseada na última posição conhecida.
        // en-US: Set current time getter based on last known position.
        getCurrentTimeRef.current = () => Number(lastKnownTimeRef.current || 0) || 0;

        // Retoma a posição quando o player estiver carregado
        player.on('loaded', async () => {
          try {
            const lastSecs = String(lastProgressRef.current?.activityId) === String(aid)
              ? Number(lastProgressRef.current?.seconds || 0) || 0
              : 0;
            // pt-BR: Prioriza API > localStorage > último progresso (pedido do usuário).
            // en-US: Prefer API > localStorage > last progress (user request).
            const startAt = savedApi || savedLocal || lastSecs || 0;
            if (startAt > 0) await player.setCurrentTime(startAt);
          } catch {}
        });

        // Atualiza duração e última posição conhecida (não salva periodicamente)
        player.on('timeupdate', (data: any) => {
          const seconds = Number(data?.seconds || 0) || 0;
          const duration = Number(data?.duration || 0) || 0;
          lastKnownTimeRef.current = seconds;
          // pt-BR: Marca reprodução iniciada após avançar pelo menos 1 segundo.
          // en-US: Mark playback started after advancing at least 1 second.
          if (seconds > 0) startedPlaybackRef.current = true;
          if (duration > 0) durationRef.current = duration;
          // pt-BR: Não conclui em timeupdate; conclusão apenas em 'ended'.
          // en-US: Do not complete on timeupdate; completion only on 'ended'.
        });

        /**
         * pause handler
         * pt-BR: Ao pausar, envia imediatamente a posição atual para a API (garante persistência).
         * en-US: On pause, immediately send current position to the API (ensures persistence).
         */
        player.on('pause', (data: any) => {
          const seconds = Number(data?.seconds || 0) || 0;
          // pt-BR: Usa função dedicada para pausa.
          // en-US: Use dedicated pause function.
          saveVideoProgressOnPause(seconds);
        });

        // pt-BR: Marca reprodução iniciada ao receber evento de play.
        // en-US: Mark playback started on play event.
        try { player.on?.('play', () => { startedPlaybackRef.current = true; }); } catch {}

        // Avança automaticamente ao término
        player.on('ended', async () => {
          // pt-BR: Guarda: execute apenas para a atividade ativa.
          // en-US: Guard: run only for the active activity.
          if (String(activeActivityIdRef.current) !== String(aid)) return;
          if (!endedMarkedRef.current) {
            endedMarkedRef.current = true;
            try {
              const id = aid;
              setCompletedIds((prev) => {
                const next = new Set(prev as any);
                const sid = String(id);
                if (!next.has(sid)) {
                  next.add(sid);
                  try { localStorage.setItem(storageKey, JSON.stringify(Array.from(next))); } catch {}
                }
                return next;
              });
              await progressService.toggleActivityCompletion({
                course_id: cid,
                module_id: modules[mi]?.module_id ?? modules[mi]?.id,
                activity_id: id,
                completed: true,
                seconds: Math.round(Number(durationRef.current || 0) || 0),
                id_matricula: enrollmentId,
              });
          } catch {}
            // pt-BR: Avança para a próxima NÃO concluída
            // en-US: Advance to next NOT completed
            navigateToNextUncompleted();
          }
        });

        // Limpeza ao trocar atividade
        const prevCleanup = playerCleanupRef.current;
        playerCleanupRef.current = () => {
          try { player.unload?.(); } catch {}
          try { player.off?.('timeupdate'); player.off?.('ended'); player.off?.('loaded'); player.off?.('pause'); } catch {}
          try { prevCleanup?.(); } catch {}
        };
      } catch {
        // Fallback: postMessage (mantém compatibilidade). Usa 'ended' no lugar de 'finish'.
        const target = el.contentWindow;
        if (!target) return;
        const onMessage = (e: MessageEvent) => {
          if (!e || !e.data) return;
          try {
            const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
            if (data?.event === 'ready') {
              const lastSecs = String(lastProgressRef.current?.activityId) === String(aid)
                ? Number(lastProgressRef.current?.seconds || 0) || 0
                : 0;
              // pt-BR: Prioriza API > localStorage > último progresso (pedido do usuário).
              // en-US: Prefer API > localStorage > last progress (user request).
              const startAt = savedApi || savedLocal || lastSecs || 0;
              if (startAt > 0) target.postMessage({ method: 'setCurrentTime', value: startAt }, '*');
              target.postMessage({ method: 'addEventListener', value: 'timeupdate' }, '*');
              target.postMessage({ method: 'addEventListener', value: 'ended' }, '*');
              // pt-BR: Alguns embeds usam 'finish' em vez de 'ended'. Ouça ambos.
              // en-US: Some embeds use 'finish' instead of 'ended'. Listen to both.
              target.postMessage({ method: 'addEventListener', value: 'finish' }, '*');
              // pt-BR: Ouve 'pause' para persistir posição imediatamente.
              // en-US: Listen to 'pause' to persist position immediately.
              target.postMessage({ method: 'addEventListener', value: 'pause' }, '*');
              // pt-BR: Ouve 'play' para marcar reprodução iniciada.
              // en-US: Listen to 'play' to mark playback started.
              target.postMessage({ method: 'addEventListener', value: 'play' }, '*');
              // pt-BR: Define função de tempo atual baseada na última posição conhecida.
              // en-US: Set current time getter based on last known position.
              getCurrentTimeRef.current = () => Number(lastKnownTimeRef.current || 0) || 0;
            } else if (data?.event === 'timeupdate') {
              const seconds = Number(data?.data?.seconds || 0) || 0;
              const duration = Number(data?.data?.duration || 0) || 0;
              lastKnownTimeRef.current = seconds;
              if (seconds > 0) startedPlaybackRef.current = true;
              if (duration > 0) durationRef.current = duration;
              // pt-BR: Não conclui em timeupdate; conclusão apenas em 'ended' ou 'finish'.
              // en-US: Do not complete on timeupdate; completion only on 'ended' or 'finish'.
            } else if (data?.event === 'pause') {
              const seconds = Number(data?.data?.seconds || 0) || 0;
              // pt-BR: Usa função dedicada para pausa.
              // en-US: Use dedicated pause function.
              saveVideoProgressOnPause(seconds);
            } else if (data?.event === 'play') {
              startedPlaybackRef.current = true;
            } else if (data?.event === 'ended' || data?.event === 'finish') {
              // pt-BR: Guarda: execute apenas para a atividade ativa.
              // en-US: Guard: run only for the active activity.
              if (String(activeActivityIdRef.current) !== String(aid)) return;
              if (!endedMarkedRef.current) {
                endedMarkedRef.current = true;
                (async () => {
                  try {
                    const id = aid;
                    setCompletedIds((prev) => {
                      const next = new Set(prev as any);
                      const sid = String(id);
                      if (!next.has(sid)) {
                        next.add(sid);
                        try { localStorage.setItem(storageKey, JSON.stringify(Array.from(next))); } catch {}
                      }
                      return next;
                    });
                    await progressService.toggleActivityCompletion({
                      course_id: cid,
                      module_id: modules[mi]?.module_id ?? modules[mi]?.id,
                      activity_id: id,
                      completed: true,
                      seconds: Math.round(Number(durationRef.current || 0) || 0),
                      id_matricula: enrollmentId,
                    });
                  } catch {}
                  // pt-BR: Avança para a próxima NÃO concluída
                  // en-US: Advance to next NOT completed
                  navigateToNextUncompleted();
                })();
              }
            }
          } catch {}
        };
        window.addEventListener('message', onMessage);
        target.postMessage({ method: 'addEventListener', value: 'ready' }, '*');
        const prevCleanup = playerCleanupRef.current;
        playerCleanupRef.current = () => { window.removeEventListener('message', onMessage); try { prevCleanup?.(); } catch {} };
      }
    };

    // fetch API position early (non-blocking) to prefer server state
    (async () => {
      try {
        const apiRes = await progressService.getPlaybackPosition(cid, aid, enrollmentId);
        savedApi = Number(apiRes?.seconds || 0) || 0;
        // pt-BR: Atualiza flag de “Retomar” baseada na API (carregamento antecipado).
        // en-US: Update “Resume” flag based on API (early fetch).
        setPlaybackExists(Boolean(apiRes?.exists === true));
      } catch {}
    })();

    // Decide qual player inicializar (YouTube/Vimeo via iframe, ou HTML5 para MP4)
    const iframeEl = iframeRef.current;
    const videoEl = html5VideoRef.current;
    const provider = getActivityProvider(a);
    const activityUrl = getActivityUrl(a);
    const ytId = provider === 'youtube' ? getYouTubeIdFromAnyUrl(activityUrl) : '';

    // Inicialização por provedor
    if (provider === 'youtube') {
      const container = youtubeContainerRef.current;
      if (container && ytId) initYouTube(container, ytId);
    } else if (provider === 'vimeo') {
      if (iframeEl) initVimeo(iframeEl);
    }

    // pt-BR: Atividades de leitura/arquivo — marcam conclusão apenas se
    //        o tempo de abertura atingir a duração declarada; se não houver
    //        duração, não marcam conclusão.
    // en-US: Reading/file activities — mark completed only if open time
    //        reaches the declared duration; if no duration, do not mark.
    {
      const typeStr = getType(a);
      const readingLike = isDocument(a) || typeStr.includes('leitura') || isLink(a);
      const hasVideo = isVideo(a);
      const requiredSecs = Math.round(Number(toSeconds(a?.duracao ?? a?.duration, String(a?.unidade_duracao ?? a?.type_duration))) || 0);
      if (readingLike && !hasVideo && !isQuiz(a) && requiredSecs > 0) {
        const startAtMs = Date.now();
        const tickMs = 1000;
        let intervalId: any = null;
        // pt-BR: Inicializa contador visual de tempo restante
        // en-US: Initialize visual remaining time counter
        try { setReadingRemaining(requiredSecs); } catch {}
        const startInterval = () => {
          if (intervalId) return;
          intervalId = setInterval(() => {
            if (destroyed) { clearInterval(intervalId); return; }
            const elapsedSec = Math.floor((Date.now() - startAtMs) / 1000);
            try { setReadingRemaining(Math.max(requiredSecs - elapsedSec, 0)); } catch {}
            if (elapsedSec >= requiredSecs && !endedMarkedRef.current) {
              clearInterval(intervalId);
              markCompleteForReading(requiredSecs);
            }
          }, tickMs);
        };
        startInterval();
        const prevCleanup = playerCleanupRef.current;
        playerCleanupRef.current = () => {
          if (intervalId) { clearInterval(intervalId); intervalId = null; }
          try { setReadingRemaining(0); } catch {}
          try { prevCleanup?.(); } catch {}
        };
      }
    }

    // Inicialização para HTML5 <video> (MP4)
    if (videoEl) {
      const onLoaded = () => {
        const lastSecs = String(lastProgressRef.current?.activityId) === String(aid)
          ? Number(lastProgressRef.current?.seconds || 0) || 0
          : 0;
        // pt-BR: Prioriza API > localStorage > último progresso (pedido do usuário).
        // en-US: Prefer API > localStorage > last progress (user request).
        const startAt = savedApi || savedLocal || lastSecs || 0;
        try { if (startAt > 0) videoEl.currentTime = startAt; } catch {}
        try { durationRef.current = Number(videoEl.duration || 0) || durationRef.current; } catch {}
      };
      // pt-BR: Atualiza referências de tempo e duração sem persistir continuamente.
      // en-US: Update time and duration refs without continuous persistence.
      const onTimeUpdate = () => {
        try {
          const current = Number(videoEl.currentTime || 0) || 0;
          lastKnownTimeRef.current = current;
          const duration = Number(videoEl.duration || 0) || 0;
          if (duration > 0) durationRef.current = duration;
          // Salvaguarda de conclusão próxima ao fim
          // if (duration > 0 && current >= duration - 1 && !endedMarkedRef.current) {
          //   markCompleteAndAdvance();
          // }
        } catch {}
      };
      // pt-BR: Define função de tempo atual para flush global.
      // en-US: Set current time getter for global flush.
      getCurrentTimeRef.current = () => { try { return Number(videoEl.currentTime || 0) || 0; } catch { return 0; } };
      // pt-BR: Ao pausar, persiste imediatamente a posição atual na API.
      // en-US: On pause, immediately persist current position to the API.
      const onPausePersist = () => {
        try {
          const pos = Number(videoEl.currentTime || 0) || 0;
          // pt-BR: Usa função dedicada para pausa.
          // en-US: Use dedicated pause function.
          saveVideoProgressOnPause(pos);
        } catch {}
      };
      const onPlayStarted = () => { startedPlaybackRef.current = true; };
      const onEnded = () => {
        // pt-BR: Guarda: execute apenas para a atividade ativa.
        // en-US: Guard: run only for the active activity.
        if (String(activeActivityIdRef.current) !== String(aid)) return;
        if (!endedMarkedRef.current) {
          endedMarkedRef.current = true;
          (async () => {
            try {
              const id = aid;
              setCompletedIds((prev) => {
                const next = new Set(prev as any);
                const sid = String(id);
                if (!next.has(sid)) {
                  next.add(sid);
                  try { localStorage.setItem(storageKey, JSON.stringify(Array.from(next))); } catch {}
                }
                return next;
              });
              await progressService.toggleActivityCompletion({
                course_id: cid,
                module_id: modules[mi]?.module_id ?? modules[mi]?.id,
                activity_id: id,
                completed: true,
                seconds: Math.round(Number(durationRef.current || 0) || 0),
                id_matricula: enrollmentId,
              });
            } catch {}
            // pt-BR: Avança para a próxima NÃO concluída
            // en-US: Advance to next NOT completed
            navigateToNextUncompleted();
          })();
        }
      };
      videoEl.addEventListener('loadedmetadata', onLoaded);
      videoEl.addEventListener('timeupdate', onTimeUpdate);
      videoEl.addEventListener('pause', onPausePersist);
      videoEl.addEventListener('play', onPlayStarted);
      videoEl.addEventListener('ended', onEnded);
      const prevCleanup = playerCleanupRef.current;
      playerCleanupRef.current = () => {
        videoEl.removeEventListener('loadedmetadata', onLoaded);
        videoEl.removeEventListener('timeupdate', onTimeUpdate);
        videoEl.removeEventListener('pause', onPausePersist);
        videoEl.removeEventListener('play', onPlayStarted);
        videoEl.removeEventListener('ended', onEnded);
        try { prevCleanup?.(); } catch {}
      };
    }

    // pt-BR: Salvamento periódico removido para evitar sobrecarga. Salva apenas no pause.
    // en-US: Periodic saving removed to avoid overload. Saves only on pause.


    return () => { destroyed = true; playerCleanupRef.current?.(); };
  }, [currentActivity, course, modules]);

  /**
   * getModuleTotalSeconds
   * pt-BR: Soma duração das atividades do módulo; se vazio, usa duração do módulo.
   * en-US: Sums activities durations; if empty, uses module duration.
   */
  function getModuleTotalSeconds(m: any) {
    const activities: any[] = Array.isArray(m?.atividades || m?.activities) ? (m?.atividades || m?.activities) : [];
    const sumActs = activities.reduce((acc, a) => acc + toSeconds(a?.duracao ?? a?.duration, String(a?.unidade_duracao ?? a?.type_duration)), 0);
    if (sumActs > 0) return sumActs;
    return toSeconds(m?.duration ?? 0, String(m?.tipo_duracao ?? '').toLowerCase());
  }




  /**
   * handleRequestCertificate
   * pt-BR: Solicita geração do certificado (PDF) para a matrícula atual.
   *        Faz download local do arquivo e exibe feedback.
   * en-US: Requests certificate (PDF) generation for current enrollment.
   *        Downloads the file and shows feedback.
   */
  async function handleRequestCertificate() {
    try {
      if (!enrollmentId) {
        toast({ title: 'Matrícula inválida', description: 'Não foi possível identificar sua matrícula.', variant: 'destructive' } as any);
        return;
      }
      setGeneratingCert(true);
      const blob = await certificatesService.generatePdf(enrollmentId);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `certificado_${String(enrollmentId)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      toast({ title: 'Certificado gerado', description: 'Download iniciado com sucesso.' });
    } catch (err: any) {
      toast({
        title: 'Falha ao gerar certificado',
        description: String(err?.message || 'Tente novamente mais tarde.'),
        variant: 'destructive',
      } as any);
    } finally {
      setGeneratingCert(false);
    }
  }

  /**
   * readActivityFromUrl effect
   * pt-BR: Lê `?activity=<id>` apenas se presente na URL inicial (intenção do usuário).
   * en-US: Reads `?activity=<id>` only if present in the initial URL (user intent).
   */
  const initialActivityParamRef = useRef<string | null>(null);
  const urlSelectionAppliedRef = useRef<boolean>(false);
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      if (initialActivityParamRef.current === null) {
        initialActivityParamRef.current = params.get('activity');
      }
      const aidParam = params.get('activity');
      if (!initialActivityParamRef.current || urlSelectionAppliedRef.current) return;
      if (String(aidParam || '') !== String(initialActivityParamRef.current || '')) return;
      const idx = filteredActivities.findIndex((a) => String(getActivityId(a, a?._moduleIndex, a?._activityIndex)) === String(aidParam));
      if (idx >= 0) {
        selectionIntentRef.current = 'user';
        setCurrentIndex(idx);
        autoSelectOnceRef.current = true;
        urlSelectionAppliedRef.current = true;
      }
    } catch {}
  }, [location.search, filteredActivities]);

  useEffect(() => {
    // pt-BR: Pré-carrega do localStorage para feedback imediato
    // en-US: Preload from localStorage for immediate feedback
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const asStrings = Array.isArray(parsed) ? parsed.map((v: any) => String(v)) : [];
        setCompletedIds(new Set(asStrings));
      }
    } catch {}
    
    const schedule = (cb: () => void) => {
      try {
        const ric = (window as any).requestIdleCallback as undefined | ((fn: any, opts?: any) => void);
        if (typeof ric === 'function') ric(cb, { timeout: 2000 }); else setTimeout(cb, 0);
      } catch {
        setTimeout(cb, 0);
      }
    };
    schedule(fetchCurriculum);
  }, [storageKey, courseId, enrollmentId]);
  /**
   * autoSkipOnAutoSelection
   * pt-BR: Mantém o auto-skip ATIVO somente quando a seleção é automática.
   *        Se a atividade atual estiver concluída e a intenção for 'auto',
   *        avança para a próxima não concluída. Se a intenção for 'user',
   *        mantém a atividade selecionada para revisão.
   * en-US: Keeps auto-skip ACTIVE only for automatic selections. If the
   *        current activity is completed and intent is 'auto', advances to the
   *        next not-completed. If intent is 'user', keeps the selection to
   *        allow review.
   */
  useEffect(() => {
    const a: any = currentActivity;
    if (!a) return;
    const mi = a?._moduleIndex; const ai = a?._activityIndex;
    const aid = getActivityId(a, mi, ai);
    const isCompleted = completedIds.has(String(aid));
    if (!isCompleted) return;
    if (selectionIntentRef.current === 'user') return; // Não auto-pular se usuário escolheu
    // pt-BR: Avança apenas para a primeira atividade imediatamente após a atual.
    // en-US: Advance only to the first activity immediately after the current.
    const nextIdx = currentIndex + 1;
    if (nextIdx < filteredActivities.length) {
      selectionIntentRef.current = 'auto';
      setCurrentIndex(nextIdx);
    }
  }, [currentActivity, currentIndex, filteredActivities, completedIds]);

  /**
   * initialAutoPick effect
   * pt-BR: Quando a página abre SEM `?activity=`, usa `completedIds` (local/API)
   *        e posições salvas para selecionar automaticamente: primeiro "Retomar"
   *        (seconds > 0 e não concluído) ou a primeira não concluída. Não marca
   *        `autoSelectOnceRef` aqui, permitindo que a resposta da API ajuste
   *        posteriormente, evitando travar na primeira atividade.
   * en-US: When the page opens WITHOUT `?activity=`, use `completedIds` (local/API)
   *        and saved positions to auto-select: first "Resume" (seconds > 0 and
   *        not completed) or the first not-completed. Does not set
   *        `autoSelectOnceRef` here, allowing the API response to refine later,
   *        avoiding locking to the first activity.
   */
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const aidParam = params.get('activity');
      if (aidParam) return; // explicit URL selection → user intent elsewhere
      if (autoSelectOnceRef.current) return; // already picked by API/initial URL
      if (!filteredActivities?.length) return;

      // 1) Pick first activity with saved seconds (Resume) and not completed
      let pickIndex = -1;
      for (let i = 0; i < filteredActivities.length; i++) {
        const a = filteredActivities[i];
        const id = a?.id ?? a?.activity_id ?? `${a?._moduleIndex}-${a?._activityIndex}`;
        const sid = String(id);
        let secs = 0;
        try {
          const posRaw = localStorage.getItem(positionKey(courseId, sid));
          secs = Number(posRaw || 0) || 0;
        } catch {}
        const hasResume = secs > 0;
        const isDone = completedIds.has(sid);
        if (hasResume && !isDone) { pickIndex = i; break; }
      }

      // 2) Fallback to first not-completed (using completedIds from local/API)
      if (pickIndex < 0) {
        for (let i = 0; i < filteredActivities.length; i++) {
          const a = filteredActivities[i];
          const id = a?.id ?? a?.activity_id ?? `${a?._moduleIndex}-${a?._activityIndex}`;
          if (!completedIds.has(String(id))) { pickIndex = i; break; }
        }
      }

      if (pickIndex >= 0) {
        selectionIntentRef.current = 'auto';
        setCurrentIndex(pickIndex);
        // Nota: não definimos autoSelectOnceRef aqui para permitir ajuste pela API
      }
    } catch {}
  }, [filteredActivities, location.search, completedIds, courseId]);

  /**
   * completedSummaryText
   * pt-BR: Texto de resumo de concluídas, no formato "X de Y assistidas".
   * en-US: Completed summary text, formatted as "X of Y watched".
   */
  const completedSummaryText = useMemo(() => {
    try {
      const total = filteredActivities.length;
      if (!total) return '';
      const count = filteredActivities.reduce((acc, a) => {
        const id = a?.id ?? a?.activity_id ?? `${a?._moduleIndex}-${a?._activityIndex}`;
        return completedIds.has(String(id)) ? acc + 1 : acc;
      }, 0);
      return `${count} de ${total} assistidas`;
    } catch {
      return '';
    }
  }, [filteredActivities, completedIds]);
// (perf) evita logs em produção

  /**
   * courseProgressPercent
   * pt-BR: Percentual de progresso total do curso (todas as atividades).
   * en-US: Total course progress percentage (all activities).
   */
  const courseProgressPercent = useMemo(() => {
    try {
      const total = flatActivities.length;
      if (!total) return 0;
      const count = flatActivities.reduce((acc, a: any) => {
        const id = a?.id ?? a?.activity_id ?? `${a?._moduleIndex}-${a?._activityIndex}`;
        return completedIds.has(String(id)) ? acc + 1 : acc;
      }, 0);
      return Math.round((count / total) * 100);
    } catch {
      return 0;
    }
  }, [flatActivities, completedIds]);

  /**
   * toggleCompleted
   * pt-BR: Alterna conclusão e persiste em localStorage e API. Envia `seconds`
   *        como inteiro; se a duração do player estiver 0, usa a duração
   *        declarada da atividade (duracao + unidade_duracao) como fallback.
   * en-US: Toggles completion and persists to localStorage and API. Sends
   *        `seconds` as an integer; if player duration is 0, falls back to the
   *        activity-declared duration (duracao + unidade_duracao).
   */
  const toggleCompleted = async (a: any, mi: number, ai: number) => {
    const id = a?.id ?? a?.activity_id ?? `${mi}-${ai}`;
    let nowCompleted = false;
    setCompletedIds((prev) => {
      const next = new Set(prev);
      const sid = String(id);
      nowCompleted = !next.has(sid);
      if (nowCompleted) next.add(sid); else next.delete(sid);
      try { localStorage.setItem(storageKey, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
    try {
      const metaSecs = Math.round(Number(toSeconds(a?.duracao ?? a?.duration, String(a?.unidade_duracao ?? a?.type_duration))) || 0);
      const playerSecs = Math.round(Number(durationRef.current || 0) || 0);
      const secondsPayload = playerSecs || metaSecs || 0;
      await progressService.toggleActivityCompletion({
        course_id: courseId,
        module_id: modules[mi]?.module_id ?? modules[mi]?.id,
        activity_id: id,
        completed: nowCompleted,
        // pt-BR: Duração total (player ou fallback da atividade), arredondada.
        // en-US: Total duration (player or activity fallback), rounded.
        seconds: secondsPayload,
        // pt-BR: Envia id_matricula quando disponível para controle de frequência.
        // en-US: Sends id_matricula when available for attendance.
        id_matricula: enrollmentId,
      });
    } catch {}
  };

  /**
   * navigatePrev / navigateNext
   * pt-BR: Controles de navegação (Anterior / Próximo).
   * en-US: Navigation controls (Previous / Next).
   */
  /**
   * navigatePrev / navigateNext
   * pt-BR: Navega com intenção automática (mantém auto-skip ativo).
   * en-US: Navigates with automatic intent (keeps auto-skip active).
   */
  const navigatePrev = () => {
    selectionIntentRef.current = 'auto';
    setCurrentIndex((i) => Math.max(0, i - 1));
  };
  const navigateNext = () => {
    selectionIntentRef.current = 'auto';
    setCurrentIndex((i) => Math.min(filteredActivities.length - 1, i + 1));
  };

  /**
   * navigateToNextUncompleted
   * pt-BR: Avança para a próxima atividade NÃO concluída, percorrendo o currículo
   *        a partir da atividade atual. Usa `progressMap` (API) quando disponível
   *        e cai para `completedIds` (localStorage/API) como fallback. Define a
   *        intenção como 'user' para evitar auto-pulos em cadeia.
   * en-US: Advances to the next NOT completed activity, scanning the curriculum
   *        from the current activity. Uses `progressMap` (API) when available
   *        and falls back to `completedIds` (localStorage/API). Sets intent to
   *        'user' to avoid chained auto-skips.
   */
  const navigateToNextUncompleted = () => {
    try {
      if (!filteredActivities?.length) return;
      const start = currentIndex + 1;
      for (let i = start; i < filteredActivities.length; i++) {
        const a: any = filteredActivities[i];
        const id = a?.id ?? a?.activity_id ?? `${a?._moduleIndex}-${a?._activityIndex}`;
        const sid = String(id);
        const isCompleted = completedIds.has(sid);
        if (!isCompleted) {
          selectionIntentRef.current = 'user';
          setCurrentIndex(i);
          return;
        }
      }
      // Fallback: se não houver próxima não concluída, avança uma posição.
      if (start < filteredActivities.length) {
        selectionIntentRef.current = 'user';
        setCurrentIndex(start);
      }
    } catch {}
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top bar: search + progress */}
      {/**
       * compactTopBar
       * pt-BR: Reduz paddings e gaps no mobile para evitar espaços excessivos
       *        e aproveitar melhor a área de conteúdo.
       * en-US: Reduce paddings and gaps on mobile to avoid excessive spacing
       *        and make better use of the content area.
       */}
      <div className="sticky top-0 z-10 bg-background text-foreground border-b px-2 py-2 md:px-3 md:py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="hidden md:block">
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                selectionIntentRef.current = 'auto';
                setCurrentIndex(0);
              }}
              placeholder="Buscar conteúdo do curso"
              className="w-[280px] md:max-w-md h-10"
            />
          </div>
          <div className="flex md:hidden items-center gap-2">
            {mobileSearchOpen ? (
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  selectionIntentRef.current = 'auto';
                  setCurrentIndex(0);
                }}
                placeholder="Buscar conteúdo do curso"
                className="w-[60%] h-9"
              />
            ) : (
              <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setMobileSearchOpen(true)} title="Buscar">
                <Search className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showGrades ? "default" : "secondary"}
              size="sm"
              onClick={() => setShowGrades(!showGrades)}
              title="Meu Desempenho"
              className="gap-2"
            >
               <GraduationCap className="h-4 w-4" />
               <span className="hidden sm:inline">Notas</span>
            </Button>
            <Button
              title={showSidebar ? 'Esconder painel lateral' : 'Mostrar painel lateral'}
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex h-8 w-8 p-0 items-center justify-center"
              onClick={() => setShowSidebar((v) => !v)}
            >
              {showSidebar ? (<ChevronLeft className="h-3.5 w-3.5" />) : (<ChevronRight className="h-3.5 w-3.5" />)}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="md:hidden h-8 px-2 whitespace-nowrap"
              onClick={() => setMobileSidebarOpen(true)}
              title="Abrir atividades"
            >
              <Folder className="h-4 w-4 mr-1" /> Atividades
            </Button>
            <Button
              size="sm"
              className="h-8 px-2 whitespace-nowrap"
              onClick={handleRequestCertificate}
              disabled={generatingCert || !enrollmentId || courseProgressPercent < 100}
              title={!enrollmentId ? 'Matrícula não identificada' : (courseProgressPercent < 100 ? 'Conclua todas as atividades para solicitar o certificado' : 'Gerar certificado em PDF')}
            >
              <GraduationCap className="h-3.5 w-3.5 mr-1" />
              {generatingCert ? 'Gerando…' : 'Solicitar certificado'}
            </Button>
            <Button title="Mostrar ou recolher atividades" variant="outline" size="sm" className="hidden md:inline-flex" onClick={() => setCollapseInactiveModules((v) => !v)}>
              {collapseInactiveModules ? (
                <><ChevronUp className="h-3.5 w-3.5 mr-1" /> Mostrar todos</>
              ) : (
                <><ChevronDown className="h-3.5 w-3.5 mr-1" /> Recolher inativos</>
              )}
            </Button>
            
          </div>
          {progressLoading && (
            <span className="flex items-center gap-1 text-[11px] md:text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> sincronizando…
            </span>
          )}
          <span className="ml-auto flex items-center gap-2 text-[11px] md:text-sm">
           {courseTotalLabel && (
             <span className="px-2 py-[2px] rounded-full bg-muted text-muted-foreground">
               {courseTotalLabel}
             </span>
           )}
           <span className="px-2 py-[2px] rounded-full bg-muted text-muted-foreground">
             {progressText}
           </span>
           {completedSummaryText && (
             <span className="px-2 py-[2px] rounded-full bg-muted text-muted-foreground">
               {completedSummaryText}
             </span>
           )}
           {/* pt-BR: Barra percentual de progresso total do curso */}
           {/* en-US: Total course progress percentage bar */}
          <span className="flex items-center gap-2">
            <div className="w-16 md:w-24 h-1 md:h-2 bg-muted rounded overflow-hidden">
              <div className="h-full md:bg-primary bg-secondary" style={{ width: `${courseProgressPercent}%` }} />
            </div>
            <span className="hidden md:inline text-[10px] md:text-xs">{courseProgressPercent}%</span>
          </span>
          </span>
        </div>
      </div>

      {/* Mobile Drawer: activities list */}
      <Drawer open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Atividades</DrawerTitle>
          </DrawerHeader>
          <div className="p-2 max-h-[60vh] overflow-y-auto">
            {modules.map((m: any, mi: number) => {
              const title = m?.titulo || m?.title || m?.name || `Módulo ${mi + 1}`;
              const activities: any[] = Array.isArray(m?.atividades || m?.activities) ? (m?.atividades || m?.activities) : [];
              const isCollapsed = Boolean(collapsedModules[mi]);
              const isCurrent = Boolean(currentActivity && mi === (currentActivity as any)._moduleIndex);
              const showActivities = !isCollapsed && (!collapseInactiveModules || isCurrent);
              return (
                <div key={`mobile-sidebar-mod-${mi}`} className="mb-3">
                  <button
                    className="w-full font-semibold text-sm mb-2 flex items-center gap-2 px-2 py-1 rounded hover:bg-muted"
                    title={isCollapsed ? 'Mostrar atividades do módulo' : 'Recolher atividades do módulo'}
                    onClick={() => setCollapsedModules(prev => ({ ...prev, [mi]: !Boolean(prev[mi]) }))}
                  >
                    {isCollapsed ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                    <Folder className="h-4 w-4" />
                    <span className="line-clamp-1 break-words flex-1 text-left">{title}</span>
                    {(() => {
                      /**
                       * pt-BR: Badge com total de atividades do módulo. O tempo total
                       *        aparece como tooltip (title) ao passar o mouse no badge.
                       * en-US: Badge with module activity count. Total time appears as
                       *        tooltip (title) when hovering over the badge.
                       */
                      const totalSecs = getModuleTotalSeconds(m);
                      const label = totalSecs ? formatDuration(totalSecs) : '';
                      const totalCount = activities.length;
                      return (
                        <Badge variant="outline" className="shrink-0" title={label || undefined}>{totalCount}</Badge>
                      );
                    })()}
                  </button>
                  {showActivities && (
                  <ul className="space-y-2">
                    {activities.map((a: any, ai: number) => {
                      const atitle = a?.titulo || a?.title || a?.name || `Atividade ${ai + 1}`;
                      const durationLabel = getDurationLabel(a);
                      const term = searchTerm.trim().toLowerCase();
                      const matches = (() => {
                        if (!term) return true;
                        const t = String(atitle).toLowerCase();
                        const d = String(a?.descricao || a?.description || '').toLowerCase();
                        const ty = String(getType(a)).toLowerCase();
                        return t.includes(term) || d.includes(term) || ty.includes(term);
                      })();
                      if (!matches) return null;
                      const typeIcon = isVideo(a) ? <Play className="h-4 w-4 text-muted-foreground" /> : isDocument(a) ? <FileText className="h-4 w-4 text-muted-foreground" /> : isLink(a) ? <LinkIcon className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />;
                      return (
                        <li key={`mobile-sidebar-${mi}-${ai}`} className="flex items-center gap-2">
                          <button
                            className="flex-1 grid grid-cols-[20px_1fr] items-center gap-2 rounded px-2 py-1 hover:bg-muted"
                            onClick={() => {
                              const globalIdx = flatActivities.findIndex((fa: any) => fa?._moduleIndex === mi && fa?._activityIndex === ai);
                              selectionIntentRef.current = 'user';
                              setCurrentIndex(globalIdx >= 0 ? globalIdx : 0);
                              setMobileSidebarOpen(false);
                            }}
                          >
                            {typeIcon}
                            <div className="text-sm font-normal line-clamp-2 break-words leading-tight">{atitle}</div>
                            {durationLabel && (
                              <div className="col-span-2 text-xs text-muted-foreground">{durationLabel}</div>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  )}
                </div>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Main content: sidebar + viewer */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Sidebar */}
        {showSidebar && (
        <aside className="hidden md:block w-[320px] border-r overflow-y-auto p-2">
          {modules.map((m: any, mi: number) => {
            const title = m?.titulo || m?.title || m?.name || `Módulo ${mi + 1}`;
            const activities: any[] = Array.isArray(m?.atividades || m?.activities) ? (m?.atividades || m?.activities) : [];
            const isCollapsed = Boolean(collapsedModules[mi]);
            const isCurrent = Boolean(currentActivity && mi === (currentActivity as any)._moduleIndex);
            const showActivities = !isCollapsed && (!collapseInactiveModules || isCurrent);
            return (
              <div key={`sidebar-mod-${mi}`} className="mb-3">
                <button
                  className="w-full font-semibold text-sm mb-2 flex items-center gap-2 px-2 py-1 rounded hover:bg-muted text-left"
                  title={isCollapsed ? 'Mostrar atividades do módulo' : 'Recolher atividades do módulo'}
                  onClick={() => setCollapsedModules(prev => ({ ...prev, [mi]: !Boolean(prev[mi]) }))}
                >
                  {isCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                  <Folder className="h-4 w-4" />
                  <span className="line-clamp-1 break-words flex-1">{title}</span>
                  {(() => {
                    /**
                     * pt-BR: Badge com total de atividades; tempo total via tooltip.
                     * en-US: Activity-count badge; total time via tooltip.
                     */
                    const totalSecs = getModuleTotalSeconds(m);
                    const label = totalSecs ? formatDuration(totalSecs) : '';
                    const totalCount = activities.length;
                    return (
                      <Badge variant="outline" className="shrink-0" title={label || undefined}>{totalCount}</Badge>
                    );
                  })()}
                </button>
                {showActivities && (
                <ul className="space-y-2">
                  {activities.map((a: any, ai: number) => {
                    const atitle = a?.titulo || a?.title || a?.name || `Atividade ${ai + 1}`;
                    const durationLabel = getDurationLabel(a);
                    // pt-BR: Determina se a atividade corresponde ao filtro de busca atual.
                    // en-US: Determines if the activity matches the current search filter.
                    const term = searchTerm.trim().toLowerCase();
                    const matches = (() => {
                      if (!term) return true;
                      const t = String(atitle).toLowerCase();
                      const mt = String(title).toLowerCase();
                      return t.includes(term) || mt.includes(term);
                    })();
                    if (!matches) return null;

                    // pt-BR: Índice no array filtrado para navegação correta.
                    // en-US: Index within filtered list for correct navigation.
                    const globalIdx = filteredActivities.findIndex((fa) => fa._moduleIndex === mi && fa._activityIndex === ai);
                    const isActive = globalIdx === currentIndex;
                    const typeIcon = (() => {
                      if (isVideo(a)) return <Play className="h-4 w-4 text-muted-foreground" />;
                      if (isDocument(a)) return <FileText className="h-4 w-4 text-muted-foreground" />;
                      if (isLink(a)) return <LinkIcon className="h-4 w-4 text-muted-foreground" />;
                      return <FileText className="h-4 w-4 text-muted-foreground" />;
                    })();
                    return (
                      <li
                        key={`sidebar-act-${mi}-${ai}`}
                        className={`flex items-center justify-between p-2 rounded border ${isActive ? 'bg-muted' : 'bg-background'}`}
                      >
                        <button
                          className="text-left flex-1 flex items-center gap-2"
                          onClick={() => {
                            // pt-BR: Clique direto do usuário — manter revisão sem auto-skip.
                            // en-US: Direct user click — keep review without auto-skip.
                            selectionIntentRef.current = 'user';
                            setCurrentIndex(globalIdx >= 0 ? globalIdx : 0);
                          }}
                        >
                          {typeIcon}
                          <div className="text-sm font-normal line-clamp-2 break-words leading-tight">{atitle}</div>
                          {durationLabel && (
                            <div className="text-xs text-muted-foreground">{durationLabel}</div>
                          )}
                        </button>
                        {(() => {
                          // console.log('a', a);
                          const idVal = a?.id ?? a?.activity_id ?? `${mi}-${ai}`;
                          const sid = String(idVal);
                          const isCompleted = completedIds.has(String(idVal));
                          const pm = progressMap[sid];
                          const resumeSecs = !isCompleted && pm && pm.seconds > 0 ? pm.seconds : 0;
                          return (
                            <div className="flex items-center gap-2">
                              {isCompleted && (
                                <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Concluído</span>
                              )}
                              {!isCompleted && resumeSecs > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">Retomar {formatDuration(resumeSecs)}</span>
                              )}
                              {String(nextActivityId ?? '') === sid && (
                                <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">Próxima</span>
                              )}
                              <button
                                className="p-1 rounded hover:bg-muted"
                                title={isCompleted ? 'Marcar como não concluída' : 'Marcar como concluída'}
                                onClick={() => toggleCompleted(a, mi, ai)}
                              >
                                <Check className={`h-4 w-4 ${isCompleted ? 'text-green-600' : 'text-muted-foreground'}`} />
                              </button>
                            </div>
                          );
                        })()}
                      </li>
                    );
                  })}
                </ul>
                )}
              </div>
            );
          })}
        </aside>
        )}

        {/* Viewer */}
        {/**
         * compactViewerWrapper
         * pt-BR: Em mobile remove bordas/sombras para economizar espaço,
         *        reduz padding interno e amplia a área do player.
         * en-US: On mobile remove borders/shadows to save space, reduce inner
         *        padding and expand the player area.
         */}
        <main className="flex-1 overflow-y-auto p-1 md:p-4">
          <Card className="border-0 shadow-none md:border md:shadow-sm md:rounded-lg">
            <CardContent className="p-2 md:p-4 space-y-3 md:space-y-4 pt-2 md:pt-4">

              {showGrades ? (
                 <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">Meu Desempenho</h2>
                        <Button variant="outline" size="sm" onClick={() => setShowGrades(false)}>Voltar para aula</Button>
                    </div>
                    {modules.map((m: any, idx: number) => {
                        const acts = Array.isArray(m?.atividades || m?.activities) ? (m?.atividades || m?.activities) : [];
                        // Improved quiz detection logic
                        const gradedActs = acts.filter((a:any) => {
                            const type = String(a?.tipo_atividade || a?.type_activities || a?.tipo || a?.post_type || '').toLowerCase();
                            const isQuizType = type.includes('quiz') || type.includes('prova');
                            const hasMinScore = a?.quiz_config?.min_score !== undefined;
                            const hasRecordedScore = a?.config && typeof a.config.score !== 'undefined';
                            return isQuizType || hasMinScore || hasRecordedScore;
                        });
                        
                        if (gradedActs.length === 0) return null;
                        
                        return (
                            <Card key={idx} className="mb-4 bg-card/50">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">{m.titulo}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {gradedActs.map((a:any, i:number) => {
                                            const score = a?.config?.score;
                                            const minScore = Number(a?.quiz_config?.min_score || 0);
                                            const hasScore = score !== undefined && score !== null;
                                            const passed = hasScore ? Number(score) >= minScore : false;
                                            
                                            // Robust title fallback
                                            const atitle = a?.titulo || a?.title || a?.name || `Atividade` ;
                                            
                                            // Status logic
                                            const hasAnswers = a?.config?.answers && Object.keys(a.config.answers).length > 0;
                                            
                                            return (
                                                <React.Fragment key={i}>
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-muted/20 p-3 rounded gap-2">
                                                        <div>
                                                            <div className="font-medium">{atitle}</div>
                                                            <div className="text-xs text-muted-foreground">Mínimo para aprovação: {minScore}%</div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {hasScore ? (
                                                                <Badge variant={passed ? 'default' : 'destructive'} className={passed ? 'bg-green-600 hover:bg-green-700' : ''}>
                                                                    {score}% {passed ? 'Aprovado' : 'Reprovado'}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant={hasAnswers ? "secondary" : "outline"} className={hasAnswers ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200" : ""}>
                                                                    {hasAnswers ? 'Em Andamento' : 'Pendente'}
                                                                </Badge>
                                                            )}
                                                            
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-6 px-2 text-xs"
                                                                onClick={() => setExpandedDetails(prev => ({...prev, [i]: !prev[i]}))}
                                                            >
                                                                {expandedDetails[i] ? 'Ocultar Detalhes' : 'Ver Detalhes'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    {/* Detail View */}
                                                    {expandedDetails[i] && (
                                                        <QuizGradeDetail activity={a} />
                                                    )}
                                                </React.Fragment>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                    {modules.every((m:any) => {
                         const acts = Array.isArray(m?.atividades || m?.activities) ? (m?.atividades || m?.activities) : [];
                         return !acts.some((a:any) => {
                            const type = String(a?.tipo_atividade || a?.type_activities || a?.tipo || a?.post_type || '').toLowerCase();
                            const isQuizType = type.includes('quiz') || type.includes('prova');
                            return isQuizType || a?.quiz_config?.min_score !== undefined;
                         });
                    }) && (
                        <div className="text-center py-10 text-muted-foreground">
                            <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p>Nenhuma atividade avaliativa encontrada neste curso.</p>
                        </div>
                    )}
                 </div>
              ) : currentActivity ? (
                <>
                  {/* Player area */}
                  <div className={`rounded-md md:rounded-lg overflow-hidden ${isVideo(currentActivity as any) ? 'aspect-video bg-black' : 'bg-white'}`}>
                    {(() => {
                      const a = currentActivity;
                      const title = String(a?.titulo || a?.title || a?.name || '');
                      const desc = String(a?.descricao || a?.description || '');
                      const url = getActivityUrl(a);
                      const content = a?.conteudo || a?.content || '';
                      if (isVideo(a)) {
                        const mi = a._moduleIndex; const ai = a._activityIndex;
                        const aid = getActivityId(a, mi, ai);
                        const cid = course?.id ?? course?.course_id ?? course?.token ?? 'course';
                        const playerId = `player-${cid}-${mi}-${ai}-${aid}`;
                        const lowerUrl = String(url || '').toLowerCase();
                        const isYouTubeEmbed = lowerUrl.includes('youtube.com/embed');
                        const isVimeoEmbed = lowerUrl.includes('player.vimeo.com/video');
                        const isMp4 = lowerUrl.endsWith('.mp4');
                        if (isYouTubeEmbed) {
                          // pt-BR: YouTube via API — usa contêiner <div> para YT.Player.
                          // en-US: YouTube via API — use <div> container for YT.Player.
                          return (
                            <div
                              ref={youtubeContainerRef}
                              id={playerId}
                              className="w-full h-full"
                            />
                          );
                        }
                        if (isVimeoEmbed) {
                          const embedWithApi = url ? buildVideoEmbedUrlWithApi(String(url), playerId) : '';
                          return embedWithApi ? (
                            <iframe
                              ref={iframeRef}
                              id={playerId}
                              className="w-full h-full"
                              src={embedWithApi}
                              title={title}
                              loading="lazy"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-white text-sm">Vídeo indisponível</div>
                          );
                        }
                        if (isMp4) {
                          return (
                            <video
                              ref={html5VideoRef}
                              className="w-full h-full"
                              src={String(url)}
                              controls
                              preload="metadata"
                            />
                          );
                        }
                        // Fallback para outros players em iframe
                        return (
                          <iframe
                            ref={iframeRef}
                            id={playerId}
                            className="w-full h-full"
                            src={String(url)}
                            title={title}
                            loading="lazy"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        );
                      }
                      if (isDocument(a)) {
                        const docUrl = getActivityUrl(a);
                        return docUrl ? (
                          <div className="flex items-center justify-center h-full">
                            <a href={String(docUrl)} target="_blank" rel="noreferrer" className="text-primary underline bg-white px-3 py-2 rounded">Abrir documento</a>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-white text-sm">Documento indisponível</div>
                        );
                      }
                      if (isLink(a)) {
                        const linkUrl = getActivityUrl(a);
                        return linkUrl ? (
                          <div className="flex items-center justify-center h-full">
                            <a href={String(linkUrl)} target="_blank" rel="noreferrer" className="text-primary underline bg-white px-3 py-2 rounded">Abrir link</a>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-white text-sm">Link indisponível</div>
                        );
                      }
                      /**
                       * pt-BR: Conteúdo de leitura (HTML rich). Renderiza como HTML com classes de tipografia.
                       *        Faz fallback para descrição quando `content` vier vazio.
                       * en-US: Reading content (rich HTML). Renders as HTML with typography classes.
                       *        Falls back to description when `content` is empty.
                       */
                      const html = String(content || desc || '');
                      if (isQuiz(a)) {
                        return (
                          <div className="p-4 bg-background">
                            <QuizViewer 
                              activity={a}
                              initialState={(a as any).config || {}}
                              onProgressUpdate={(state) => {
                                 // Auto-save progress
                                 const cfg = (a as any).quiz_config || {};
                                 progressService.savePlaybackPosition({
                                    course_id: course?.id || course?.course_id || 0,
                                    module_id: a?._moduleIndex !== -1 ? (modules[a._moduleIndex]?.module_id ?? modules[a._moduleIndex]?.id) : undefined,
                                    activity_id: getActivityId(a, a._moduleIndex, a._activityIndex),
                                    seconds: 0,
                                    id_matricula: enrollmentId,
                                    config: { ...state, score: undefined } // Save intermediate state without score
                                  }).catch(() => {});
                              }}
                              onComplete={(score) => {
                                // Mark as complete only if score is enough
                                const cfg = (a as any).quiz_config || {};
                                const minScore = Number(cfg.min_score) || 0;
                                if (score >= minScore) {
                                  markCompleteAndAdvance(score);
                                } else {
                                  // pt-BR: Salva a nota mesmo reprovado, sem marcar como concluído.
                                  // en-US: Save grade even if failed, without marking as completed.
                                  progressService.savePlaybackPosition({
                                    course_id: course?.id || course?.course_id || 0,
                                    module_id: a?._moduleIndex !== -1 ? (modules[a._moduleIndex]?.module_id ?? modules[a._moduleIndex]?.id) : undefined,
                                    activity_id: getActivityId(a, a._moduleIndex, a._activityIndex),
                                    seconds: 0,
                                    id_matricula: enrollmentId,
                                    config: { score }
                                  }).then(() => {
                                      // pt-BR: Atualiza currículo para refletir nota reprovada.
                                      // en-US: Refresh curriculum to reflect failed grade.
                                      fetchCurriculum();
                                  }).catch(() => {});
                                }
                              }} 
                            />
                          </div>
                        );
                      }
                      if (!html.trim()) {
                        return (
                          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Conteúdo indisponível</div>
                        );
                      }
                      return (
                        <div className="p-4 overflow-auto">
                          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
                        </div>
                      );
                    })()}
                  </div>
                  {/*
                   * Title and Description
                   * pt-BR: Bloco de título da atividade e descrição.
                   *        Para vídeos, a descrição fica oculta por padrão e pode ser exibida sob demanda.
                   * en-US: Activity title and description block.
                   *        For videos, description is hidden by default and can be toggled.
                   */}
                  <div>
                    {/**
                     * Title + Share Link
                     * pt-BR: Mostra o título e um botão para copiar a URL da atividade atual.
                     * en-US: Shows the title and a button to copy the current activity URL.
                     */}
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold break-words line-clamp-2">
                        {String(currentActivity?.titulo || currentActivity?.title || currentActivity?.name || '')}
                      </h2>
                    </div>
                    {(() => {
                      // pt-BR: Selo "Concluído" quando a atividade atual consta em completedIds.
                      // en-US: "Completed" badge when current activity appears in completedIds.
                      const a: any = currentActivity;
                      const mi = a?._moduleIndex; const ai = a?._activityIndex;
                      const aid = getActivityId(a, mi, ai);
                      const isCompleted = completedIds.has(String(aid));
                      if (!isCompleted) return null;
                      return (
                        <span className="inline-block mt-1 text-xs px-2 py-1 rounded bg-green-100 text-green-700">Concluído</span>
                      );
                    })()}
                    {(() => {
                      /**
                       * pt-BR: Badge de tempo restante para leitura/arquivo com cores por urgência.
                       * en-US: Remaining time badge for reading/file with urgency colors.
                       */
                      const a: any = currentActivity;
                      const readingLike = isDocument(a) || isLink(a) || String(getType(a)).toLowerCase().includes('leitura');
                      const hasVideo = isVideo(a);
                      const requiredSecs = Math.round(Number(toSeconds(a?.duracao ?? a?.duration, String(a?.unidade_duracao ?? a?.type_duration))) || 0);
                      const mi = a?._moduleIndex; const ai = a?._activityIndex; const aid = getActivityId(a, mi, ai);
                      const isCompleted = completedIds.has(String(aid));
                      if (!readingLike || hasVideo || requiredSecs <= 0 || isCompleted) return null;
                      const label = readingRemaining > 0 ? `Concluir em ${formatDuration(readingRemaining)} / ${formatDuration(requiredSecs)}` : 'Pronto para concluir';
                      const urgencyCls = readingUrgencyClass(readingRemaining);
                      return (
                        <span className={`inline-flex items-center mt-1 ml-2 text-xs px-2 py-0.5 rounded ${urgencyCls}`}>
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          {label}
                        </span>
                      );
                    })()}
                    {(() => {
                      /**
                       * pt-BR: Barra de progresso visual para leitura/arquivo (percentual de conclusão).
                       * en-US: Visual progress bar for reading/file (completion percentage).
                       */
                      const a: any = currentActivity;
                      const readingLike = isDocument(a) || isLink(a) || String(getType(a)).toLowerCase().includes('leitura');
                      const hasVideo = isVideo(a);
                      const requiredSecs = Math.round(Number(toSeconds(a?.duracao ?? a?.duration, String(a?.unidade_duracao ?? a?.type_duration))) || 0);
                      const mi = a?._moduleIndex; const ai = a?._activityIndex; const aid = getActivityId(a, mi, ai);
                      const isCompleted = completedIds.has(String(aid));
                      if (!readingLike || hasVideo || requiredSecs <= 0 || isCompleted) return null;
                      const pct = requiredSecs > 0 ? Math.min(100, Math.max(0, Math.round(((requiredSecs - readingRemaining) / requiredSecs) * 100))) : 0;
                      return (
                        <div className="mt-2 w-full max-w-sm">
                          {/*
                           * pt-BR: Linha de timer regressivo textual (restante / total), atualizada a cada segundo.
                           * en-US: Textual countdown line (remaining / total), updated each second.
                           */}
                          <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-muted-foreground">
                            <span>Tempo restante: {formatDuration(Math.max(readingRemaining, 0))}</span>
                            <span>Total: {formatDuration(requiredSecs)}</span>
                          </div>
                          <div className="h-1 rounded bg-gray-200">
                            <div className="h-1 rounded bg-blue-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })()}
                    {(() => {
                      // pt-BR: Mostra um selo simples com o provedor do vídeo quando aplicável.
                      // en-US: Shows a simple badge with video provider when applicable.
                      const provider = getActivityProvider(currentActivity);
                      if (!isVideo(currentActivity as any) || provider === 'unknown') return null;
                      const label = provider === 'youtube' ? 'YouTube' : provider === 'vimeo' ? 'Vimeo' : provider === 'mp4' ? 'MP4' : '';
                      if (!label) return null;
                      return (
                        <span className="inline-block mt-1 text-xs px-2 py-1 rounded bg-muted text-muted-foreground">{label}</span>
                      );
                    })()}
                    {(() => {
                      /**
                       * pt-BR: Microbadge “Retomar” quando a API indica posição salva (exists: true).
                       * en-US: “Resume” microbadge shown when API indicates a saved position (exists: true).
                       */
                      if (!isVideo(currentActivity as any) || !playbackExists) return null;
                      // pt-BR: Não exibe "Retomar" se a atividade já estiver concluída.
                      // en-US: Do not show "Resume" if the activity is already completed.
                      const a: any = currentActivity;
                      const mi = a?._moduleIndex; const ai = a?._activityIndex;
                      const aid = getActivityId(a, mi, ai);
                      const isCompleted = completedIds.has(String(aid));
                      if (isCompleted) return null;
                      return (
                        <span className="inline-block mt-1 text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">Retomar</span>
                      );
                    })()}
                    {(() => {
                      // pt-BR: Usa a descrição rica (HTML), quando disponível.
                      // en-US: Uses rich description (HTML), when available.
                      const descHtml = String(currentActivity?.descricao || currentActivity?.description || '');
                      if (!descHtml) return null;

                      // pt-BR: Para vídeos, mantém a descrição oculta por padrão e exibe via toggle.
                      // en-US: For videos, keep description hidden by default and show via toggle.
                      const isVideoActivity = isVideo(currentActivity as any);

                      if (isVideoActivity) {
                        return (
                          <VideoDescriptionToggle html={descHtml} />
                        );
                      }

                      // pt-BR: Outras atividades: evita duplicação se descrição == conteúdo já renderizado.
                      // en-US: Other activities: avoid duplication if description == content already rendered.
                      const contentHtml = String(currentActivity?.conteudo || currentActivity?.content || descHtml);
                      if (htmlEquals(descHtml, contentHtml)) return null;
                      return (
                        <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: descHtml }} />
                      );
                    })()}
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={navigatePrev} disabled={currentIndex <= 0}>Anterior</Button>
                    <Button variant="ghost" onClick={navigateNext} disabled={currentIndex >= filteredActivities.length - 1}>Próximo</Button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Nenhuma atividade encontrada.</div>
              )}
            </CardContent>
          </Card>
          
          {/* pt-BR: Card de comentários da atividade atual */}
          {/* en-US: Comments card for current activity */}
          <Card className="mt-4">
            <CardContent className="pt-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Comentários da atividade</h3>
                  <p className="text-sm text-muted-foreground">Somente comentários aprovados são exibidos. Comentários publicados entram em moderação.</p>
                </div>
              </div>

              <div>
                <Label>Novo comentário</Label>
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, COMMENT_MAX))}
                  placeholder="Escreva seu comentário... / Write your comment..."
                  rows={3}
                />
                <div className="mt-2">
                  <Label className="text-xs">Avaliação (obrigatória)</Label>
                  <div className="mt-1">
                    <StarRating value={rating} onChange={setRating} />
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{Math.max(0, draft.trim().length)} / {COMMENT_MAX}</span>
                  <span>mín {COMMENT_MIN}</span>
                </div>
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => createMutation.mutate(draft.trim())}
                    disabled={createMutation.isPending || !draft.trim() || !currentActivityKeyForComments || draft.trim().length < COMMENT_MIN || rating < 1}
                  >
                    {createMutation.isPending ? 'Publicando...' : 'Publicar'}
                  </Button>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {commentsQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">Carregando comentários...</div>
                ) : (Array.isArray(commentsQuery.data) && commentsQuery.data.length > 0 ? (
                  (commentsQuery.data as any[]).map((c: any) => (
                    <div key={String(c?.id ?? Math.random())}>
                      {renderCommentItem(c)}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">Nenhum comentário para esta atividade.</div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
