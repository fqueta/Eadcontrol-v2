import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Layers, Palette, CheckSquare, Search, Users, GraduationCap, Settings2, Check, Sparkles, Plus, Pencil, Trash2, GripVertical, ListOrdered, Kanban, LogIn, LogOut } from 'lucide-react';
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
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { FormActionBar } from '@/components/common/FormActionBar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

import { FunnelStrategyFactory } from '@/lib/funnelStrategies';
import { useFunnelsList, useStagesList, useCreateStage, useUpdateStage, useDeleteStage, useUpdateFunnel } from '@/hooks/funnels';
import { funnelsService } from '@/services/funnelsService';
import { enrollmentSituationsService } from '@/services/enrollmentSituationsService';
import { EnrollmentSituation } from '@/types/enrollmentSituation';
import { FunnelRecord, StageRecord, CreateStageInput, UpdateStageInput, UpdateFunnelInput, FunnelSettings, StageAction } from '@/types/pipelines';
import { toast } from '@/hooks/use-toast';

const COLOR_PRESETS = [
  '#3b82f6',
  '#10b981',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#ef4444',
  '#14b8a6',
  '#06b6d4',
  '#64748b',
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

const stageSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  order: z.coerce.number().int().nonnegative().optional(),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Cor inválida').optional(),
  active: z.boolean().default(true),
});

type StageFormData = z.infer<typeof stageSchema>;

