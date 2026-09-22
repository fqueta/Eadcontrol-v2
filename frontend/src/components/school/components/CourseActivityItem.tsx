import { useState, useRef, useEffect, useMemo } from 'react';
import { useFormContext, useWatch, useFieldArray } from 'react-hook-form';
import { GripVertical, ChevronDown, ChevronUp, ChevronLeft, X, Plus, Loader2, PlayCircle, FileText, Layout, Download, CheckSquare, Clock, Youtube, Play, ExternalLink, UploadCloud, Film, AlertCircle, CheckCircle2, Maximize2, Trash2, Sparkles, FolderOpen, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { extractVideoMeta } from '@/services/videoTipsService';
import { integrationsService } from '@/services/integrationsService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getTenantApiUrl, getVersionApi } from '@/lib/qlib';
import { CustomVideoPlayer } from '@/components/common/CustomVideoPlayer';
import type { MediaFile } from '@/types/media';
import { AssessmentEditor } from './assessment';

// Helper for keys
const activityKey = (mIdx: number, aIdx: number) => `${mIdx}:${aIdx}`;
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function fetchFileVideoDuration(file: File): Promise<number> {
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

export function resolveEadControlPlayUrl(rawUrl: string): string {
  const url = (rawUrl || '').trim();
  if (!url) return '';
  if (url.startsWith('blob:')) {
    return url;
  }

  // Se for URL do endpoint S3 (*.r2.cloudflarestorage.com), caminho relativo, URL de streaming ou arquivo HLS (.m3u8)
  if (url.includes('r2.cloudflarestorage.com') || url.includes('/videos/') || url.includes('media/stream') || url.includes('.m3u8')) {
    if (url.includes('/api/v1/integrations/media/stream') && url.startsWith('http')) {
      return url;
    }
    try {
      let cleanPath = url;
      if (url.includes('://')) {
        const parsed = new URL(url);
        cleanPath = parsed.pathname.replace(/^\/+/, '');
        const segments = cleanPath.split('/');
        // Se o primeiro segmento for o bucket (ex: ead-control/api-eaddemo/...)
        if (segments.length > 2) {
          cleanPath = segments.slice(1).join('/');
        }
      }
      const apiBase = `${getTenantApiUrl()}${getVersionApi()}`;
      return `${apiBase}/integrations/media/stream?path=${encodeURIComponent(cleanPath)}`;
    } catch {
      const apiBase = `${getTenantApiUrl()}${getVersionApi()}`;
      return `${apiBase}/integrations/media/stream?path=${encodeURIComponent(url)}`;
    }
  }

  return url;
}

export interface VideoPreviewInfo {
  provider: 'youtube' | 'vimeo' | 'eadcontrol';
  providerLabel: string;
  videoId?: string;
  embedUrl?: string;
  directUrl?: string;
  thumbnail?: string;
}

export function getVideoPreviewInfo(rawUrl: string, selectedSource?: string): VideoPreviewInfo | null {
  const url = (rawUrl || '').trim();
  if (!url) return null;

  // 1. Check YouTube (URL has highest priority)
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const isExplicitYouTube = url.includes('youtube.com') || url.includes('youtu.be');

  if (ytMatch || isExplicitYouTube || (selectedSource === 'youtube' && !url.includes('vimeo') && !url.includes('r2.') && !url.includes('/videos/'))) {
    const id = ytMatch ? ytMatch[1] : '';
    return {
      provider: 'youtube',
      providerLabel: 'YouTube',
      videoId: id,
      thumbnail: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : undefined,
      embedUrl: id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : undefined,
    };
  }

  // 2. Check Vimeo (URL has highest priority)
  const isExplicitVimeo = url.includes('vimeo.com') || url.includes('player.vimeo.com');
  let vmId = '';
  let vmHash = '';

  if (isExplicitVimeo || selectedSource === 'vimeo') {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      const cleanPath = parsed.pathname.replace(/^\/+|\/+$/g, '');
      const segments = cleanPath.split('/').filter(Boolean);

      if (parsed.hostname.includes('player.vimeo.com')) {
        const vIdx = segments.indexOf('video');
        if (vIdx !== -1 && segments[vIdx + 1] && /^\d+$/.test(segments[vIdx + 1])) {
          vmId = segments[vIdx + 1];
        } else if (segments[0] && /^\d+$/.test(segments[0])) {
          vmId = segments[0];
        }
        vmHash = parsed.searchParams.get('h') || '';
      } else if (parsed.hostname.includes('vimeo.com')) {
        for (let i = 0; i < segments.length; i++) {
          if (/^\d{6,12}$/.test(segments[i])) {
            vmId = segments[i];
            if (segments[i + 1] && /^[a-zA-Z0-9]+$/.test(segments[i + 1])) {
              vmHash = segments[i + 1];
            }
            break;
          }
        }
        if (!vmHash) {
          vmHash = parsed.searchParams.get('h') || '';
        }
      }
    } catch {
      const fallbackMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (fallbackMatch) vmId = fallbackMatch[1];
    }

    if (vmId || isExplicitVimeo) {
      const hParam = vmHash ? `h=${vmHash}&` : '';
      return {
        provider: 'vimeo',
        providerLabel: 'Vimeo',
        videoId: vmId,
        thumbnail: vmId ? `https://vumbnail.com/${vmId}.jpg` : undefined,
        embedUrl: vmId ? `https://player.vimeo.com/video/${vmId}?${hParam}autoplay=1&badge=0&autopause=0` : url,
      };
    }
  }

  // 3. Check Ead Control / Direct video file
  return {
    provider: 'eadcontrol',
    providerLabel: 'Ead Control',
    directUrl: resolveEadControlPlayUrl(url),
  };
}


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

    // Ead Control Video Upload State
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUploading, setVideoUploading] = useState(false);
    const [videoUploadProgress, setVideoUploadProgress] = useState(0);
    const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
    const [detectedDuration, setDetectedDuration] = useState<number>(0);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const xhrRef = useRef<XMLHttpRequest | null>(null);

    // Mediateca Picker State
    const [isMediaLibraryModalOpen, setIsMediaLibraryModalOpen] = useState(false);
    const [mediaLibraryFiles, setMediaLibraryFiles] = useState<MediaFile[]>([]);
    const [mediaLibraryLoading, setMediaLibraryLoading] = useState(false);
    const [mediaLibrarySearch, setMediaLibrarySearch] = useState('');
    const mediaLibrarySearchTimer = useRef<NodeJS.Timeout | null>(null);

    const loadMediaLibraryFiles = async (searchQuery = '') => {
      setMediaLibraryLoading(true);
      try {
        const res = await integrationsService.listMediaFiles({
          search: searchQuery || undefined,
          per_page: 24,
        });
        setMediaLibraryFiles(res.data || []);
      } catch (err) {
        console.error('Erro ao listar arquivos da mediateca:', err);
      } finally {
        setMediaLibraryLoading(false);
      }
    };

    const handleOpenMediaLibrary = () => {
      setIsMediaLibraryModalOpen(true);
      loadMediaLibraryFiles(mediaLibrarySearch);
    };

    const handleSelectMediaFile = (file: MediaFile) => {
      const chosenUrl = file.hls_url || file.effective_stream_url || file.public_url;
      if (chosenUrl) {
        onFieldChange('video_source', 'eadcontrol');
        onFieldChange('video_url', chosenUrl);
        if (file.thumbnail_url) {
          onFieldChange('thumbnail_url', file.thumbnail_url);
        }
        if (file.duration_seconds && file.duration_seconds > 0) {
          onFieldChange('duracao', String(Math.round(file.duration_seconds)));
          onFieldChange('unidade_duracao', 'seg');
        } else {
          // Busca automática da duração se não constava ainda no objeto da mediateca
          setTimeout(() => importVideoDuration(index, aIdx), 150);
        }
        if (!a.titulo && file.original_name) {
          const cleanTitle = file.original_name.replace(/\.[^/.]+$/, '');
          onFieldChange('titulo', cleanTitle);
        }
        // Vincular atividade ao arquivo de mídia na tabela media_files
        if (a.id) {
          integrationsService.linkMediaFile(file.id, Number(a.id)).catch(() => {});
        }
        toast({
          title: 'Vídeo da Mediateca selecionado!',
          description: `"${file.original_name}" vinculado à aula com sucesso.`,
        });
        setIsMediaLibraryModalOpen(false);
      }
    };

    // Auto-detectar duração automaticamente quando o vídeo é inserido ou já existente sem duração
    useEffect(() => {
      const hasVideo = a?.tipo === 'video' && Boolean(a?.video_url);
      const isDurationEmpty = !a?.duracao || a?.duracao === '0' || Number(a?.duracao) === 0;
      if (hasVideo && isDurationEmpty) {
        const timer = setTimeout(() => {
          importVideoDuration(index, aIdx);
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [a?.video_url, a?.tipo]);

    // Cancel upload on unmount
    useEffect(() => {
      return () => {
        if (xhrRef.current) {
          xhrRef.current.abort();
        }
      };
    }, []);

    const handleVideoFileChange = async (file: File | null) => {
      setVideoFile(file);
      setVideoUploadError(null);
      setVideoUploadProgress(0);
      setDetectedDuration(0);
      if (file) {
        try {
          const sec = await fetchFileVideoDuration(file);
          setDetectedDuration(sec);
          if (sec > 0 && (!a.duracao || a.duracao === '0' || Number(a.duracao) === 0)) {
            onFieldChange('duracao', String(Math.round(sec)));
            onFieldChange('unidade_duracao', 'seg');
          }
        } catch {
          // silent
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

    const handleEadControlUpload = async () => {
      if (!videoFile) return;
      setVideoUploading(true);
      setVideoUploadProgress(0);
      setVideoUploadError(null);

      try {
        const mimeType = videoFile.type || 'video/mp4';
        const res: any = await integrationsService.getR2PresignedUploadUrl(
          videoFile.name,
          mimeType,
          'videos'
        );

        const presignedData = res?.data || res;
        const uploadUrl     = presignedData?.upload_url;
        const publicUrl     = presignedData?.public_url;
        const mediaFileId   = res?.media_file_id ?? null;

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
            reject(new Error('Falha de conexão com o armazenamento Ead Control durante o upload.'));
          };

          xhr.onabort = () => {
            reject(new Error('Upload cancelado pelo usuário.'));
          };

          xhr.open('PUT', uploadUrl);
          xhr.setRequestHeader('Content-Type', mimeType);
          xhr.send(videoFile);
        });

        onFieldChange('video_url', String(publicUrl));
        onFieldChange('video_source', 'eadcontrol');

        // Apply duration if detected
        if (detectedDuration > 0) {
          onFieldChange('duracao', String(Math.round(detectedDuration)));
          onFieldChange('unidade_duracao', 'seg');
        }
        setVideoFile(null);
        setVideoUploadError(null);

        // Disparar transcodificação HLS adaptativa própria em segundo plano
        setIsTranscodingHls(true);
        try {
          const sourcePath = presignedData?.path || publicUrl;
          const resolvedActivityId = (a as any).activity_id || (a as any).id ? Number((a as any).activity_id || (a as any).id) : undefined;
          await integrationsService.requestVideoTranscode({
            path:          sourcePath,
            activity_id:   resolvedActivityId,
            media_file_id: mediaFileId ?? undefined,
          });

          toast({
            title: 'Vídeo enviado com sucesso!',
            description: 'Iniciando otimização HLS para streaming instantâneo. Você já pode salvar o curso.',
          });

          // Polling suave para obter URL do manifesto .m3u8 assim que pronto
          let attempts = 0;
          const maxAttempts = 35; // ~100 segundos
          if (transcodePollRef.current) clearInterval(transcodePollRef.current);

          transcodePollRef.current = setInterval(async () => {
            attempts++;
            try {
              const st = await integrationsService.checkTranscodeStatus(sourcePath);
              if (st?.status === 'ready') {
                if (st.master_url) {
                  onFieldChange('video_url', st.master_url);
                  onFieldChange('hls_master_url' as any, st.master_url);
                }
                if (st.thumbnail_url) {
                  onFieldChange('thumbnail_url' as any, st.thumbnail_url);
                }
                if (st.duration && (!a.duracao || a.duracao === '0' || Number(a.duracao) === 0)) {
                  onFieldChange('duracao', String(Math.round(st.duration)));
                  onFieldChange('unidade_duracao', 'seg');
                }
                setIsTranscodingHls(false);
                if (transcodePollRef.current) clearInterval(transcodePollRef.current);
                toast({
                  title: 'Streaming HLS Ativo!',
                  description: 'O vídeo foi fatiado e agora abre instantaneamente no estilo Netflix/YouTube.',
                });
              } else if (st?.status === 'failed' || attempts >= maxAttempts) {
                setIsTranscodingHls(false);
                if (transcodePollRef.current) clearInterval(transcodePollRef.current);
              }
            } catch {
              if (attempts >= maxAttempts) {
                setIsTranscodingHls(false);
                if (transcodePollRef.current) clearInterval(transcodePollRef.current);
              }
            }
          }, 3000);
        } catch (transErr) {
          console.warn('Transcode request fallback:', transErr);
          setIsTranscodingHls(false);
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

    const [isPlayingPreview, setIsPlayingPreview] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isTranscodingHls, setIsTranscodingHls] = useState(false);
    const transcodePollRef = useRef<NodeJS.Timeout | null>(null);
    const { toast } = useToast();
    const [isDeletingVideo, setIsDeletingVideo] = useState(false);

    useEffect(() => {
      return () => {
        if (transcodePollRef.current) {
          clearInterval(transcodePollRef.current);
        }
      };
    }, []);

    const handleTriggerHlsOptimization = async () => {
      const currentUrl = (a as any).video_url;
      if (!currentUrl) return;

      const resolvedActivityId = (a as any).activity_id || (a as any).id ? Number((a as any).activity_id || (a as any).id) : undefined;

      setIsTranscodingHls(true);
      try {
        await integrationsService.requestVideoTranscode({
          path: currentUrl,
          activity_id: resolvedActivityId,
        });

        toast({
          title: 'Otimização HLS iniciada!',
          description: 'Fatiando vídeo em segundo plano para streaming instantâneo...',
        });

        let attempts = 0;
        const maxAttempts = 35;
        if (transcodePollRef.current) clearInterval(transcodePollRef.current);

        transcodePollRef.current = setInterval(async () => {
          attempts++;
          try {
            const st = await integrationsService.checkTranscodeStatus(currentUrl);
            if (st?.status === 'ready') {
              if (st.master_url) {
                onFieldChange('video_url', st.master_url);
                onFieldChange('hls_master_url' as any, st.master_url);
              }
              if (st.thumbnail_url) {
                onFieldChange('thumbnail_url' as any, st.thumbnail_url);
              }
              if (st.duration && (!a.duracao || a.duracao === '0' || Number(a.duracao) === 0)) {
                onFieldChange('duracao', String(Math.round(st.duration)));
                onFieldChange('unidade_duracao', 'seg');
              }
              setIsTranscodingHls(false);
              if (transcodePollRef.current) clearInterval(transcodePollRef.current);
              toast({
                title: 'Streaming HLS Ativo!',
                description: 'O vídeo foi fatiado e agora abre instantaneamente.',
              });
            } else if (st?.status === 'failed' || attempts >= maxAttempts) {
              setIsTranscodingHls(false);
              if (transcodePollRef.current) clearInterval(transcodePollRef.current);
            }
          } catch {
            if (attempts >= maxAttempts) {
              setIsTranscodingHls(false);
              if (transcodePollRef.current) clearInterval(transcodePollRef.current);
            }
          }
        }, 3000);
      } catch (err) {
        console.error('Erro ao disparar otimização HLS:', err);
        setIsTranscodingHls(false);
        toast({
          title: 'Erro na otimização',
          description: 'Não foi possível disparar a conversão HLS.',
          variant: 'destructive',
        });
      }
    };

    const handleDeleteVideo = async () => {
      const currentUrl = (a as any).video_url;
      if (!currentUrl && !videoFile) return;

      if (!window.confirm('Tem certeza que deseja excluir o vídeo desta atividade?')) {
        return;
      }

      setIsDeletingVideo(true);
      try {
        if (currentUrl && (currentUrl.includes('r2.cloudflarestorage.com') || currentUrl.includes('/videos/') || currentUrl.includes('media/stream'))) {
          try {
            await integrationsService.deleteR2File(currentUrl);
          } catch (delErr) {
            console.warn('Aviso ao excluir arquivo R2:', delErr);
          }
        }

        onFieldChange('video_url', '');
        setIsPlayingPreview(false);
        setVideoFile(null);
        setVideoUploadProgress(0);
        setVideoUploadError(null);
        if (videoInputRef.current) {
          videoInputRef.current.value = '';
        }
        recalcCourseDuration();
        toast({
          title: 'Vídeo excluído',
          description: 'O vídeo foi removido desta atividade.',
        });
      } catch (err: any) {
        toast({
          title: 'Erro ao excluir vídeo',
          description: err?.message || 'Falha ao remover o vídeo.',
          variant: 'destructive',
        });
      } finally {
        setIsDeletingVideo(false);
      }
    };

    // Reset inline playback if URL changes
    useEffect(() => {
      setIsPlayingPreview(false);
    }, [a.video_url]);

    // Detected video source
    const currentVideoSource = (a as any).video_source || (
      a.video_url && (
        a.video_url.includes('r2.cloudflarestorage.com') ||
        a.video_url.includes('.r2.dev') ||
        a.video_url.includes('/videos/') ||
        a.video_url.includes('media/stream')
      ) ? 'eadcontrol' : (
        a.video_url && (a.video_url.includes('vimeo.com') || a.video_url.includes('player.vimeo.com')) ? 'vimeo' : 'youtube'
      )
    );

    // Dynamic preview info for all platforms (YouTube, Vimeo, Ead Control)
    const previewInfo = useMemo(() => {
      if (a.tipo !== 'video' || !a.video_url) return null;
      return getVideoPreviewInfo(a.video_url, currentVideoSource);
    }, [a.tipo, a.video_url, currentVideoSource]);

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
                              {...control.register(`modulos.${index}.atividades.${aIdx}.titulo`)}
                              onChange={(e) => {
                                control.register(`modulos.${index}.atividades.${aIdx}.titulo`).onChange(e);
                                if (['duracao', 'unidade_duracao', 'active'].includes('titulo')) recalcCourseDuration();
                              }}
                              className="h-8 py-0 px-2 text-sm font-bold border-transparent bg-transparent hover:border-input focus:bg-background focus:border-input transition-all w-full max-w-[500px] placeholder:text-muted-foreground/40"
                              placeholder="Título da aula..."
                              onClick={(e) => e.stopPropagation()}
                          />
                      )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 pl-2 border-l border-muted/50">
                    {collapsed && (
                        <Badge variant="outline" className="text-[9px] h-5 px-1.5 font-bold uppercase tracking-tight bg-muted/20 border-transparent text-muted-foreground">
                          {a.tipo === 'quiz' ? 'Prova / Avaliação' : a.tipo}
                        </Badge>
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
                {a.tipo === 'quiz' ? (
                  /* Layout 100% largura para Prova / Avaliação (Ergonômico) */
                  <div className="space-y-4">
                    {/* Barra de Controles Rápidos do Cabeçalho da Prova */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-background rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Tipo de Conteúdo</Label>
                          <Select value={a.tipo || 'quiz'} onValueChange={(v) => onFieldChange('tipo', v)}>
                            <SelectTrigger className="h-8 bg-background font-bold text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="video" className="p-2 text-xs"><div className="flex items-center gap-2"><PlayCircle className="h-3.5 w-3.5" /> Vídeo</div></SelectItem>
                              <SelectItem value="leitura" className="p-2 text-xs"><div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> Texto/Leitura</div></SelectItem>
                              <SelectItem value="quiz" className="p-2 text-xs"><div className="flex items-center gap-2"><CheckSquare className="h-3.5 w-3.5 text-primary" /> Prova / Avaliação</div></SelectItem>
                              <SelectItem value="arquivo" className="p-2 text-xs"><div className="flex items-center gap-2"><Download className="h-3.5 w-3.5" /> Arquivo</div></SelectItem>
                              <SelectItem value="tarefa" className="p-2 text-xs"><div className="flex items-center gap-2"><Layout className="h-3.5 w-3.5" /> Tarefa</div></SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Duração</Label>
                            <Input 
                              className="h-8 w-20 bg-background text-center font-bold text-xs" 
                              value={a?.duracao ?? ''}
                              onChange={(e) => {
                                onFieldChange('duracao', e.target.value);
                                recalcCourseDuration();
                              }} 
                              placeholder="0" 
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Unidade</Label>
                            <Select value={a.unidade_duracao || 'seg'} onValueChange={(v) => onFieldChange('unidade_duracao', v)}>
                              <SelectTrigger className="h-8 w-20 bg-background text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="seg">Seg</SelectItem>
                                <SelectItem value="min">Min</SelectItem>
                                <SelectItem value="hrs">Hrs</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800">
                          <Switch checked={((a as any).active || 's') === 's'} onCheckedChange={(c) => onFieldChange('active', c ? 's' : 'n')} className="scale-75" />
                          <span className="text-xs font-bold text-foreground">Aula Ativa</span>
                        </div>
                      </div>
                    </div>

                    {/* Construtor de Avaliação Ergonômico com Strategy Pattern */}
                    <AssessmentEditor
                      activityTitle={a.titulo || `Atividade ${aIdx + 1}`}
                      activityIndex={aIdx}
                      moduleIndex={index}
                      description={a.descricao || ''}
                      onDescriptionChange={(html) => onFieldChange('descricao', html)}
                      quizConfig={(a as any).quiz_config || {}}
                      onUpdateQuizConfig={localUpdateQuizConfig}
                      questions={questionFields.map((q: any, qIdx: number) => {
                        const qVal = (a.quiz_questions && a.quiz_questions[qIdx]) ? a.quiz_questions[qIdx] : q;
                        return qVal;
                      })}
                      onAddQuestion={localAddQuizQuestion}
                      onRemoveQuestion={removeQuestion}
                      onMoveQuestion={moveQuestion}
                      onUpdateQuestion={localUpdateQuizQuestion}
                      onUpdateOption={localUpdateQuizOption}
                      onAddOption={localAddQuizOption}
                      onRemoveOption={localRemoveQuizOption}
                    />
                  </div>
                ) : (
                  /* Layout 2 colunas para os outros tipos (vídeo, leitura, arquivo, tarefa) */
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
                                <SelectItem value="quiz" className="p-2.5"><div className="flex items-center gap-2"><CheckSquare className="h-4 w-4 text-primary" /> Prova / Avaliação</div></SelectItem>
                                <SelectItem value="arquivo" className="p-2.5"><div className="flex items-center gap-2"><Download className="h-4 w-4" /> Arquivo</div></SelectItem>
                                <SelectItem value="tarefa" className="p-2.5"><div className="flex items-center gap-2"><Layout className="h-4 w-4" /> Tarefa</div></SelectItem>
                              </SelectContent>
                            </Select>
                         </div>

                         <div className="grid grid-cols-2 gap-3">
                             <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Duração</Label>
                                <Input 
                                   className="h-9 bg-background text-center font-bold" 
                                   value={a?.duracao ?? ''}
                                   onChange={(e) => {
                                     onFieldChange('duracao', e.target.value);
                                     recalcCourseDuration();
                                   }} 
                                   placeholder="0" 
                                />
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
                         <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descrição Pública</Label>
                            <div className="min-h-[140px] rounded-2xl border border-slate-200 bg-white/80 shadow-sm overflow-hidden">
                               <RichTextEditor
                                  value={a.descricao || ''}
                                  onChange={(html) => onFieldChange('descricao', html)}
                                  placeholder="Descrição pública da atividade (visível para alunos)"
                               />
                            </div>
                         </div>

                         {a.tipo === 'video' && (
                             <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="w-full sm:w-[160px]">
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">Plataforma</Label>
                                        <Select value={currentVideoSource} onValueChange={(v) => { onFieldChange('video_source', v); }}>
                                            <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="youtube">YouTube</SelectItem>
                                                <SelectItem value="vimeo">Vimeo</SelectItem>
                                                <SelectItem value="eadcontrol">Ead Control</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">URL do Vídeo</Label>
                                         <div className="flex gap-2">
                                            <Input 
                                                className="h-10 font-mono text-sm bg-background border-2 focus-visible:ring-primary/20" 
                                                placeholder={
                                                  currentVideoSource === 'eadcontrol'
                                                    ? "https://... (URL no Ead Control ou faça upload abaixo)"
                                                    : currentVideoSource === 'vimeo'
                                                      ? "https://player.vimeo.com/video/..."
                                                      : "https://www.youtube.com/watch?v=..."
                                                } 
                                                {...control.register(`modulos.${index}.atividades.${aIdx}.video_url`)}
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  onFieldChange('video_url', val);
                                                  if (val.includes('youtube.com') || val.includes('youtu.be')) {
                                                    onFieldChange('video_source', 'youtube');
                                                  } else if (val.includes('vimeo.com') || val.includes('player.vimeo.com')) {
                                                    onFieldChange('video_source', 'vimeo');
                                                  } else if (val.includes('r2.cloudflarestorage.com') || val.includes('/videos/') || val.includes('.mp4') || val.includes('media/stream')) {
                                                    onFieldChange('video_source', 'eadcontrol');
                                                  }
                                                }}
                                                onBlur={() => importVideoDuration(index, aIdx)} 
                                            />
                                            {(a as any).video_url && (
                                                <>
                                                  <Button type="button" size="icon" variant="outline" className="h-10 w-10 shrink-0 border-2 hover:bg-primary/5 hover:text-primary transition-all shadow-sm" onClick={() => importVideoDuration(index, aIdx)} title="Sincronizar duração">
                                                     <RefreshCw className="h-4 w-4" />
                                                  </Button>
                                                  <Button 
                                                     type="button" 
                                                     size="icon" 
                                                     variant="outline" 
                                                     disabled={isDeletingVideo}
                                                     className="h-10 w-10 shrink-0 border-2 text-destructive hover:bg-destructive/10 hover:border-destructive transition-all shadow-sm" 
                                                     onClick={handleDeleteVideo} 
                                                     title="Excluir/Remover vídeo"
                                                  >
                                                     {isDeletingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                  </Button>
                                                </>
                                            )}
                                         </div>
                                    </div>
                                </div>

                                 {/* Ead Control Video Upload Section */}
                                 {currentVideoSource === 'eadcontrol' && (
                                    <div className="space-y-3 pt-1">
                                       <input
                                          ref={videoInputRef}
                                          type="file"
                                          accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.mov,.m4v"
                                          className="hidden"
                                          onChange={(e) => handleVideoFileChange(e.target.files?.[0] || null)}
                                       />

                                       {!videoFile ? (
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                             {/* Opção 1: Do Computador */}
                                             <div
                                                onClick={() => videoInputRef.current?.click()}
                                                className="cursor-pointer border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary transition-all rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 bg-white/60 dark:bg-slate-950/40 hover:bg-primary/5 group/drop"
                                             >
                                                <div className="w-10 h-10 rounded-full bg-primary/10 group-hover/drop:bg-primary/20 flex items-center justify-center text-primary transition-colors">
                                                   <UploadCloud className="w-5 h-5" />
                                                </div>
                                                <div>
                                                   <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                      Do seu Computador
                                                   </p>
                                                   <p className="text-[11px] text-muted-foreground mt-0.5">
                                                      MP4, WebM ou MOV (upload direto)
                                                   </p>
                                                </div>
                                             </div>

                                             {/* Opção 2: Da Mediateca */}
                                             <div
                                                onClick={handleOpenMediaLibrary}
                                                className="cursor-pointer border-2 border-dashed border-violet-300 dark:border-violet-800 hover:border-violet-500 transition-all rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 bg-violet-50/40 dark:bg-violet-950/20 hover:bg-violet-500/10 group/media"
                                             >
                                                <div className="w-10 h-10 rounded-full bg-violet-500/10 group-hover/media:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 transition-colors">
                                                   <FolderOpen className="w-5 h-5" />
                                                </div>
                                                <div>
                                                   <p className="text-xs font-semibold text-violet-950 dark:text-violet-200">
                                                      Escolher da Mediateca
                                                   </p>
                                                   <p className="text-[11px] text-muted-foreground mt-0.5">
                                                      Reutilizar vídeos já enviados ou HLS
                                                   </p>
                                                </div>
                                             </div>
                                          </div>
                                       ) : (
                                          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-950 space-y-3">
                                             <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                   <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                                      <Film className="w-4 h-4" />
                                                   </div>
                                                   <div className="min-w-0">
                                                      <p className="text-xs font-medium truncate">{videoFile.name}</p>
                                                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                                         <span>{formatBytes(videoFile.size)}</span>
                                                         {detectedDuration > 0 && (
                                                            <>
                                                               <span>•</span>
                                                               <span>Duração: {Math.round(detectedDuration)}s</span>
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
                                                      className="text-muted-foreground hover:text-destructive h-7 text-xs px-2"
                                                   >
                                                      <X className="w-3.5 h-3.5 mr-1" /> Remover
                                                   </Button>
                                                )}
                                             </div>

                                             {/* Upload Progress */}
                                             {videoUploading && (
                                                <div className="space-y-1.5 pt-1">
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
                                                         className="text-xs h-6 px-2 text-muted-foreground hover:text-destructive"
                                                      >
                                                         Cancelar upload
                                                      </Button>
                                                   </div>
                                                </div>
                                             )}

                                             {/* Action buttons */}
                                             {!videoUploading && (
                                                <div className="pt-1 flex flex-wrap items-center gap-2">
                                                   <Button
                                                      type="button"
                                                      size="sm"
                                                      onClick={handleEadControlUpload}
                                                      className="h-8 text-xs font-semibold"
                                                   >
                                                      <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                                                      Fazer Upload para o Ead Control
                                                   </Button>
                                                   <Button
                                                      type="button"
                                                      variant="outline"
                                                      size="sm"
                                                      onClick={() => videoInputRef.current?.click()}
                                                      className="h-8 text-xs"
                                                   >
                                                      Escolher outro arquivo
                                                   </Button>
                                                   <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={handleOpenMediaLibrary}
                                                      className="h-8 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/40"
                                                   >
                                                      <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                                                      Ou escolher da Mediateca
                                                   </Button>
                                                </div>
                                             )}
                                          </div>
                                       )}

                                       {/* Erro */}
                                       {videoUploadError && (
                                          <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
                                             <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                             <div>
                                                <p className="font-semibold">Erro no upload do vídeo:</p>
                                                <p>{videoUploadError}</p>
                                             </div>
                                          </div>
                                       )}
                                    </div>
                                 )}

                                 {/* Video Preview Layer - Suporte Completo a Preview (YouTube, Vimeo, Ead Control) */}
                                 {previewInfo && (
                                    <div className="mt-3 p-3.5 rounded-xl border bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm flex flex-col sm:flex-row gap-4 animate-in zoom-in-95 fade-in duration-300">
                                        {/* Player / Thumbnail Container */}
                                        {isPlayingPreview ? (
                                            <div className="relative w-full sm:w-[260px] md:w-[300px] aspect-video rounded-lg overflow-hidden bg-black shadow-inner border border-slate-800 shrink-0">
                                                {previewInfo.provider === 'youtube' && (
                                                    <iframe
                                                        src={previewInfo.embedUrl}
                                                        title={a.titulo || 'Preview YouTube'}
                                                        className="w-full h-full border-0"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                        allowFullScreen
                                                    />
                                                )}
                                                {previewInfo.provider === 'vimeo' && (
                                                    <iframe
                                                        src={previewInfo.embedUrl}
                                                        title={a.titulo || 'Preview Vimeo'}
                                                        className="w-full h-full border-0"
                                                        allow="autoplay; fullscreen; picture-in-picture"
                                                        allowFullScreen
                                                    />
                                                )}
                                                {previewInfo.provider === 'eadcontrol' && (
                                                    <CustomVideoPlayer
                                                        src={previewInfo.directUrl || a.video_url}
                                                        title={a.titulo || 'Preview da Aula'}
                                                        className="w-full h-full"
                                                    />
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setIsPlayingPreview(false)}
                                                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/80 hover:bg-black text-white hover:text-red-400 transition-colors z-20"
                                                    title="Fechar reprodução"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div 
                                                onClick={() => setIsPlayingPreview(true)}
                                                className="relative w-full sm:w-[190px] aspect-video rounded-lg overflow-hidden bg-slate-950 group/preview cursor-pointer shadow-sm hover:shadow-md transition-all flex items-center justify-center shrink-0"
                                                title="Clique para assistir o preview"
                                            >
                                                {previewInfo.provider === 'eadcontrol' ? (
                                                    previewInfo.thumbnail ? (
                                                        <img 
                                                            src={previewInfo.thumbnail} 
                                                            alt="Preview" 
                                                            className="w-full h-full object-cover opacity-85 group-hover/preview:opacity-100 group-hover/preview:scale-105 transition-all duration-300"
                                                        />
                                                    ) : (
                                                        <video 
                                                            src={previewInfo.directUrl || a.video_url} 
                                                            className="w-full h-full object-cover opacity-70 group-hover/preview:opacity-90 transition-opacity"
                                                            preload="metadata"
                                                        />
                                                    )
                                                ) : previewInfo.thumbnail ? (
                                                    <img 
                                                        src={previewInfo.thumbnail} 
                                                        alt="Preview" 
                                                        onError={(e) => {
                                                            (e.target as HTMLElement).style.display = 'none';
                                                        }}
                                                        className="w-full h-full object-cover opacity-85 group-hover/preview:opacity-100 group-hover/preview:scale-105 transition-all duration-300"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                                        <PlayCircle className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                )}

                                                {/* Play Button Overlay */}
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/preview:bg-black/30 transition-colors">
                                                    <div className="w-10 h-10 rounded-full bg-white/95 group-hover/preview:bg-white group-hover/preview:scale-110 shadow-lg flex items-center justify-center transition-transform">
                                                        <Play className="h-4 w-4 text-slate-900 ml-0.5 fill-slate-900" />
                                                    </div>
                                                </div>

                                                {/* Provider Badge */}
                                                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md flex items-center gap-1 z-10">
                                                    {previewInfo.provider === 'youtube' && <Youtube className="h-3 w-3 text-red-500" />}
                                                    {previewInfo.provider === 'vimeo' && <PlayCircle className="h-3 w-3 text-blue-400" />}
                                                    {previewInfo.provider === 'eadcontrol' && <Film className="h-3 w-3 text-emerald-400" />}
                                                    <span className="text-[9px] font-bold text-white uppercase">{previewInfo.providerLabel}</span>
                                                </div>

                                                <div className="absolute bottom-1 right-2 text-[9px] text-white/90 font-semibold group-hover/preview:text-white transition-colors drop-shadow">
                                                    Clique para assistir
                                                </div>
                                            </div>
                                        )}

                                        {/* Info & Meta */}
                                        <div className="flex-1 space-y-2.5 min-w-0">
                                            <div className="flex items-start justify-between gap-2 flex-wrap">
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                                        Preview Confirmado
                                                    </p>
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5 truncate">
                                                        Vínculo com {previewInfo.providerLabel} estabelecido
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {!isPlayingPreview ? (
                                                        <Button 
                                                            type="button" 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="h-7 text-[10px] font-bold uppercase hover:bg-primary/10 hover:text-primary border-primary/30 text-primary"
                                                            onClick={() => setIsPlayingPreview(true)}
                                                        >
                                                            <Play className="h-3 w-3 mr-1 fill-current" /> Assistir Preview
                                                        </Button>
                                                    ) : (
                                                        <Button 
                                                            type="button" 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="h-7 text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground"
                                                            onClick={() => setIsPlayingPreview(false)}
                                                        >
                                                            <X className="h-3 w-3 mr-1" /> Fechar Player
                                                        </Button>
                                                    )}

                                                    <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-7 text-[10px] font-bold uppercase hover:bg-muted"
                                                        onClick={() => setIsPreviewModalOpen(true)}
                                                        title="Assistir em modal expandido"
                                                    >
                                                        <Maximize2 className="h-3 w-3 mr-1" /> Modal
                                                    </Button>

                                                    {previewInfo.provider === 'eadcontrol' && !a.video_url?.includes('.m3u8') && (
                                                        <Button 
                                                            type="button" 
                                                            variant="outline" 
                                                            size="sm" 
                                                            disabled={isTranscodingHls}
                                                            className="h-7 text-[10px] font-bold uppercase bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 transition-colors"
                                                            onClick={handleTriggerHlsOptimization}
                                                            title="Fatiar este vídeo para abrir instantaneamente via HLS"
                                                        >
                                                            {isTranscodingHls ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1 text-amber-600" />}
                                                            Otimizar HLS
                                                        </Button>
                                                    )}

                                                    <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-7 text-[10px] font-bold uppercase hover:bg-muted text-muted-foreground hover:text-foreground"
                                                        onClick={() => window.open(a.video_url, '_blank')}
                                                        title="Abrir URL original em nova aba"
                                                    >
                                                        <ExternalLink className="h-3 w-3 mr-1" /> Testar Link
                                                    </Button>

                                                    <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        disabled={isDeletingVideo}
                                                        className="h-7 text-[10px] font-bold uppercase text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                                                        onClick={handleDeleteVideo}
                                                        title="Excluir vídeo desta atividade"
                                                    >
                                                        {isDeletingVideo ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
                                                        Excluir Vídeo
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 pt-0.5">
                                                {previewInfo.videoId && (
                                                    <Badge variant="outline" className="bg-white dark:bg-slate-950 text-[9px] font-mono border-slate-200 dark:border-slate-800">
                                                        ID: {previewInfo.videoId}
                                                    </Badge>
                                                )}
                                                {isTranscodingHls ? (
                                                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[9px] font-bold animate-pulse flex items-center gap-1">
                                                        <Loader2 className="h-2.5 w-2.5 animate-spin text-amber-600" />
                                                        PROCESSANDO STREAMING HLS...
                                                    </Badge>
                                                ) : a.video_url?.includes('.m3u8') ? (
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold flex items-center gap-1">
                                                        <Sparkles className="h-2.5 w-2.5 text-emerald-600" />
                                                        HLS ADAPTATIVO (INSTANTÂNEO)
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 text-[9px] font-semibold flex items-center gap-1">
                                                        <Film className="h-2.5 w-2.5 text-slate-500" />
                                                        MP4 ORIGINAL (NÃO OTIMIZADO)
                                                    </Badge>
                                                )}
                                                <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-[9px] font-bold uppercase tracking-tight">
                                                    {previewInfo.provider === 'eadcontrol' ? 'ARM. LOCAL / EAD CONTROL' : previewInfo.providerLabel}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                 )}

                                 {/* Modal Dialog de Preview Expandido */}
                                 {previewInfo && (
                                    <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
                                        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border border-slate-800 text-white sm:rounded-xl">
                                            <DialogHeader className="p-3.5 px-4 bg-slate-900 border-b border-slate-800 flex flex-row items-center justify-between">
                                                <div className="flex items-center gap-2.5 min-w-0 pr-6">
                                                    <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
                                                        <PlayCircle className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <DialogTitle className="text-sm font-bold text-white truncate">
                                                            {a.titulo || 'Preview do Vídeo'}
                                                        </DialogTitle>
                                                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                                            <span className="capitalize font-semibold">{previewInfo.providerLabel}</span>
                                                            {a.duracao && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>Duração: {a.duracao} {a.unidade_duracao || 'seg'}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </DialogHeader>

                                            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
                                                {previewInfo.provider === 'youtube' && (
                                                    <iframe
                                                        src={previewInfo.embedUrl}
                                                        title={a.titulo || 'Preview YouTube'}
                                                        className="w-full h-full border-0"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                        allowFullScreen
                                                    />
                                                )}
                                                {previewInfo.provider === 'vimeo' && (
                                                    <iframe
                                                        src={previewInfo.embedUrl}
                                                        title={a.titulo || 'Preview Vimeo'}
                                                        className="w-full h-full border-0"
                                                        allow="autoplay; fullscreen; picture-in-picture"
                                                        allowFullScreen
                                                    />
                                                )}
                                                {previewInfo.provider === 'eadcontrol' && (
                                                    <CustomVideoPlayer
                                                        src={previewInfo.directUrl || a.video_url}
                                                        title={a.titulo || 'Preview da Aula'}
                                                        className="w-full h-full"
                                                    />
                                                )}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                 )}

                                 {/* Modal Dialog de Seleção da Mediateca */}
                                 <Dialog open={isMediaLibraryModalOpen} onOpenChange={setIsMediaLibraryModalOpen}>
                                     <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden sm:rounded-xl">
                                         <DialogHeader className="p-4 px-6 border-b bg-muted/30">
                                             <div className="flex items-center justify-between gap-4">
                                                 <div className="flex items-center gap-3">
                                                     <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                                                         <FolderOpen className="h-5 w-5" />
                                                     </div>
                                                     <div>
                                                         <DialogTitle className="text-base font-bold">
                                                             Selecionar Vídeo da Mediateca
                                                         </DialogTitle>
                                                         <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                                             Escolha um vídeo já existente para vincular a esta aula instantaneamente.
                                                         </DialogDescription>
                                                     </div>
                                                 </div>

                                                 <Button
                                                     type="button"
                                                     variant="outline"
                                                     size="sm"
                                                     onClick={() => loadMediaLibraryFiles(mediaLibrarySearch)}
                                                     disabled={mediaLibraryLoading}
                                                     className="h-8 text-xs shrink-0"
                                                 >
                                                     <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${mediaLibraryLoading ? 'animate-spin' : ''}`} />
                                                     Atualizar
                                                 </Button>
                                             </div>

                                             {/* Barra de Busca */}
                                             <div className="relative mt-3">
                                                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                                 <Input
                                                     value={mediaLibrarySearch}
                                                     onChange={(e) => {
                                                         const val = e.target.value;
                                                         setMediaLibrarySearch(val);
                                                         if (mediaLibrarySearchTimer.current) clearTimeout(mediaLibrarySearchTimer.current);
                                                         mediaLibrarySearchTimer.current = setTimeout(() => {
                                                             loadMediaLibraryFiles(val);
                                                         }, 350);
                                                     }}
                                                     placeholder="Buscar por nome do arquivo ou pasta..."
                                                     className="pl-8 h-9 text-xs bg-background"
                                                 />
                                             </div>
                                         </DialogHeader>

                                         {/* Conteúdo da Mediateca */}
                                         <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-[320px]">
                                             {mediaLibraryLoading ? (
                                                 <div className="flex flex-col items-center justify-center h-56 gap-2 text-muted-foreground">
                                                     <Loader2 className="w-7 h-7 animate-spin text-violet-600" />
                                                     <p className="text-xs">Carregando vídeos da Mediateca...</p>
                                                 </div>
                                             ) : mediaLibraryFiles.length === 0 ? (
                                                 <div className="flex flex-col items-center justify-center h-56 gap-2 text-center text-muted-foreground">
                                                     <Film className="w-10 h-10 opacity-30 text-violet-600" />
                                                     <p className="text-sm font-semibold">Nenhum vídeo encontrado</p>
                                                     <p className="text-xs max-w-sm">
                                                         {mediaLibrarySearch ? 'Nenhum resultado com esse filtro de busca.' : 'Envie um vídeo do seu computador ou faça a varredura na Mediateca principal.'}
                                                     </p>
                                                 </div>
                                             ) : (
                                                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                     {mediaLibraryFiles.map((f) => {
                                                         const isCurrent = (a.video_url || '').includes(f.storage_path || '') || (f.hls_url && a.video_url === f.hls_url);
                                                         return (
                                                             <div
                                                                 key={f.id}
                                                                 onClick={() => handleSelectMediaFile(f)}
                                                                 className={`group/card relative rounded-xl border p-3 cursor-pointer transition-all hover:border-violet-500 hover:shadow-md ${
                                                                     isCurrent
                                                                         ? 'border-violet-600 bg-violet-50/60 dark:bg-violet-950/30 ring-2 ring-violet-500/20'
                                                                         : 'border-border bg-card hover:bg-muted/30'
                                                                 }`}
                                                             >
                                                                 {/* Thumbnail */}
                                                                 <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900 mb-2.5 flex items-center justify-center">
                                                                     {f.thumbnail_url ? (
                                                                         <img
                                                                             src={f.thumbnail_url}
                                                                             alt={f.original_name || 'Thumbnail'}
                                                                             className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                                                                             onError={(e) => {
                                                                                 (e.target as HTMLElement).style.display = 'none';
                                                                             }}
                                                                         />
                                                                     ) : (
                                                                         <PlayCircle className="w-8 h-8 text-slate-500 group-hover/card:text-violet-400 transition-colors" />
                                                                     )}

                                                                     {/* Duration badge */}
                                                                     {f.formatted_duration && (
                                                                         <span className="absolute bottom-1 right-1.5 text-[9px] font-semibold bg-black/80 text-white px-1.5 py-0.5 rounded">
                                                                             {f.formatted_duration}
                                                                         </span>
                                                                     )}

                                                                     {/* HLS badge */}
                                                                     {f.status === 'ready' && (
                                                                         <span className="absolute top-1 left-1.5 text-[8px] font-bold bg-emerald-600/90 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                                             <Sparkles className="w-2.5 h-2.5" /> HLS
                                                                         </span>
                                                                     )}

                                                                     {/* Selected indicator */}
                                                                     {isCurrent && (
                                                                         <div className="absolute inset-0 bg-violet-600/20 flex items-center justify-center backdrop-blur-[1px]">
                                                                             <Badge className="bg-violet-600 text-white font-bold text-[10px]">
                                                                                 VINCULADO
                                                                             </Badge>
                                                                         </div>
                                                                     )}
                                                                 </div>

                                                                 {/* Title & Metadata */}
                                                                 <p className="text-xs font-semibold truncate text-foreground group-hover/card:text-violet-600 dark:group-hover/card:text-violet-400 transition-colors" title={f.original_name}>
                                                                     {f.original_name || 'Vídeo sem título'}
                                                                 </p>

                                                                 <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground mt-1">
                                                                     <span>{f.formatted_size || formatBytes(f.size_bytes || 0)}</span>
                                                                     <span className="truncate max-w-[120px]">
                                                                         {f.linked_activity_id ? `Aula #${f.linked_activity_id}` : 'Disponível'}
                                                                     </span>
                                                                 </div>

                                                                 {/* Action CTA */}
                                                                 <Button
                                                                     type="button"
                                                                     size="sm"
                                                                     variant={isCurrent ? "secondary" : "outline"}
                                                                     className="w-full mt-2.5 h-7 text-xs font-semibold group-hover/card:bg-violet-600 group-hover/card:text-white group-hover/card:border-violet-600 transition-all"
                                                                 >
                                                                     {isCurrent ? 'Selecionado' : 'Usar este Vídeo'}
                                                                 </Button>
                                                             </div>
                                                         );
                                                     })}
                                                 </div>
                                             )}
                                         </div>
                                     </DialogContent>
                                 </Dialog>
                                 
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
                                      <Input 
                                        className="h-9 bg-background border-2" 
                                        {...control.register(`modulos.${index}.atividades.${aIdx}.arquivo_url`)}
                                        onChange={(e) => control.register(`modulos.${index}.atividades.${aIdx}.arquivo_url`).onChange(e)} 
                                        placeholder="https://..." 
                                      />
                                  </div>
                              </div>
                          )}
                    </div>
                </div>
               )}
              </div>
            )}
         </div>
     );
   }
