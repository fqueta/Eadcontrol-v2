import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  CheckCheck,
  Clock,
  FileText,
  Headset,
  Image as ImageIcon,
  Loader2,
  MessageSquarePlus,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
  Send,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useChatInbox,
  useChatMessages,
  useChatInstances,
  useSendChatMedia,
  useSendChatMessage,
  useStartConversation,
  useToggleConversationAi,
} from '@/hooks/chatInbox';
import type { ChatConversation, ChatMessage, ChatMedia } from '@/types/whatsapp';
import { cn } from '@/lib/utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function digits(phone?: string | null): string {
  return (phone || '').replace(/\D/g, '');
}

function formatPhoneBR(phone?: string | null): string {
  const value = digits(phone);

  if (!value) return 'Número desconhecido';

  if (value.length >= 12) {
    return `+${value.slice(0, 2)} (${value.slice(2, 4)}) ${value.slice(4, -4)}-${value.slice(-4)}`;
  }

  if (value.length >= 10) {
    return `(${value.slice(0, 2)}) ${value.slice(2, -4)}-${value.slice(-4)}`;
  }

  return value;
}

function initials(name?: string | null, phone?: string | null): string {
  const source = (name || '').trim() || formatPhoneBR(phone);

  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function formatTime(date?: string | null): string {
  if (!date) return '';

  try {
    return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatDateTime(date?: string | null): string {
  if (!date) return '';

  try {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

// ─── Message bubble ──────────────────────────────────────────────────────────

function MessageMedia({ media }: { media?: ChatMedia | null }) {
  if (!media?.url) return null;

  if (media.type === 'image') {
    return (
      <a href={media.url} target="_blank" rel="noreferrer" className="block">
        <img
          src={media.url}
          alt={media.name || 'Imagem'}
          className="max-h-64 w-full max-w-xs rounded-lg object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  if (media.type === 'audio') {
    return (
      <div className="w-full max-w-xs">
        <audio controls src={media.url} className="w-full" preload="none" />
        {media.transcription && (
          <p className="mt-1 text-[11px] italic opacity-70">Transcrição: {media.transcription}</p>
        )}
      </div>
    );
  }

  if (media.type === 'video') {
    return (
      <video controls src={media.url} className="max-h-64 w-full max-w-xs rounded-lg" preload="none" />
    );
  }

  return (
    <a
      href={media.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-lg border border-current/20 bg-background/40 px-3 py-2 text-xs underline-offset-2 hover:underline"
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate">{media.name || 'Documento'}</span>
    </a>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isAi = message.role === 'assistant';
  const isHuman = message.role === 'human_agent';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">{message.content}</span>
      </div>
    );
  }

  const media = message.metadata?.media ?? null;
  const sendError = message.metadata?.send_error;

  return (
    <div className={cn('flex w-full gap-2', isUser ? 'justify-start' : 'justify-end')}>
      {isUser && (
        <Avatar className="mt-auto h-7 w-7 shrink-0">
          <AvatarFallback className="bg-muted text-[10px]">
            {initials(message.metadata?.push_name, message.metadata?.push_name)}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[70%]',
          isUser && 'rounded-bl-md bg-muted text-foreground',
          isAi && 'rounded-br-md border border-primary/20 bg-primary/10 text-foreground',
          isHuman && 'rounded-br-md border border-sky-500/25 bg-sky-500/10 text-foreground'
        )}
      >
        {isAi && (
          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
            <Bot className="h-3 w-3" /> Agente IA
          </div>
        )}

        {isHuman && (
          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-sky-600">
            <Headset className="h-3 w-3" /> Atendente
          </div>
        )}

        <MessageMedia media={media} />

        {(() => {
          const content = message.content || '';
          const isPlaceholder = !!media && /\[(Imagem|Áudio|Vídeo|Documento)[^\]]*\]/.test(content);

          if (!content || isPlaceholder) {
            return null;
          }

          return <p className="whitespace-pre-wrap break-words">{content}</p>;
        })()}

        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-60">
          {formatTime(message.created_at)}
          {isAi && <CheckCheck className="h-3 w-3" />}
        </div>

        {sendError && (
          <p className="mt-1 text-[10px] font-medium text-destructive">Falha no envio: {sendError}</p>
        )}
      </div>
    </div>
  );
}

// ─── Conversation item ───────────────────────────────────────────────────────

function ConversationItem({
  conversation,
  active,
  onClick,
}: {
  conversation: ChatConversation;
  active: boolean;
  onClick: () => void;
}) {
  const name = conversation.contact_name || formatPhoneBR(conversation.contact_phone);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-muted/60',
        active && 'bg-primary/10 hover:bg-primary/10'
      )}
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
          {initials(conversation.contact_name, conversation.contact_phone)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {conversation.last_message_at ? formatTime(conversation.last_message_at) : ''}
          </span>
        </div>

        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">
            {conversation.last_message || 'Sem mensagens'}
          </span>

          <div className="flex shrink-0 items-center gap-1">
            {conversation.ai_paused && (
              <span title="Atendimento humano">
                <Headset className="h-3 w-3 text-sky-600" />
              </span>
            )}
            {(conversation.unread_count ?? 0) > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {conversation.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ChatInbox() {
  const { code } = useParams<{ code?: string }>();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState('active');
  const [instanceFilter, setInstanceFilter] = useState<string>('all');

  const [selectedId, setSelectedId] = useState<string | null>(code ?? null);
  const [composer, setComposer] = useState('');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const [startOpen, setStartOpen] = useState(false);
  const [startForm, setStartForm] = useState({ instance: '', phone: '', name: '', message: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const inboxParams = useMemo(
    () => ({
      status: statusFilter,
      q: debouncedSearch || undefined,
      instance_id: instanceFilter === 'all' ? undefined : instanceFilter,
    }),
    [statusFilter, debouncedSearch, instanceFilter]
  );

  const inboxQuery = useChatInbox(inboxParams, { refetchInterval: 15000 });
  const instancesQuery = useChatInstances();
  const messagesQuery = useChatMessages(selectedId ?? undefined, { refetchInterval: 8000 });

  const sendMutation = useSendChatMessage();
  const mediaMutation = useSendChatMedia();
  const toggleAiMutation = useToggleConversationAi();
  const startMutation = useStartConversation();

  const conversations = inboxQuery.data?.data ?? [];
  const activeConversation = messagesQuery.data?.conversation
    ?? conversations.find((item) => String(item.id) === String(selectedId))
    ?? null;

  const messages = messagesQuery.data?.data ?? [];

  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(String(conversations[0].id));
    }
  }, [conversations, selectedId]);

  useEffect(() => {
    if (code) {
      setMobileChatOpen(true);
    }
  }, [code]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedId]);

  const handleSend = async () => {
    const content = composer.trim();

    if (!content || !selectedId) return;

    setComposer('');

    try {
      await sendMutation.mutateAsync({ id: selectedId, message: content });
    } catch (error: any) {
      setComposer(content);
      toast({
        title: 'Falha ao enviar',
        description: error?.message || 'Verifique a conexão.',
        variant: 'destructive',
      });
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !selectedId) return;

    try {
      await mediaMutation.mutateAsync({ id: selectedId, file, message: composer.trim() });
      setComposer('');
      toast({ title: 'Mídia enviada' });
    } catch (error: any) {
      toast({
        title: 'Falha ao enviar mídia',
        description: error?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleToggleAi = async () => {
    if (!activeConversation) return;

    const paused = !(activeConversation.ai_paused || activeConversation.status === 'transferred');

    try {
      const result = await toggleAiMutation.mutateAsync({ id: activeConversation.id, paused });
      toast({ title: result.message });
    } catch (error: any) {
      toast({ title: 'Erro ao alternar IA', description: error?.message, variant: 'destructive' });
    }
  };

  const handleStart = async () => {
    if (!startForm.instance || digits(startForm.phone).length < 10 || !startForm.message.trim()) {
      toast({ title: 'Preencha conexão, número e mensagem', variant: 'destructive' });
      return;
    }

    try {
      const result = await startMutation.mutateAsync({
        whatsapp_instance_id: Number(startForm.instance),
        phone: startForm.phone,
        contact_name: startForm.name || undefined,
        message: startForm.message,
      });

      toast({ title: 'Conversa iniciada' });
      setStartOpen(false);
      setStartForm({ instance: '', phone: '', name: '', message: '' });
      setSelectedId(String(result.data.id));
      setMobileChatOpen(true);
    } catch (error: any) {
      toast({ title: 'Erro ao iniciar conversa', description: error?.message, variant: 'destructive' });
    }
  };

  const instances = instancesQuery.data?.data ?? [];
  const aiPaused = !!activeConversation && (activeConversation.ai_paused || activeConversation.status === 'transferred');

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chat de Atendimento</h1>
          <p className="text-sm text-muted-foreground">
            Converse com contatos do WhatsApp, assuma atendimentos e acompanhe as respostas da IA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => inboxQuery.refetch()} disabled={inboxQuery.isFetching}>
            <RefreshCw className={cn('mr-2 h-4 w-4', inboxQuery.isFetching && 'animate-spin')} />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setStartOpen(true)} disabled={instances.length === 0}>
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            Nova conversa
          </Button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-11rem)] min-h-[520px] overflow-hidden rounded-xl border bg-card shadow-sm">
        {/* Lista de conversas */}
        <aside
          className={cn(
            'flex w-full flex-col border-r md:w-[340px] md:shrink-0',
            mobileChatOpen && 'hidden md:flex'
          )}
        >
          <div className="space-y-2 border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome ou número"
                className="pl-9"
              />
            </div>

            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Em aberto</SelectItem>
                  <SelectItem value="transferred">Aguardando humano</SelectItem>
                  <SelectItem value="closed">Encerradas</SelectItem>
                  <SelectItem value="all">Todas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={instanceFilter} onValueChange={setInstanceFilter}>
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue placeholder="Conexão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas conexões</SelectItem>
                  {instances.map((instance) => (
                    <SelectItem key={instance.id} value={String(instance.id)}>
                      {instance.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className="flex-1">
            {inboxQuery.isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground">
                <Headset className="h-8 w-8 opacity-40" />
                Nenhuma conversa encontrada.
              </div>
            ) : (
              conversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  active={String(conversation.id) === String(selectedId)}
                  onClick={() => {
                    setSelectedId(String(conversation.id));
                    setMobileChatOpen(true);
                  }}
                />
              ))
            )}
          </ScrollArea>
        </aside>

        {/* Conversa */}
        <section className={cn('flex min-w-0 flex-1 flex-col', !mobileChatOpen && 'hidden md:flex')}>
          {!activeConversation ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="rounded-full bg-muted p-5">
                <Headset className="h-9 w-9 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Selecione uma conversa</p>
                <p className="text-sm text-muted-foreground">
                  Escolha um contato na lista para visualizar o histórico e responder.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Cabeçalho */}
              <div className="flex items-center gap-3 border-b px-3 py-2.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileChatOpen(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                    {initials(activeConversation.contact_name, activeConversation.contact_phone)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {activeConversation.contact_name || formatPhoneBR(activeConversation.contact_phone)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {formatPhoneBR(activeConversation.contact_phone)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Smartphone className="h-3 w-3" />
                      {activeConversation.whatsapp_instance?.display_name
                        || activeConversation.whatsappInstance?.display_name
                        || 'Conexão'}
                    </span>
                    {activeConversation.agent?.name && (
                      <span className="inline-flex items-center gap-1">
                        <Bot className="h-3 w-3" />
                        {activeConversation.agent.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={aiPaused ? 'border-sky-500/40 text-sky-600' : 'border-emerald-500/40 text-emerald-600'}
                  >
                    {aiPaused ? (
                      <>
                        <Headset className="mr-1 h-3 w-3" /> Humano
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-1 h-3 w-3" /> IA ativa
                      </>
                    )}
                  </Badge>

                  <Button variant="outline" size="sm" onClick={handleToggleAi} disabled={toggleAiMutation.isPending}>
                    {aiPaused ? 'Reativar IA' : 'Assumir'}
                  </Button>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,theme(colors.muted/40),transparent_60%)] px-3 py-4">
                {messagesQuery.isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                    <Clock className="h-7 w-7 opacity-40" />
                    Sem mensagens ainda.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="border-t bg-background p-2.5">
                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                    className="hidden"
                    onChange={handleFile}
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={mediaMutation.isPending}
                    title="Anexar arquivo"
                  >
                    {mediaMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  </Button>

                  <Textarea
                    value={composer}
                    onChange={(event) => setComposer(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                    placeholder="Digite uma mensagem… (Enter envia, Shift+Enter quebra linha)"
                    className="max-h-32 min-h-[40px] flex-1 resize-none"
                  />

                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!composer.trim() || sendMutation.isPending}
                  >
                    {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>

                {aiPaused && (
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Headset className="h-3 w-3" />
                    A IA está pausada nesta conversa — você está respondendo como atendente humano.
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Nova conversa */}
      <Dialog open={startOpen} onOpenChange={setStartOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova conversa</DialogTitle>
            <DialogDescription>Inicie um atendimento a partir de um número de WhatsApp.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Conexão</Label>
              <Select
                value={startForm.instance}
                onValueChange={(value) => setStartForm((previous) => ({ ...previous, instance: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conexão" />
                </SelectTrigger>
                <SelectContent>
                  {instances.map((instance) => (
                    <SelectItem key={instance.id} value={String(instance.id)}>
                      {instance.display_name} {instance.status === 'connected' ? '· conectado' : '· desconectado'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start-phone">Número</Label>
                <Input
                  id="start-phone"
                  placeholder="5511999999999"
                  value={startForm.phone}
                  onChange={(event) => setStartForm((previous) => ({ ...previous, phone: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-name">Nome (opcional)</Label>
                <Input
                  id="start-name"
                  placeholder="Nome do contato"
                  value={startForm.name}
                  onChange={(event) => setStartForm((previous) => ({ ...previous, name: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-message">Primeira mensagem</Label>
              <Textarea
                id="start-message"
                rows={3}
                placeholder="Olá! Tudo bem? Como podemos ajudar?"
                value={startForm.message}
                onChange={(event) => setStartForm((previous) => ({ ...previous, message: event.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStartOpen(false)}>Cancelar</Button>
            <Button onClick={handleStart} disabled={startMutation.isPending}>
              {startMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Iniciar conversa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
