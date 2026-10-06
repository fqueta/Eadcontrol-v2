import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CloudUpload, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { coursesService } from '@/services/coursesService';
import { useToast } from '@/hooks/use-toast';

interface MigrationItem {
  activity_id: number;
  title: string;
  vimeo_id: string;
  status: string;
  detail?: string | null;
}

interface MigrationStatus {
  course_id: number;
  total_vimeo: number;
  summary: Record<string, number>;
  items: MigrationItem[];
}

const ACTIVE_STATES = ['queued', 'pending', 'downloading', 'uploading', 'transcoding'];

const STATUS_LABELS: Record<string, string> = {
  queued: 'Na fila',
  pending: 'Pendente',
  downloading: 'Baixando do Vimeo',
  uploading: 'Enviando ao R2',
  transcoding: 'Otimizando HLS',
  ready: 'Pronto (HLS)',
  failed: 'Falhou',
  skipped_ready: 'Já tinha HLS',
};

/**
 * VimeoMigrationButton
 * pt-BR: Botão + progresso da migração em lote dos vídeos do Vimeo do curso
 *        para o Cloudflare R2 (com HLS). Exibido no cabeçalho da aba de conteúdo.
 * en-US: Button + progress for bulk migration of course Vimeo videos to
 *        Cloudflare R2 (with HLS). Shown in the content tab header.
 */
export function VimeoMigrationButton({ courseId }: { courseId?: number }) {
  const { toast } = useToast();
  const [starting, setStarting] = useState(false);
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [force, setForce] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => stopPolling, []);

  const fetchStatus = async (cid: number): Promise<MigrationStatus | null> => {
    try {
      const data = await coursesService.vimeoMigrationStatus(cid);
      setStatus(data);
      return data;
    } catch {
      return null;
    }
  };

  const startPolling = (cid: number) => {
    stopPolling();
    pollCountRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      const data = await fetchStatus(cid);
      const summary = data?.summary || {};
      const active = ACTIVE_STATES.reduce((acc, s) => acc + Number(summary[s] || 0), 0);
      if (active === 0 || pollCountRef.current >= 240) {
        stopPolling();
        if (active === 0 && data && data.total_vimeo > 0) {
          const ready = Number(summary.ready || 0) + Number(summary.skipped_ready || 0);
          const failed = Number(summary.failed || 0);
          toast({
            title: 'Migração do Vimeo concluída',
            description: `${ready} vídeo(s) com HLS${failed > 0 ? `, ${failed} com falha (ver detalhes)` : ''}.`,
          });
        }
      }
    }, 5000);
  };

  const handleMigrate = async () => {
    if (!courseId) return;
    const ok = window.confirm(
      'Migrar os vídeos do Vimeo deste curso para o armazenamento Ead Control (R2 com HLS)? O processo roda em segundo plano e pode levar algum tempo.'
    );
    if (!ok) return;

    setStarting(true);
    try {
      const res: any = await coursesService.migrateVimeoVideos(courseId, force);
      toast({
        title: 'Migração iniciada!',
        description: res?.message || `${res?.dispatched ?? 0} vídeo(s) enfileirados para migração.`,
      });
      await fetchStatus(courseId);
      startPolling(courseId);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Falha ao iniciar a migração. Verifique a integração do Vimeo.';
      toast({ title: 'Erro na migração', description: String(msg), variant: 'destructive' });
    } finally {
      setStarting(false);
    }
  };

  if (!courseId) return null;

  const summary = status?.summary || {};
  const total = status?.total_vimeo || 0;
  const done = Number(summary.ready || 0) + Number(summary.skipped_ready || 0);
  const failed = Number(summary.failed || 0);
  const active = ACTIVE_STATES.reduce((acc, s) => acc + Number(summary[s] || 0), 0);
  const progress = total > 0 ? Math.round(((done + failed) / total) * 100) : 0;
  const failedItems = (status?.items || []).filter((i) => i.status === 'failed');

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleMigrate}
          disabled={starting}
          className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:text-blue-800 font-semibold"
          title="Baixa os vídeos do Vimeo, envia ao R2 e gera HLS automaticamente"
        >
          {starting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CloudUpload className="h-4 w-4 mr-2" />}
          Migrar vídeos do Vimeo
        </Button>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={force}
            onChange={(e) => setForce(e.target.checked)}
            className="h-3.5 w-3.5 accent-blue-600"
          />
          Migrar novamente os que já têm HLS
        </label>
        {status && total > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => courseId && fetchStatus(courseId)}
            className="h-7 text-xs text-muted-foreground"
            title="Atualizar progresso"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Atualizar
          </Button>
        )}
      </div>

      {status && total > 0 && (
        <div className="rounded-xl border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-900/50 p-3 space-y-2 min-w-[280px]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-blue-900 dark:text-blue-200">
              Migração Vimeo → Ead Control: {done}/{total} prontos
              {active > 0 && <span className="ml-1 font-medium text-blue-700 dark:text-blue-300">({active} em andamento...)</span>}
            </span>
            <span className="font-mono font-bold text-blue-800 dark:text-blue-300">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {Object.entries(summary)
              .filter(([, v]) => Number(v) > 0)
              .map(([k, v]) => (
                <span key={k} className="flex items-center gap-1">
                  {k === 'ready' || k === 'skipped_ready' ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  ) : k === 'failed' ? (
                    <AlertCircle className="h-3 w-3 text-red-600" />
                  ) : (
                    <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                  )}
                  {STATUS_LABELS[k] || k}: <strong>{Number(v)}</strong>
                </span>
              ))}
          </div>
          {failedItems.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowDetails((s) => !s)}
                className="text-[11px] font-bold text-red-700 dark:text-red-400 underline"
              >
                {showDetails ? 'Ocultar falhas' : `Ver ${failedItems.length} falha(s)`}
              </button>
              {showDetails && (
                <ul className="mt-1.5 space-y-1 max-h-40 overflow-y-auto text-[11px]">
                  {failedItems.map((f) => (
                    <li key={f.activity_id} className="rounded bg-white/70 dark:bg-slate-900/60 border border-red-200 dark:border-red-900 p-1.5">
                      <span className="font-semibold">{f.title || `Atividade #${f.activity_id}`}</span>
                      <span className="text-muted-foreground"> (vimeo:{f.vimeo_id})</span>
                      {f.detail && <p className="text-red-700 dark:text-red-400 mt-0.5">{f.detail}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
