import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Loader2,
  Plus,
  QrCode,
  RefreshCw,
  Send,
  Smartphone,
  KeyRound,
  Trash2,
  Unplug,
  Power,
  Settings2,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  useConnectWhatsappInstance,
  useCreateWhatsappInstance,
  useDeleteWhatsappInstance,
  useDisconnectWhatsappInstance,
  usePairWhatsappInstance,
  useReconnectWhatsappInstance,
  useSendWhatsappMessage,
  useToggleInstanceAi,
  useWhatsappInstances,
} from '@/hooks/whatsapp';
import type { WhatsappInstance, WhatsappInstanceStatus } from '@/types/whatsapp';
import { WhatsappNotificationsCard } from '@/components/whatsapp/WhatsappNotificationsCard';

function formatPhoneBR(phone?: string | null): string {
  const digits = (phone || '').replace(/\D/g, '');

  if (!digits) {
    return 'Número não pareado';
  }

  if (digits.length >= 12) {
    const ddi = digits.slice(0, 2);
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    const middle = rest.slice(0, Math.max(0, rest.length - 4));
    const last = rest.slice(-4);

    return `+${ddi} (${ddd}) ${middle}-${last}`;
  }

  return digits;
}

const STATUS_META: Record<WhatsappInstanceStatus, { label: string; className: string; dot: string }> = {
  connected: {
    label: 'Conectado',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  connecting: {
    label: 'Aguardando leitura',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    dot: 'bg-amber-500',
  },
  disconnected: {
    label: 'Desconectado',
    className: 'bg-muted text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
  },
};

function StatusBadge({ status }: { status: WhatsappInstanceStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.disconnected;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function extractPairingCode(payload: any): string | null {
  if (!payload) return null;

  const candidates = [
    payload?.data?.code,
    payload?.data?.pairingCode,
    payload?.data?.pairing_code,
    payload?.code,
    payload?.pairingCode,
    payload?.pairing_code,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return candidate.trim();
    }
  }

  return null;
}

export default function WhatsappConnections() {
  const { toast } = useToast();
  const { data, isLoading, refetch, isFetching } = useWhatsappInstances({ refetchInterval: 20000 });

  const createMutation = useCreateWhatsappInstance();
  const connectMutation = useConnectWhatsappInstance();
  const pairMutation = usePairWhatsappInstance();
  const disconnectMutation = useDisconnectWhatsappInstance();
  const reconnectMutation = useReconnectWhatsappInstance();
  const deleteMutation = useDeleteWhatsappInstance();
  const toggleAiMutation = useToggleInstanceAi();
  const sendMutation = useSendWhatsappMessage();

  const instances = data?.data ?? [];
  const meta = data?.meta;

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [qrOpen, setQrOpen] = useState(false);
  const [qrInstance, setQrInstance] = useState<WhatsappInstance | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrSeconds, setQrSeconds] = useState(60);
  const [pairPhone, setPairPhone] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  const [testOpen, setTestOpen] = useState(false);
  const [testInstance, setTestInstance] = useState<WhatsappInstance | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Olá! Esta é uma mensagem de teste do Ead Control. 👋');

  const [deleteTarget, setDeleteTarget] = useState<WhatsappInstance | null>(null);

  useEffect(() => {
    if (!qrOpen || !qrCode) return;

    setQrSeconds(60);

    const timer = window.setInterval(() => {
      setQrSeconds((previous) => (previous > 0 ? previous - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [qrOpen, qrCode]);

  const configured = meta?.configured !== false;
  const maxInstances = meta?.max_instances ?? 0;

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast({ title: 'Informe um nome para a conexão', variant: 'destructive' });
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        display_name: newName.trim(),
        phone_number: newPhone.trim() || undefined,
      });

      toast({ title: 'Conexão criada', description: result.message });
      setCreateOpen(false);
      setNewName('');
      setNewPhone('');
      await refetch();

      if (result.instance) {
        openQr(result.instance);
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao criar conexão',
        description: error?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const openQr = async (instance: WhatsappInstance) => {
    setQrInstance(instance);
    setQrCode(instance.qr_code ?? null);
    setPairingCode(null);
    setPairPhone(instance.phone_number ?? '');
    setQrOpen(true);

    if (instance.status === 'connected') {
      return;
    }

    try {
      const result = await connectMutation.mutateAsync(instance.id);
      setQrCode(result.qr_code ?? null);

      if (result.status === 'connected') {
        toast({ title: 'WhatsApp já conectado', description: result.message });
        setQrOpen(false);
        await refetch();
      }
    } catch (error: any) {
      toast({
        title: 'Não foi possível gerar o QR Code',
        description: error?.message || 'Verifique a configuração do Evolution GO.',
        variant: 'destructive',
      });
    }
  };

  const handlePair = async () => {
    if (!qrInstance) return;

    try {
      const result = await pairMutation.mutateAsync({ id: qrInstance.id, phone: pairPhone });
      const code = extractPairingCode(result);

      setPairingCode(code);

      if (!code) {
        toast({
          title: 'Pareamento solicitado',
          description: 'Confira o código no painel do Evolution GO.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro no pareamento',
        description: error?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleSendTest = async () => {
    if (!testInstance) return;

    try {
      await sendMutation.mutateAsync({
        id: testInstance.id,
        phone: testPhone.replace(/\D/g, ''),
        message: testMessage,
      });

      toast({ title: 'Mensagem enviada', description: 'Confira o WhatsApp informado.' });
      setTestOpen(false);
    } catch (error: any) {
      toast({
        title: 'Falha ao enviar',
        description: error?.message || 'Verifique se o aparelho está conectado.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: 'Conexão removida' });
      setDeleteTarget(null);
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: error?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const busy = connectMutation.isPending || disconnectMutation.isPending || reconnectMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conexões WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Pareie números via Evolution GO e gerencie o atendimento humano e automático.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            disabled={!configured || (maxInstances > 0 && instances.length >= maxInstances)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova conexão
          </Button>
        </div>
      </div>

      {!configured && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Evolution GO não configurado</p>
                <p className="text-xs text-muted-foreground">
                  Cadastre a URL e a API key da integração <strong>Evolution GO</strong> para parear números.
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/settings/integrations">
                <Settings2 className="mr-2 h-4 w-4" />
                Abrir integrações
                <ExternalLink className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <WhatsappNotificationsCard />

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : instances.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="rounded-full bg-muted p-4">
              <Smartphone className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Nenhuma conexão cadastrada</p>
              <p className="text-sm text-muted-foreground">
                Crie a primeira conexão e escaneie o QR Code com o WhatsApp do celular.
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)} disabled={!configured}>
              <Plus className="mr-2 h-4 w-4" />
              Criar conexão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {instances.map((instance) => {
            const agent = (instance.agents ?? []).find((item: any) => item.is_active) ?? instance.agents?.[0];

            return (
              <Card key={instance.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Smartphone className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{instance.display_name}</CardTitle>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatPhoneBR(instance.phone_number)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={instance.status} />
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="rounded-lg border bg-muted/40 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Instância</span>
                      <span className="truncate font-mono text-[11px]">{instance.instance_name}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="shrink-0 text-muted-foreground">Webhook</span>
                      <span
                        className="truncate font-mono text-[10px]"
                        title={instance.webhook_url || 'Registrado no próximo connect'}
                      >
                        {instance.webhook_url || 'Automático no connect'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Conversas abertas</span>
                      <span className="font-semibold">{instance.open_conversations_count ?? 0}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Agente de IA</span>
                      {agent ? (
                        <Badge variant="outline" className={agent.is_active ? 'border-emerald-500/40 text-emerald-600' : 'text-muted-foreground'}>
                          <Bot className="mr-1 h-3 w-3" />
                          {agent.name} {agent.is_active ? '· ativo' : '· pausado'}
                        </Badge>
                      ) : (
                        <Link to="/admin/whatsapp/agentes" className="text-primary hover:underline">
                          Criar agente
                        </Link>
                      )}
                    </div>
                  </div>

                  {instance.last_error && (
                    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-3">{instance.last_error}</span>
                    </div>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2">
                    {instance.status !== 'connected' ? (
                      <Button size="sm" onClick={() => openQr(instance)} disabled={busy}>
                        <QrCode className="mr-2 h-4 w-4" />
                        Conectar
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => { setTestInstance(instance); setTestPhone(instance.phone_number ?? ''); setTestOpen(true); }}>
                          <Send className="mr-2 h-4 w-4" />
                          Testar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            disconnectMutation.mutate(instance.id, {
                              onSuccess: () => toast({ title: 'WhatsApp desconectado' }),
                              onError: (error: any) =>
                                toast({ title: 'Erro ao desconectar', description: error?.message, variant: 'destructive' }),
                            })
                          }
                          disabled={busy}
                        >
                          <Unplug className="mr-2 h-4 w-4" />
                          Desconectar
                        </Button>
                      </>
                    )}

                    {instance.status === 'disconnected' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          reconnectMutation.mutate(instance.id, {
                            onSuccess: (result) =>
                              toast({ title: 'Reconexão solicitada', description: `Status: ${result.status}` }),
                            onError: (error: any) =>
                              toast({ title: 'Erro ao reconectar', description: error?.message, variant: 'destructive' }),
                          })
                        }
                        disabled={busy}
                      >
                        <Power className="mr-2 h-4 w-4" />
                        Reconectar
                      </Button>
                    )}

                    {agent && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          toggleAiMutation.mutate(
                            { id: instance.id, isActive: !agent.is_active },
                            {
                              onSuccess: (result) => toast({ title: result.message }),
                              onError: (error: any) =>
                                toast({ title: 'Erro ao alternar IA', description: error?.message, variant: 'destructive' }),
                            }
                          )
                        }
                        disabled={toggleAiMutation.isPending}
                      >
                        <Bot className="mr-2 h-4 w-4" />
                        {agent.is_active ? 'Pausar IA' : 'Ativar IA'}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(instance)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Criar conexão */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova conexão WhatsApp</DialogTitle>
            <DialogDescription>
              O número será pareado lendo um QR Code. Use um nome para identificar a conexão no painel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">Nome da conexão</Label>
              <Input
                id="display-name"
                placeholder="Ex.: Atendimento Comercial"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Número (opcional)</Label>
              <Input
                id="phone"
                placeholder="Ex.: 5511999999999"
                value={newPhone}
                onChange={(event) => setNewPhone(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Com DDI e DDD. Pode ser preenchido automaticamente após o pareamento.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar e conectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code / pareamento */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar {qrInstance?.display_name}</DialogTitle>
            <DialogDescription>
              Abra o WhatsApp → Aparelhos conectados → Conectar um aparelho.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="qr" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="qr">
                <QrCode className="mr-2 h-4 w-4" />
                QR Code
              </TabsTrigger>
              <TabsTrigger value="pair">
                <KeyRound className="mr-2 h-4 w-4" />
                Código
              </TabsTrigger>
            </TabsList>

            <TabsContent value="qr" className="space-y-4 pt-2">
              <div className="flex min-h-[260px] items-center justify-center rounded-xl border bg-muted/30 p-4">
                {connectMutation.isPending && !qrCode ? (
                  <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Gerando QR Code…
                  </div>
                ) : qrCode ? (
                  <img src={qrCode} alt="QR Code do WhatsApp" className="h-60 w-60 rounded-lg bg-white object-contain p-2" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                    <QrCode className="h-10 w-10 opacity-40" />
                    Nenhum QR Code disponível.
                    <Button size="sm" variant="outline" onClick={() => qrInstance && openQr(qrInstance)}>
                      Gerar QR Code
                    </Button>
                  </div>
                )}
              </div>

              {qrCode && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {qrSeconds > 0 ? `O código expira em ${qrSeconds}s` : 'Código expirado'}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => qrInstance && openQr(qrInstance)} disabled={connectMutation.isPending}>
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    Novo QR
                  </Button>
                </div>
              )}

              <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                Evite pedir vários QR seguidos: isso pode derrubar a sessão. Após a leitura, a conexão aparecerá como <strong>Conectado</strong> automaticamente.
              </p>
            </TabsContent>

            <TabsContent value="pair" className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="pair-phone">Número do WhatsApp</Label>
                <Input
                  id="pair-phone"
                  placeholder="5511999999999"
                  value={pairPhone}
                  onChange={(event) => setPairPhone(event.target.value)}
                />
              </div>

              {pairingCode && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Código de pareamento</p>
                  <p className="mt-1 text-2xl font-bold tracking-[0.3em] text-primary">{pairingCode}</p>
                </div>
              )}

              <Button className="w-full" onClick={handlePair} disabled={pairMutation.isPending || pairPhone.replace(/\D/g, '').length < 10}>
                {pairMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gerar código de pareamento
              </Button>

              <p className="text-xs text-muted-foreground">
                No celular: WhatsApp → Aparelhos conectados → Conectar com número de telefone → informe o código acima.
              </p>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQrOpen(false)}>Fechar</Button>
            <Button
              variant="secondary"
              onClick={async () => {
                await refetch();
                if (qrInstance) {
                  const updated = (data?.data ?? []).find((item) => item.id === qrInstance.id);
                  if (updated?.status === 'connected') {
                    toast({ title: 'WhatsApp conectado com sucesso!' });
                    setQrOpen(false);
                  }
                }
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Já escaneei
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teste de envio */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar mensagem de teste</DialogTitle>
            <DialogDescription>Usa a conexão {testInstance?.display_name}.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-phone">Número de destino</Label>
              <Input
                id="test-phone"
                placeholder="5511999999999"
                value={testPhone}
                onChange={(event) => setTestPhone(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-message">Mensagem</Label>
              <Textarea
                id="test-message"
                rows={4}
                value={testMessage}
                onChange={(event) => setTestMessage(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>Cancelar</Button>
            <Button onClick={handleSendTest} disabled={sendMutation.isPending || testPhone.replace(/\D/g, '').length < 10}>
              {sendMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conexão?</AlertDialogTitle>
            <AlertDialogDescription>
              A instância <strong>{deleteTarget?.display_name}</strong> será removida do Evolution GO.
              As conversas vinculadas deixam de aparecer no inbox. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
