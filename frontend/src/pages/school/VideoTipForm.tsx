import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, Play, Youtube, Video, Link2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  videoTipsService,
  extractVideoMeta,
  VideoTipCreateInput,
  VideoTip,
} from '@/services/videoTipsService';

interface Props {
  mode: 'create' | 'edit';
}

/**
 * VideoTipForm
 * pt-BR: Formulário de criação e edição de vídeo/dica da escola.
 *        Detecta automaticamente o provider (YouTube/Vimeo) e extrai
 *        thumbnail e embed_url ao colar a URL do vídeo.
 * en-US: Create/edit form for school video tips.
 *        Automatically detects provider (YouTube/Vimeo) and extracts
 *        thumbnail and embed_url when the video URL is pasted.
 */
export default function VideoTipForm({ mode }: Props) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Form state ────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [menuOrder, setMenuOrder] = useState(0);
  const [published, setPublished] = useState(false);
  const [category, setCategory] = useState('');
  const [preview, setPreview] = useState<{ thumbnail: string | null; embed_url: string; provider: string } | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  // ── Carregar dados (modo edição) ─────────────────────────────
  const { data: existingPost, isLoading: loadingEdit } = useQuery<VideoTip>({
    queryKey: ['video-tip-edit', id],
    queryFn: async () => {
      const raw = await videoTipsService.adminList({ per_page: 100 });
      const items: any[] = raw?.data ?? raw?.items ?? [];
      const found = items.find((p: any) => String(p.ID ?? p.id) === String(id));
      return found;
    },
    enabled: mode === 'edit' && !!id,
    staleTime: 0,
  });

  useEffect(() => {
    if (mode === 'edit' && existingPost) {
      setTitle(existingPost.post_title ?? existingPost.title ?? '');
      setDescription(existingPost.post_content ?? existingPost.description ?? '');
      setExcerpt(existingPost.post_excerpt ?? existingPost.excerpt ?? '');
      setMenuOrder(existingPost.menu_order ?? 0);
      setPublished((existingPost.post_status ?? 'draft') === 'publish');
      const cfg = (existingPost.config ?? {}) as any;
      const url = cfg.video_url ?? existingPost.video_url ?? '';
      setCategory(cfg.category ?? '');
      setVideoUrl(url);
      if (url) {
        const meta = extractVideoMeta(url);
        setPreview({ thumbnail: meta.thumbnail, embed_url: meta.embed_url, provider: meta.provider });
      }
    }
  }, [existingPost, mode]);

  // ── Extração automática ao digitar URL ───────────────────────
  const handleUrlChange = useCallback((value: string) => {
    setVideoUrl(value);
    setShowPlayer(false);
    if (!value.trim()) { setPreview(null); return; }
    try {
      const meta = extractVideoMeta(value);
      setPreview({ thumbnail: meta.thumbnail, embed_url: meta.embed_url, provider: meta.provider });
    } catch {
      setPreview(null);
    }
  }, []);

  // ── Mutações ──────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: VideoTipCreateInput) => videoTipsService.adminCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'video-tips'] });
      toast({ title: 'Vídeo criado com sucesso!' });
      navigate('/admin/school/video-tips');
    },
    onError: () => toast({ title: 'Erro ao criar vídeo.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: VideoTipCreateInput) =>
      videoTipsService.adminUpdate(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'video-tips'] });
      queryClient.invalidateQueries({ queryKey: ['video-tip-edit', id] });
      toast({ title: 'Vídeo atualizado com sucesso!' });
      navigate('/admin/school/video-tips');
    },
    onError: () => toast({ title: 'Erro ao atualizar vídeo.', variant: 'destructive' }),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Submit ────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: 'O título é obrigatório.', variant: 'destructive' });
      return;
    }
    if (!videoUrl.trim()) {
      toast({ title: 'Informe a URL do vídeo.', variant: 'destructive' });
      return;
    }
    const meta = extractVideoMeta(videoUrl);
    const payload: VideoTipCreateInput = {
      post_title: title.trim(),
      post_content: description.trim() || undefined,
      post_excerpt: excerpt.trim() || undefined,
      post_status: published ? 'publish' : 'draft',
      post_type: 'video_tip',
      menu_order: menuOrder,
      config: {
        ...meta,
        category: category.trim() || undefined
      },
    };
    if (mode === 'create') createMutation.mutate(payload);
    else updateMutation.mutate(payload);
  }

  if (mode === 'edit' && loadingEdit) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 w-full">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/school/video-tips')}
          id="btn-voltar-video"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">
            {mode === 'create' ? 'Novo Vídeo / Dica' : 'Editar Vídeo'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Cole a URL do YouTube ou Vimeo — o preview é gerado automaticamente.
          </p>
        </div>
        <div className="ml-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open('/aluno', '_blank')}
            className="gap-2"
            id="btn-visao-aluno-form"
          >
            <Eye className="w-4 h-4" />
            Visão do Aluno
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Coluna principal ── */}
        <div className="lg:col-span-3 space-y-5">
          {/* URL do vídeo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="w-4 h-4 text-violet-500" />
                URL do Vídeo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="input-video-url">Link do YouTube ou Vimeo *</Label>
                <Input
                  id="input-video-url"
                  placeholder="https://youtu.be/... ou https://vimeo.com/..."
                  value={videoUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              {/* Preview automático */}
              {preview && (
                <div className="rounded-lg overflow-hidden border bg-slate-50 dark:bg-slate-800/50">
                  {!showPlayer ? (
                    <div className="relative aspect-video cursor-pointer group" onClick={() => setShowPlayer(true)}>
                      {preview.thumbnail ? (
                        <img
                          src={preview.thumbnail}
                          alt="Thumbnail"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-700 aspect-video">
                          <Video className="w-12 h-12 text-slate-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                        <span className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <Play className="w-6 h-6 text-slate-800 ml-0.5" />
                        </span>
                      </div>
                      <span className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 rounded px-2 py-0.5 text-xs font-medium">
                        {preview.provider === 'youtube'
                          ? <><Youtube className="w-3.5 h-3.5 text-red-500" /> YouTube</>
                          : preview.provider === 'vimeo'
                            ? <><Play className="w-3.5 h-3.5 text-blue-400" /> Vimeo</>
                            : <><Video className="w-3.5 h-3.5" /> Vídeo</>
                        }
                      </span>
                    </div>
                  ) : (
                    <div className="relative aspect-video">
                      <iframe
                        src={preview.embed_url}
                        title="Preview"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground px-3 py-2">
                    {showPlayer ? 'Clique em outro campo para fechar o player.' : 'Clique no thumbnail para testar o vídeo.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Título e descrição */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informações do Vídeo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="input-titulo">Título *</Label>
                <Input
                  id="input-titulo"
                  placeholder="Ex: 5 dicas para aprender mais rápido"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={255}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="input-resumo">Resumo (subtítulo)</Label>
                <Input
                  id="input-resumo"
                  placeholder="Breve descrição exibida no card"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  maxLength={255}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="input-descricao">Descrição completa</Label>
                <Textarea
                  id="input-descricao"
                  placeholder="Detalhes sobre o vídeo, links adicionais, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Coluna lateral ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Publicação */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Publicação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="switch-published" className="cursor-pointer">
                    {published ? 'Publicado' : 'Rascunho'}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {published
                      ? 'Visível para todos os alunos'
                      : 'Apenas visível para administradores'}
                  </p>
                </div>
                <Switch
                  id="switch-published"
                  checked={published}
                  onCheckedChange={setPublished}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="input-ordem">Ordem de exibição</Label>
                <Input
                  id="input-ordem"
                  type="number"
                  min={0}
                  value={menuOrder}
                  onChange={(e) => setMenuOrder(Number(e.target.value))}
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground">Vídeos com menor número aparecem primeiro.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="input-categoria">Categoria</Label>
                <Input
                  id="input-categoria"
                  placeholder="Ex: Tutorial, Dica, Boas-vindas"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">Use categorias para agrupar vídeos para os alunos.</p>
              </div>
            </CardContent>
          </Card>

          {/* Botões de ação */}
          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              disabled={isSaving}
              id="btn-salvar-video"
              className="w-full gap-2"
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
              ) : (
                <><Save className="w-4 h-4" /> {mode === 'create' ? 'Criar vídeo' : 'Salvar alterações'}</>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate('/admin/school/video-tips')}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
