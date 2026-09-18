import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Video, 
  ExternalLink,
  Save,
  Zap
} from 'lucide-react';
import { integrationsService } from '@/services/integrationsService';
import { useCreateApiCredential, useUpdateApiCredential } from '@/hooks/apiCredentials';
import { useToast } from '@/hooks/use-toast';
import { ApiCredential } from '@/types';

interface VimeoConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCredential?: ApiCredential | null;
  onSaved?: () => void;
}

export const VimeoConfigDialog: React.FC<VimeoConfigDialogProps> = ({
  open,
  onOpenChange,
  initialCredential,
  onSaved,
}) => {
  const { toast } = useToast();
  const createMutation = useCreateApiCredential();
  const updateMutation = useUpdateApiCredential();

  const [accessToken, setAccessToken] = useState('');
  const [active, setActive] = useState(true);

  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTestResult(null);
      if (initialCredential) {
        setAccessToken(''); // Vazio por segurança para permitir manter o já existente ou sobrescrever
        setActive(initialCredential.active !== false);
      } else {
        setAccessToken('');
        setActive(true);
      }
    }
  }, [open, initialCredential]);

  // Testar Token Vimeo
  const handleTestConnection = async () => {
    if (!accessToken.trim() && !initialCredential) {
      toast({
        title: 'Token não informado',
        description: 'Cole seu Personal Access Token do Vimeo para testar.',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const configPayload: Record<string, any> = {};
      if (accessToken.trim()) {
        configPayload.access_token = accessToken.trim();
      }

      const res = await integrationsService.testIntegration('vimeo', configPayload);
      setTestResult(res);
      if (res.success) {
        toast({
          title: 'Sucesso!',
          description: res.message,
        });
      } else {
        toast({
          title: 'Falha no Token',
          description: res.message,
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao testar token do Vimeo';
      setTestResult({ success: false, message: msg });
      toast({
        title: 'Erro de Conexão',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Salvar Credencial
  const handleSave = async () => {
    if (!accessToken.trim() && !initialCredential) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o Access Token do Vimeo.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const configObject: Record<string, any> = {
        ...(initialCredential?.config || {}),
      };

      if (accessToken.trim()) {
        configObject.access_token = accessToken.trim();
      }

      if (initialCredential?.id) {
        await updateMutation.mutateAsync({
          id: initialCredential.id,
          data: {
            name: 'Vimeo',
            active,
            config: configObject,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: 'Vimeo',
          slug: 'vimeo',
          active,
          config: configObject,
        });
      }

      toast({
        title: 'Salvo com sucesso!',
        description: 'As configurações do Vimeo foram atualizadas.',
      });
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err?.response?.data?.message || 'Não foi possível salvar as credenciais.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Configurar Vimeo</DialogTitle>
              <DialogDescription>
                Integração para leitura e migração de vídeos legados hospedados no Vimeo.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Dica */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-300 flex items-start justify-between">
          <div>
            <p className="font-semibold mb-0.5">Como gerar o token?</p>
            <p>
              Acesse <strong>developer.vimeo.com/apps</strong> → crie uma aplicação → gere um <strong>Personal Access Token</strong> com os escopos <code>public</code>, <code>private</code> e <code>video_files</code>.
            </p>
          </div>
          <a
            href="https://developer.vimeo.com/apps"
            target="_blank"
            rel="noreferrer"
            className="text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0 ml-2"
          >
            Vimeo Apps <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="space-y-4 py-2">
          {/* Status Ativo */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-neutral-50/50 dark:bg-neutral-900/50">
            <div>
              <Label className="font-semibold text-sm">Integração Ativa</Label>
              <p className="text-xs text-muted-foreground">
                Permite que a plataforma se comunique com a API do Vimeo para consultar e migrar vídeos.
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          {/* Access Token */}
          <div className="space-y-1.5">
            <Label htmlFor="vimeo_token">
              Personal Access Token {initialCredential ? '(preencha apenas para alterar)' : <span className="text-red-500">*</span>}
            </Label>
            <div className="relative">
              <Input
                id="vimeo_token"
                type={showSecret ? 'text' : 'password'}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={initialCredential ? '••••••••••••••••••••••••••••••••' : 'Cole seu Personal Access Token'}
                className="font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              O token é armazenado de forma criptografada com AES-256.
            </p>
          </div>

          {/* Resultado do Teste */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{testResult.success ? 'Token Válido' : 'Erro de Validação'}</p>
                <p className="mt-0.5">{testResult.message}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting || isSaving}
            className="gap-1.5 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-400"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Validando...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-blue-500" />
                Testar Token Vimeo
              </>
            )}
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isTesting}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
