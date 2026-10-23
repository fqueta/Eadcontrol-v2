import { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useToast } from '@/hooks/use-toast';
import {
  useAiAgents,
  useAiInstances,
  useCreateAiAgent,
  useCreateKnowledgeBase,
  useDeleteAiAgent,
  useDeleteKnowledgeBase,
  useKnowledgeBases,
  useLlmProviders,
  useReindexKnowledgeBase,
  useSyncCatalog,
  useTestAiAgent,
  useUpdateAiAgent,
  useUpdateKnowledgeBase,
} from '@/hooks/aiAgents';
import type { AiAgent, AiAgentTestResult, AiKnowledgeBase } from '@/types/ai';
import { cn } from '@/lib/utils';

// ─── Constantes ──────────────────────────────────────────────────────────────

const DAYS: Array<{ key: string; label: string }> = [
  { key: 'mon', label: 'Segunda' },
  { key: 'tue', label: 'Terça' },
  { key: 'wed', label: 'Quarta' },
  { key: 'thu', label: 'Quinta' },
  { key: 'fri', label: 'Sexta' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
];

const DEFAULT_PROMPT = `Você é um atendente consultivo e cordial. Seu objetivo é entender a necessidade do contato, tirar dúvidas sobre cursos e produtos e encaminhar para matrícula quando houver interesse.

Regras:
- Cumprimente pelo nome quando disponível.
- Responda apenas o que estiver no contexto (catálogo e base de conhecimento).
- Se o contato pedir desconto, condições especiais ou reclamar, transfira para um atendente humano.`;

interface DayHours {
  enabled: boolean;
  start: string;
  end: string;
}

interface AgentFormState {
  name: string;
  whatsapp_instance_id: string;
  llm_provider: string;
  llm_model: string;
  is_active: boolean;
  system_prompt: string;
  welcome_message: string;
  temperature: number;
  max_tokens: number;
  transfer_keywords: string;
  handoff_message: string;
  offline_message: string;
  use_catalog: boolean;
  business_hours_enabled: boolean;
  timezone: string;
  hours: Record<string, DayHours>;
  knowledge_content: string;
}

function defaultHours(): Record<string, DayHours> {
  return DAYS.reduce<Record<string, DayHours>>((accumulator, day) => {
    accumulator[day.key] = {
      enabled: ['mon', 'tue', 'wed', 'thu', 'fri'].includes(day.key),
      start: '09:00',
      end: '18:00',
    };

    return accumulator;
  }, {});
}

function emptyForm(): AgentFormState {
  return {
    name: '',
    whatsapp_instance_id: '',
    llm_provider: 'openai',
    llm_model: '',
    is_active: true,
    system_prompt: DEFAULT_PROMPT,
    welcome_message: 'Olá! 👋 Sou o assistente virtual e posso ajudar com informações sobre cursos, produtos e matrículas. Como posso ajudar?',
    temperature: 0.7,
    max_tokens: 600,
    transfer_keywords: 'atendente, humano, falar com pessoa, suporte',
    handoff_message: 'Tudo bem! Vou chamar um atendente da nossa equipe para continuar com você. 😊',
    offline_message: 'Nosso atendimento está fora do horário comercial no momento. Deixe sua mensagem que responderemos em breve. 🙏',
    use_catalog: true,
    business_hours_enabled: false,
    timezone: 'America/Sao_Paulo',
    hours: defaultHours(),
    knowledge_content: '',
  };
}

function formFromAgent(agent: AiAgent): AgentFormState {
  const settings = agent.settings ?? {};
  const business = settings.business_hours ?? { enabled: false };
  const hours = defaultHours();

  Object.keys(hours).forEach((day) => {
    const range = (business as any)?.days?.[day];

    if (!range) {
      hours[day] = { ...hours[day], enabled: false };
      return;
    }

    const normalized = Array.isArray(range) ? range[0] : range;

    hours[day] = {
      enabled: true,
      start: normalized?.start || '09:00',
      end: normalized?.end || '18:00',
    };
  });

  const keywords = settings.transfer_keywords;

  return {
    name: agent.name ?? '',
    whatsapp_instance_id: agent.whatsapp_instance_id ? String(agent.whatsapp_instance_id) : '',
    llm_provider: agent.llm_provider ?? 'openai',
    llm_model: agent.llm_model ?? '',
    is_active: !!agent.is_active,
    system_prompt: agent.system_prompt ?? '',
    welcome_message: agent.welcome_message ?? '',
    temperature: Number(agent.temperature ?? 0.7),
    max_tokens: Number(agent.max_tokens ?? 600),
    transfer_keywords: Array.isArray(keywords) ? keywords.join(', ') : (keywords ?? ''),
    handoff_message: settings.handoff_message ?? '',
    offline_message: settings.offline_message ?? '',
    use_catalog: settings.use_catalog !== false,
    business_hours_enabled: !!business.enabled,
    timezone: (business as any)?.timezone ?? 'America/Sao_Paulo',
    hours,
    knowledge_content: '',
  };
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function AiAgents() {
  const { toast } = useToast();

  const agentsQuery = useAiAgents();
  const instancesQuery = useAiInstances();
  const providersQuery = useLlmProviders();

  const createMutation = useCreateAiAgent();
  const updateMutation = useUpdateAiAgent();
  const deleteMutation = useDeleteAiAgent();
  const testMutation = useTestAiAgent();
  const syncCatalogMutation = useSyncCatalog();

  const createKnowledgeMutation = useCreateKnowledgeBase();
  const updateKnowledgeMutation = useUpdateKnowledgeBase();
  const deleteKnowledgeMutation = useDeleteKnowledgeBase();
  const reindexKnowledgeMutation = useReindexKnowledgeBase();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('agent');
  const [form, setForm] = useState<AgentFormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<AiAgent | null>(null);

  const [kbDialogOpen, setKbDialogOpen] = useState(false);
  const [editingKb, setEditingKb] = useState<AiKnowledgeBase | null>(null);
  const [kbForm, setKbForm] = useState({ name: '', content: '', type: 'text' });
  const [deleteKbTarget, setDeleteKbTarget] = useState<AiKnowledgeBase | null>(null);

  const [testInput, setTestInput] = useState('');
  const [testHistory, setTestHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string; meta?: AiAgentTestResult }>>([]);

  const agents = agentsQuery.data?.data ?? [];
  const instances = instancesQuery.data?.data ?? [];
  const providers = providersQuery.data?.data ?? [];

  const knowledgeQuery = useKnowledgeBases(activeAgentId ?? undefined);
  const knowledgeBases = knowledgeQuery.data?.data ?? [];

  const activeAgent = useMemo(
    () => agents.find((agent) => agent.id === activeAgentId) ?? null,
    [agents, activeAgentId]
  );

  const activeProvider = providers.find((provider) => provider.name === form.llm_provider);
  const models = activeProvider?.models ?? {};

  useEffect(() => {
    if (!dialogOpen) return;

    if (activeAgentId) {
      const found = agents.find((agent) => agent.id === activeAgentId);
      if (found) {
        setForm(formFromAgent(found));
      }
    } else {
      setForm(emptyForm());
    }
  }, [dialogOpen, activeAgentId, agentsQuery.data]);

  useEffect(() => {
    if (!form.llm_model && activeProvider?.default_model) {
      setForm((previous) => ({ ...previous, llm_model: activeProvider.default_model as string }));
    }
  }, [activeProvider, form.llm_model]);

  const openCreate = () => {
    setActiveAgentId(null);
    setActiveTab('agent');
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (agent: AiAgent, tab = 'agent') => {
    setActiveAgentId(agent.id);
    setActiveTab(tab);
    setForm(formFromAgent(agent));
    setTestHistory([]);
    setDialogOpen(true);
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    whatsapp_instance_id: form.whatsapp_instance_id ? Number(form.whatsapp_instance_id) : null,
    llm_provider: form.llm_provider as any,
    llm_model: form.llm_model || activeProvider?.default_model || 'gpt-4o-mini',
    is_active: form.is_active,
    system_prompt: form.system_prompt,
    welcome_message: form.welcome_message,
    temperature: Number(form.temperature),
    max_tokens: Number(form.max_tokens),
    knowledge_name: 'Base de conhecimento principal',
    knowledge_content: form.knowledge_content.trim() || null,
    settings: {
      transfer_keywords: form.transfer_keywords
        .split(',')
        .map((keyword) => keyword.trim())
        .filter(Boolean),
      handoff_message: form.handoff_message,
      offline_message: form.offline_message,
      use_catalog: form.use_catalog,
      business_hours: {
        enabled: form.business_hours_enabled,
        timezone: form.timezone,
        days: Object.entries(form.hours).reduce<Record<string, { start: string; end: string }>>((accumulator, [day, value]) => {
          if (value.enabled) {
            accumulator[day] = { start: value.start, end: value.end };
          }
          return accumulator;
        }, {}),
      },
    },
  });

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Informe o nome do agente', variant: 'destructive' });
      return;
    }

    try {
      if (activeAgentId) {
        const result = await updateMutation.mutateAsync({ id: activeAgentId, payload: buildPayload() });
        toast({ title: result.message });
        setDialogOpen(false);
      } else {
        const result = await createMutation.mutateAsync(buildPayload());
        toast({ title: result.message });
        setDialogOpen(false);
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar agente',
        description: error?.message || 'Verifique os campos e tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: 'Agente removido' });
      setDeleteTarget(null);
    } catch (error: any) {
      toast({ title: 'Erro ao remover', description: error?.message, variant: 'destructive' });
    }
  };

  const handleTest = async () => {
    if (!activeAgentId || !testInput.trim()) return;

    const question = testInput.trim();
    setTestInput('');
    setTestHistory((previous) => [...previous, { role: 'user', content: question }]);

    try {
      const result = await testMutation.mutateAsync({ id: activeAgentId, message: question });
      setTestHistory((previous) => [
        ...previous,
        { role: 'assistant', content: result.data.content, meta: result.data },
      ]);
    } catch (error: any) {
      setTestHistory((previous) => [
        ...previous,
        { role: 'assistant', content: `Erro: ${error?.message || 'falha ao consultar o provedor.'}` },
      ]);
    }
  };

  const openKbDialog = (kb?: AiKnowledgeBase) => {
    if (kb) {
      setEditingKb(kb);
      setKbForm({ name: kb.name, content: kb.content ?? '', type: kb.type });
    } else {
      setEditingKb(null);
      setKbForm({ name: '', content: '', type: 'text' });
    }

    setKbDialogOpen(true);
  };

  const handleSaveKb = async () => {
    if (!activeAgentId || !kbForm.name.trim() || !kbForm.content.trim()) {
      toast({ title: 'Informe nome e conteúdo da base', variant: 'destructive' });
      return;
    }

    try {
      if (editingKb) {
        const result = await updateKnowledgeMutation.mutateAsync({
          agentId: activeAgentId,
          id: editingKb.id,
          payload: { name: kbForm.name, content: kbForm.content, type: kbForm.type },
        });

        toast({ title: result.message });
      } else {
        const result = await createKnowledgeMutation.mutateAsync({
          agentId: activeAgentId,
          payload: { name: kbForm.name, content: kbForm.content, type: kbForm.type },
        });

        toast({ title: result.message });
      }

      setKbDialogOpen(false);
      setEditingKb(null);
    } catch (error: any) {
      toast({ title: 'Erro ao salvar base', description: error?.message, variant: 'destructive' });
    }
  };

  const handleSyncCatalog = async () => {
    if (!activeAgentId) return;

    try {
      const result = await syncCatalogMutation.mutateAsync(activeAgentId);
      toast({ title: result.message });
    } catch (error: any) {
      toast({ title: 'Erro ao sincronizar catálogo', description: error?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agentes de IA</h1>
          <p className="text-sm text-muted-foreground">
            Configure a persona, o modelo, o horário de atendimento e a base de conhecimento (RAG).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => agentsQuery.refetch()} disabled={agentsQuery.isFetching}>
            <RefreshCw className={cn('mr-2 h-4 w-4', agentsQuery.isFetching && 'animate-spin')} />
            Atualizar
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo agente
          </Button>
        </div>
      </div>

      {agentsQuery.isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="rounded-full bg-muted p-4">
              <BrainCircuit className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Nenhum agente configurado</p>
              <p className="text-sm text-muted-foreground">
                Crie um agente para responder automaticamente no WhatsApp com base no seu catálogo e na sua base de conhecimento.
              </p>
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Criar agente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{agent.name}</CardTitle>
                      <CardDescription className="truncate text-xs">
                        {agent.llm_provider} · {agent.llm_model}
                      </CardDescription>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={agent.is_active ? 'border-emerald-500/40 text-emerald-600' : 'text-muted-foreground'}
                  >
                    {agent.is_active ? 'Ativo' : 'Pausado'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border bg-muted/40 p-2.5">
                    <p className="text-muted-foreground">Conexão</p>
                    <p className="truncate font-medium">{agent.instance?.display_name || 'Global (todas)'}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-2.5">
                    <p className="text-muted-foreground">Conversas abertas</p>
                    <p className="font-medium">{agent.open_conversations_count ?? 0}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-2.5">
                    <p className="text-muted-foreground">Bases de conhecimento</p>
                    <p className="font-medium">{agent.knowledge_bases_count ?? 0}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-2.5">
                    <p className="text-muted-foreground">Catálogo</p>
                    <p className="font-medium">{(agent.settings?.use_catalog ?? true) ? 'Incluído' : 'Desligado'}</p>
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => openEdit(agent)}>
                    <Settings2 className="mr-2 h-4 w-4" />
                    Configurar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(agent, 'knowledge')}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Conhecimento
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(agent, 'test')}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Testar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(agent)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog principal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] w-[96vw] max-w-5xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              {activeAgentId ? `Configurar ${activeAgent?.name ?? 'agente'}` : 'Novo agente de IA'}
            </DialogTitle>
            <DialogDescription>
              As respostas usam o prompt, o catálogo de cursos/produtos e a base de conhecimento cadastrada.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
            <div className="border-b px-6 pt-3">
              <TabsList className="grid w-full max-w-xl grid-cols-3">
                <TabsTrigger value="agent">
                  <Settings2 className="mr-2 h-4 w-4" />
                  Agente
                </TabsTrigger>
                <TabsTrigger value="knowledge" disabled={!activeAgentId}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Conhecimento
                </TabsTrigger>
                <TabsTrigger value="test" disabled={!activeAgentId}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Testar
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {/* Tab: Agente */}
              <TabsContent value="agent" className="mt-0 space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="agent-name">Nome do agente *</Label>
                    <Input
                      id="agent-name"
                      value={form.name}
                      onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
                      placeholder="Ex.: Assistente EAD"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Conexão WhatsApp</Label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.whatsapp_instance_id}
                      onChange={(event) => setForm((previous) => ({ ...previous, whatsapp_instance_id: event.target.value }))}
                    >
                      <option value="">Global (todas as conexões)</option>
                      {instances.map((instance) => (
                        <option key={instance.id} value={String(instance.id)}>
                          {instance.display_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Provedor de IA</Label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.llm_provider}
                      onChange={(event) => {
                        const provider = providers.find((item) => item.name === event.target.value);
                        setForm((previous) => ({
                          ...previous,
                          llm_provider: event.target.value,
                          llm_model: provider?.default_model ?? '',
                        }));
                      }}
                    >
                      {providers.map((provider) => (
                        <option key={provider.name} value={provider.name}>
                          {provider.label} {provider.configured ? '' : '(chave não configurada)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.llm_model}
                      onChange={(event) => setForm((previous) => ({ ...previous, llm_model: event.target.value }))}
                    >
                      <option value="">Padrão do provedor</option>
                      {Object.entries(models).map(([model, info]) => (
                        <option key={model} value={model}>
                          {info?.label ?? model}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Agente ativo</p>
                    <p className="text-xs text-muted-foreground">Quando desligado, nenhuma resposta automática é enviada.</p>
                  </div>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm((previous) => ({ ...previous, is_active: checked }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="system-prompt">Instruções do agente (persona e regras)</Label>
                  <Textarea
                    id="system-prompt"
                    rows={7}
                    value={form.system_prompt}
                    onChange={(event) => setForm((previous) => ({ ...previous, system_prompt: event.target.value }))}
                    placeholder="Descreva a persona, o tom de voz e o que o agente pode ou não responder."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcome">Mensagem de boas-vindas</Label>
                  <Textarea
                    id="welcome"
                    rows={2}
                    value={form.welcome_message}
                    onChange={(event) => setForm((previous) => ({ ...previous, welcome_message: event.target.value }))}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="keywords">Palavras-chave de transferência</Label>
                    <Input
                      id="keywords"
                      value={form.transfer_keywords}
                      onChange={(event) => setForm((previous) => ({ ...previous, transfer_keywords: event.target.value }))}
                      placeholder="atendente, humano, suporte"
                    />
                    <p className="text-xs text-muted-foreground">Separe por vírgula. Ao detectar, a IA pausa e transfere para humano.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="handoff">Mensagem de transferência</Label>
                    <Input
                      id="handoff"
                      value={form.handoff_message}
                      onChange={(event) => setForm((previous) => ({ ...previous, handoff_message: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="temperature">Criatividade (temperatura)</Label>
                    <div className="flex items-center gap-3">
                      <input
                        id="temperature"
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={form.temperature}
                        onChange={(event) => setForm((previous) => ({ ...previous, temperature: Number(event.target.value) }))}
                        className="flex-1 accent-primary"
                      />
                      <span className="w-10 text-right text-sm tabular-nums">{form.temperature.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-tokens">Limite de tokens da resposta</Label>
                    <Input
                      id="max-tokens"
                      type="number"
                      min={64}
                      max={8192}
                      value={form.max_tokens}
                      onChange={(event) => setForm((previous) => ({ ...previous, max_tokens: Number(event.target.value) }))}
                    />
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <Database className="h-4 w-4" />
                        Usar catálogo de cursos e produtos
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Inclui títulos, valores e links reais do Eadcontrol no contexto da IA.
                      </p>
                    </div>
                    <Switch
                      checked={form.use_catalog}
                      onCheckedChange={(checked) => setForm((previous) => ({ ...previous, use_catalog: checked }))}
                    />
                  </div>

                  {activeAgentId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={handleSyncCatalog}
                      disabled={syncCatalogMutation.isPending}
                    >
                      {syncCatalogMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Sincronizar catálogo na base RAG
                    </Button>
                  )}
                </div>

                <div className="rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="h-4 w-4" />
                        Horário de atendimento
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Fora do expediente o agente envia o aviso configurado e não chama a IA.
                      </p>
                    </div>
                    <Switch
                      checked={form.business_hours_enabled}
                      onCheckedChange={(checked) => setForm((previous) => ({ ...previous, business_hours_enabled: checked }))}
                    />
                  </div>

                  {form.business_hours_enabled && (
                    <div className="mt-4 space-y-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor="timezone" className="text-xs">Fuso horário</Label>
                          <Input
                            id="timezone"
                            value={form.timezone}
                            onChange={(event) => setForm((previous) => ({ ...previous, timezone: event.target.value }))}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="offline-message" className="text-xs">Mensagem fora do horário</Label>
                          <Input
                            id="offline-message"
                            value={form.offline_message}
                            onChange={(event) => setForm((previous) => ({ ...previous, offline_message: event.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        {DAYS.map((day) => {
                          const value = form.hours[day.key];

                          return (
                            <div key={day.key} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
                              <Switch
                                checked={value.enabled}
                                onCheckedChange={(checked) =>
                                  setForm((previous) => ({
                                    ...previous,
                                    hours: {
                                      ...previous.hours,
                                      [day.key]: { ...previous.hours[day.key], enabled: checked },
                                    },
                                  }))
                                }
                              />
                              <span className="w-20 text-xs font-medium">{day.label}</span>

                              <input
                                type="time"
                                value={value.start}
                                disabled={!value.enabled}
                                onChange={(event) =>
                                  setForm((previous) => ({
                                    ...previous,
                                    hours: {
                                      ...previous.hours,
                                      [day.key]: { ...previous.hours[day.key], start: event.target.value },
                                    },
                                  }))
                                }
                                className="h-8 rounded-md border border-input bg-background px-2 text-xs disabled:opacity-40"
                              />
                              <span className="text-xs text-muted-foreground">até</span>
                              <input
                                type="time"
                                value={value.end}
                                disabled={!value.enabled}
                                onChange={(event) =>
                                  setForm((previous) => ({
                                    ...previous,
                                    hours: {
                                      ...previous.hours,
                                      [day.key]: { ...previous.hours[day.key], end: event.target.value },
                                    },
                                  }))
                                }
                                className="h-8 rounded-md border border-input bg-background px-2 text-xs disabled:opacity-40"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {!activeAgentId && (
                  <div className="space-y-2 rounded-xl border border-dashed p-4">
                    <Label htmlFor="initial-knowledge">Base de conhecimento inicial (opcional)</Label>
                    <Textarea
                      id="initial-knowledge"
                      rows={4}
                      value={form.knowledge_content}
                      placeholder="Cole aqui FAQ, políticas, horários, formas de pagamento, etc."
                      onChange={(event) => {
                        const value = event.target.value;
                        setForm((previous) => ({ ...previous, knowledge_content: value }));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Será indexada em segundo plano com embeddings. Você também pode cadastrar outras bases depois.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Tab: Conhecimento */}
              <TabsContent value="knowledge" className="mt-0 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Base de conhecimento (RAG)</p>
                    <p className="text-xs text-muted-foreground">
                      Os trechos mais relevantes são enviados ao modelo junto com a pergunta.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleSyncCatalog} disabled={syncCatalogMutation.isPending}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sincronizar catálogo
                    </Button>
                    <Button size="sm" onClick={() => openKbDialog()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nova base
                    </Button>
                  </div>
                </div>

                {knowledgeQuery.isLoading ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : knowledgeBases.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                    <FileText className="h-7 w-7 opacity-40" />
                    Nenhuma base cadastrada.
                    <Button size="sm" variant="outline" onClick={() => openKbDialog()}>
                      Cadastrar primeira base
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {knowledgeBases.map((base) => (
                      <div key={base.id} className="rounded-xl border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{base.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <Badge variant="outline" className="text-[10px]">{base.type}</Badge>
                              <span>{base.chunks_count ?? 0} trechos</span>
                              <span>· {base.is_active ? 'ativa' : 'inativa'}</span>
                              {base.last_synced_at && <span>· {new Date(base.last_synced_at).toLocaleString('pt-BR')}</span>}
                            </div>
                          </div>

                          <Badge
                            variant="outline"
                            className={cn(
                              base.embeddings_status === 'completed' && 'border-emerald-500/40 text-emerald-600',
                              base.embeddings_status === 'processing' && 'border-amber-500/40 text-amber-600',
                              base.embeddings_status === 'failed' && 'border-destructive/40 text-destructive'
                            )}
                          >
                            {base.embeddings_status === 'processing' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            {base.embeddings_status === 'completed' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                            {base.embeddings_status === 'failed' && <TriangleAlert className="mr-1 h-3 w-3" />}
                            {base.embeddings_status}
                          </Badge>
                        </div>

                        {base.embeddings_error && (
                          <p className="mt-2 text-[11px] text-amber-600">{base.embeddings_error}</p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => openKbDialog(base)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              reindexKnowledgeMutation.mutate(
                                { agentId: activeAgentId as number, id: base.id },
                                {
                                  onSuccess: (result) => toast({ title: result.message }),
                                  onError: (error: any) =>
                                    toast({ title: 'Erro ao reindexar', description: error?.message, variant: 'destructive' }),
                                }
                              )
                            }
                            disabled={reindexKnowledgeMutation.isPending}
                          >
                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            Reindexar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteKbTarget(base)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab: Testar */}
              <TabsContent value="test" className="mt-0 flex h-full flex-col">
                <div className="rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Teste a persona, o catálogo e a base de conhecimento sem enviar mensagens pelo WhatsApp.
                </div>

                <ScrollArea className="mt-3 h-[42vh] rounded-xl border p-3">
                  {testHistory.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                      <Sparkles className="h-7 w-7 opacity-40" />
                      Faça uma pergunta para testar o agente.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {testHistory.map((entry, index) => (
                        <div key={index} className={cn('flex', entry.role === 'user' ? 'justify-end' : 'justify-start')}>
                          <div
                            className={cn(
                              'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                              entry.role === 'user'
                                ? 'rounded-br-md bg-primary text-primary-foreground'
                                : 'rounded-bl-md border bg-background'
                            )}
                          >
                            <p className="whitespace-pre-wrap">{entry.content}</p>

                            {entry.meta && (
                              <p className="mt-1 text-[10px] opacity-60">
                                {entry.meta.provider}/{entry.meta.model} · {entry.meta.tokens} tokens · {entry.meta.rag_chunks} trechos RAG
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <div className="mt-3 flex items-end gap-2">
                  <Textarea
                    value={testInput}
                    onChange={(event) => setTestInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleTest();
                      }
                    }}
                    rows={2}
                    placeholder="Ex.: Quais cursos vocês têm e qual o valor?"
                    className="resize-none"
                  />
                  <Button onClick={handleTest} disabled={testMutation.isPending || !testInput.trim()}>
                    {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </TabsContent>
            </div>

            <div className="flex items-center justify-between gap-2 border-t px-6 py-3">
              <span className="text-xs text-muted-foreground">
                {activeAgentId ? 'As alterações valem para as próximas mensagens.' : 'Após criar, você poderá cadastrar bases e testar.'}
              </span>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar agente
                </Button>
              </div>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Dialog base de conhecimento */}
      <Dialog open={kbDialogOpen} onOpenChange={setKbDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[96vw] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingKb ? 'Editar base de conhecimento' : 'Nova base de conhecimento'}</DialogTitle>
            <DialogDescription>
              Cole textos, FAQ ou políticas. A indexação gera embeddings em segundo plano.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="kb-name">Nome *</Label>
                <Input
                  id="kb-name"
                  value={kbForm.name}
                  onChange={(event) => setKbForm((previous) => ({ ...previous, name: event.target.value }))}
                  placeholder="Ex.: FAQ de matrículas"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={kbForm.type}
                  onChange={(event) => setKbForm((previous) => ({ ...previous, type: event.target.value }))}
                >
                  <option value="text">Texto livre</option>
                  <option value="faq">Perguntas frequentes</option>
                  <option value="url">Conteúdo de site</option>
                  <option value="catalog">Catálogo</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kb-content">Conteúdo *</Label>
              <Textarea
                id="kb-content"
                rows={12}
                value={kbForm.content}
                onChange={(event) => setKbForm((previous) => ({ ...previous, content: event.target.value }))}
                placeholder="Ex.:\nPergunta: Como faço a matrícula?\nResposta: ..."
              />
              <p className="text-xs text-muted-foreground">{kbForm.content.length.toLocaleString('pt-BR')} caracteres</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setKbDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSaveKb}
              disabled={createKnowledgeMutation.isPending || updateKnowledgeMutation.isPending}
            >
              {(createKnowledgeMutation.isPending || updateKnowledgeMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar e indexar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir agente */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover agente?</AlertDialogTitle>
            <AlertDialogDescription>
              O agente <strong>{deleteTarget?.name}</strong> e suas bases de conhecimento serão removidos.
              As conversas existentes permanecem no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Excluir base */}
      <AlertDialog open={!!deleteKbTarget} onOpenChange={(open) => !open && setDeleteKbTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover base de conhecimento?</AlertDialogTitle>
            <AlertDialogDescription>
              A base <strong>{deleteKbTarget?.name}</strong> e todos os seus trechos indexados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (!deleteKbTarget || !activeAgentId) return;

                deleteKnowledgeMutation.mutate(
                  { agentId: activeAgentId, id: deleteKbTarget.id },
                  {
                    onSuccess: () => {
                      toast({ title: 'Base removida' });
                      setDeleteKbTarget(null);
                    },
                    onError: (error: any) =>
                      toast({ title: 'Erro ao remover base', description: error?.message, variant: 'destructive' }),
                  }
                );
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
