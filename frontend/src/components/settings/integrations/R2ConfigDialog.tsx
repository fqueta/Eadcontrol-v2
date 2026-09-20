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
  Cloud, 
  ExternalLink,
  Save,
  Zap
} from 'lucide-react';
import { integrationsService } from '@/services/integrationsService';
import { useCreateApiCredential, useUpdateApiCredential } from '@/hooks/apiCredentials';
import { useToast } from '@/hooks/use-toast';
import { ApiCredential } from '@/types';

function cleanAccountId(val: string): string {
  const trimmed = val.trim();
  const urlMatch = trimmed.match(/https?:\/\/([a-f0-9]{32})\.r2\.cloudflarestorage\.com/i);
  if (urlMatch) return urlMatch[1];
  const dashMatch = trimmed.match(/dash\.cloudflare\.com\/([a-f0-9]{32})/i);
  if (dashMatch) return dashMatch[1];
  return trimmed;
}

interface R2ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCredential?: ApiCredential | null;
  onSaved?: () => void;
}

export const R2ConfigDialog: React.FC<R2ConfigDialogProps> = ({
  open,
  onOpenChange,
  initialCredential,
  onSaved,
}) => {
  const { toast } = useToast();
  const createMutation = useCreateApiCredential();
  const updateMutation = useUpdateApiCredential();

  const [accountId, setAccountId] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [bucket, setBucket] = useState('');
  const [publicUrl, setPublicUrl] = useState('');
  const [active, setActive] = useState(true);

  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isTokenInAccountId = accountId.trim().startsWith('cfat_');
  const isTokenInAccessKeyId = accessKeyId.trim().startsWith('cfat_');

  // Carregar dados existentes ao abrir
  useEffect(() => {
    if (open) {
      setTestResult(null);
      if (initialCredential) {
        const cfg = initialCredential.config || {};
        setAccountId(cfg.account_id || '');
        setAccessKeyId(cfg.access_key_id || '');
        setSecretAccessKey(''); // Por segurança, campo vazio para permitir manter ou sobrescrever
        setBucket(cfg.bucket || '');
        setPublicUrl(cfg.public_url || '');
        setActive(initialCredential.active !== false);
      } else {
        setAccountId('');
        setAccessKeyId('');
        setSecretAccessKey('');
        setBucket('');
        setPublicUrl('');
        setActive(true);
      }
    }
  }, [open, initialCredential]);

  // Testar Conexão R2
  const handleTestConnection = async () => {
    const resolvedAccountId = cleanAccountId(accountId);
    const resolvedAccessKeyId = accessKeyId.trim();

    if (!resolvedAccountId || !resolvedAccessKeyId || !bucket.trim()) {
      toast({
        title: 'Campos incompletos',
        description: 'Preencha o ID da conta, ID da chave de acesso e Nome do Bucket para testar.',
        variant: 'destructive',
      });
      return;
    }

    if (resolvedAccountId.startsWith('cfat_')) {
      toast({
        title: 'ID da conta incorreto',
        description: 'Você inseriu o "Valor do token" (cfat_...) no campo ID da conta. O ID da conta é o código hexadecimal de 32 caracteres presente no endpoint S3 ou na URL do painel Cloudflare.',
        variant: 'destructive',
      });
      return;
    }

    if (resolvedAccessKeyId.startsWith('cfat_')) {
      toast({
        title: 'Chave de acesso incorreta',
        description: 'Você inseriu o "Valor do token" (cfat_...) no campo "ID da chave de acesso". Utilize a chave da seção "Use as credenciais seguintes para clientes S3".',
        variant: 'destructive',
      });
      return;
    }

    if (resolvedAccountId === resolvedAccessKeyId) {
      toast({
        title: 'Campos duplicados',
        description: 'O "ID da conta" e o "ID da chave de acesso" não podem ser iguais. O ID da conta é o código da sua conta Cloudflare (64982c192275a7afd4ae802efaa9d883), e o ID da chave pertence ao token S3 (c0c182e7...).',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const configPayload: Record<string, any> = {
        account_id: resolvedAccountId,
        access_key_id: resolvedAccessKeyId,
        bucket: bucket.trim(),
        public_url: publicUrl.trim(),
      };
      if (secretAccessKey.trim()) {
        configPayload.secret_access_key = secretAccessKey.trim();
      }

      const res = await integrationsService.testIntegration('cloudflare-r2', configPayload);
      setTestResult(res);
      if (res.success) {
        toast({
          title: 'Sucesso!',
          description: res.message,
        });
      } else {
        toast({
          title: 'Erro de Conexão',
          description: res.message,
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao testar conexão com R2';
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
    const resolvedAccountId = cleanAccountId(accountId);
    const resolvedAccessKeyId = accessKeyId.trim();

    if (!resolvedAccountId || !resolvedAccessKeyId || !bucket.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha os campos obrigatórios (ID da conta, ID da chave de acesso e Bucket).',
        variant: 'destructive',
      });
      return;
    }

    if (resolvedAccountId.startsWith('cfat_')) {
      toast({
        title: 'ID da conta incorreto',
        description: 'O ID da conta não pode ser o token cfat_... Utilize o código de 32 caracteres da Cloudflare.',
        variant: 'destructive',
      });
      return;
    }

    if (resolvedAccessKeyId.startsWith('cfat_')) {
      toast({
        title: 'ID da chave incorreto',
        description: 'O ID da chave de acesso não pode ser o token cfat_... Utilize a chave da seção de clientes S3.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const configObject: Record<string, any> = {
        ...(initialCredential?.config || {}),
        account_id: resolvedAccountId,
        access_key_id: resolvedAccessKeyId,
        bucket: bucket.trim(),
        public_url: publicUrl.trim(),
      };

      if (secretAccessKey.trim()) {
        configObject.secret_access_key = secretAccessKey.trim();
      }

      if (initialCredential?.id) {
        await updateMutation.mutateAsync({
          id: initialCredential.id,
          data: {
            name: 'Cloudflare R2',
            active,
            config: configObject,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: 'Cloudflare R2',
          slug: 'cloudflare-r2',
          active,
          config: configObject,
        });
      }

      toast({
        title: 'Salvo com sucesso!',
        description: 'As configurações do Cloudflare R2 foram atualizadas.',
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
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Configurar Cloudflare R2</DialogTitle>
              <DialogDescription>
                Armazenamento de alta performance com zero taxa de egress para vídeos da plataforma.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Guia Rápido */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start justify-between">
          <div>
            <p className="font-semibold mb-0.5">Onde encontrar essas credenciais na Cloudflare?</p>
            <p>
              No painel da Cloudflare → <strong>Armazenamento de objetos R2</strong> → <strong>Manage R2 API Tokens</strong> → crie um token. Na tela de sucesso, utilize os dados da seção <strong>"Use as credenciais seguintes para clientes S3"</strong>.
            </p>
          </div>
          <a
            href="https://developers.cloudflare.com/r2/api/s3/tokens/"
            target="_blank"
            rel="noreferrer"
            className="text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 shrink-0 ml-2"
          >
            Doc <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="space-y-4 py-2">
          {/* Status Ativo */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-neutral-50/50 dark:bg-neutral-900/50">
            <div>
              <Label className="font-semibold text-sm">Integração Ativa</Label>
              <p className="text-xs text-muted-foreground">
                Habilita o uso do R2 para uploads e streaming de vídeos nas aulas.
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          {/* Account ID */}
          <div className="space-y-1.5">
            <Label htmlFor="account_id">
              ID da conta Cloudflare (Account ID) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="account_id"
              value={accountId}
              onChange={(e) => setAccountId(cleanAccountId(e.target.value))}
              placeholder="Ex: 64982c192275a7afd4ae802efaa9d883 ou cole o endpoint S3"
              className="font-mono text-sm"
            />
            {isTokenInAccountId ? (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                Atenção: Você colou o "Valor do token" (cfat_...). O ID da conta é o código de 32 caracteres presente na URL da Cloudflare ou no endpoint S3.
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Código de 32 caracteres presente no endpoint S3 (<span className="font-mono font-medium">https://[ID_DA_CONTA].r2.cloudflarestorage.com</span>) ou na URL da Cloudflare. Não utilize o "Valor do token".
              </p>
            )}
          </div>

          {/* Access Key ID */}
          <div className="space-y-1.5">
            <Label htmlFor="access_key">
              ID da chave de acesso <span className="text-red-500">*</span>
            </Label>
            <Input
              id="access_key"
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value.trim())}
              placeholder="Ex: c0c182e73f09a7cb940069bf3a923f01"
              className="font-mono text-sm"
            />
            {isTokenInAccessKeyId ? (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                Atenção: Você colou o "Valor do token" (cfat_...). Utilize o valor do campo "ID da chave de acesso" da seção "clientes S3" da Cloudflare.
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Corresponde exatamente ao campo <strong>"ID da chave de acesso"</strong> na seção <em>"Use as credenciais seguintes para clientes S3"</em> da Cloudflare.
              </p>
            )}
          </div>

          {/* Secret Access Key */}
          <div className="space-y-1.5">
            <Label htmlFor="secret_key">
              Chave de acesso secreta {initialCredential ? '(preencha apenas para alterar)' : <span className="text-red-500">*</span>}
            </Label>
            <div className="relative">
              <Input
                id="secret_key"
                type={showSecret ? 'text' : 'password'}
                value={secretAccessKey}
                onChange={(e) => setSecretAccessKey(e.target.value.trim())}
                placeholder={initialCredential ? '••••••••••••••••••••••••••••••••' : 'Cole sua Chave de acesso secreta'}
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
              Corresponde ao campo <strong>"Chave de acesso secreta"</strong> na seção de clientes S3 da Cloudflare (criptografada no banco com AES-256).
            </p>
          </div>

          {/* Bucket */}
          <div className="space-y-1.5">
            <Label htmlFor="bucket">Nome do Bucket <span className="text-red-500">*</span></Label>
            <Input
              id="bucket"
              value={bucket}
              onChange={(e) => setBucket(e.target.value.trim())}
              placeholder="Ex: ead-control"
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Nome do bucket criado em Cloudflare → Armazenamento de objetos R2.
            </p>
          </div>

          {/* URL Pública / Domínio Personalizado */}
          <div className="space-y-1.5">
            <Label htmlFor="public_url">URL Pública / Domínio Personalizado</Label>
            <Input
              id="public_url"
              value={publicUrl}
              onChange={(e) => setPublicUrl(e.target.value.trim())}
              placeholder="Ex: https://64982c192275a7afd4ae802efaa9d883.r2.cloudflarestorage.com/ead-control"
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              URL base onde os vídeos públicos são acessados. Pode ser o endpoint do bucket ou um domínio personalizado configurado no Cloudflare R2.
            </p>
          </div>

          {/* Resultado do Teste de Conexão */}
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
                <p className="font-semibold">{testResult.success ? 'Conexão OK' : 'Falha na Conexão'}</p>
                <p className="mt-0.5">{testResult.message}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {/* Botão Testar */}
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting || isSaving}
            className="gap-1.5 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-400"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-500" />
                Testar Conexão R2
              </>
            )}
          </Button>

          {/* Botão Salvar */}
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isTesting}
            className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
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
