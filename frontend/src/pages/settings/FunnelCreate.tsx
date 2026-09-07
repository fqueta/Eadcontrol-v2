import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Layers, Palette, CheckSquare, Search, Users, GraduationCap, Settings2, Check, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { FormActionBar } from '@/components/common/FormActionBar';
import { Separator } from '@/components/ui/separator';

import { FunnelStrategyFactory, FunnelEntityType } from '@/lib/funnelStrategies';
import { useCreateFunnel } from '@/hooks/funnels';
import { enrollmentSituationsService } from '@/services/enrollmentSituationsService';
import { EnrollmentSituation } from '@/types/enrollmentSituation';
import { CreateFunnelInput, FunnelSettings } from '@/types/pipelines';
import { toast } from '@/hooks/use-toast';

const COLOR_PRESETS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

const funnelSchema = z.object({
  name: z.string().min(1, 'Nome do funil é obrigatório'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida (use formato #RRGGBB)'),
  isActive: z.boolean().default(true),
  entity_type: z.enum(['clientes', 'matriculas']),
  managed_situations: z.array(z.union([z.number(), z.string()])).default([]),
  autoAdvance: z.boolean().default(true),
  requiresApproval: z.boolean().default(false),
  notificationEnabled: z.boolean().default(true),
});

type FunnelFormData = z.infer<typeof funnelSchema>;

export default function FunnelCreate() {
  const navigate = useNavigate();
  const createFunnelMutation = useCreateFunnel();

  const [situacoesList, setSituacoesList] = useState<EnrollmentSituation[]>([]);
  const [isLoadingSituacoes, setIsLoadingSituacoes] = useState(false);
  const [situationSearch, setSituationSearch] = useState('');

  const form = useForm<FunnelFormData>({
    resolver: zodResolver(funnelSchema),
    defaultValues: {
      name: '',
      description: '',
      color: '#3b82f6',
      isActive: true,
      entity_type: 'clientes',
      managed_situations: [],
      autoAdvance: true,
      requiresApproval: false,
      notificationEnabled: true,
    },
  });

  const watchEntityType = form.watch('entity_type');
  const watchColor = form.watch('color');
  const watchManagedSituations = form.watch('managed_situations') || [];

  // Carrega a lista de situações de matrícula quando a entidade for "matriculas"
  useEffect(() => {
    if (watchEntityType === 'matriculas' && situacoesList.length === 0 && !isLoadingSituacoes) {
      setIsLoadingSituacoes(true);
      enrollmentSituationsService.listSituations({ page: 1, per_page: 100 })
        .then((res: any) => {
          const data = res?.data ?? (Array.isArray(res) ? res : []);
          setSituacoesList(Array.isArray(data) ? data : []);
        })
        .catch(() => {})
        .finally(() => setIsLoadingSituacoes(false));
    }
  }, [watchEntityType, situacoesList.length, isLoadingSituacoes]);

  const filteredSituacoes = useMemo(() => {
    if (!situationSearch.trim()) return situacoesList;
    const s = situationSearch.toLowerCase();
    return situacoesList.filter(sit => sit.name.toLowerCase().includes(s));
  }, [situacoesList, situationSearch]);

  const onSubmit = async (data: FunnelFormData) => {
    try {
      const strategy = FunnelStrategyFactory.getStrategyByType(data.entity_type);
      const settingsObj: FunnelSettings = {
        autoAdvance: data.autoAdvance,
        requiresApproval: data.requiresApproval,
        notificationEnabled: data.notificationEnabled,
        entity_type: data.entity_type,
        place: strategy.placeValue,
        managed_situations: data.entity_type === 'matriculas' ? data.managed_situations : [],
      };

      const payload: CreateFunnelInput = {
        name: data.name,
        description: data.description || '',
        color: data.color,
        isActive: data.isActive,
        settings: settingsObj,
      };

      const created = await createFunnelMutation.mutateAsync(payload);
      toast({
        title: 'Funil criado com sucesso!',
        description: `O funil "${data.name}" foi cadastrado.`,
      });

      const redirectRoute = created?.id ? `/admin/settings/stages/edit/${created.id}` : '/admin/settings/stages';
      navigate(redirectRoute);
    } catch (err: any) {
      toast({
        title: 'Erro ao criar funil',
        description: err?.message || 'Falha ao salvar dados do funil.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto space-y-6 pb-32">
      {/* Header com navegação */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/settings/stages" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" /> Criar Novo Funil
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure o nome, cor, tipo de entidade e regras de automação do novo funil.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Card 1: Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" /> Informações Básicas
              </CardTitle>
              <CardDescription>
                Identificação principal e estilização visual do funil nas SPAs e Kanban.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="name" control={form.control} render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Nome do Funil *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: Funil de Vendas Corporativo ou Atendimento de Matrículas" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField name="description" control={form.control} render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva o propósito deste funil e os objetivos da pipeline..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Seletor de Cor */}
                <FormField name="color" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Palette className="h-4 w-4" /> Cor do Funil
                    </FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <Input type="color" className="w-12 h-10 p-1 cursor-pointer" {...field} />
                        <Input placeholder="#3b82f6" className="w-32 uppercase font-mono text-xs" {...field} />
                      </div>
                    </FormControl>
                    <div className="flex items-center gap-1.5 flex-wrap pt-2">
                      {COLOR_PRESETS.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          className="w-6 h-6 rounded-full border transition-transform hover:scale-110 flex items-center justify-center"
                          style={{ backgroundColor: hex }}
                          onClick={() => form.setValue('color', hex)}
                        >
                          {watchColor.toLowerCase() === hex.toLowerCase() && (
                            <Check className="h-3 w-3 text-white drop-shadow" />
                          )}
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Status Ativo */}
                <FormField name="isActive" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Funil Ativo</FormLabel>
                      <FormDescription>
                        Funis inativos ficam ocados nos seletores do Kanban.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Entidade Organizada */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" /> Tipo de Entidade Organizada
              </CardTitle>
              <CardDescription>
                Escolha a entidade que esta pipeline vai organizar e quais telas do sistema terão acesso a ela.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField name="entity_type" control={form.control} render={({ field }) => (
                <FormItem className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Opção 1: Clientes / Leads */}
                    <div
                      className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all flex items-start gap-3 ${
                        field.value === 'clientes'
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                      onClick={() => field.onChange('clientes')}
                    >
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Users className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold text-base flex items-center gap-2">
                          Clientes / Leads
                          {field.value === 'clientes' && <Badge variant="default" className="text-[10px]">Selecionado</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Organiza leads, oportunidades e propostas de clientes no Kanban de Vendas (<code className="text-[11px]">/admin/customers/leads</code>).
                        </p>
                      </div>
                    </div>

                    {/* Opção 2: Matrículas / Alunos */}
                    <div
                      className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all flex items-start gap-3 ${
                        field.value === 'matriculas'
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                      onClick={() => field.onChange('matriculas')}
                    >
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <GraduationCap className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold text-base flex items-center gap-2">
                          Matrículas / Alunos
                          {field.value === 'matriculas' && <Badge variant="secondary" className="text-[10px]">Selecionado</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Organiza matrículas de alunos no Kanban de Suporte (<code className="text-[11px]">/admin/support</code>), permitindo automações de situação.
                        </p>
                      </div>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Select Múltiplo de Situações para Matrículas */}
              {watchEntityType === 'matriculas' && (
                <div className="border rounded-xl p-4 bg-muted/20 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-5 w-5 text-primary" />
                      <div>
                        <h4 className="font-semibold text-sm">Situações de Matrícula Gerenciadas (Select Múltiplo)</h4>
                        <p className="text-xs text-muted-foreground">
                          Marque as situações cujas matrículas serão filtradas e organizadas por este funil.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          const allIds = situacoesList.map(s => s.id);
                          form.setValue('managed_situations', allIds);
                        }}
                      >
                        Selecionar Todas
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-muted-foreground"
                        onClick={() => {
                          form.setValue('managed_situations', []);
                        }}
                      >
                        Limpar Seleção
                      </Button>
                    </div>
                  </div>

                  {/* Busca interna */}
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar situação..."
                      value={situationSearch}
                      onChange={(e) => setSituationSearch(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>

                  {isLoadingSituacoes && (
                    <div className="text-sm text-muted-foreground py-4 text-center">Carregando situações de matrícula...</div>
                  )}

                  {!isLoadingSituacoes && filteredSituacoes.length === 0 && (
                    <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                      Nenhuma situação encontrada.
                    </div>
                  )}

                  {!isLoadingSituacoes && filteredSituacoes.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                      {filteredSituacoes.map((sit) => {
                        const isChecked = watchManagedSituations.some(id => String(id) === String(sit.id));
                        return (
                          <label
                            key={String(sit.id)}
                            className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-primary/10 border-primary/50 text-foreground font-medium'
                                : 'bg-background hover:bg-muted/50 border-border text-muted-foreground'
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                const current = (form.getValues('managed_situations') || []) as (string | number)[];
                                if (checked) {
                                  form.setValue('managed_situations', [...current, sit.id]);
                                } else {
                                  form.setValue(
                                    'managed_situations',
                                    current.filter(id => String(id) !== String(sit.id))
                                  );
                                }
                              }}
                            />
                            <span className="text-xs truncate" title={sit.name}>
                              {sit.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground flex items-center justify-between pt-1">
                    <span>Total selecionado: <strong>{watchManagedSituations.length}</strong> de {situacoesList.length} situações</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Configurações de Automação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings2 className="h-5 w-5 text-primary" /> Regras e Automações Globais
              </CardTitle>
              <CardDescription>
                Comportamentos do funil para transição automática de etapas e notificações.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField name="autoAdvance" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-semibold">Avanço Automático</FormLabel>
                      <FormDescription className="text-xs">
                        Avança cards automaticamente após ações configuradas.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField name="requiresApproval" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-semibold">Requer Aprovação</FormLabel>
                      <FormDescription className="text-xs">
                        Exige confirmação para mover cards de etapa.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField name="notificationEnabled" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-semibold">Notificações</FormLabel>
                      <FormDescription className="text-xs">
                        Dispara alertas ao responsável na mudança de etapa.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* FormActionBar para Salvar / Cancelar */}
          <FormActionBar
            mode="create"
            fixed={true}
            onCancel={() => navigate('/admin/settings/stages')}
            showCancel={true}
            showSubmit={true}
          />
        </form>
      </Form>
    </div>
  );
}
