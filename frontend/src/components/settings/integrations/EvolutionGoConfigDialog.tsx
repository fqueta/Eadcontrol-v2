import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  RotateCcw,
  Save,
  Smartphone,
  Zap,
} from 'lucide-react';
import { integrationsService } from '@/services/integrationsService';
import { useCreateApiCredential, useUpdateApiCredential } from '@/hooks/apiCredentials';
import { useToast } from '@/hooks/use-toast';
import { getTenantApiUrl } from '@/lib/qlib';
import { ApiCredential } from '@/types';

interface EvolutionGoConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCredential?: ApiCredential | null;
  onSaved?: () => void;
}

/**
 * EvolutionGoConfigDialog
 * pt-BR: Configuração do servidor Evolution GO (URL, API key global e prefixo
 *        das instâncias). As credenciais do tenant têm prioridade sobre o .env.
 */
export const EvolutionGoConfigDialog: React.FC<EvolutionGoConfigDialogProps> = ({
  open,
  onOpenChange,
  initialCredential,
  onSaved,
}) => {
  const { toast } = useToast();
  const createMutation = useCreateApiCredential();
  const updateMutation = useUpdateApiCredential();

  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [instancePrefix, setInstancePrefix] = useState('ead');
  const [webhookBaseUrl, setWebhookBaseUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [active, setActive] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * URL que o backend usa quando o campo de webhook está vazio: o host público
   * desta própria API (mesma origem usada pelo frontend nas chamadas).
   */
  const automaticWebhookBase = useMemo(() => {
    try {
      return getTenantApiUrl().replace(/\/api\/?$/, '');
    } catch {
      return '';
    }
  }, []);

  const effectiveWebhookBase =
    webhookBaseUrl.trim().replace(/\/+$/, '') || automaticWebhookBase;

  const webhookPreview = `${effectiveWebhookBase}/api/v1/whatsapp/webhook/{instancia}`;

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookPreview);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Endpoint copiado', description: webhookPreview });
    } catch {
      toast({
        title: 'Não foi possível copiar',
        description: 'Selecione o texto do endpoint manualmente.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!open) return;

    setTestResult(null);
    setCopied(false);

    const config = initialCredential?.config || {};

    setBaseUrl(config.base_url || '');
    setApiKey('');
    setInstancePrefix(config.instance_prefix || 'ead');
    setWebhookBaseUrl(config.webhook_base_url || '');
    setActive(initialCredential ? initialCredential.active !== false : true);
  }, [open, initialCredential]);

  const handleTest = async () => {
    if (!baseUrl.trim()) {
      toast({ title: 'Informe a URL do servidor', variant: 'destructive' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await integrationsService.testIntegration('evolution-go', {
        base_url: baseUrl.trim(),
        api_key: apiKey.trim(),
      });

      setTestResult({ success: !!result.success, message: result.message });

      toast({
        title: result.success ? 'Conexão OK' : 'Falha na conexão',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error: any) {
      const message = error?.message || 'Não foi possível testar o servidor Evolution GO.';
      setTestResult({ success: false, message });
      toast({ title: 'Falha na conexão', description: message, variant: 'destructive' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!baseUrl.trim()) {
      toast({ title: 'Informe a URL do servidor', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    try {
      const configObject: Record<string, any> = {
        ...(initialCredential?.config || {}),
        base_url: baseUrl.trim(),
        instance_prefix: instancePrefix.trim() || 'ead',
      };

      const trimmedWebhookBase = webhookBaseUrl.trim().replace(/\/+$/, '');
      if (trimmedWebhookBase) {
        configObject.webhook_base_url = trimmedWebhookBase;
      } else {
        delete configObject.webhook_base_url;
      }

      if (apiKey.trim()) {
        configObject.api_key = apiKey.trim();
      }

      if (initialCredential?.id) {
        await updateMutation.mutateAsync({
          id: initialCredential.id,
          data: {
            name: 'Evolution GO',
            active,
            config: configObject,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: 'Evolution GO',
          slug: 'evolution-go',
          active,
          config: configObject,
        });
      }

      toast({
        title: 'Configuração salva',
        description: 'A conexão WhatsApp já pode ser pareada.',
      });

      onSaved?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error?.message || 'Não foi possível salvar as credenciais.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[620px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Configurar Evolution GO</DialogTitle>
              <DialogDescription>
                Servidor responsável pelas conexões WhatsApp, QR Code e envio de mensagens.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Onde encontrar?</p>
            <p>
              Use a URL pública do seu servidor Evolution GO (ex.:{' '}
              <span className="font-mono">https://evolution.suaempresa.com</span>) e a API key global
              configurada no servidor. A chave fica criptografada no banco e é usada apenas no backend.
            </p>
          </div>
        </div>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
            <div>
              <Label className="text-sm font-semibold">Integração ativa</Label>
              <p className="text-xs text-muted-foreground">
                Desativa o uso do Evolution GO sem apagar as conexões existentes.
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="evolution-base-url">
              URL do servidor <span className="text-red-500">*</span>
            </Label>
            <Input
              id="evolution-base-url"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value.trim())}
              placeholder="https://evolution.suaempresa.com"
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Sem barra no final. O backend chama <span className="font-mono">/instance/create</span>,{' '}
              <span className="font-mono">/instance/connect</span> e <span className="font-mono">/send/text</span>.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="evolution-api-key">
              API key global {initialCredential ? '(preencha apenas para alterar)' : <span className="text-red-500">*</span>}
            </Label>
            <div className="relative">
              <Input
                id="evolution-api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value.trim())}
                placeholder={initialCredential ? '••••••••••••••••••••' : 'Chave global do servidor Evolution GO'}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey((previous) => !previous)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Usada para criar/excluir instâncias. Cada instância recebe um token próprio automaticamente.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="evolution-prefix">Prefixo das instâncias</Label>
            <Input
              id="evolution-prefix"
              value={instancePrefix}
              onChange={(event) => setInstancePrefix(event.target.value.trim())}
              placeholder="ead"
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Evita colisão de nomes quando o servidor é compartilhado entre tenants (ex.:{' '}
              <span className="font-mono">{instancePrefix || 'ead'}_eaddemo_a1b2c3</span>).
            </p>
          </div>

          <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <Label htmlFor="evolution-webhook-base-url" className="text-sm font-semibold">
                  URL base pública do webhook
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Endereço público onde o Evolution GO entrega as mensagens recebidas. Use a URL desta API
                  (ex.: <span className="font-mono">https://api.suaempresa.com</span>) ou um túnel de
                  desenvolvimento (<span className="font-mono">ngrok</span> /{' '}
                  <span className="font-mono">cloudflared</span>).
                </p>
              </div>

              {webhookBaseUrl.trim() && (
                <button
                  type="button"
                  onClick={() => setWebhookBaseUrl('')}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restaurar automático
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="evolution-webhook-base-url"
                value={webhookBaseUrl}
                onChange={(event) => setWebhookBaseUrl(event.target.value.trim())}
                placeholder={automaticWebhookBase || 'https://api.suaempresa.com'}
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyWebhook}
                className="shrink-0 gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar endpoint
                  </>
                )}
              </Button>
            </div>

            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Endpoint entregue às instâncias
              </p>
              <p className="mt-1 break-all font-mono text-[11px] text-foreground">{webhookPreview}</p>
            </div>

            <p className="text-[11px] text-muted-foreground">
              {webhookBaseUrl.trim() ? (
                <>
                  Após salvar, use <strong>Conectar/Reconectar</strong> nas conexões existentes para
                  registrar o novo endereço no Evolution GO.
                </>
              ) : (
                <>
                  Vazio = usa automaticamente{' '}
                  <span className="font-mono">{automaticWebhookBase || 'a URL pública desta API'}</span>.
                </>
              )}
            </p>
          </div>

          {testResult && (
            <div
              className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${
                testResult.success
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              )}
              <div>
                <p className="font-semibold">{testResult.success ? 'Conexão OK' : 'Falha na conexão'}</p>
                <p className="mt-0.5">{testResult.message}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={isTesting || isSaving}
            className="gap-1.5"
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testando…
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 text-emerald-500" />
                Testar conexão
              </>
            )}
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isTesting}
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar configuração
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
