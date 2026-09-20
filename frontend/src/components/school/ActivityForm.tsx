import { useEffect, useMemo, useState, useRef } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { UploadCloud, Video, Loader2, CheckCircle2, AlertCircle, Link as LinkIcon, Film, X } from 'lucide-react';
import type { ActivityPayload, ActivityRecord, ActivityType } from '@/types/activities';
import { uploadActivityFile } from '@/services/activitiesService';
import { integrationsService } from '@/services/integrationsService';

function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatDurationDisplay(seconds: number) {
  if (!seconds || isNaN(seconds)) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

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
   * fetchDirectVideoDuration
   * Obtém a duração em segundos de arquivos MP4/R2 diretamente dos metadados.
   */
  async function fetchDirectVideoDuration(videoUrl: string): Promise<number> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        resolve(video.duration || 0);
      };
      video.onerror = () => {
        resolve(0);
      };
      video.src = videoUrl;
    });
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
      } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const id = parseYouTubeVideoId(url);
        if (id) seconds = await fetchYouTubeDuration(id);
      } else {
        // Tenta obter duração de vídeo direto / Cloudflare R2
        seconds = await fetchDirectVideoDuration(url);
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
  const currentContent = form.watch('content') || '';
  const isCurrentR2Video = Boolean(
    currentContent &&
    (currentContent.includes('.r2.dev') ||
     currentContent.includes('r2.cloudflarestorage.com') ||
     currentContent.includes('/videos/'))
  );
  const contentPlaceholder = useMemo(() => {
    switch (type) {
      case 'video': return 'URL do vídeo (YouTube, Vimeo ou Ead Control / MP4)';
      case 'apostila': return 'Descrição do arquivo (upload em etapa futura)';
      case 'avaliacao': return 'Instruções ou JSON de questões (etapa futura)';
      default: return 'Conteúdo da atividade';
    }
  }, [type]);

  // --- Upload de Vídeo para Cloudflare R2 ---
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [videoUploadSuccess, setVideoUploadSuccess] = useState(false);
  const [detectedDuration, setDetectedDuration] = useState<number>(0);
  const [videoTab, setVideoTab] = useState<'r2' | 'url'>('r2');
  const videoInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Sincroniza a aba ativa quando initialData carregar
  useEffect(() => {
    if (initialData?.content) {
      const c = initialData.content;
      if (c.includes('youtube.com') || c.includes('youtu.be') || c.includes('vimeo.com')) {
        setVideoTab('url');
      } else {
        setVideoTab('r2');
      }
    }
  }, [initialData]);

  // Cancela upload em andamento ao desmontar o componente
  useEffect(() => {
    return () => {
      if (xhrRef.current) {
        xhrRef.current.abort();
      }
    };
  }, []);

  /**
   * fetchFileVideoDuration
   * Obtém a duração em segundos a partir do arquivo de vídeo selecionado no navegador.
   */
  async function fetchFileVideoDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          const d = video.duration || 0;
          URL.revokeObjectURL(url);
          resolve(d);
        };
        video.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(0);
        };
        video.src = url;
      } catch {
        resolve(0);
      }
    });
  }

  const handleVideoFileChange = async (file: File | null) => {
    setVideoFile(file);
    setVideoUploadError(null);
    setVideoUploadSuccess(false);
    setVideoUploadProgress(0);
    setDetectedDuration(0);
    if (file) {
      try {
        const sec = await fetchFileVideoDuration(file);
        setDetectedDuration(sec);
        if (sec > 0 && !form.getValues('duration')) {
          form.setValue('duration', String(Math.round(sec)));
          form.setValue('type_duration', 'seg');
        }
      } catch (e) {
        // silencioso
      }
    }
  };

  const cancelVideoUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setVideoUploading(false);
    setVideoUploadProgress(0);
  };

  /**
   * handleR2VideoUpload
   * Envia arquivo diretamente para Cloudflare R2 via Presigned PUT URL.
   */
  const handleR2VideoUpload = async () => {
    if (!videoFile) return;
    setVideoUploading(true);
    setVideoUploadProgress(0);
    setVideoUploadError(null);
    setVideoUploadSuccess(false);

    try {
      const mimeType = videoFile.type || 'video/mp4';
      const res: any = await integrationsService.getR2PresignedUploadUrl(
        videoFile.name,
        mimeType,
        'videos'
      );

      const presignedData = res?.data || res;
      const uploadUrl = presignedData?.upload_url;
      const publicUrl = presignedData?.public_url;

      if (!uploadUrl || !publicUrl) {
        throw new Error('Servidor não retornou a URL assinada de upload para o armazenamento Ead Control.');
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setVideoUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Falha no upload para o Ead Control (Código HTTP ${xhr.status})`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Falha de conexão com o armazenamento Ead Control durante o upload. Verifique as configurações de rede ou CORS do armazenamento.'));
        };

        xhr.onabort = () => {
          reject(new Error('Upload cancelado pelo usuário.'));
        };

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', mimeType);
        xhr.send(videoFile);
      });

      form.setValue('content', String(publicUrl));
      setVideoUploadSuccess(true);

      // Aplica duração do vídeo
      if (detectedDuration > 0) {
        form.setValue('duration', String(Math.round(detectedDuration)));
        form.setValue('type_duration', 'seg');
      } else {
        const sec = await fetchDirectVideoDuration(publicUrl);
        if (sec > 0) {
          setDetectedDuration(sec);
          form.setValue('duration', String(Math.round(sec)));
          form.setValue('type_duration', 'seg');
        }
      }
    } catch (err: any) {
      console.error('Erro no upload para o Ead Control:', err);
      const msg = err?.response?.data?.message || err?.message || 'Falha no upload do vídeo para o Ead Control.';
      setVideoUploadError(String(msg));
    } finally {
      setVideoUploading(false);
      xhrRef.current = null;
    }
  };

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
                <SelectItem value="video">Vídeo (YouTube, Vimeo ou Ead Control)</SelectItem>
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
            <div className="space-y-4 md:col-span-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <Label className="text-base font-semibold">Vídeo da Atividade</Label>
                  <p className="text-xs text-muted-foreground">
                    Faça upload do arquivo de vídeo diretamente para o Ead Control ou utilize um link externo.
                  </p>
                </div>
              </div>

              <Tabs value={videoTab} onValueChange={(v) => setVideoTab(v as 'r2' | 'url')} className="w-full">
                <TabsList className="grid grid-cols-2 w-full max-w-md h-10 bg-slate-200/70 dark:bg-slate-800">
                  <TabsTrigger value="r2" className="flex items-center gap-2 font-medium">
                    <UploadCloud className="w-4 h-4" />
                    Upload Ead Control
                  </TabsTrigger>
                  <TabsTrigger value="url" className="flex items-center gap-2 font-medium">
                    <LinkIcon className="w-4 h-4" />
                    Link Externo (YouTube / Vimeo)
                  </TabsTrigger>
                </TabsList>

                {/* Aba Upload Ead Control */}
                <TabsContent value="r2" className="space-y-4 pt-2 focus-visible:outline-none">
                  {/* Se já há URL de vídeo salva no formulário */}
                  {isCurrentR2Video && (
                    <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-900 dark:text-emerald-200 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 font-medium">
                          <span>Vídeo ativo armazenado no Ead Control</span>
                        </div>
                        <p className="text-xs font-mono break-all text-emerald-800 dark:text-emerald-300">
                          {currentContent}
                        </p>
                      </div>
                      <a
                        href={currentContent}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline font-medium hover:text-emerald-700 shrink-0 self-center"
                      >
                        Visualizar
                      </a>
                    </div>
                  )}

                  {/* Área de seleção de arquivo */}
                  <div className="space-y-3">
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.mov,.m4v"
                      className="hidden"
                      onChange={(e) => handleVideoFileChange(e.target.files?.[0] || null)}
                    />

                    {!videoFile ? (
                      <div
                        onClick={() => videoInputRef.current?.click()}
                        className="cursor-pointer border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary dark:hover:border-primary transition-colors rounded-xl p-6 flex flex-col items-center justify-center text-center gap-2 bg-white dark:bg-slate-950/40"
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            Clique para selecionar um vídeo do seu computador
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Formatos suportados: MP4, WebM, MOV (Armazenamento direto no Ead Control)
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-950 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                              <Film className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{videoFile.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{formatBytes(videoFile.size)}</span>
                                {detectedDuration > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>Duração detectada: {formatDurationDisplay(detectedDuration)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {!videoUploading && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                handleVideoFileChange(null);
                                if (videoInputRef.current) videoInputRef.current.value = '';
                              }}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="w-4 h-4 mr-1" /> Remover
                            </Button>
                          )}
                        </div>

                        {/* Progresso do upload */}
                        {videoUploading && (
                          <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-1.5 font-medium text-primary">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Enviando vídeo para o Ead Control...
                              </span>
                              <span className="font-semibold">{videoUploadProgress}%</span>
                            </div>
                            <Progress value={videoUploadProgress} className="h-2" />
                            <div className="flex justify-end pt-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={cancelVideoUpload}
                                className="text-xs h-7 text-muted-foreground hover:text-destructive"
                              >
                                Cancelar upload
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Botões de Ação */}
                        {!videoUploading && (
                          <div className="pt-2 flex flex-wrap items-center gap-3">
                            <Button
                              type="button"
                              onClick={handleR2VideoUpload}
                              className="w-full sm:w-auto"
                            >
                              <UploadCloud className="w-4 h-4 mr-2" />
                              Fazer Upload para o Ead Control
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => videoInputRef.current?.click()}
                            >
                              Escolher outro arquivo
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mensagem de Erro */}
                    {videoUploadError && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Erro no upload do vídeo:</p>
                          <p>{videoUploadError}</p>
                          {videoUploadError.toLowerCase().includes('não está configurada') && (
                            <p className="mt-1 text-slate-600 dark:text-slate-400">
                              Para configurar o armazenamento, acesse o menu <strong>Configurações &gt; Integrações</strong>.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Campo de URL gerada / atual */}
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs text-muted-foreground">URL do vídeo (armazenada no Ead Control)</Label>
                    <Input
                      placeholder="https://..."
                      {...form.register('content')}
                      className="font-mono text-xs"
                      onBlur={importVideoDuration}
                    />
                  </div>
                </TabsContent>

                {/* Aba Link Externo */}
                <TabsContent value="url" className="space-y-3 pt-2 focus-visible:outline-none">
                  <div className="space-y-2">
                    <Label>Link do Vídeo</Label>
                    <Textarea
                      rows={2}
                      placeholder={contentPlaceholder}
                      {...form.register('content')}
                      onBlur={importVideoDuration}
                    />
                    <p className="text-xs text-muted-foreground">
                      Informe o link completo do vídeo (YouTube, Vimeo ou link direto MP4). A duração será obtida automaticamente ao sair do campo.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
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