import { useState } from 'react';
import { useFormContext, useWatch, useFieldArray } from 'react-hook-form';
import { GripVertical, ChevronDown, ChevronUp, ChevronLeft, X, Plus, Loader2, PlayCircle, FileText, Layout, Download, CheckSquare, Clock } from 'lucide-react';
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
           <div className="flex items-center gap-3 p-2.5 pr-4 cursor-pointer hover:bg-muted/40 transition-all rounded-t-md group/activity" onClick={(e) => {
              if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('.stop-propagation')) return;
              toggleActivityCollapse(index, aIdx);
           }}>
                <div className="cursor-grab active:cursor-grabbing text-muted-foreground/40 group-hover/activity:text-primary transition-colors p-1">
                    <GripVertical className="h-4 w-4" />
                </div>
                
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted text-muted-foreground">
                        {a.tipo === 'video' && <PlayCircle className="h-4 w-4" />}
                        {a.tipo === 'leitura' && <FileText className="h-4 w-4" />}
                        {a.tipo === 'quiz' && <CheckSquare className="h-4 w-4" />}
                        {a.tipo === 'arquivo' && <Download className="h-4 w-4" />}
                        {a.tipo === 'tarefa' && <Layout className="h-4 w-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      {collapsed ? (
                          <div className="flex items-baseline gap-2">
                             <span className="text-sm font-bold text-foreground/80 truncate block">{a.titulo || `Atividade ${aIdx + 1}`}</span>
                             {a.duracao && (
                               <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                 <Clock className="h-3 w-3" /> {a.duracao}{a.unidade_duracao}
                               </span>
                             )}
                          </div>
                      ) : (
                          <Input 
                              value={a.titulo || ''} 
                              onChange={(e) => onFieldChange('titulo', e.target.value)}
                              className="h-8 py-0 px-2 text-sm font-bold border-transparent bg-transparent hover:border-input focus:bg-background focus:border-input transition-all w-full max-w-[500px] placeholder:text-muted-foreground/40"
                              placeholder="Título da aula..."
                              onClick={(e) => e.stopPropagation()}
                          />
                      )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 pl-2 border-l border-muted/50">
                    {collapsed && (
                        <Badge variant="outline" className="text-[9px] h-5 px-1.5 font-bold uppercase tracking-tight bg-muted/20 border-transparent text-muted-foreground">{a.tipo}</Badge>
                    )}
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted" onClick={(e) => { e.stopPropagation(); toggleActivityCollapse(index, aIdx); }}>
                       {collapsed ? <ChevronLeft className="h-4 w-4 text-muted-foreground/60" /> : <ChevronDown className="h-4 w-4 text-primary" />}
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-all" onClick={(e) => { e.stopPropagation(); removeActivity(index, aIdx); }}>
                       <X className="h-4 w-4" />
                    </Button>
                </div>
           </div>

           {/* Activity Body */}
           {!collapsed && (
             <div className="p-4 border-t bg-muted/10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Left Column: Type & Config */}
                    <div className="md:col-span-3 space-y-4 pt-1">
                         <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Tipo de Conteúdo</Label>
                            <Select value={a.tipo || 'video'} onValueChange={(v) => onFieldChange('tipo', v)}>
                              <SelectTrigger className="h-9 bg-background font-medium"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="video" className="p-2.5"><div className="flex items-center gap-2"><PlayCircle className="h-4 w-4" /> Vídeo</div></SelectItem>
                                <SelectItem value="leitura" className="p-2.5"><div className="flex items-center gap-2"><FileText className="h-4 w-4" /> Texto/Leitura</div></SelectItem>
                                <SelectItem value="quiz" className="p-2.5"><div className="flex items-center gap-2"><CheckSquare className="h-4 w-4" /> Quiz/Avaliação</div></SelectItem>
                                <SelectItem value="arquivo" className="p-2.5"><div className="flex items-center gap-2"><Download className="h-4 w-4" /> Arquivo</div></SelectItem>
                                <SelectItem value="tarefa" className="p-2.5"><div className="flex items-center gap-2"><Layout className="h-4 w-4" /> Tarefa</div></SelectItem>
                              </SelectContent>
                            </Select>
                         </div>

                         <div className="grid grid-cols-2 gap-3">
                             <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Duração</Label>
                                <Input className="h-9 bg-background text-center font-bold" value={a.duracao || ''} onChange={(e) => onFieldChange('duracao', e.target.value)} placeholder="0" />
                             </div>
                             <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Unidade</Label>
                                <Select value={a.unidade_duracao || 'seg'} onValueChange={(v) => onFieldChange('unidade_duracao', v)}>
                                  <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="seg">Seg</SelectItem>
                                    <SelectItem value="min">Min</SelectItem>
                                    <SelectItem value="hrs">Hrs</SelectItem>
                                  </SelectContent>
                                </Select>
                             </div>
                         </div>

                          <div className="flex items-center justify-between border-2 border-dashed rounded-lg p-3 bg-white/50 backdrop-blur-sm transition-all hover:bg-white hover:border-primary/30">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Status</span>
                                <span className="text-xs font-bold text-foreground">Aula Ativa</span>
                              </div>
                              <Switch checked={((a as any).active || 's') === 's'} onCheckedChange={(c) => onFieldChange('active', c ? 's' : 'n')} className="scale-90" />
                          </div>
                    </div>

                    {/* Right Column: Content specific fields */}
                    <div className="md:col-span-9 space-y-5 border-l-2 pl-6 border-dashed border-muted">
                         {a.tipo === 'video' && (
                             <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="w-full sm:w-[150px]">
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">Plataforma</Label>
                                        <Select value={(a as any).video_source || 'youtube'} onValueChange={(v) => { onFieldChange('video_source', v); }}>
                                            <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="youtube">YouTube</SelectItem>
                                                <SelectItem value="vimeo">Vimeo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">URL do Vídeo</Label>
                                         <div className="flex gap-2">
                                            <Input 
                                                className="h-10 font-mono text-sm bg-background border-2 focus-visible:ring-primary/20" 
                                                placeholder="https://www.youtube.com/watch?v=..." 
                                                value={(a as any).video_url || ''}
                                                onChange={(e) => onFieldChange('video_url', e.target.value)}
                                                onBlur={() => importVideoDuration(index, aIdx)} 
                                            />
                                            {(a as any).video_url && (
                                                 <Button type="button" size="icon" variant="outline" className="h-10 w-10 shrink-0 border-2 hover:bg-primary/5 hover:text-primary transition-all shadow-sm" onClick={() => importVideoDuration(index, aIdx)} title="Sincronizar dados">
                                                    <Loader2 className="h-4 w-4" />
                                                 </Button>
                                            )}
                                         </div>
                                    </div>
                                </div>
                                {!import.meta.env.VITE_YOUTUBE_API_KEY && ((a as any).video_source === 'youtube') && (
                                    <div className="flex items-center gap-2 text-[10px] text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200/50 italic font-medium">
                                       Tip: Configure VITE_YOUTUBE_API_KEY para importar a duração automaticamente.
                                    </div>
                                )}
                             </div>
                         )}
                         
                          {a.tipo === 'arquivo' && (
                              <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                  <div className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center bg-white/40 backdrop-blur-sm group/upload hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
                                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover/upload:scale-110 transition-transform">
                                         <Download className="h-6 w-6 text-primary" />
                                      </div>
                                      <p className="text-sm font-bold text-foreground/80 mb-1">Upload de Material</p>
                                      <p className="text-xs text-muted-foreground mb-4">Arquivos PDF, DOCX ou ZIP até 50MB</p>
                                      <Input type="file" className="max-w-[280px] text-xs h-9 bg-background border-2 cursor-pointer" onChange={(e) => handleActivityFileUpload(index, aIdx, e.target.files?.[0] || null)} />
                                  </div>
                                  <div className="space-y-1.5">
                                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Ou link externo para download</Label>
                                      <Input className="h-9 bg-background border-2" value={(a as any).arquivo_url || ''} onChange={(e) => onFieldChange('arquivo_url', e.target.value)} placeholder="https://..." />
                                  </div>
                              </div>
                          )}

                          {/* Quiz Builder */}
                          {a.tipo === 'quiz' && (
                              <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                                {/* Quiz Config */}
                                <div className="bg-primary/5 rounded-2xl p-5 border-2 border-primary/10 shadow-sm overflow-hidden relative">
                                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                     <CheckSquare className="h-16 w-16" />
                                  </div>
                                  <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 mb-5 flex items-center gap-2">
                                     <Layout className="h-3.5 w-3.5" />
                                     Configurações do Quiz
                                  </h5>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-5 relative z-10">
                                    <div className="space-y-1.5">
                                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">Nota mínima (%)</Label>
                                      <Input 
                                        type="number" 
                                        className="h-9 bg-background font-bold text-center border-2" 
                                        placeholder="70"
                                        value={(a as any).quiz_config?.nota_minima ?? ''}
                                        onChange={(e) => localUpdateQuizConfig('nota_minima', Number(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">Tentativas</Label>
                                      <Input 
                                        type="number" 
                                        className="h-9 bg-background font-bold text-center border-2" 
                                        placeholder="3"
                                        value={(a as any).quiz_config?.tentativas ?? ''}
                                        onChange={(e) => localUpdateQuizConfig('tentativas', Number(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">Tempo Limite (min)</Label>
                                      <Input 
                                        type="number" 
                                        className="h-9 bg-background font-bold text-center border-2" 
                                        placeholder="0"
                                        value={(a as any).quiz_config?.time_limit ?? ''}
                                        onChange={(e) => localUpdateQuizConfig('time_limit', Number(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between bg-background/50 p-1.5 px-2 rounded-lg border">
                                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Gabarito</Label>
                                          <Switch 
                                            checked={(a as any).quiz_config?.mostrar_respostas ?? false}
                                            onCheckedChange={(c) => localUpdateQuizConfig('mostrar_respostas', c)}
                                            className="scale-75"
                                          />
                                        </div>
                                        <div className="flex items-center justify-between bg-background/50 p-1.5 px-2 rounded-lg border">
                                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Correção</Label>
                                          <Switch 
                                            checked={(a as any).quiz_config?.mostrar_correcao ?? false}
                                            onCheckedChange={(c) => localUpdateQuizConfig('mostrar_correcao', c)}
                                            className="scale-75"
                                          />
                                        </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Questions Header */}
                                <div className="flex items-center justify-between border-b pb-4 mt-6">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-1 bg-primary rounded-full" />
                                    <h5 className="text-base font-black tracking-tight text-foreground">Banco de Questões</h5>
                                    <Badge variant="secondary" className="rounded-lg px-2 py-0.5 text-[10px] font-black bg-primary/10 text-primary border-primary/10">
                                      {questionFields.length} {questionFields.length === 1 ? 'QUESTÃO' : 'QUESTÕES'}
                                    </Badge>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button type="button" size="sm" variant="outline" className="h-9 font-bold bg-background hover:bg-primary/5 hover:text-primary border-2 border-primary/20 transition-all gap-2" onClick={() => localAddQuizQuestion('multipla_escolha')}>
                                      <Plus className="h-4 w-4" /> Múltipla Escolha
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" className="h-9 font-bold bg-background hover:bg-primary/5 hover:text-primary border-2 border-primary/20 transition-all gap-2" onClick={() => localAddQuizQuestion('verdadeiro_falso')}>
                                      <Plus className="h-4 w-4" /> V ou F
                                    </Button>
                                  </div>
                                </div>

                                {/* Questions List */}
                                {questionFields.length === 0 && (
                                  <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-muted/5 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
                                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                       <FileText className="h-6 w-6 text-muted-foreground/40" />
                                    </div>
                                    <p className="text-sm font-bold text-foreground/60 mb-1">Nenhuma pergunta adicionada.</p>
                                    <p className="text-xs text-muted-foreground">Adicione sua primeira questão clicando nos botões acima.</p>
                                  </div>
                                )}

                                <div className="space-y-4">
                                  {questionFields.map((q: any, qIdx: number) => {
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
