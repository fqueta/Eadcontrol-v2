import React, { useEffect, useState, useRef } from 'react';
import { getTenantApiUrl, getVersionApi } from '@/lib/qlib';
import { getAppVersion } from '@/lib/branding';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VersionCheckerProps {
  /**
   * Intervalo em milissegundos para verificar nova versão.
   * Padrão: 4 minutos (240.000 ms).
   */
  checkIntervalMs?: number;
}

/**
 * VersionChecker
 * Monitora em segundo plano se a versão salva no backend mudou em relação à versão
 * que o usuário está executando localmente no SPA.
 * Quando detecta uma mudança, exibe um banner/toast fixo para o usuário atualizar.
 */
export const VersionChecker: React.FC<VersionCheckerProps> = ({
  checkIntervalMs = 240000,
}) => {
  // Versão inicial gravada quando a sessão do SPA abriu
  const currentLocalVersionRef = useRef<string>(getAppVersion('1.0.0'));
  const [newVersionAvailable, setNewVersionAvailable] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Função para buscar versão remota na API pública de branding
  const checkForNewVersion = async () => {
    try {
      const base = getTenantApiUrl() + getVersionApi();
      const publicUrl = `${base}/public/options/branding?_t=${Date.now()}`;
      
      const res = await fetch(publicUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
      });

      if (!res.ok) return;

      const json = await res.json();
      const serverVersion = String(json?.data?.app_version || '').trim();

      if (serverVersion && serverVersion !== currentLocalVersionRef.current) {
        // Nova versão detectada!
        setNewVersionAvailable(serverVersion);
      }
    } catch {
      // Falha silenciosa para não atrapalhar o usuário em caso de oscilação de rede
    }
  };

  useEffect(() => {
    // Primeira checagem após 15 segundos da inicialização
    const initialTimer = setTimeout(() => {
      checkForNewVersion();
    }, 15000);

    // Polling regular
    const intervalTimer = setInterval(() => {
      checkForNewVersion();
    }, checkIntervalMs);

    // Checar também quando o usuário retorna à aba do navegador
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForNewVersion();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [checkIntervalMs]);

  const handleReload = () => {
    setIsUpdating(true);
    if (newVersionAvailable) {
      try {
        localStorage.setItem('app_version', newVersionAvailable);
      } catch {}
    }
    // Força recarga limpando cache se possível
    window.location.reload();
  };

  if (!newVersionAvailable || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-[99999] max-w-md animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-slate-900/95 dark:bg-slate-900/95 text-white p-4 rounded-2xl shadow-2xl border border-indigo-500/40 backdrop-blur-lg flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-indigo-400">
            <Sparkles className="h-5 w-5 animate-pulse" />
            <span className="font-bold text-sm tracking-wide text-white">Nova Versão Disponível</span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
            title="Fechar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Uma atualização do sistema (<strong className="text-indigo-300 font-mono">v{newVersionAvailable}</strong>) foi publicada.
          Atualize para carregar as novas funcionalidades e melhorias.
        </p>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="text-xs text-slate-400 hover:text-white hover:bg-slate-800 h-8 px-3 rounded-lg"
          >
            Mais tarde
          </Button>
          <Button
            size="sm"
            onClick={handleReload}
            disabled={isUpdating}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-8 px-4 rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-600/30"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            {isUpdating ? 'Atualizando…' : 'Atualizar Agora'}
          </Button>
        </div>
      </div>
    </div>
  );
};
export default VersionChecker;
