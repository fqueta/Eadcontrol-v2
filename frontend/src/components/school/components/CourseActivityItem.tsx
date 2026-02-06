import { useState } from 'react';
import { useFormContext, useWatch, useFieldArray } from 'react-hook-form';
import { GripVertical, ChevronDown, ChevronUp, ChevronLeft, X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor } from '@/components/ui/RichTextEditor';

// Helper for keys
const activityKey = (mIdx: number, aIdx: number) => `${mIdx}:${aIdx}`;
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function CourseActivityItem({
    index, // module index
    aIdx, // activity index
    field, // activity field (for id)
    collapsedActivities,
    toggleActivityCollapse,
    removeActivity,
    setDragActivity,
    dragActivity,
    localReorderActivities,
    
    // Global helpers
    importVideoDuration,
    handleActivityFileUpload,
    recalcCourseDuration
  }: any) {
    const { control, getValues, setValue } = useFormContext();
    
    // Watch this activity 
    const a = useWatch({
      control,
      name: `modulos.${index}.atividades.${aIdx}`,
      defaultValue: field 
    });

    const key = activityKey(index, aIdx);
    const collapsed = Boolean(collapsedActivities[key]);

    // Setup useFieldArray for Quiz Questions
    const { fields: questionFields, append: appendQuestion, remove: removeQuestion, move: moveQuestion } = useFieldArray({
      control,
      name: `modulos.${index}.atividades.${aIdx}.quiz_questions`
    });

    const [dragQuestionIdx, setDragQuestionIdx] = useState<number | null>(null);
    const [collapsedQuestionsLocal, setCollapsedQuestionsLocal] = useState<Record<number, boolean>>({});

    const toggleQuestionCollapseLocal = (qIdx: number) => {
        setCollapsedQuestionsLocal(prev => ({...prev, [qIdx]: !prev[qIdx]}));
    };

    const localAddQuizQuestion = (type: 'multipla_escolha' | 'verdadeiro_falso') => {
        const newQ: any = {
          id: generateId(),
          tipo_pergunta: type,
          enunciado: '',
          pontos: 1,
          opcoes: type === 'multipla_escolha' ? [
             { id: generateId(), texto: '', correta: true },
             { id: generateId(), texto: '', correta: false },
             { id: generateId(), texto: '', correta: false },
             { id: generateId(), texto: '', correta: false },
          ] : undefined,
          resposta_correta: type === 'verdadeiro_falso' ? 'verdadeiro' : undefined
        };
        appendQuestion(newQ);
    };

    const onFieldChange = (fieldName: string, val: any) => {
       setValue(`modulos.${index}.atividades.${aIdx}.${fieldName}`, val, { shouldValidate: true, shouldDirty: true });
       if (['duracao', 'unidade_duracao', 'active'].includes(fieldName)) {
          recalcCourseDuration();
       }
    };

    const localUpdateQuizQuestion = (qIdx: number, fieldName: string, val: any) => {
         setValue(`modulos.${index}.atividades.${aIdx}.quiz_questions.${qIdx}.${fieldName}`, val);
    };

    const localAddQuizOption = (qIdx: number) => {
         const currentOptions = getValues(`modulos.${index}.atividades.${aIdx}.quiz_questions.${qIdx}.opcoes`) || [];
         if(currentOptions.length < 6) {
             const newOpt = { id: generateId(), texto: '', correta: false };
             setValue(`modulos.${index}.atividades.${aIdx}.quiz_questions.${qIdx}.opcoes`, [...currentOptions, newOpt]);
         }
    };

    const localRemoveQuizOption = (qIdx: number, optIdx: number) => {
        const currentOptions = getValues(`modulos.${index}.atividades.${aIdx}.quiz_questions.${qIdx}.opcoes`) || [];
        if (currentOptions.length > 2) {
             const newOpts = [...currentOptions];
             newOpts.splice(optIdx, 1);
             setValue(`modulos.${index}.atividades.${aIdx}.quiz_questions.${qIdx}.opcoes`, newOpts);
        }
    };

    const localUpdateQuizOption = (qIdx: number, optIdx: number, fieldName: string, val: any) => {
        if (fieldName === 'correta' && val === true) {
             // Reset others
             const currentOptions = getValues(`modulos.${index}.atividades.${aIdx}.quiz_questions.${qIdx}.opcoes`) || [];
             const newOpts = currentOptions.map((o: any, i: number) => ({ ...o, correta: i === optIdx }));
             setValue(`modulos.${index}.atividades.${aIdx}.quiz_questions.${qIdx}.opcoes`, newOpts);
        } else {
             setValue(`modulos.${index}.atividades.${aIdx}.quiz_questions.${qIdx}.opcoes.${optIdx}.${fieldName}`, val);
        }
    };

    const localUpdateQuizConfig = (fieldName: string, val: any) => {
        setValue(`modulos.${index}.atividades.${aIdx}.quiz_config.${fieldName}`, val);
    };

    return (
       <div
          className="group relative flex flex-col bg-background border rounded-md shadow-sm transition-all hover:shadow-md"
          draggable
          onDragStart={() => setDragActivity({ moduleIdx: index, activityIdx: aIdx })}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragActivity && dragActivity.moduleIdx === index) {
              localReorderActivities(index, dragActivity.activityIdx, aIdx);
            }
            setDragActivity(null);
          }}
        >
           {/* Activity Header */}
           <div className="flex items-center gap-2 p-2 pr-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-md" onClick={(e) => {
              if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('.stop-propagation')) return;
              toggleActivityCollapse(index, aIdx);
           }}>
                <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1">
                    <GripVertical className="h-4 w-4" />
                </div>
                
                <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate stop-propagation">
                            {collapsed ? (a.titulo || `Atividade ${aIdx + 1}`) : 
                                <Input 
                                    value={a.titulo || ''} 
                                    onChange={(e) => onFieldChange('titulo', e.target.value)}
                                    className="h-7 py-0 px-2 text-sm font-medium border-transparent bg-transparent hover:border-input focus:bg-background focus:border-input transition-all w-full max-w-[400px]"
                                    placeholder="Título da atividade"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            }
                        </span>
                        {collapsed && (
                             <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal uppercase tracking-wider">{a.tipo}</Badge>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {!collapsed && (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase mr-2">{a.tipo}</Badge>
                    )}
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={(e) => { e.stopPropagation(); toggleActivityCollapse(index, aIdx); }}>
                       {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); removeActivity(index, aIdx); }}>
                       <X className="h-4 w-4" />
                    </Button>
                </div>
           </div>

           {/* Activity Body */}
           {!collapsed && (
             <div className="p-3 border-t bg-muted/5">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Left Column: Type & Config */}
                    <div className="md:col-span-3 space-y-3 pt-1">
                         <div className="space-y-1">
                            <Label className="text-xs">Tipo de Conteúdo</Label>
                            <Select value={a.tipo || 'video'} onValueChange={(v) => onFieldChange('tipo', v)}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="video">Vídeo</SelectItem>
                                <SelectItem value="leitura">Texto/Leitura</SelectItem>
                                <SelectItem value="quiz">Quiz/Avaliação</SelectItem>
                                <SelectItem value="arquivo">Arquivo para baixar</SelectItem>
                                <SelectItem value="tarefa">Tarefa Prática</SelectItem>
                              </SelectContent>
                            </Select>
                         </div>

                         <div className="grid grid-cols-2 gap-2">
                             <div className="space-y-1">
                                <Label className="text-xs">Duração</Label>
                                <Input className="h-8" value={a.duracao || ''} onChange={(e) => onFieldChange('duracao', e.target.value)} />
                             </div>
                             <div className="space-y-1">
                                <Label className="text-xs">Unidade</Label>
                                <Select value={a.unidade_duracao || 'seg'} onValueChange={(v) => onFieldChange('unidade_duracao', v)}>
                                  <SelectTrigger className="h-8 p-1"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="seg">Seg</SelectItem>
                                    <SelectItem value="min">Min</SelectItem>
                                    <SelectItem value="hrs">Hrs</SelectItem>
                                  </SelectContent>
                                </Select>
                             </div>
                         </div>
                         
                          <div className="flex items-center justify-between border rounded p-2 bg-background">
                              <span className="text-xs font-medium">Ativo</span>
                              <Switch checked={((a as any).active || 's') === 's'} onCheckedChange={(c) => onFieldChange('active', c ? 's' : 'n')} className="scale-75" />
                          </div>
                    </div>

                    {/* Right Column: Content specific fields */}
                    <div className="md:col-span-9 space-y-3 border-l pl-4 border-dashed">
                         {a.tipo === 'video' && (
                             <div className="space-y-3">
                                <div className="flex gap-3">
                                    <div className="w-[120px]">
                                        <Label className="text-xs">Plataforma</Label>
                                        <Select value={(a as any).video_source || 'youtube'} onValueChange={(v) => { onFieldChange('video_source', v); }}>
                                            <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="youtube">YouTube</SelectItem>
                                                <SelectItem value="vimeo">Vimeo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-xs">Link do Vídeo</Label>
                                         <div className="flex gap-2 mt-1">
                                            <Input 
                                                className="h-8 font-mono text-sm" 
                                                placeholder="https://..." 
                                                value={(a as any).video_url || ''}
                                                onChange={(e) => onFieldChange('video_url', e.target.value)}
                                                onBlur={() => importVideoDuration(index, aIdx)} 
                                            />
                                            {(a as any).video_url && (
                                                 <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => importVideoDuration(index, aIdx)} title="Importar duração">
                                                    <Loader2 className="h-3 w-3" />
                                                 </Button>
                                            )}
                                         </div>
                                    </div>
                                </div>
                                {!import.meta.env.VITE_YOUTUBE_API_KEY && ((a as any).video_source === 'youtube') && (
                                    <p className="text-[10px] text-orange-600 bg-orange-50 p-1 rounded inline-block">
                                       Atenção: Configure VITE_YOUTUBE_API_KEY para importar dados automaticamente.
                                    </p>
                                )}
                             </div>
                         )}
                         
                          {a.tipo === 'arquivo' && (
                              <div className="space-y-3">
                                  <div className="border border-dashed rounded-md p-4 flex flex-col items-center justify-center text-center bg-muted/20">
                                      <p className="text-xs text-muted-foreground mb-2">Arraste um arquivo ou clique para selecionar</p>
                                      <Input type="file" className="max-w-[250px] text-xs" onChange={(e) => handleActivityFileUpload(index, aIdx, e.target.files?.[0] || null)} />
                                  </div>
                                  <div>
                                      <Label className="text-xs">Ou link direto</Label>
                                      <Input className="h-8 mt-1" value={(a as any).arquivo_url || ''} onChange={(e) => onFieldChange('arquivo_url', e.target.value)} placeholder="https://..." />
                                  </div>
                              </div>
                          )}

                          {/* Quiz Builder */}
                          {a.tipo === 'quiz' && (
                              <div className="space-y-4">
                                {/* Quiz Config */}
                                <div className="bg-muted/30 rounded-lg p-3 border">
                                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Configurações do Quiz</h5>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Nota mínima (%)</Label>
                                      <Input 
                                        type="number" 
                                        className="h-8" 
                                        placeholder="70"
                                        value={(a as any).quiz_config?.nota_minima ?? ''}
                                        onChange={(e) => localUpdateQuizConfig('nota_minima', Number(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Tentativas</Label>
                                      <Input 
                                        type="number" 
                                        className="h-8" 
                                        placeholder="3"
                                        value={(a as any).quiz_config?.tentativas ?? ''}
                                        onChange={(e) => localUpdateQuizConfig('tentativas', Number(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Tempo Limite (min)</Label>
                                      <Input 
                                        type="number" 
                                        className="h-8" 
                                        placeholder="0 (sem limite)"
                                        value={(a as any).quiz_config?.time_limit ?? ''}
                                        onChange={(e) => localUpdateQuizConfig('time_limit', Number(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="flex items-center gap-2 pt-5">
                                      <Switch 
                                        checked={(a as any).quiz_config?.mostrar_respostas ?? false}
                                        onCheckedChange={(c) => localUpdateQuizConfig('mostrar_respostas', c)}
                                        className="scale-75"
                                      />
                                      <Label className="text-xs">Mostrar respostas</Label>
                                    </div>
                                    <div className="flex items-center gap-2 pt-5">
                                      <Switch 
                                        checked={(a as any).quiz_config?.mostrar_correcao ?? false}
                                        onCheckedChange={(c) => localUpdateQuizConfig('mostrar_correcao', c)}
                                        className="scale-75"
                                      />
                                      <Label className="text-xs">Correção</Label>
                                    </div>
                                  </div>
                                </div>

                                {/* Questions Header */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <h5 className="text-sm font-semibold">Perguntas</h5>
                                    <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px]">
                                      {questionFields.length}
                                    </Badge>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => localAddQuizQuestion('multipla_escolha')}>
                                      <Plus className="h-3 w-3" /> Múltipla Escolha
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => localAddQuizQuestion('verdadeiro_falso')}>
                                      <Plus className="h-3 w-3" /> V ou F
                                    </Button>
                                  </div>
                                </div>

                                {/* Questions List */}
                                {questionFields.length === 0 && (
                                  <div className="text-center py-8 border border-dashed rounded-lg bg-muted/5">
                                    <p className="text-sm text-muted-foreground mb-2">Nenhuma pergunta adicionada.</p>
                                    <p className="text-xs text-muted-foreground">Clique acima para adicionar.</p>
                                  </div>
                                )}

                                <div className="space-y-3">
                                  {questionFields.map((q: any, qIdx: number) => {
                                     // We use 'q' for id, but we should use watched value for content if we want responsive typing? 
                                     // Actually with useFieldArray, 'q' IS the item from the array state, but usually we register inputs.
                                     // However, for complex nested objects, useWatch or controlled is safer.
                                     // Since we use setValue in 'localUpdateQuizQuestion', the 'field' in useFieldArray might NOT update on every keystroke unless we watch.
                                     // Let's watch the specific question to be safe, or just use `a.quiz_questions[qIdx]` since we watch `a` (activity).
                                     
                                     // `a` is the whole activity watched. So `a.quiz_questions` has the current values.
                                     const qValue = (a.quiz_questions && a.quiz_questions[qIdx]) ? a.quiz_questions[qIdx] : q;

                                     return (
                                    <div 
                                      key={q.id} 
                                      className="border rounded-lg bg-background shadow-sm"
                                      draggable
                                      onDragStart={() => setDragQuestionIdx(qIdx)}
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={() => {
                                        if (dragQuestionIdx !== null) {
                                            moveQuestion(dragQuestionIdx, qIdx);
                                            setDragQuestionIdx(null);
                                        }
                                      }}
                                    >
                                      {/* Question Header */}
                                      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b rounded-t-lg group-q">
                                        <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => toggleQuestionCollapseLocal(qIdx)}>
                                           {/* Drag Handle for Question */}
                                           <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1" onClick={(e) => e.stopPropagation()} onMouseDown={() => setDragQuestionIdx(qIdx)}>
                                              <GripVertical className="h-3 w-3" />
                                           </div>

                                          {collapsedQuestionsLocal[qIdx] ? (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground mr-1" />
                                          ) : (
                                            <ChevronUp className="h-4 w-4 text-muted-foreground mr-1" />
                                          )}
                                          <span className="text-sm font-medium">Pergunta {qIdx + 1}</span>
                                          <Badge variant={qValue.tipo_pergunta === 'multipla_escolha' ? 'default' : 'secondary'} className="text-[10px] h-5 px-1.5 ml-2">
                                            {qValue.tipo_pergunta === 'multipla_escolha' ? 'Múltipla Escolha' : 'V ou F'}
                                          </Badge>
                                        </div>
                                        <div className="flex gap-1">
                                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive/70" onClick={() => removeQuestion(qIdx)}>
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>

                                      {/* Question Body */}
                                      {!collapsedQuestionsLocal[qIdx] && (
                                        <div className="p-3">
                                            <div className="mb-3">
                                              <Label className="text-xs mb-1 block">Enunciado</Label>
                                              <div className="min-h-[80px]">
                                                <RichTextEditor
                                                  value={qValue.enunciado || ''}
                                                  onChange={(html) => localUpdateQuizQuestion(qIdx, 'enunciado', html)}
                                                  placeholder="Digite a pergunta..."
                                                />
                                              </div>
                                            </div>

                                            <div className="mb-3">
                                              <Label className="text-xs mb-1 block">Pontos</Label>
                                              <Input 
                                                type="number"
                                                className="h-7 w-20"
                                                value={qValue.pontos}
                                                onChange={(e) => localUpdateQuizQuestion(qIdx, 'pontos', Number(e.target.value) || 0)}
                                              />
                                            </div>

                                            {qValue.tipo_pergunta === 'multipla_escolha' && (
                                              <div className="space-y-2">
                                                <Label className="text-xs block">Opções</Label>
                                                {(qValue.opcoes || []).map((opt: any, optIdx: number) => (
                                                  <div key={opt.id || optIdx} className="flex items-center gap-2">
                                                    <div className="pt-1">
                                                      <input 
                                                        type="radio" 
                                                        name={`q-${index}-${aIdx}-${qIdx}`} 
                                                        checked={opt.correta} 
                                                        onChange={() => localUpdateQuizOption(qIdx, optIdx, 'correta', true)}
                                                      />
                                                    </div>
                                                    <Input 
                                                      className="h-7 flex-1" 
                                                      value={opt.texto || ''} 
                                                      onChange={(e) => localUpdateQuizOption(qIdx, optIdx, 'texto', e.target.value)}
                                                      placeholder={`Opção ${optIdx + 1}`}
                                                    />
                                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive/50 hover:text-destructive" onClick={() => localRemoveQuizOption(qIdx, optIdx)}>
                                                      <X className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                ))}
                                                <Button type="button" variant="outline" size="sm" className="h-6 text-xs mt-1" onClick={() => localAddQuizOption(qIdx)}>
                                                  <Plus className="h-3 w-3 mr-1" /> Adicionar Opção
                                                </Button>
                                              </div>
                                            )}

                                            {/* Verdadeiro/Falso */}
                                            {qValue.tipo_pergunta === 'verdadeiro_falso' && (
                                              <div className="space-y-2">
                                                <Label className="text-xs block">Resposta Correta</Label>
                                                 <Select value={qValue.resposta_correta || 'verdadeiro'} onValueChange={(v) => localUpdateQuizQuestion(qIdx, 'resposta_correta', v)}>
                                                    <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="verdadeiro">Verdadeiro</SelectItem>
                                                      <SelectItem value="falso">Falso</SelectItem>
                                                    </SelectContent>
                                                 </Select>
                                              </div>
                                            )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                  })}
                                </div>
                              </div>
                          )}
                    </div>
                </div>
             </div>
           )}
        </div>
    );
  }