function StageActionCard({
  act,
  trigger,
  funnelsList,
  situacoesList,
  managedSituationsList,
  otherSituationsList,
  isLoadingSituacoes,
  onUpdate,
  onRemove,
}: {
  act: StageAction;
  trigger: 'onEnter' | 'onExit';
  funnelsList: FunnelRecord[];
  situacoesList: EnrollmentSituation[];
  managedSituationsList: EnrollmentSituation[];
  otherSituationsList: EnrollmentSituation[];
  isLoadingSituacoes: boolean;
  onUpdate: (patch: Partial<StageAction>) => void;
  onRemove: () => void;
}) {
  const [targetStages, setTargetStages] = useState<StageRecord[]>([]);
  const [isLoadingTargetStages, setIsLoadingTargetStages] = useState(false);

  const selectedTargetFunnelId = act.target_funnel_id ? String(act.target_funnel_id) : '';

  useEffect(() => {
    if (act.type === 'move_to_funnel' && selectedTargetFunnelId) {
      setIsLoadingTargetStages(true);
      funnelsService.listStages(selectedTargetFunnelId, { page: 1, per_page: 50 })
        .then((res: any) => {
          const list = res?.data ?? (Array.isArray(res) ? res : []);
          setTargetStages(Array.isArray(list) ? list : []);
        })
        .catch(() => setTargetStages([]))
        .finally(() => setIsLoadingTargetStages(false));
    } else {
      setTargetStages([]);
    }
  }, [act.type, selectedTargetFunnelId]);

  return (
    <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="w-full sm:w-64">
          <label className="text-[11px] font-medium text-muted-foreground">Tipo de Ação de Automação</label>
          <Select
            value={act.type || 'set_situacao'}
            onValueChange={(v) => onUpdate({ type: v as any })}
          >
            <SelectTrigger className="h-8 text-xs mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="set_situacao">🎯 Alterar Situação da Matrícula</SelectItem>
              <SelectItem value="move_to_funnel">🔀 Transferir para Outro Funil / Etapa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Switch
            checked={!!act.enabled}
            onCheckedChange={(v) => onUpdate({ enabled: v })}
          />
          <span className="text-xs">{act.enabled === false ? 'Inativa' : 'Ativa'}</span>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {(!act.type || act.type === 'set_situacao') && (
        <div>
          <label className="text-xs font-medium">Situação de Matrícula Destino</label>
          <Select
            value={act.situacao_id ? String(act.situacao_id) : ''}
            onValueChange={(v) => onUpdate({ situacao_id: Number(v) })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione a situação" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingSituacoes && <SelectItem value="0" disabled>Carregando...</SelectItem>}
              {!isLoadingSituacoes && situacoesList.length === 0 && <SelectItem value="0" disabled>Nenhuma situação</SelectItem>}
              {!isLoadingSituacoes && (
                <>
                  {managedSituationsList.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Situações Gerenciadas por este Funil
                      </SelectLabel>
                      {managedSituationsList.map((s) => (
                        <SelectItem key={String(s.id)} value={String(s.id)}>
                          ⭐ {s.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {otherSituationsList.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-xs text-muted-foreground">
                        Outras Situações
                      </SelectLabel>
                      {otherSituationsList.map((s) => (
                        <SelectItem key={String(s.id)} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {act.type === 'move_to_funnel' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t">
          <div>
            <label className="text-xs font-medium">Funil Destino *</label>
            <Select
              value={selectedTargetFunnelId}
              onValueChange={(v) => onUpdate({ target_funnel_id: v, target_stage_id: '' })}
            >
              <SelectTrigger className="mt-1 text-xs">
                <SelectValue placeholder="Selecione o funil destino" />
              </SelectTrigger>
              <SelectContent>
                {funnelsList.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium">Etapa Destino no Funil *</label>
            <Select
              value={act.target_stage_id ? String(act.target_stage_id) : ''}
              onValueChange={(v) => onUpdate({ target_stage_id: v })}
              disabled={!selectedTargetFunnelId || isLoadingTargetStages}
            >
              <SelectTrigger className="mt-1 text-xs">
                <SelectValue placeholder={isLoadingTargetStages ? 'Carregando etapas...' : 'Selecione a etapa'} />
              </SelectTrigger>
              <SelectContent>
                {targetStages.map((stg) => (
                  <SelectItem key={stg.id} value={String(stg.id)}>
                    {stg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FunnelEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const funnelId = id || '';

  const { data: allFunnelsData } = useFunnelsList({ page: 1, per_page: 50 });
  const allFunnels = useMemo(() => allFunnelsData?.data ?? [], [allFunnelsData?.data]);

  const [funnel, setFunnel] = useState<FunnelRecord | null>(null);
  const [isLoadingFunnel, setIsLoadingFunnel] = useState(true);

  const updateFunnelMutation = useUpdateFunnel();

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

  // Busca dados do funil ao montar
  useEffect(() => {
    if (!funnelId) return;
    setIsLoadingFunnel(true);
    funnelsService.getFunnel(funnelId)
      .then((data: any) => {
        if (data) {
          setFunnel(data);
          const strategy = FunnelStrategyFactory.getStrategy(data);
          form.reset({
            name: data.name || '',
            description: data.description || '',
            color: data.color || '#3b82f6',
            isActive: (data.isActive ?? data.active) ?? true,
            entity_type: strategy.entityType,
            managed_situations: data.settings?.managed_situations || [],
            autoAdvance: data.settings?.autoAdvance ?? true,
            requiresApproval: data.settings?.requiresApproval ?? false,
            notificationEnabled: data.settings?.notificationEnabled ?? true,
          });
        }
      })
      .catch((err) => {
        toast({ title: 'Erro ao carregar funil', description: err?.message, variant: 'destructive' });
      })
      .finally(() => setIsLoadingFunnel(false));
  }, [funnelId, form]);

  const watchEntityType = form.watch('entity_type');
  const watchColor = form.watch('color');
  const watchManagedSituations = form.watch('managed_situations') || [];

  const managedSituationsList = useMemo(() => {
    if (!watchManagedSituations || watchManagedSituations.length === 0) return [];
    return situacoesList.filter((s) => watchManagedSituations.some(id => String(id) === String(s.id)));
  }, [situacoesList, watchManagedSituations]);

  const otherSituationsList = useMemo(() => {
    if (!watchManagedSituations || watchManagedSituations.length === 0) return situacoesList;
    return situacoesList.filter((s) => !watchManagedSituations.some(id => String(id) === String(s.id)));
  }, [situacoesList, watchManagedSituations]);

  // Carrega situações de matrícula quando a entidade for "matriculas"
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

  // Etapas do funil
  const stageListParams = useMemo(() => ({ page: 1, per_page: 50 }), []);
  const { data: stagesData, isLoading: isLoadingStages } = useStagesList(funnelId, stageListParams, { enabled: !!funnelId });
  const stages = useMemo(() => (stagesData as any)?.data ?? [], [stagesData]);

  const createStageMutation = useCreateStage(funnelId);
  const updateStageMutation = useUpdateStage(funnelId);
  const deleteStageMutation = useDeleteStage(funnelId);

  // Estado local para reordenação de etapas
  const [orderedStages, setOrderedStages] = useState<StageRecord[]>([]);
  const [dragStageIndex, setDragStageIndex] = useState<number | null>(null);
  const [stageHoverIndex, setStageHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    setOrderedStages(stages);
  }, [stages]);

  // Modal de Etapa
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<StageRecord | null>(null);
  const [deletingStage, setDeletingStage] = useState<StageRecord | null>(null);
  const [stageActionsTab, setStageActionsTab] = useState<'onEnter' | 'onExit'>('onEnter');
  const [stageActionsOnEnter, setStageActionsOnEnter] = useState<StageAction[]>([]);
  const [stageActionsOnExit, setStageActionsOnExit] = useState<StageAction[]>([]);

  const stageForm = useForm<StageFormData>({
    resolver: zodResolver(stageSchema),
    defaultValues: { name: '', description: '', order: 0, color: '#3b82f6', active: true },
  });

  const openStageModal = (stage?: StageRecord) => {
    if (situacoesList.length === 0) {
      enrollmentSituationsService.listSituations({ page: 1, per_page: 100 })
        .then((res: any) => setSituacoesList(res?.data ?? (Array.isArray(res) ? res : [])))
        .catch(() => {});
    }
    if (stage) {
      setEditingStage(stage);
      stageForm.reset({
        name: stage.name,
        description: stage.description || '',
        order: stage.order ?? 0,
        color: stage.color || watchColor || '#3b82f6',
        active: !!stage.active,
      });
      const acts = (stage as any).settings?.actions || (stage as any).config?.actions || { onEnter: [], onExit: [] };
      setStageActionsOnEnter(Array.isArray(acts.onEnter) ? acts.onEnter : []);
      setStageActionsOnExit(Array.isArray(acts.onExit) ? acts.onExit : []);
    } else {
      setEditingStage(null);
      stageForm.reset({
        name: '',
        description: '',
        order: (stages.length || 0) + 1,
        color: watchColor || '#3b82f6',
        active: true,
      });
      setStageActionsOnEnter([]);
      setStageActionsOnExit([]);
    }
    setStageActionsTab('onEnter');
    setIsStageModalOpen(true);
  };

  const closeStageModal = () => {
    setIsStageModalOpen(false);
    setEditingStage(null);
    stageForm.reset();
  };

  const addStageAction = (trigger: 'onEnter' | 'onExit') => {
    const newAction: StageAction = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      type: 'set_situacao',
      situacao_id: (situacoesList[0]?.id as number) || 0,
      enabled: true,
      order: trigger === 'onEnter' ? stageActionsOnEnter.length : stageActionsOnExit.length,
    };
    if (trigger === 'onEnter') setStageActionsOnEnter(prev => [...prev, newAction]);
    else setStageActionsOnExit(prev => [...prev, newAction]);
  };

  const removeStageAction = (trigger: 'onEnter' | 'onExit', actionId: string) => {
    if (trigger === 'onEnter') setStageActionsOnEnter(prev => prev.filter(a => a.id !== actionId));
    else setStageActionsOnExit(prev => prev.filter(a => a.id !== actionId));
  };

  const updateStageAction = (trigger: 'onEnter' | 'onExit', actionId: string, patch: Partial<StageAction>) => {
    if (trigger === 'onEnter') setStageActionsOnEnter(prev => prev.map(a => a.id === actionId ? { ...a, ...patch } as StageAction : a));
    else setStageActionsOnExit(prev => prev.map(a => a.id === actionId ? { ...a, ...patch } as StageAction : a));
  };

  const isValidAction = (a: StageAction) => {
    const type = a.type || 'set_situacao';
    if (type === 'move_to_funnel' || (type as string) === 'transfer_funnel') {
      return !!a.target_funnel_id && !!a.target_stage_id;
    }
    return !!a.situacao_id && Number(a.situacao_id) > 0;
  };

  const onSubmitStage = async (data: StageFormData) => {
    const cleanOnEnter = stageActionsOnEnter.filter(isValidAction).map((a, i) => ({ ...a, order: i, enabled: a.enabled ?? true }));
    const cleanOnExit = stageActionsOnExit.filter(isValidAction).map((a, i) => ({ ...a, order: i, enabled: a.enabled ?? true }));
    const hasActions = cleanOnEnter.length > 0 || cleanOnExit.length > 0;

    try {
      const settingsPayload: any = hasActions ? { actions: { onEnter: cleanOnEnter, onExit: cleanOnExit } } : undefined;
      let finalSettings: any = settingsPayload;
      if (editingStage) {
        const existing = (editingStage as any).settings || {};
        if (settingsPayload) finalSettings = { ...existing, ...settingsPayload };
        else if (stageActionsOnEnter.length === 0 && stageActionsOnExit.length === 0 && existing.actions) {
          finalSettings = { ...existing, actions: { onEnter: [], onExit: [] } };
        } else {
          finalSettings = existing;
        }
      }

      const payload: CreateStageInput | UpdateStageInput = {
        name: data.name,
        description: data.description || '',
        order: data.order ?? 0,
        color: data.color || watchColor || '#3b82f6',
        active: data.active ?? true,
        funnel_id: funnelId,
        ...(finalSettings ? { settings: finalSettings } : {}),
      } as any;

      if (editingStage) {
        await updateStageMutation.mutateAsync({ stageId: editingStage.id, data: payload as UpdateStageInput });
        toast({ title: 'Etapa atualizada com sucesso!' });
      } else {
        await createStageMutation.mutateAsync(payload as CreateStageInput);
        toast({ title: 'Etapa criada com sucesso!' });
      }
      closeStageModal();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar etapa', description: err?.message, variant: 'destructive' });
    }
  };

  const confirmDeleteStage = async () => {
    if (!deletingStage) return;
    try {
      await deleteStageMutation.mutateAsync(deletingStage.id);
      setDeletingStage(null);
      toast({ title: 'Etapa excluída com sucesso' });
    } catch (err: any) {
      toast({ title: 'Erro ao excluir etapa', description: err?.message, variant: 'destructive' });
    }
  };

  const onSubmitFunnel = async (data: FunnelFormData) => {
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

      const payload: UpdateFunnelInput = {
        name: data.name,
        description: data.description || '',
        color: data.color,
        isActive: data.isActive,
        settings: settingsObj,
      };

      await updateFunnelMutation.mutateAsync({ id: funnelId, data: payload });
      toast({
        title: 'Funil atualizado com sucesso!',
        description: `As alterações do funil "${data.name}" foram salvas.`,
      });
      navigate('/admin/settings/stages');
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar funil',
        description: err?.message || 'Falha ao salvar dados do funil.',
        variant: 'destructive',
      });
    }
  };

  if (isLoadingFunnel) {
    return (
      <div className="container mx-auto p-8 text-center text-muted-foreground">
        Carregando dados do funil...
      </div>
    );
  }

  const currentStrategy = FunnelStrategyFactory.getStrategy(funnel);

  return (
    <div className="container mx-auto space-y-6 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/settings/stages" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{form.watch('name') || funnel?.name}</h1>
              <Badge variant={currentStrategy.badgeVariant}>{currentStrategy.badgeLabel}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">ID do Funil: {funnelId}</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(currentStrategy.targetRoute(funnelId))}
          className="gap-2"
        >
          <Kanban className="h-4 w-4" />
          <span>Ver no Kanban ({currentStrategy.label})</span>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitFunnel)} className="space-y-6">
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
                      <Input placeholder="Ex.: Funil de Vendas B2B" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField name="description" control={form.control} render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva o propósito deste funil..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Color Picker */}
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
                        Funis inativos ficam ocultos nos seletores do Kanban.
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

          {/* Card 2: Entidade Organizada & Situações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" /> Tipo de Entidade Organizada
              </CardTitle>
              <CardDescription>
                Altere a entidade e as situações de matrícula gerenciadas por este funil.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField name="entity_type" control={form.control} render={({ field }) => (
                <FormItem className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Clientes / Leads */}
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
                          Organiza leads, oportunidades e propostas no Kanban de Vendas (<code className="text-[11px]">/admin/customers/leads</code>).
                        </p>
                      </div>
                    </div>

                    {/* Matrículas / Alunos */}
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
                          Organiza matrículas de alunos no Kanban de Suporte (<code className="text-[11px]">/admin/support</code>).
                        </p>
                      </div>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Select Múltiplo para Matrículas */}
              {watchEntityType === 'matriculas' && (
                <div className="border rounded-xl p-4 bg-muted/20 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-5 w-5 text-primary" />
                      <div>
                        <h4 className="font-semibold text-sm">Situações de Matrícula Gerenciadas (Select Múltiplo)</h4>
                        <p className="text-xs text-muted-foreground">
                          Marque as situações cujas matrículas serão filtradas e exibidas no Kanban deste funil.
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

                  {/* Busca */}
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

          {/* Card 3: Configurações de Automação Globais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings2 className="h-5 w-5 text-primary" /> Regras e Automações Globais
              </CardTitle>
              <CardDescription>
                Comportamentos do funil para transição automática e alertas.
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

          {/* Card 4: Gerenciamento de Etapas do Funil */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ListOrdered className="h-5 w-5 text-primary" /> Etapas do Funil ({orderedStages.length})
                </CardTitle>
                <CardDescription>
                  Defina as etapas da pipeline, cores e automações de mudança de situação de matrícula.
                </CardDescription>
              </div>
              <Button type="button" onClick={() => openStageModal()} className="gap-2">
                <Plus className="h-4 w-4" /> Adicionar Etapa
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingStages && <p className="text-sm text-muted-foreground py-4">Carregando etapas...</p>}

              {!isLoadingStages && orderedStages.length === 0 && (
                <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground space-y-3">
                  <p className="text-sm">Nenhuma etapa cadastrada neste funil.</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => openStageModal()} className="gap-1">
                    <Plus className="h-4 w-4" /> Criar Primeira Etapa
                  </Button>
                </div>
              )}

              {!isLoadingStages && orderedStages.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">&nbsp;</TableHead>
                      <TableHead>Nome da Etapa</TableHead>
                      <TableHead className="w-20">Ordem</TableHead>
                      <TableHead className="w-24">Cor</TableHead>
                      <TableHead>Automações de Situação</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="text-right w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderedStages.map((stage, idx) => {
                      const acts = (stage as any).settings?.actions || (stage as any).config?.actions || { onEnter: [], onExit: [] };
                      const cEnter = Array.isArray(acts.onEnter) ? acts.onEnter.filter((a: any) => a.enabled !== false).length : 0;
                      const cExit = Array.isArray(acts.onExit) ? acts.onExit.filter((a: any) => a.enabled !== false).length : 0;
                      const totalActs = cEnter + cExit;

                      return (
                        <TableRow key={stage.id}>
                          <TableCell className="text-muted-foreground">
                            <GripVertical className="h-4 w-4" />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{stage.name}</div>
                            {stage.description && <div className="text-xs text-muted-foreground truncate max-w-xs">{stage.description}</div>}
                          </TableCell>
                          <TableCell className="text-xs font-mono">{stage.order ?? idx + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: stage.color || watchColor || '#3b82f6' }} />
                              <span className="text-xs font-mono uppercase">{stage.color || watchColor}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {totalActs > 0 ? (
                              <div className="flex gap-1.5 flex-wrap">
                                {cEnter > 0 && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <LogIn className="h-3 w-3 text-emerald-500" /> {cEnter} ao entrar
                                  </Badge>
                                )}
                                {cExit > 0 && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <LogOut className="h-3 w-3 text-amber-500" /> {cExit} ao sair
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {(stage.active ?? true) ? (
                              <Badge variant="default" className="text-[10px]">Ativa</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Inativa</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                onClick={() => openStageModal(stage)}
                                title="Editar etapa"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeletingStage(stage)}
                                title="Excluir etapa"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* FormActionBar para Salvar Alterações */}
          <FormActionBar
            mode="edit"
            fixed={true}
            onCancel={() => navigate('/admin/settings/stages')}
            showCancel={true}
            showSubmit={true}
          />
        </form>
      </Form>

      {/* Modal de Criar/Editar Etapa */}
      <Dialog open={isStageModalOpen} onOpenChange={setIsStageModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStage ? 'Editar Etapa' : 'Nova Etapa'}</DialogTitle>
            <DialogDescription>Configure nome, cor e automações de mudança de situação da matrícula.</DialogDescription>
          </DialogHeader>
          <Form {...stageForm}>
            <form onSubmit={stageForm.handleSubmit(onSubmitStage)} className="space-y-4">
              <FormField name="name" control={stageForm.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Etapa *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Qualificação ou Matrícula Confirmada" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="description" control={stageForm.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descrição da etapa..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField name="order" control={stageForm.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordem</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="color" control={stageForm.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor da Etapa</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input type="color" className="w-10 h-9 p-1" {...field} />
                        <Input placeholder="#3b82f6" className="font-mono text-xs uppercase" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField name="active" control={stageForm.control} render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel>Etapa Ativa</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Separator className="my-2" />

              {/* Automações de Situação de Matrícula */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Automações de Situação (Matrículas)</h4>
                  </div>
                  {watchEntityType === 'clientes' && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                      Funil de Clientes
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ao mover um card para esta etapa, o sistema pode alterar a situação da matrícula automaticamente. Configure ações para entrada e saída.
                </p>

                {watchEntityType === 'clientes' ? (
                  <div className="rounded-md bg-amber-50 dark:bg-amber-950/40 p-3 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300">
                    Este funil organiza <strong>Clientes (Leads)</strong>. Automações de situação de matrícula são aplicáveis em funis de <strong>Matrículas</strong>.
                  </div>
                ) : (
                  <Tabs value={stageActionsTab} onValueChange={(v) => setStageActionsTab(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="onEnter" className="flex items-center gap-1">
                        <LogIn className="h-3.5 w-3.5" /> Ao Entrar ({stageActionsOnEnter.length})
                      </TabsTrigger>
                      <TabsTrigger value="onExit" className="flex items-center gap-1">
                        <LogOut className="h-3.5 w-3.5" /> Ao Sair ({stageActionsOnExit.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="onEnter" className="space-y-3 mt-3">
                      {stageActionsOnEnter.length === 0 && (
                        <p className="text-xs text-muted-foreground border border-dashed rounded-lg p-4 text-center">
                          Nenhuma ação ao entrar nesta etapa. Clique abaixo para adicionar.
                        </p>
                      )}
                      {stageActionsOnEnter.map((act) => (
                        <StageActionCard
                          key={act.id}
                          act={act}
                          trigger="onEnter"
                          funnelsList={allFunnels}
                          situacoesList={situacoesList}
                          managedSituationsList={managedSituationsList}
                          otherSituationsList={otherSituationsList}
                          isLoadingSituacoes={isLoadingSituacoes}
                          onUpdate={(patch) => updateStageAction('onEnter', act.id, patch)}
                          onRemove={() => removeStageAction('onEnter', act.id)}
                        />
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => addStageAction('onEnter')} className="w-full gap-1">
                        <Plus className="h-4 w-4" /> Adicionar ação ao entrar
                      </Button>
                    </TabsContent>

                    <TabsContent value="onExit" className="space-y-3 mt-3">
                      {stageActionsOnExit.length === 0 && (
                        <p className="text-xs text-muted-foreground border border-dashed rounded-lg p-4 text-center">
                          Nenhuma ação ao sair desta etapa. Clique abaixo para adicionar.
                        </p>
                      )}
                      {stageActionsOnExit.map((act) => (
                        <StageActionCard
                          key={act.id}
                          act={act}
                          trigger="onExit"
                          funnelsList={allFunnels}
                          situacoesList={situacoesList}
                          managedSituationsList={managedSituationsList}
                          otherSituationsList={otherSituationsList}
                          isLoadingSituacoes={isLoadingSituacoes}
                          onUpdate={(patch) => updateStageAction('onExit', act.id, patch)}
                          onRemove={() => removeStageAction('onExit', act.id)}
                        />
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => addStageAction('onExit')} className="w-full gap-1">
                        <Plus className="h-4 w-4" /> Adicionar ação ao sair
                      </Button>
                    </TabsContent>
                  </Tabs>
                )}
              </div>

              <FormActionBar
                mode="edit"
                fixed={false}
                onCancel={closeStageModal}
                showCancel={true}
                showSubmit={true}
              />
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão de etapa */}
      <AlertDialog open={!!deletingStage} onOpenChange={(open) => !open && setDeletingStage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etapa "{deletingStage?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá a etapa e suas automações do funil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingStage(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteStage}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
