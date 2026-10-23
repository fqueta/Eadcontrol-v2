import { useEffect, useMemo, useState } from 'react';
import { BellRing, Loader2, MessageSquare, Send, Settings2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useTestWhatsappNotification,
  useUpdateWhatsappNotificationSettings,
  useWhatsappNotificationSettings,
} from '@/hooks/whatsapp';

function formatPhoneBR(phone?: string | null): string {
  const digits = (phone || '').replace(/\D/g, '');

  if (!digits) return '';

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

/**
 * Descrições amigáveis por evento (o backend envia apenas chave + rótulo).
 */
const EVENT_DESCRIPTIONS: Record<string, string> = {
  comments: 'Novo comentário aguardando moderação em curso ou atividade.',
  enrollments: 'Nova matrícula/proposta criada no funil de vendas.',
  sales: 'Pagamento aprovado ou matrícula efetivada manualmente.',
  payments: 'Conta a receber quitada pelo gateway (ex.: PIX, boleto ou OS).',
};

/**
 * WhatsappNotificationsCard
 * pt-BR: Configura os alertas administrativos enviados por WhatsApp
 *        (ex.: novo comentário aguardando moderação).
 */
export function WhatsappNotificationsCard() {
  const { toast } = useToast();
  const { data, isLoading } = useWhatsappNotificationSettings();
  const updateMutation = useUpdateWhatsappNotificationSettings();
  const testMutation = useTestWhatsappNotification();

  const settings = data?.data;
  const instances = useMemo(() => data?.instances ?? [], [data?.instances]);
  const events = useMemo(() => data?.events ?? [], [data?.events]);

  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [instanceId, setInstanceId] = useState<string>('');
  const [recipients, setRecipients] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['comments']);

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.enabled);
    setInstanceId(settings.instance_id ? String(settings.instance_id) : '');
    setRecipients(settings.recipients_raw ?? '');
    setSelectedEvents(settings.events ?? []);
  }, [settings]);

  const selectedInstance = useMemo(
    () =>
      instances.find((instance) => String(instance.id) === instanceId) ??
      (instanceId ? null : instances[0] ?? null),
    [instances, instanceId]
  );

  const dialogInstance = useMemo(
    () => instances.find((instance) => String(instance.id) === instanceId) ?? null,
    [instances, instanceId]
  );

  const eventLabels = useMemo(() => {
    const map = new Map(events.map((event) => [event.key, event.label]));
    return (settings?.events ?? []).map((key) => map.get(key) ?? key);
  }, [events, settings?.events]);

  const buildPayload = () => ({
    enabled,
    instance_id: instanceId ? Number(instanceId) : null,
    recipients: recipients.trim(),
    events: selectedEvents,
  });

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(buildPayload());
      toast({ title: 'Preferências salvas', description: 'Os alertas por WhatsApp foram atualizados.' });
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleTest = async () => {
    try {
      // pt-BR: Salva primeiro para que o teste use a conexão/destino atuais.
      await updateMutation.mutateAsync(buildPayload());
      const result = await testMutation.mutateAsync(recipients.trim());
      toast({
        title: 'Mensagem de teste enviada',
        description: `${result.sent} mensagem(ns) enviada(s). Confira o WhatsApp.`,
      });
    } catch (error) {
      toast({
        title: 'Não foi possível testar',
        description:
          error instanceof Error ? error.message : 'Verifique a conexão e o número informado.',
        variant: 'destructive',
      });
    }
  };

  const toggleEvent = (key: string) => {
    setSelectedEvents((previous) =>
      previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key]
    );
  };

  /**
   * Liga/desliga o canal direto no card, sem abrir o modal de configuração.
   */
  const handleToggleEnabled = async (value: boolean) => {
    setEnabled(value);

    try {
      await updateMutation.mutateAsync({ ...buildPayload(), enabled: value });
      toast({
        title: value ? 'Alertas ativados' : 'Alertas desativados',
        description: value
          ? 'Os eventos selecionados serão enviados por WhatsApp.'
          : 'Nenhum alerta será enviado até que o canal seja reativado.',
      });
    } catch (error) {
      setEnabled(!value);
      toast({
        title: 'Erro ao atualizar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const busy = updateMutation.isPending || testMutation.isPending;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <BellRing className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Notificações por WhatsApp</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Receba alertas de comentários, matrículas, vendas e pagamentos no WhatsApp da conexão
                  ou em um número escolhido.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={settings?.enabled ?? false}
                onCheckedChange={handleToggleEnabled}
                disabled={busy || isLoading}
                aria-label="Ligar ou desligar alertas por WhatsApp"
              />
              <Badge
                variant="outline"
                className={
                  settings?.enabled
                    ? 'border-emerald-500/40 text-emerald-600'
                    : 'text-muted-foreground'
                }
              >
                {settings?.enabled ? 'Ativo' : 'Desativado'}
              </Badge>
              <Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={isLoading}>
                <Settings2 className="mr-2 h-4 w-4" />
                Configurar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-muted-foreground">Conexão</p>
            <p className="mt-1 truncate font-medium">
              {selectedInstance?.display_name ?? 'Não definida'}
            </p>
            {selectedInstance?.phone_number && (
              <p className="text-muted-foreground">{formatPhoneBR(selectedInstance.phone_number)}</p>
            )}
          </div>

          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-muted-foreground">Destino</p>
            <p className="mt-1 line-clamp-2 font-medium">
              {settings?.recipients?.length
                ? settings.recipients.map((phone) => formatPhoneBR(phone) || phone).join(', ')
                : 'Próprio número da conexão'}
            </p>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-muted-foreground">Eventos</p>
            <p className="mt-1 font-medium">
              {eventLabels.length ? eventLabels.join(', ') : 'Nenhum evento selecionado'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Alertas administrativos por WhatsApp</DialogTitle>
            <DialogDescription>
              Use uma conexão já pareada do Evolution GO. Se nenhum destino for informado, o alerta é
              enviado para o próprio número da conexão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="pr-4">
                <p className="text-sm font-medium">Ativar envio de alertas</p>
                <p className="text-xs text-muted-foreground">
                  Chave geral do canal. Escolha abaixo quais eventos devem ser enviados.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notify-instance">Conexão de envio</Label>
              <Select value={instanceId} onValueChange={setInstanceId}>
                <SelectTrigger id="notify-instance">
                  <SelectValue placeholder="Selecione uma conexão" />
                </SelectTrigger>
                <SelectContent>
                  {instances.map((instance) => (
                    <SelectItem key={instance.id} value={String(instance.id)}>
                      <span className="flex items-center gap-2">
                        <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                        {instance.display_name}
                        <span className="text-xs text-muted-foreground">
                          {instance.status === 'connected' ? '· conectado' : '· desconectado'}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {instances.length === 0 && (
                <p className="text-xs text-destructive">
                  Nenhuma conexão cadastrada. Crie e pareie uma conexão primeiro.
                </p>
              )}
              {dialogInstance && dialogInstance.status !== 'connected' && (
                <p className="text-xs text-amber-600">
                  Esta conexão está desconectada: os alertas não serão enviados até que ela seja
                  reconectada.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notify-recipients">Números de destino (opcional)</Label>
              <Input
                id="notify-recipients"
                placeholder="5511999999999, 5521888888888"
                value={recipients}
                onChange={(event) => setRecipients(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Com DDI e DDD. Separe vários números por vírgula. Em branco, envia para o número da
                própria conexão.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Eventos que deseja receber</Label>
              <p className="text-xs text-muted-foreground">
                Ligue ou desligue cada tipo de alerta individualmente.
              </p>
              <div className="space-y-2">
                {events.map((event) => {
                  const checked = selectedEvents.includes(event.key);

                  return (
                    <div
                      key={event.key}
                      className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${
                        checked ? 'border-primary/30 bg-primary/5' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {event.label}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {EVENT_DESCRIPTIONS[event.key] ?? 'Alerta administrativo.'}
                        </p>
                      </div>
                      <Switch checked={checked} onCheckedChange={() => toggleEvent(event.key)} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={busy || !instanceId}
              className="w-full sm:w-auto"
            >
              {testMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Enviar teste
            </Button>

            <div className="flex w-full gap-2 sm:w-auto">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="button" onClick={handleSave} disabled={busy} className="flex-1">
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default WhatsappNotificationsCard;
