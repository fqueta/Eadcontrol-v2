import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { ActivityPayload, ActivityRecord, ActivityType } from '@/types/activities';
import { uploadActivityFile } from '@/services/activitiesService';

/**
 * ActivityForm
 * pt-BR: Formulário para criar/editar atividades de um módulo/curso.
 * en-US: Form to create/edit activities for a module/course.
 */
export const ActivityForm = ({ initialData, onSubmit }: { initialData?: Partial<ActivityRecord>; onSubmit: (values: ActivityPayload) => Promise<void> | void; }) => {
  // Schema de validação com zod
  const activitySchema = z.object({
    title: z.string().min(1, 'Título é obrigatório'),
    name: z.string().min(1, 'Nome interno é obrigatório'),
    type_duration: z.enum(['seg','min','hrs','']).default('hrs'),
    type_activities: z.enum(['video','apostila','avaliacao','']).default('video'),
    duration: z.coerce.string().min(1, 'Duração é obrigatória'),
    content: z.string().optional().default(''),
    description: z.string().optional().default(''),
    active: z.boolean().default(true),
  });

  const form = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      title: '',
      name: '',
      type_duration: 'hrs',
      type_activities: 'video',
      duration: '',
      content: '',
      description: '',
      active: true,
    },
  });

  /**
   * applyInitialData
   * pt-BR: Preenche o formulário quando em modo de edição.
   * en-US: Populates the form when in edit mode.
   */
  useEffect(() => {
    if (!initialData) return;
    form.reset({
      title: initialData.title ?? '',
      name: initialData.name ?? '',
      type_duration: (initialData.type_duration as any) ?? 'hrs',
      type_activities: (initialData.type_activities as any) ?? 'video',
      duration: String(initialData.duration ?? ''),
      content: initialData.content ?? '',
      description: initialData.description ?? '',
      active: normalizeActive(initialData.active),
    });
  }, [initialData]);

  /**
   * parseYouTubeVideoId
   * pt-BR: Extrai o ID de um vídeo do YouTube a partir da URL.
   * en-US: Extracts a YouTube video ID from the URL.
   */
  function parseYouTubeVideoId(url: string): string | null {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.replace('/', '').trim();
        return id || null;
      }
      if (u.hostname.includes('youtube.com')) {
        const v = u.searchParams.get('v');
        if (v) return v;
        const parts = u.pathname.split('/').filter(Boolean);
        const idx = parts.findIndex((p) => p === 'embed' || p === 'shorts');
        if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * ensureYouTubeApi
   * pt-BR: Garante o carregamento da API IFrame do YouTube.
   * en-US: Ensures the YouTube IFrame API is loaded.
   */
  async function ensureYouTubeApi(): Promise<void> {
    const w = window as any;
    if (w.YT && w.YT.Player) return;
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existing) {
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        s.async = true;
        s.onerror = () => reject(new Error('Falha ao carregar YouTube API'));
        document.head.appendChild(s);
      }
      const checkInterval = setInterval(() => {
        if (w.YT && w.YT.Player) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 200);
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Timeout ao carregar YouTube API'));
      }, 8000);
    });
  }

  /**
   * fetchYouTubeDuration
   * pt-BR: Obtém a duração do vídeo (segundos) via API IFrame do YouTube.
   * en-US: Retrieves video duration (seconds) using the YouTube IFrame API.
   */
  async function fetchYouTubeDuration(videoId: string): Promise<number> {
    await ensureYouTubeApi();
    const w = window as any;
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);
    return new Promise<number>((resolve, reject) => {
      try {
        const player = new w.YT.Player(container, {
          videoId,
          events: {
            onReady: () => {
              try {
                const seconds = Number(player.getDuration() || 0);
                player.destroy();
                container.remove();
                resolve(seconds);
              } catch (e) {
                player.destroy();
                container.remove();
                reject(e);
              }
            },
            onError: (e: any) => {
              try { player.destroy(); } catch {}
              container.remove();
              reject(new Error(`Erro YouTube (${String(e)})`));
            },
          },
        });
      } catch (e) {
        container.remove();
        reject(e);
      }
    });
  }

  /**
   * fetchVimeoDuration
   * pt-BR: Obtém a duração (segundos) via oEmbed do Vimeo com URL normalizada.
   * en-US: Retrieves duration (seconds) via Vimeo oEmbed with normalized URL.
   */
  async function fetchVimeoDuration(videoUrl: string): Promise<number> {
    /**
     * parseVimeoVideoParts
     * pt-BR: Extrai ID e hash de privacidade de URLs do Vimeo.
     * en-US: Extracts ID and privacy hash from Vimeo URLs.
     */
    const parseVimeoVideoParts = (url: string): { id: string; hash?: string } | null => {
      try {
        const u = new URL(url);
        const clean = (s: string) => s.split('?')[0].split('#')[0];
        if (u.hostname.includes('vimeo.com')) {
          const parts = clean(u.pathname).split('/').filter(Boolean);
          if (parts.length >= 1 && /^\d+$/.test(parts[0])) {
            const id = parts[0];
            const hash = parts[1] && /^[a-zA-Z0-9]+$/.test(parts[1]) ? parts[1] : (u.searchParams.get('h') || undefined);
            return { id, hash };
          }
        }
        if (u.hostname.includes('player.vimeo.com')) {
          const parts = clean(u.pathname).split('/').filter(Boolean);
          const idx = parts.findIndex((p) => p === 'video');
          const id = idx >= 0 && parts[idx + 1] ? parts[idx + 1] : '';
          const hash = u.searchParams.get('h') || undefined;
          if (id && /^\d+$/.test(id)) return { id, hash };
        }
        return null;
      } catch {
        return null;
      }
    };

    const parts = parseVimeoVideoParts(videoUrl);
    const id = parts?.id;
    const hash = parts?.hash;

    // 1) oEmbed (sem/with hash)
    const primary = parts ? `https://vimeo.com/${id}` : videoUrl;
    const oembedPrimary = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(primary)}`;
    const resPrimary = await fetch(oembedPrimary);
    if (resPrimary.ok) {
      const data: any = await resPrimary.json();
      const domainRestricted = Number(data?.domain_status_code || 0) === 403;
      const d = Number(data?.duration || 0);
      if (d > 0) return d;
      // fallback: player config se duração ausente (ex.: domain_status_code 403)
      if (id) {
        const cfgUrl = `https://player.vimeo.com/video/${id}/config${hash ? `?h=${hash}` : ''}`;
        try {
          const cfgRes = await fetch(cfgUrl);
          if (cfgRes.ok) {
            const cfg: any = await cfgRes.json();
            const cd = Number((cfg?.video?.duration ?? cfg?.duration) || 0);
            if (cd > 0) return cd;
          }
        } catch {}
      }
    }

    // 2) oEmbed com hash
    if (id && hash) {
      const fallback = `https://vimeo.com/${id}/${hash}`;
      const oembedFallback = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(fallback)}`;
      const resFallback = await fetch(oembedFallback);
      if (resFallback.ok) {
        const data2: any = await resFallback.json();
        const d2 = Number(data2?.duration || 0);
        if (d2 > 0) return d2;
      }
      // 3) player config com hash
      const cfgUrl2 = `https://player.vimeo.com/video/${id}/config${hash ? `?h=${hash}` : ''}`;
      try {
        const cfgRes2 = await fetch(cfgUrl2);
        if (cfgRes2.ok) {
          const cfg2: any = await cfgRes2.json();
          const cd2 = Number((cfg2?.video?.duration ?? cfg2?.duration) || 0);
          if (cd2 > 0) return cd2;
        }
      } catch {}
    }
    /**
     * Player SDK fallback
     * pt-BR: Último recurso: instanciar o Vimeo Player SDK em um iframe fora da tela
     *        e obter a duração com `getDuration()`.
     * en-US: Final fallback: instantiate Vimeo Player SDK in an offscreen iframe
     *        and get duration using `getDuration()`.
     */
    if (id) {
      try {
        const PlayerMod = await import('@vimeo/player');
        const Player = PlayerMod.default as any;
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
        iframe.src = `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ''}`;
        document.body.appendChild(iframe);
        const player = new Player(iframe);
        const duration = await new Promise<number>((resolve, reject) => {
          player.on('loaded', async () => {
            try {
              const d = await player.getDuration();
              resolve(Number(d || 0));
            } catch (e) {
              reject(e);
            }
          });
          player.on('error', (e: any) => reject(new Error(`Vimeo Player error: ${String(e)}`)));
        });
        try { player.destroy(); } catch {}
        iframe.remove();
        if (duration > 0) return duration;
      } catch {}
    }

    throw new Error('Falha ao obter duração do Vimeo (oEmbed/config/Player SDK). O vídeo pode estar bloqueado para incorporação no seu domínio. No Vimeo: Settings → Privacy → Where can this video be embedded? Adicione seu domínio (produção/dev via túnel).');
  }

  /**
   * importVideoDuration
   * pt-BR: Importa automaticamente a duração quando o tipo é vídeo e há URL.
   * en-US: Automatically imports duration when type is video and URL is present.
   */
  async function importVideoDuration() {
    const type = form.getValues('type_activities');
    const url = String(form.getValues('content') || '').trim();
    if (type !== 'video' || !url) return;
    try {
      let seconds = 0;
      if (url.includes('vimeo.com')) {
        seconds = await fetchVimeoDuration(url);
      } else {
        const id = parseYouTubeVideoId(url);
        if (!id) throw new Error('Não foi possível extrair o ID do YouTube');
        seconds = await fetchYouTubeDuration(id);
      }
      if (seconds > 0) {
        form.setValue('duration', String(Math.round(seconds)));
        form.setValue('type_duration', 'seg');
      }
    } catch (e) {
      console.warn('Falha ao importar duração do vídeo:', e);
    }
  }


  /**
   * normalizeActive
   * pt-BR: Converte formatos variados para boolean.
   * en-US: Converts mixed formats to boolean.
   */
  function normalizeActive(val: ActivityRecord['active'] | undefined): boolean {
    if (typeof val === 'boolean') return val;
    if (val === 's' || val === 1) return true;
    if (val === 'n' || val === 0) return false;
    return Boolean(val);
  }

  /**
   * handleSubmit
   * pt-BR: Encaminha valores do formulário ao callback externo.
   * en-US: Forwards form values to the external callback.
   */
  /**
   * handleSubmit
   * pt-BR: Serializa conteúdo conforme tipo e envia ao callback externo.
   * en-US: Serializes content by type and forwards to external callback.
   */
  const handleSubmit = async () => {
    const values = form.getValues();
    const type = values.type_activities as ActivityType;
    if (type === 'avaliacao') {
      const payloadContent = JSON.stringify({ questions });
      values.content = payloadContent;
    }
    await onSubmit(values as ActivityPayload);
  };

  const type = form.watch('type_activities') as ActivityType;
  const contentPlaceholder = useMemo(() => {
    switch (type) {
      case 'video': return 'URL do vídeo (YouTube/Vimeo)';
      case 'apostila': return 'Descrição do arquivo (upload em etapa futura)';
      case 'avaliacao': return 'Instruções ou JSON de questões (etapa futura)';
      default: return 'Conteúdo da atividade';
    }
  }, [type]);

  // --- Upload de Apostila ---
  const [apostilaFile, setApostilaFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /**
   * handleApostilaUpload
   * pt-BR: Envia arquivo da apostila para API e guarda URL em content.
   * en-US: Uploads apostila file to API and stores URL in content.
   */
  const handleApostilaUpload = async () => {
    if (!apostilaFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const res: any = await uploadActivityFile(apostilaFile, { type: 'apostila' });
      // Espera retorno { url: '...' } ou { data: { url: '...' } }
      const url = res?.url || res?.data?.url || res?.path || res?.data?.path;
      if (!url) throw new Error('Upload sem URL retornada');
      form.setValue('content', String(url));
    } catch (err: any) {
      setUploadError(String(err?.message || 'Falha no upload'));
    } finally {
      setUploading(false);
    }
  };

  // --- Editor de Questões (Avaliação) ---
  type Answer = { text: string; correct: boolean };
  type Question = { text: string; answers: Answer[]; points: number };
  const [questions, setQuestions] = useState<Question[]>([]);

  /**
   * initQuestionsFromContent
   * pt-BR: Ao editar, carrega JSON de questões do campo content.
   * en-US: On edit, loads questions JSON from content field.
   */
  useEffect(() => {
    if (type !== 'avaliacao') return;
    const c = form.getValues('content');
    try {
      const parsed = JSON.parse(String(c || '{}'));
      if (parsed && Array.isArray(parsed.questions)) {
        setQuestions(parsed.questions);
      }
    } catch {
      // conteúdo não-JSON, ignora
    }
  }, [type]);

  /**
   * addQuestion
   * pt-BR: Adiciona uma nova questão com 4 alternativas.
   * en-US: Adds a new question with 4 alternatives.
   */
  const addQuestion = () => {
    setQuestions((prev) => [...prev, { text: '', points: 1, answers: [
      { text: '', correct: false },
      { text: '', correct: false },
      { text: '', correct: false },
      { text: '', correct: false },
    ] }]);
  };

  /**
   * removeQuestion
   * pt-BR: Remove uma questão pelo índice.
   * en-US: Removes a question by index.
   */
  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  /**
   * updateQuestion
   * pt-BR: Atualiza texto ou pontos da questão.
   * en-US: Updates the question text or points.
   */
  const updateQuestion = (idx: number, patch: Partial<Question>) => {
    setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };

  /**
   * updateAnswer
   * pt-BR: Atualiza alternativa de uma questão.
   * en-US: Updates an answer of a question.
   */
  const updateAnswer = (qIdx: number, aIdx: number, patch: Partial<Answer>) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const answers = q.answers.map((a, j) => j === aIdx ? { ...a, ...patch } : a);
      return { ...q, answers };
    }));
  };

  /**
   * setCorrectAnswer
   * pt-BR: Marca alternativa como correta (única) para questão.
   * en-US: Marks an answer as the correct (single) for the question.
   */
  const setCorrectAnswer = (qIdx: number, aIdx: number) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const answers = q.answers.map((a, j) => ({ ...a, correct: j === aIdx }));
      return { ...q, answers };
    }));
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input placeholder="Título (aluno)" {...form.register('title')} className={form.formState.errors?.title ? 'border-red-500' : ''} />
            {form.formState.errors?.title && (<p className="text-xs text-red-600">{String(form.formState.errors.title.message)}</p>)}
          </div>
          <div className="space-y-2">
            <Label>Nome interno</Label>
            <Input placeholder="Nome interno (admin)" {...form.register('name')} className={form.formState.errors?.name ? 'border-red-500' : ''} />
            {form.formState.errors?.name && (<p className="text-xs text-red-600">{String(form.formState.errors.name.message)}</p>)}
          </div>

          <div className="space-y-2">
            <Label>Tipo da atividade</Label>
            <Select value={form.watch('type_activities')} onValueChange={(v) => form.setValue('type_activities', v as any)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Vídeo (YouTube/Vimeo)</SelectItem>
                <SelectItem value="apostila">Apostila (PDF/TXT)</SelectItem>
                <SelectItem value="avaliacao">Avaliação (Prova/Simulado)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo de duração</Label>
            <Select value={form.watch('type_duration')} onValueChange={(v) => form.setValue('type_duration', v as any)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="seg">Segundos</SelectItem>
                <SelectItem value="min">Minutos</SelectItem>
                <SelectItem value="hrs">Horas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Duração</Label>
            <Input placeholder="Ex.: 10" {...form.register('duration')} className={form.formState.errors?.duration ? 'border-red-500' : ''} />
            {form.formState.errors?.duration && (<p className="text-xs text-red-600">{String(form.formState.errors.duration.message)}</p>)}
          </div>

          {/* Conteúdo dinâmico por tipo */}
          {type === 'video' && (
            <div className="space-y-2 md:col-span-2">
              <Label>Conteúdo</Label>
              <Textarea rows={3} placeholder={contentPlaceholder} {...form.register('content')} onBlur={importVideoDuration} />
              <p className="text-xs text-muted-foreground">Informe o link completo do vídeo. Suporte a YouTube/Vimeo.</p>
            </div>
          )}
          {type === 'apostila' && (
            <div className="space-y-2 md:col-span-2">
              <Label>Arquivo da apostila</Label>
              <Input type="file" accept=".pdf,.txt,.doc,.docx,.odt" onChange={(e) => setApostilaFile(e.target.files?.[0] || null)} />
              <div className="flex items-center gap-2">
                <Button type="button" onClick={handleApostilaUpload} disabled={!apostilaFile || uploading}>{uploading ? 'Enviando...' : 'Enviar arquivo'}</Button>
                {uploadError && <span className="text-xs text-red-600">{uploadError}</span>}
              </div>
              <p className="text-xs text-muted-foreground">Após o upload, o campo Conteúdo recebe a URL do arquivo.</p>
              <div className="space-y-2">
                <Label>Conteúdo (URL gerada)</Label>
                <Input placeholder="URL do arquivo" {...form.register('content')} />
              </div>
            </div>
          )}
          {type === 'avaliacao' && (
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <Label>Questões</Label>
                <Button type="button" variant="outline" onClick={addQuestion}>Adicionar questão</Button>
              </div>
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="border rounded-md p-3 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <div className="md:col-span-2">
                      <Label>Enunciado</Label>
                      <Textarea rows={2} placeholder="Texto da questão" value={q.text} onChange={(e) => updateQuestion(qIdx, { text: e.target.value })} />
                    </div>
                    <div>
                      <Label>Pontos</Label>
                      <Input type="number" min={0} value={q.points} onChange={(e) => updateQuestion(qIdx, { points: Number(e.target.value || 0) })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {q.answers.map((a, aIdx) => (
                      <div key={aIdx} className="flex items-center gap-2">
                        <Input placeholder={`Alternativa ${String.fromCharCode(65 + aIdx)}`} value={a.text} onChange={(e) => updateAnswer(qIdx, aIdx, { text: e.target.value })} />
                        <Button type="button" variant={a.correct ? 'default' : 'outline'} size="sm" onClick={() => setCorrectAnswer(qIdx, aIdx)}>
                          {a.correct ? 'Correta' : 'Marcar correta'}
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" variant="destructive" onClick={() => removeQuestion(qIdx)}>Remover questão</Button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">As questões serão salvas em JSON no campo Conteúdo.</p>
            </div>
          )}
          <div className="space-y-2 md:col-span-2">
            <Label>Descrição</Label>
            <Textarea rows={4} placeholder="Descrição da atividade" {...form.register('description')} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
            <div className="space-y-0.5"><Label>Ativar</Label></div>
            <Switch checked={!!form.watch('active')} onCheckedChange={(checked) => form.setValue('active', checked)} />
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => form.reset()}>Limpar</Button>
        <Button type="button" onClick={handleSubmit}>Salvar</Button>
      </div>
    </div>
  );
};

export default ActivityForm;