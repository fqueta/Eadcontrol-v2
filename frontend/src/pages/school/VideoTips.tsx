import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Play, Plus, Pencil, Trash2, Eye, EyeOff,
  Video, Search, RefreshCw, Youtube, ExternalLink,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { videoTipsService, VideoTip } from '@/services/videoTipsService';
import VideoTipModal from '@/components/school/VideoTipModal';

const QUERY_KEY = ['admin', 'video-tips'];

/**
 * VideoTips
 * pt-BR: Página de gerenciamento de vídeos/dicas no painel do administrador da escola.
 * en-US: Video tips management page in the school admin panel.
 */
export default function VideoTips() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'publish' | 'draft'>('all');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<VideoTip | null>(null);
  const [previewTip, setPreviewTip] = useState<VideoTip | null>(null);

  // ── Listagem ──────────────────────────────────────────────────
  const { data: resp, isLoading, refetch } = useQuery({
    queryKey: [...QUERY_KEY, page, statusFilter],
    queryFn: () =>
      videoTipsService.adminList({
        page,
        per_page: 12,
        ...(statusFilter !== 'all' ? { post_status: statusFilter } : {}),
      }),
    staleTime: 2 * 60 * 1000,
  });

  const rawItems: any[] = resp?.data ?? resp?.items ?? [];
  const tips: VideoTip[] = rawItems.map((p: any) => ({
    ...p,
    id: p.ID ?? p.id,
    title: p.post_title,
    description: p.post_content,
    excerpt: p.post_excerpt,
    video_url: p.config?.video_url ?? null,
    provider: p.config?.provider ?? null,
    video_id: p.config?.video_id ?? null,
    thumbnail: p.config?.thumbnail ?? null,
    embed_url: p.config?.embed_url ?? null,
  }));

  const filteredTips = search.trim()
    ? tips.filter((t) =>
        t.title?.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase())
      )
    : tips;

  const lastPage: number = resp?.last_page ?? 1;

  // ── Toggle status ─────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'publish' | 'draft' }) =>
      videoTipsService.adminToggleStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Status atualizado com sucesso.' });
    },
    onError: () => toast({ title: 'Erro ao atualizar status.', variant: 'destructive' }),
  });

  // ── Delete ────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) => videoTipsService.adminDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setDeleteTarget(null);
      toast({ title: 'Vídeo movido para a lixeira.' });
    },
    onError: () => toast({ title: 'Erro ao excluir.', variant: 'destructive' }),
  });

  const handleToggle = useCallback((tip: VideoTip) => {
    const status = tip.post_status ?? 'draft';
    toggleMutation.mutate({ id: tip.id, status: status as 'publish' | 'draft' });
  }, [toggleMutation]);

  // ── Helpers ───────────────────────────────────────────────────
  function getThumbnail(tip: VideoTip): string | null {
    return tip.thumbnail ?? (tip.config as any)?.thumbnail ?? null;
  }

  function getProviderIcon(tip: VideoTip) {
    const p = tip.provider ?? (tip.config as any)?.provider;
    if (p === 'youtube') return <Youtube className="w-4 h-4 text-red-500" />;
    if (p === 'vimeo') return <Play className="w-4 h-4 text-blue-400" />;
    return <Video className="w-4 h-4 text-slate-400" />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vídeos / Dicas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Publique vídeos do YouTube ou Vimeo como dicas para seus alunos.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            id="btn-visao-aluno"
            variant="outline"
            onClick={() => window.open('/aluno', '_blank')}
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            Visão do Aluno
          </Button>
          <Button
            id="btn-novo-video"
            onClick={() => navigate('/admin/school/video-tips/create')}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Vídeo
          </Button>
        </div>
      </div>

      {/* ── Filtros ── */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="input-busca-video"
                placeholder="Buscar por título ou descrição…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'publish', 'draft'] as const).map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  id={`btn-filter-${s}`}
                >
                  {s === 'all' ? 'Todos' : s === 'publish' ? 'Publicados' : 'Rascunhos'}
                </Button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => refetch()} title="Recarregar">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Grid de vídeos ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-44 bg-muted rounded-t-lg" />
              <CardContent className="pt-3 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTips.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Video className="w-12 h-12 text-muted-foreground/40" />
            <div>
              <p className="font-medium text-slate-700 dark:text-slate-300">Nenhum vídeo encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? 'Tente outros termos de busca.' : 'Clique em "Novo Vídeo" para adicionar o primeiro.'}
              </p>
            </div>
            {!search && (
              <Button onClick={() => navigate('/admin/school/video-tips/create')} size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> Adicionar vídeo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTips.map((tip) => {
            const thumb = getThumbnail(tip);
            const isPublished = (tip.post_status ?? 'draft') === 'publish';
            return (
              <Card
                key={tip.id}
                className="overflow-hidden hover:shadow-md transition-shadow group"
              >
                {/* Thumbnail */}
                <div className="relative h-44 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={tip.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-12 h-12 text-slate-300" />
                    </div>
                  )}
                  {/* Play overlay */}
                  <button
                    className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setPreviewTip(tip)}
                    title="Pré-visualizar"
                  >
                    <span className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 text-slate-800 ml-0.5" />
                    </span>
                  </button>
                  {/* Provider badge */}
                  <span className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded px-2 py-0.5 text-xs font-medium shadow-sm">
                    {getProviderIcon(tip)}
                    {(tip.provider ?? (tip.config as any)?.provider ?? 'vídeo')}
                  </span>
                  {/* Status badge */}
                  <span className={`absolute top-2 right-2 rounded px-2 py-0.5 text-xs font-medium shadow-sm ${isPublished ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'}`}>
                    {isPublished ? 'Publicado' : 'Rascunho'}
                  </span>
                </div>

                {/* Info */}
                <CardContent className="pt-3 pb-2 space-y-1">
                  <p className="font-semibold text-sm line-clamp-2 leading-snug" title={tip.title}>
                    {tip.title || '(sem título)'}
                  </p>
                  {tip.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {tip.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/60 pt-0.5">
                    Ordem: {tip.menu_order ?? 0} · {new Date(tip.created_at ?? '').toLocaleDateString('pt-BR')}
                  </p>
                </CardContent>

                {/* Actions */}
                <div className="px-4 pb-3 flex items-center gap-1 border-t pt-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Pré-visualizar"
                    onClick={() => setPreviewTip(tip)}
                    id={`btn-preview-${tip.id}`}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title={isPublished ? 'Despublicar' : 'Publicar'}
                    onClick={() => handleToggle(tip)}
                    id={`btn-toggle-${tip.id}`}
                  >
                    {isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Editar"
                    onClick={() => navigate(`/admin/school/video-tips/${tip.id}/edit`)}
                    id={`btn-edit-${tip.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  {tip.video_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Abrir no YouTube/Vimeo"
                      onClick={() => window.open(tip.video_url ?? '', '_blank')}
                      id={`btn-open-${tip.id}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive ml-auto"
                    title="Mover para lixeira"
                    onClick={() => setDeleteTarget(tip)}
                    id={`btn-delete-${tip.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Paginação ── */}
      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Página {page} de {lastPage}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= lastPage}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ── Confirm delete ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover para a lixeira?</AlertDialogTitle>
            <AlertDialogDescription>
              O vídeo "<strong>{deleteTarget?.title}</strong>" será movido para a lixeira.
              Você poderá restaurá-lo depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Preview modal ── */}
      {previewTip && (
        <VideoTipModal
          tip={previewTip}
          open={!!previewTip}
          onClose={() => setPreviewTip(null)}
        />
      )}
    </div>
  );
}
