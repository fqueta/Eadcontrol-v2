import { useState, useEffect, useCallback, useRef } from 'react';
import { Film, Search, RefreshCw, Trash2, Link2, Play, Copy, Download, Shield, Loader2, BarChart3, HardDrive, AlertCircle, CheckCircle2, Clock, ScanSearch, ExternalLink, Settings2, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { integrationsService } from '@/services/integrationsService';
import { CustomVideoPlayer } from '@/components/common/CustomVideoPlayer';
import type { MediaFile, MediaStats } from '@/types/media';

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: MediaFile['status'] }) {
  const map: Record<string, { label: string; cls: string }> = {
    uploaded:   { label: 'Enviado',       cls: 'bg-slate-800 text-slate-300 border-slate-700' },
    processing: { label: 'Processando…',  cls: 'bg-amber-950 text-amber-300 border-amber-700' },
    ready:      { label: 'Pronto HLS',    cls: 'bg-emerald-950 text-emerald-300 border-emerald-700' },
    failed:     { label: 'Falhou',        cls: 'bg-red-950 text-red-300 border-red-700' },
  };
  const s = map[status] ?? map.uploaded;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>
      {status === 'processing' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
      {status === 'ready' && <CheckCircle2 className="w-2.5 h-2.5" />}
      {status === 'failed' && <AlertCircle className="w-2.5 h-2.5" />}
      {s.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border bg-card p-5 flex items-start gap-4 ${color}`}>
      <div className="p-2 rounded-lg bg-white/5">
        <Icon className="w-5 h-5 opacity-70" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-2xl font-bold leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function MediaLibrary() {
  const { toast } = useToast();

  // State
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [stats, setStats] = useState<MediaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orphansOnly, setOrphansOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Dialogs
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaFile | null>(null);
  const [shareTarget, setShareTarget] = useState<MediaFile | null>(null);
  const [shareResult, setShareResult] = useState<{ watch_url: string; expires_at: string } | null>(null);
  const [shareHours, setShareHours] = useState(4);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load data
  const loadData = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const [filesRes, statsRes] = await Promise.all([
        integrationsService.listMediaFiles({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          orphans: orphansOnly || undefined,
          search: search || undefined,
          page: p,
          per_page: 16,
        }),
        integrationsService.getMediaStats(),
      ]);
      setFiles(filesRes.data);
      setMeta(filesRes.meta);
      setStats(statsRes);
      setPage(p);
    } catch {
      toast({ title: 'Erro ao carregar a Mediateca', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, orphansOnly, search]);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  // Debounce search
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => loadData(1), 400);
  };

  // Scan R2
  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await integrationsService.scanR2();
      toast({
        title: `Varredura concluída!`,
        description: `${res.imported} vídeo(s) novo(s) importado(s), ${res.skipped} já registrado(s).`,
      });
      loadData(1);
    } catch {
      toast({ title: 'Erro na varredura do armazenamento', variant: 'destructive' });
    } finally {
      setScanning(false);
    }
  };

  // Delete single
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await integrationsService.deleteMediaFile(deleteTarget.id);
      toast({ title: 'Vídeo excluído do armazenamento' });
      setDeleteTarget(null);
      setSelected(prev => { prev.delete(deleteTarget.id); return new Set(prev); });
      loadData(page);
    } catch {
      toast({ title: 'Erro ao excluir vídeo', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    let deleted = 0;
    for (const id of selected) {
      try {
        await integrationsService.deleteMediaFile(id);
        deleted++;
      } catch {}
    }
    toast({ title: `${deleted} vídeo(s) excluído(s)` });
    setSelected(new Set());
    setConfirmBulkDelete(false);
    setBulkDeleting(false);
    loadData(1);
  };

  // Toggle allow_download
  const handleToggleDownload = async (f: MediaFile) => {
    try {
      await integrationsService.updateMediaFile(f.id, { allow_download: !f.allow_download });
      setFiles(prev => prev.map(item => item.id === f.id ? { ...item, allow_download: !item.allow_download } : item));
    } catch {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  };

  // Copy link
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'URL copiada!' });
  };

  // Share token
  const handleGenerateShare = async () => {
    if (!shareTarget) return;
    setSharingLoading(true);
    try {
      const res = await integrationsService.generateShareToken(shareTarget.id, { expires_hours: shareHours });
      setShareResult({ watch_url: res.watch_url, expires_at: res.expires_at });
    } catch {
      toast({ title: 'Erro ao gerar link protegido', variant: 'destructive' });
    } finally {
      setSharingLoading(false);
    }
  };

  // Download
  const handleDownload = async (f: MediaFile) => {
    try {
      const res = await integrationsService.requestDownload(f.id);
      const a = document.createElement('a');
      a.href = res.download_url;
      a.download = res.filename;
      a.click();
    } catch {
      toast({ title: 'Erro ao gerar link de download', variant: 'destructive' });
    }
  };

  // HLS Optimization
  const [optimizingIds, setOptimizingIds] = useState<Set<number>>(new Set());

  const handleTranscodeHls = async (f: MediaFile) => {
    const targetPath = f.storage_path || f.public_url;
    if (!targetPath) {
      toast({ title: 'Caminho do arquivo não localizado', variant: 'destructive' });
      return;
    }

    setOptimizingIds(prev => new Set(prev).add(f.id));
    // Otimisticamente atualiza status do item para 'processing'
    setFiles(prev => prev.map(item => item.id === f.id ? { ...item, status: 'processing' } : item));

    try {
      await integrationsService.requestVideoTranscode({
        path: targetPath,
        media_file_id: f.id,
      });

      toast({
        title: 'Otimização HLS iniciada!',
        description: `O vídeo "${f.original_name}" está sendo fatiado em segundo plano para streaming instantâneo.`,
      });

      // Polling para checar quando ficar 'ready'
      let attempts = 0;
      const maxAttempts = 35;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const st = await integrationsService.checkTranscodeStatus(targetPath);
          if (st?.status === 'ready') {
            clearInterval(interval);
            setOptimizingIds(prev => {
              const next = new Set(prev);
              next.delete(f.id);
              return next;
            });
            loadData(page);
            toast({
              title: 'HLS Pronto!',
              description: `"${f.original_name}" agora reproduz instantaneamente com qualidade adaptativa.`,
            });
          } else if (st?.status === 'failed' || attempts >= maxAttempts) {
            clearInterval(interval);
            setOptimizingIds(prev => {
              const next = new Set(prev);
              next.delete(f.id);
              return next;
            });
            loadData(page);
          }
        } catch {
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            setOptimizingIds(prev => {
              const next = new Set(prev);
              next.delete(f.id);
              return next;
            });
          }
        }
      }, 3000);

    } catch (err: any) {
      toast({
        title: 'Erro ao disparar otimização HLS',
        description: err?.message || 'Falha ao solicitar processamento.',
        variant: 'destructive',
      });
      setOptimizingIds(prev => {
        const next = new Set(prev);
        next.delete(f.id);
        return next;
      });
      loadData(page);
    }
  };

  // Select toggle
  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalPages = meta?.last_page ?? 1;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Film className="w-6 h-6 text-violet-400" />
            Mediateca
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Biblioteca de vídeos — gerencie uploads, streaming HLS e proteção de conteúdo.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setConfirmBulkDelete(true)}>
              <Trash2 className="w-4 h-4 mr-1.5" />
              Excluir {selected.size} selecionado(s)
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => loadData(page)} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleScan} disabled={scanning}>
            {scanning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ScanSearch className="w-4 h-4 mr-1.5" />}
            {scanning ? 'Varrendo…' : 'Varrer Armazenamento'}
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Film} label="Total de Vídeos" value={stats.total} sub={stats.total_size} color="border-violet-900/40" />
          <StatCard icon={CheckCircle2} label="Prontos (HLS)" value={stats.ready} sub={`${stats.linked} em uso`} color="border-emerald-900/40" />
          <StatCard icon={AlertCircle} label="Vídeos Órfãos" value={stats.orphans} sub={stats.orphan_size} color="border-amber-900/40" />
          <StatCard icon={HardDrive} label="Processando" value={stats.processing} sub={`${stats.failed} com falha`} color="border-blue-900/40" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="media-search"
            placeholder="Buscar por nome do arquivo…"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); loadData(1); }}>
          <SelectTrigger id="status-filter" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ready">Pronto HLS</SelectItem>
            <SelectItem value="processing">Processando</SelectItem>
            <SelectItem value="uploaded">Enviado</SelectItem>
            <SelectItem value="failed">Falhou</SelectItem>
          </SelectContent>
        </Select>

        <label className="flex items-center gap-2 cursor-pointer px-3 h-9 rounded-md border bg-card text-sm shrink-0">
          <Switch
            id="orphans-filter"
            checked={orphansOnly}
            onCheckedChange={v => { setOrphansOnly(v); loadData(1); }}
            className="scale-90"
          />
          Só órfãos
        </label>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
          <Film className="w-12 h-12 opacity-30" />
          <p className="text-sm">Nenhum vídeo encontrado.</p>
          <Button variant="outline" size="sm" onClick={handleScan} disabled={scanning}>
            <ScanSearch className="w-4 h-4 mr-1.5" />
            Varrer armazenamento para importar vídeos existentes
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {files.map(f => (
            <MediaCard
              key={f.id}
              file={f}
              isSelected={selected.has(f.id)}
              isOptimizing={optimizingIds.has(f.id)}
              onToggleSelect={() => toggleSelect(f.id)}
              onPreview={() => setPreviewFile(f)}
              onDelete={() => setDeleteTarget(f)}
              onShare={() => { setShareTarget(f); setShareResult(null); }}
              onCopyUrl={() => handleCopyUrl(f.effective_stream_url || f.hls_url || f.public_url || '')}
              onToggleDownload={() => handleToggleDownload(f)}
              onDownload={() => handleDownload(f)}
              onTranscodeHls={() => handleTranscodeHls(f)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => loadData(page - 1)}>Anterior</Button>
          <span className="flex items-center text-sm text-muted-foreground px-2">
            {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => loadData(page + 1)}>Próxima</Button>
        </div>
      )}

      {/* ── Preview Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!previewFile} onOpenChange={open => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-4 pb-2.5 flex flex-row items-center justify-between border-b bg-card">
            <div className="flex items-center gap-2.5 min-w-0 pr-4">
              <Film className="w-5 h-5 shrink-0 text-violet-400" />
              <div className="min-w-0">
                <DialogTitle className="text-base truncate">
                  {previewFile?.original_name ?? 'Vídeo'}
                </DialogTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {previewFile?.formatted_duration && <span>{previewFile.formatted_duration}</span>}
                  {previewFile?.formatted_size && <span>• {previewFile.formatted_size}</span>}
                  {previewFile?.status === 'ready' && (
                    <span className="text-emerald-500 font-semibold flex items-center gap-1">
                      • <Sparkles className="w-3 h-3" /> HLS Adaptativo Ativo
                    </span>
                  )}
                </div>
              </div>
            </div>

            {previewFile && previewFile.status !== 'ready' && (
              <Button
                size="sm"
                variant="outline"
                disabled={optimizingIds.has(previewFile.id) || previewFile.status === 'processing'}
                onClick={async () => {
                  await handleTranscodeHls(previewFile);
                }}
                className="h-8 text-xs font-semibold text-amber-500 border-amber-500/40 hover:bg-amber-500/10 shrink-0"
              >
                {optimizingIds.has(previewFile.id) || previewFile.status === 'processing' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Processando HLS...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Otimizar para HLS
                  </>
                )}
              </Button>
            )}
          </DialogHeader>
          {previewFile && (
            <CustomVideoPlayer
              src={previewFile.effective_stream_url || previewFile.hls_url || previewFile.public_url || ''}
              poster={previewFile.thumbnail_url}
              className="w-full rounded-b-xl"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ──────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Excluir vídeo permanentemente?</DialogTitle>
            <DialogDescription>
              O arquivo <strong className="text-foreground">{deleteTarget?.original_name}</strong> será excluído
              do armazenamento Ead Control (R2) — <strong>incluindo a pasta HLS</strong>. Esta ação é irreversível.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deletingId === deleteTarget?.id}>
              {deletingId === deleteTarget?.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Delete Confirm ────────────────────────────────────────── */}
      <Dialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Excluir {selected.size} vídeos?</DialogTitle>
            <DialogDescription>
              Todos os arquivos selecionados serão removidos permanentemente do armazenamento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmBulkDelete(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Share Dialog ───────────────────────────────────────────────── */}
      <Dialog open={!!shareTarget} onOpenChange={open => !open && setShareTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-violet-400" />
              Gerar Link Protegido
            </DialogTitle>
            <DialogDescription>
              Crie um link de reprodução seguro com expiração — protegido por token HMAC, sem expor a URL do R2.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="share-hours">Expiração do link</Label>
              <Select value={String(shareHours)} onValueChange={v => setShareHours(Number(v))}>
                <SelectTrigger id="share-hours" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hora</SelectItem>
                  <SelectItem value="4">4 horas</SelectItem>
                  <SelectItem value="24">24 horas</SelectItem>
                  <SelectItem value="168">7 dias</SelectItem>
                  <SelectItem value="720">30 dias</SelectItem>
                  <SelectItem value="0">Sem expiração</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {shareResult ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input id="share-url" value={shareResult.watch_url} readOnly className="text-xs font-mono" />
                  <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(shareResult.watch_url); toast({ title: 'Copiado!' }); }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Expira em: {shareResult.expires_at || 'Nunca'}
                </p>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href={shareResult.watch_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-1.5" /> Testar link
                  </a>
                </Button>
              </div>
            ) : (
              <Button className="w-full" onClick={handleGenerateShare} disabled={sharingLoading}>
                {sharingLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Shield className="w-4 h-4 mr-1.5" />}
                Gerar Link Protegido
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Media Card ─────────────────────────────────────────────────────────────────

interface MediaCardProps {
  file: MediaFile;
  isSelected: boolean;
  isOptimizing?: boolean;
  onToggleSelect: () => void;
  onPreview: () => void;
  onDelete: () => void;
  onShare: () => void;
  onCopyUrl: () => void;
  onToggleDownload: () => void;
  onDownload: () => void;
  onTranscodeHls: () => void;
}

function MediaCard({ file, isSelected, isOptimizing, onToggleSelect, onPreview, onDelete, onShare, onCopyUrl, onToggleDownload, onDownload, onTranscodeHls }: MediaCardProps) {
  return (
    <div
      className={`group relative flex flex-col rounded-xl border bg-card overflow-hidden transition-all hover:border-violet-700/50 hover:shadow-lg hover:shadow-violet-950/20 ${isSelected ? 'border-violet-500 ring-1 ring-violet-500/50' : 'border-border'}`}
    >
      {/* Thumbnail */}
      <div
        className="relative aspect-video bg-slate-900 cursor-pointer overflow-hidden"
        onClick={onPreview}
      >
        {file.thumbnail_url ? (
          <img src={file.thumbnail_url} alt={file.original_name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Film className="w-10 h-10 text-slate-700" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 text-slate-900 ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Status badges overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {file.is_orphan && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-amber-950">ÓRFÃO</span>
          )}
          {file.status === 'ready' && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-600/90 text-white flex items-center gap-1 backdrop-blur-sm">
              <Sparkles className="w-2.5 h-2.5" /> HLS
            </span>
          )}
        </div>

        {/* Select checkbox */}
        <button
          onClick={e => { e.stopPropagation(); onToggleSelect(); }}
          className={`absolute top-2 right-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-violet-500 border-violet-500' : 'border-white/50 bg-black/30 opacity-0 group-hover:opacity-100'}`}
        >
          {isSelected && <X className="w-3 h-3 text-white" />}
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-1.5 p-3 flex-1">
        <p className="text-sm font-medium leading-tight line-clamp-2 break-all" title={file.original_name}>
          {file.original_name ?? '—'}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={file.status} />
          {file.formatted_size && (
            <span className="text-[10px] text-muted-foreground">{file.formatted_size}</span>
          )}
          {file.formatted_duration && file.formatted_duration !== '--:--' && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />{file.formatted_duration}
            </span>
          )}
        </div>

        {/* Download toggle */}
        <label className="flex items-center gap-1.5 cursor-pointer mt-auto pt-2 border-t border-border">
          <Switch
            id={`dl-${file.id}`}
            checked={!!file.allow_download}
            onCheckedChange={onToggleDownload}
            className="scale-75"
          />
          <span className="text-[10px] text-muted-foreground">Download liberado</span>
          {(file.download_count ?? 0) > 0 && (
            <span className="ml-auto text-[9px] text-muted-foreground">{file.download_count}×</span>
          )}
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 p-2 pt-0">
        <Button id={`btn-preview-${file.id}`} size="icon" variant="ghost" className="h-7 w-7" onClick={onPreview} title="Assistir Preview">
          <Play className="w-3.5 h-3.5" />
        </Button>

        {/* Botão de Otimização HLS */}
        {file.status !== 'ready' && (
          <Button
            id={`btn-hls-${file.id}`}
            size="icon"
            variant="ghost"
            disabled={isOptimizing || file.status === 'processing'}
            className="h-7 w-7 text-amber-500 hover:text-amber-400 hover:bg-amber-950/30"
            onClick={onTranscodeHls}
            title={file.status === 'processing' ? 'Processando HLS...' : 'Otimizar HLS (Streaming instantâneo estilo YouTube)'}
          >
            {isOptimizing || file.status === 'processing' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
          </Button>
        )}

        <Button id={`btn-share-${file.id}`} size="icon" variant="ghost" className="h-7 w-7" onClick={onShare} title="Gerar link protegido">
          <Shield className="w-3.5 h-3.5" />
        </Button>
        <Button id={`btn-copy-${file.id}`} size="icon" variant="ghost" className="h-7 w-7" onClick={onCopyUrl} title="Copiar URL">
          <Copy className="w-3.5 h-3.5" />
        </Button>
        {file.allow_download && (
          <Button id={`btn-dl-${file.id}`} size="icon" variant="ghost" className="h-7 w-7" onClick={onDownload} title="Download">
            <Download className="w-3.5 h-3.5" />
          </Button>
        )}
        <Button
          id={`btn-del-${file.id}`}
          size="icon"
          variant="ghost"
          className="h-7 w-7 ml-auto text-red-500/70 hover:text-red-400 hover:bg-red-950/30"
          onClick={onDelete}
          title="Excluir"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
