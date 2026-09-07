import React, { useMemo, useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, Layers, ListOrdered, GripVertical, ChevronDown, ChevronRight, Settings2, LogOut, LogIn, Kanban, CheckSquare, MoreHorizontal, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FormActionBar } from '@/components/common/FormActionBar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

import { FunnelRecord, StageRecord, CreateFunnelInput, UpdateFunnelInput, CreateStageInput, UpdateStageInput, FunnelSettings, StageAction } from '@/types/pipelines';
import { useFunnelsList, useCreateFunnel, useUpdateFunnel, useDeleteFunnel, useStagesList, useCreateStage, useUpdateStage, useDeleteStage } from '@/hooks/funnels';
import { funnelsService } from '@/services/funnelsService';
import { enrollmentSituationsService } from '@/services/enrollmentSituationsService';
import { EnrollmentSituation } from '@/types/enrollmentSituation';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from '@/hooks/use-toast';
import { FunnelStrategyFactory, FunnelEntityType } from '@/lib/funnelStrategies';

interface InlineEditNameProps {
  value: string;
  onSave: (newValue: string) => Promise<void> | void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}

function InlineEditName({
  value,
  onSave,
  className = '',
  inputClassName = '',
  placeholder = 'Nome',
}: InlineEditNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmed = currentValue.trim();
    if (!trimmed || trimmed === value) {
      setIsEditing(false);
      setCurrentValue(value);
      return;
    }
    try {
      setIsSaving(true);
      await onSave(trimmed);
      setIsEditing(false);
    } catch (err) {
      setCurrentValue(value);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
      setCurrentValue(value);
    }
  };

  if (isEditing) {
    return (
      <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <Input
          ref={inputRef}
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={isSaving}
          placeholder={placeholder}
          className={`h-7 px-2 text-sm font-medium border-primary/50 focus-visible:ring-1 bg-background ${inputClassName}`}
        />
        {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />}
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      title="Clique para editar o nome"
      className={`group inline-flex items-center gap-1.5 cursor-pointer rounded px-1.5 py-0.5 -mx-1.5 hover:bg-muted/80 transition-colors ${className}`}
    >
      <span className="font-medium">{value}</span>
      <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 text-muted-foreground transition-opacity shrink-0" />
    </div>
  );
}

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

/**
 * Stages — Configuração de Funis e Etapas
 * pt-BR: Página para gerenciar funis (pipelines) e suas etapas.
 * en-US: Page to manage funnels (pipelines) and their stages.
 */
export default function Stages() {
  const navigate = useNavigate();

  // Listagem e estado
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [placeFilter, setPlaceFilter] = useState<string>('all');
  /**
   * debouncedSearch
   * pt-BR: Valor de busca com debounce para evitar filtragens a cada tecla.
   * en-US: Debounced search value to avoid filtering on every keystroke.
   */
  const debouncedSearch = useDebounce(search, 300);
  /**
   * useFunnelsList
   * pt-BR: Lista funis com opções seguras para evitar retries infinitos e refetch em foco.
   * en-US: Lists funnels with safe options to avoid infinite retries and refetch on focus.
   */
  const { data: funnelsData, isLoading: isLoadingFunnels, error: funnelsError } = useFunnelsList(
    { page, per_page: 10 },
    {
      staleTime: 5 * 60 * 1000, // 5min
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: (failureCount: number, error: any) => {
        // Evita retries para erros de cliente (4xx)
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 1;
      },
    }
  );
  
  /**
   * Notificação de erro de funis
   * pt-BR: Exibe toast quando a listagem de funis falha.
   * en-US: Shows a toast when funnels listing fails.
   */
  useEffect(() => {
    if (funnelsError) {
      const message = (funnelsError as any)?.message || 'Falha ao carregar funis';
      toast({ title: 'Erro ao carregar funis', description: message, variant: 'destructive' });
    }
  }, [funnelsError]);
  // Evita loops de renderização: memoiza o fallback [] para não criar nova referência a cada render
  const funnels = useMemo(() => funnelsData?.data ?? [], [funnelsData?.data]);

  // Estado local para reordenação de funis
  const [orderedFunnels, setOrderedFunnels] = useState<FunnelRecord[]>([]);

  useEffect(() => {
    setOrderedFunnels(funnels);
  }, [funnels]);

  const [selectedFunnel, setSelectedFunnel] = useState<FunnelRecord | null>(null);

  /**
   * expandedFunnelIds
   * pt-BR: Conjunto de IDs de funis atualmente expandidos (accordion global).
   * en-US: Set of funnel IDs currently expanded (global accordion state).
   */
  const [expandedFunnelIds, setExpandedFunnelIds] = useState<Set<string>>(new Set());

  /**
   * toggleExpandFunnel
   * pt-BR: Alterna a expansão de um funil específico.
   * en-US: Toggles expansion for a specific funnel.
   */
  const toggleExpandFunnel = (id: string) => {
    setExpandedFunnelIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /**
   * expandAllFunnels
   * pt-BR: Expande todos os funis filtrados.
   * en-US: Expands all filtered funnels.
   */
  const expandAllFunnels = () => {
    setExpandedFunnelIds(new Set(filteredFunnels.map(f => f.id)));
  };

  /**
   * collapseAllFunnels
   * pt-BR: Recolhe todos os funis (limpa expansão).
   * en-US: Collapses all funnels (clears expansion).
   */
  const collapseAllFunnels = () => {
    setExpandedFunnelIds(new Set());
  };

  // Filtragem client-side usando Strategy Pattern
  /**
   * filteredFunnels
   * pt-BR: Filtra funis pelo termo e estratégia de entidade selecionada.
   * en-US: Filters funnels by search term and selected entity strategy.
   */
  const filteredFunnels = useMemo(() => {
    let result = orderedFunnels;
    if (placeFilter !== 'all') {
      result = result.filter(f => {
        const strat = FunnelStrategyFactory.getStrategy(f);
        return strat.entityType === placeFilter || strat.placeValue === placeFilter;
      });
    }
    if (!debouncedSearch.trim()) return result;
    const s = debouncedSearch.toLowerCase();
    return result.filter(f => f.name.toLowerCase().includes(s) || (f.description || '').toLowerCase().includes(s));
  }, [orderedFunnels, debouncedSearch, placeFilter]);

  // Hooks de mutação para funis
  const createFunnelMutation = useCreateFunnel();
  const updateFunnelMutation = useUpdateFunnel();
  const deleteFunnelMutation = useDeleteFunnel();

  // Diálogo de Funil
  const [isFunnelModalOpen, setIsFunnelModalOpen] = useState(false);
  const [editingFunnel, setEditingFunnel] = useState<FunnelRecord | null>(null);

  const funnelSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor deve ser um hex (#rrggbb)'),
    isActive: z.boolean().optional(),
    // Settings estruturados
    autoAdvance: z.boolean().optional(),
    requiresApproval: z.boolean().optional(),
    notificationEnabled: z.boolean().optional(),
    entity_type: z.enum(['clientes', 'matriculas']),
    managed_situations: z.array(z.union([z.number(), z.string()])).optional(),
    place: z.enum(['vendas', 'atendimento']).optional(),
  });
  type FunnelFormData = z.infer<typeof funnelSchema>;
  const funnelForm = useForm<FunnelFormData>({
    resolver: zodResolver(funnelSchema),
    defaultValues: {
      name: '',
      description: '',
      color: '#3b82f6',
      isActive: true,
      autoAdvance: true,
      requiresApproval: false,
      notificationEnabled: true,
      entity_type: 'clientes',
      managed_situations: [],
      place: 'vendas',
    }
  });

  // Etapas: listagem e mutações
  const funnelId = selectedFunnel?.id || '';
  /**
   * stageListParams
   * pt-BR: Memoiza os parâmetros para evitar recriação/alteração de queryKey em cada render.
   * en-US: Memoizes params to avoid queryKey changes on every render.
   */
  const stageListParams = useMemo(() => ({ page: 1, per_page: 20 }), []);
  const { data: stagesData, isLoading: isLoadingStages } = useStagesList(
    funnelId,
    stageListParams,
    { refetchOnWindowFocus: false, refetchOnReconnect: false }
  );
  // Evita loops de renderização: memoiza o fallback [] para não criar nova referência a cada render
  const stages = useMemo(() => (stagesData as any)?.data ?? [], [stagesData]);

  // Estado local para reordenação de etapas
  const [orderedStages, setOrderedStages] = useState<StageRecord[]>([]);
  useEffect(() => {
    setOrderedStages(stages);
  }, [stages]);

  const createStageMutation = useCreateStage(funnelId);
  const updateStageMutation = useUpdateStage(funnelId);
  const deleteStageMutation = useDeleteStage(funnelId);

  // Diálogo de Etapa
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<StageRecord | null>(null);
  const [stageActionsTab, setStageActionsTab] = useState<'onEnter'|'onExit'>('onEnter');
  const [stageActionsOnEnter, setStageActionsOnEnter] = useState<StageAction[]>([]);
  const [stageActionsOnExit, setStageActionsOnExit] = useState<StageAction[]>([]);
  const [situacoesList, setSituacoesList] = useState<EnrollmentSituation[]>([]);
  const [isLoadingSituacoes, setIsLoadingSituacoes] = useState(false);

  const selectedFunnelStrategy = useMemo(() => {
    return selectedFunnel ? FunnelStrategyFactory.getStrategy(selectedFunnel) : null;
  }, [selectedFunnel]);

  const selectedFunnelManagedSituations = useMemo(() => {
    return selectedFunnel?.settings?.managed_situations || [];
  }, [selectedFunnel]);

  const managedSituationsListModal = useMemo(() => {
    if (!selectedFunnelManagedSituations || selectedFunnelManagedSituations.length === 0) return [];
    return situacoesList.filter((s) => selectedFunnelManagedSituations.includes(s.id));
  }, [situacoesList, selectedFunnelManagedSituations]);

  const otherSituationsListModal = useMemo(() => {
    if (!selectedFunnelManagedSituations || selectedFunnelManagedSituations.length === 0) return situacoesList;
    return situacoesList.filter((s) => !selectedFunnelManagedSituations.includes(s.id));
  }, [situacoesList, selectedFunnelManagedSituations]);

  const stageSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
    order: z.coerce.number().int().nonnegative().optional(),
    // Cor em formato hexadecimal (#RGB ou #RRGGBB)
    color: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Cor inválida (use #RRGGBB)')
      .optional(),
    active: z.boolean().optional(),
  });
  type StageFormData = z.infer<typeof stageSchema>;
  const stageForm = useForm<StageFormData>({
    resolver: zodResolver(stageSchema),
    defaultValues: { name: '', description: '', order: 0, color: '#3b82f6', active: true }
  });

  const fetchSituacoes = async () => {
    if (situacoesList.length > 0 || isLoadingSituacoes) return;
    setIsLoadingSituacoes(true);
    try {
      const res = await enrollmentSituationsService.listSituations({ page: 1, per_page: 100 });
      const data = (res as any)?.data ?? (Array.isArray(res) ? res : []);
      setSituacoesList(Array.isArray(data) ? data : []);
    } catch (e) {
      // silent
    } finally {
      setIsLoadingSituacoes(false);
    }
  };

  const addStageAction = (trigger: 'onEnter'|'onExit') => {
    const newAction: StageAction = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2,6),
      type: 'set_situacao',
      situacao_id: (situacoesList[0]?.id as number) || 0,
      enabled: true,
      order: trigger === 'onEnter' ? stageActionsOnEnter.length : stageActionsOnExit.length,
    };
    if (trigger === 'onEnter') setStageActionsOnEnter(prev => [...prev, newAction]);
    else setStageActionsOnExit(prev => [...prev, newAction]);
  };
  const removeStageAction = (trigger: 'onEnter'|'onExit', id: string) => {
    if (trigger === 'onEnter') setStageActionsOnEnter(prev => prev.filter(a=>a.id!==id));
    else setStageActionsOnExit(prev => prev.filter(a=>a.id!==id));
  };
  const updateStageAction = (trigger: 'onEnter'|'onExit', id: string, patch: Partial<StageAction>) => {
    if (trigger === 'onEnter') setStageActionsOnEnter(prev => prev.map(a=> a.id===id ? {...a, ...patch} as StageAction : a));
    else setStageActionsOnExit(prev => prev.map(a=> a.id===id ? {...a, ...patch} as StageAction : a));
  };

  // Handlers — Funis
  /**
   * openFunnelModal
   * pt-BR: Abre o modal de funil com dados padrão ou do funil editado.
   * en-US: Opens funnel modal with default values or the edited funnel.
   */
  const openFunnelModal = (funnel?: FunnelRecord) => {
    fetchSituacoes();
    if (funnel) {
      setEditingFunnel(funnel);
      const strategy = FunnelStrategyFactory.getStrategy(funnel);
      funnelForm.reset({
        name: funnel.name,
        description: funnel.description || '',
        color: funnel.color || '#3b82f6',
        isActive: (funnel.isActive ?? funnel.active) ?? true,
        autoAdvance: funnel.settings?.autoAdvance ?? true,
        requiresApproval: funnel.settings?.requiresApproval ?? false,
        notificationEnabled: funnel.settings?.notificationEnabled ?? true,
        entity_type: strategy.entityType,
        managed_situations: funnel.settings?.managed_situations || [],
        place: strategy.placeValue,
      });
    } else {
      setEditingFunnel(null);
      funnelForm.reset({
        name: '',
        description: '',
        color: '#3b82f6',
        isActive: true,
        autoAdvance: true,
        requiresApproval: false,
        notificationEnabled: true,
        entity_type: 'clientes',
        managed_situations: [],
        place: 'vendas',
      });
    }
    setIsFunnelModalOpen(true);
  };

  const closeFunnelModal = () => {
    setIsFunnelModalOpen(false);
    setEditingFunnel(null);
    funnelForm.reset();
  };

  /**
   * onSubmitFunnel
   * pt-BR: Cria/atualiza funil usando a estratégia correspondente.
   * en-US: Creates/updates funnel using the corresponding strategy.
   */
  const onSubmitFunnel = async (data: FunnelFormData) => {
    try {
      const strategy = FunnelStrategyFactory.getStrategyByType(data.entity_type);
      const settingsObj: FunnelSettings = {
        autoAdvance: data.autoAdvance ?? true,
        requiresApproval: data.requiresApproval ?? false,
        notificationEnabled: data.notificationEnabled ?? true,
        entity_type: data.entity_type,
        place: strategy.placeValue,
        managed_situations: data.entity_type === 'matriculas' ? (data.managed_situations || []) : [],
      };
      const payload: CreateFunnelInput | UpdateFunnelInput = {
        name: data.name,
        description: data.description || '',
        color: data.color,
        isActive: data.isActive ?? true,
        settings: settingsObj,
      };
      if (editingFunnel) {
        await updateFunnelMutation.mutateAsync({ id: editingFunnel.id, data: payload as UpdateFunnelInput });
      } else {
        await createFunnelMutation.mutateAsync(payload as CreateFunnelInput);
      }
      closeFunnelModal();
    } catch (err: any) {
      // pt-BR: Erros já são tratados pelo hook genérico com toast.
    }
  };

  // Handlers — Etapas
  /**
   * openStageModal
   * pt-BR: Abre o modal de etapa. Aceita opcionalmente o funil atual para evitar condição de corrida ao definir o estado.
   * en-US: Opens the stage modal. Optionally accepts the current funnel to avoid race conditions when setting state.
   */
  const openStageModal = (stage?: StageRecord, funnelArg?: FunnelRecord) => {
    const currentFunnel = funnelArg || selectedFunnel;
    if (!currentFunnel) {
      toast({ title: 'Selecione um funil', description: 'Escolha um funil para gerenciar etapas.' });
      return;
    }
    // Garanta que o funil selecionado seja definido quando fornecido diretamente
    if (funnelArg) setSelectedFunnel(funnelArg);
    fetchSituacoes();
    if (stage) {
      setEditingStage(stage);
      stageForm.reset({
        name: stage.name,
        description: stage.description || '',
        order: stage.order ?? 0,
        color: stage.color || currentFunnel.color || '#3b82f6',
        active: !!stage.active,
      });
      const acts = (stage as any).settings?.actions || (stage as any).config?.actions || { onEnter: [], onExit: [] };
      // normalizar caso venha como object sem arrays
      setStageActionsOnEnter(Array.isArray(acts.onEnter) ? acts.onEnter : []);
      setStageActionsOnExit(Array.isArray(acts.onExit) ? acts.onExit : []);
    } else {
      setEditingStage(null);
      stageForm.reset({ name: '', description: '', order: (stages.length || 0) + 1, color: currentFunnel.color || '#3b82f6', active: true });
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
    setStageActionsOnEnter([]);
    setStageActionsOnExit([]);
  };

  /**
   * Abrir modal de etapa para um funil específico
   * pt-BR: Seleciona o funil e abre a criação de etapa.
   * en-US: Selects the funnel and opens the stage creation modal.
   */
  const openStageForFunnel = (funnel: FunnelRecord) => {
    // pt-BR: Abre modal já com o funil passado, evitando alerta de seleção.
    // en-US: Opens modal with the provided funnel, avoiding selection alert.
    openStageModal(undefined, funnel);
  };

  /**
   * onSubmitStage
   * pt-BR: Submete criação/edição de etapa. Usa endpoints planos e envia `funnel_id` no payload.
   * en-US: Submits stage create/edit. Uses flat endpoints and includes `funnel_id` in payload.
   */
  const onSubmitStage = async (data: StageFormData) => {
    if (!selectedFunnel) return;
    // validar ações: filtrar incompletas
    const isValidAction = (a: StageAction) => {
      if (a.type === 'move_to_funnel') {
        return !!a.target_funnel_id && !!a.target_stage_id;
      }
      return !!a.situacao_id && Number(a.situacao_id) > 0;
    };
    const cleanOnEnter = stageActionsOnEnter.filter(isValidAction).map((a, i) => ({ ...a, order: i, enabled: a.enabled ?? true }));
    const cleanOnExit = stageActionsOnExit.filter(isValidAction).map((a, i) => ({ ...a, order: i, enabled: a.enabled ?? true }));
    const hasActions = cleanOnEnter.length > 0 || cleanOnExit.length > 0;
    try {
      const settingsPayload: any = hasActions ? { actions: { onEnter: cleanOnEnter, onExit: cleanOnExit } } : undefined;
      // quando editando, mesclar com settings existentes para não perder outros campos
      let finalSettings: any = settingsPayload;
      if (editingStage) {
        const existing = (editingStage as any).settings || {};
        if (settingsPayload) finalSettings = { ...existing, ...settingsPayload };
        else {
          // se não tem ações novas e estágio tinha actions, preservar ou limpar conforme estado
          // se usuário removeu todas, enviar actions vazias
          if (stageActionsOnEnter.length===0 && stageActionsOnExit.length===0 && existing.actions) {
            finalSettings = { ...existing, actions: { onEnter: [], onExit: [] } };
          } else {
            finalSettings = existing;
          }
        }
      } else if (settingsPayload) {
        finalSettings = settingsPayload;
      }
      const payload: CreateStageInput | UpdateStageInput = {
        name: data.name,
        description: data.description || '',
        order: data.order ?? 0,
        color: data.color || selectedFunnel.color || '#3b82f6',
        active: data.active ?? true,
        ...(finalSettings ? { settings: finalSettings } : {}),
      } as any;
      if (editingStage) {
        (payload as UpdateStageInput).funnel_id = selectedFunnel.id;
        await updateStageMutation.mutateAsync({ stageId: editingStage.id, data: payload as UpdateStageInput });
      } else {
        (payload as CreateStageInput).funnel_id = selectedFunnel.id;
        await createStageMutation.mutateAsync(payload as CreateStageInput);
      }
      closeStageModal();
    } catch (err: any) {
      // pt-BR: Erros já são tratados pelos hooks de etapas com toast.
    }
  };

  // Exclusão de funil/etapa
  const [deletingFunnel, setDeletingFunnel] = useState<FunnelRecord | null>(null);
  const [deletingStage, setDeletingStage] = useState<StageRecord | null>(null);

  /**
   * Reordena etapas localmente e persiste
   * pt-BR: Atualiza o array local e salva via endpoint de reorder ou update.
   * en-US: Updates local array then persists via reorder endpoint or update fallback.
   */
  const handleReorderStages = async (fromIndex: number, toIndex: number) => {
    if (!selectedFunnel) return;
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

    const list = [...orderedStages];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    setOrderedStages(list);

    try {
      const ids = list.map(s => s.id);
      await funnelsService.reorderStages(selectedFunnel.id, ids);
      toast({ title: 'Ordem de etapas atualizada', description: 'A nova ordem foi salva.' });
    } catch (err: any) {
      try {
        await Promise.all(list.map((s, idx) => funnelsService.updateStage(selectedFunnel.id, s.id, { order: idx + 1 })));
        toast({ title: 'Ordem de etapas atualizada', description: 'Salva via atualização individual.' });
      } catch (err2: any) {
        toast({ title: 'Erro ao salvar ordem', description: err2?.message || 'Não foi possível persistir a nova ordem.' });
      }
    }
  };

  // Drag and drop para etapas
  const [dragStageIndex, setDragStageIndex] = useState<number | null>(null);
  /**
   * onDragStartStageRow
   * pt-BR: Inicia o arraste de uma linha de etapa e define o índice de origem.
   * en-US: Starts dragging a stage row and sets the source index.
   */
  const onDragStartStageRow = (index: number) => (e: React.DragEvent<HTMLTableRowElement>) => {
    setDragStageIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };
  const [stageHoverIndex, setStageHoverIndex] = useState<number | null>(null);
  /**
   * onDragOverStageRow
   * pt-BR: Permite dropar sobre a linha e destaca o alvo.
   * en-US: Allows dropping over the row and highlights the target.
   */
  const onDragOverStageRow = (toIndex: number) => (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    setStageHoverIndex(toIndex);
    e.dataTransfer.dropEffect = 'move';
  };
  /**
   * onDropStageRow
   * pt-BR: Conclui o drop, reordena e limpa destaque.
   * en-US: Completes drop, reorders and clears highlight.
   */
  const onDropStageRow = (toIndex: number) => (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    const fromIndexStr = e.dataTransfer.getData('text/plain');
    const fromIndex = Number(fromIndexStr);
    handleReorderStages(fromIndex, toIndex);
    setDragStageIndex(null);
    setStageHoverIndex(null);
  };
  /**
   * onDragLeaveStageRow
   * pt-BR: Remove o destaque quando o cursor sai da linha.
   * en-US: Removes highlight when the cursor leaves the row.
   */
  const onDragLeaveStageRow = () => {
    setStageHoverIndex(null);
  };

  /**
   * Reordena array local de funis
   * pt-BR: Move o item arrastado para a posição alvo e persiste a ordem.
   * en-US: Moves dragged item to the target position and persists order.
   */
  const handleReorderFunnels = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

    const canDrag = !search.trim();
    if (!canDrag) return; // evita reordenar com filtro ativo

    const list = [...orderedFunnels];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    setOrderedFunnels(list);

    // Persiste nova ordem: tenta endpoint de reorder; se não existir, faz updateField 'order'
    try {
      const ids = list.map(f => f.id);
      await funnelsService.reorderFunnels(ids);
      toast({ title: 'Ordem atualizada', description: 'A nova ordem dos funis foi salva.' });
    } catch (err: any) {
      // Fallback: atualiza funil via PUT /funnels/:id com { order }
      try {
        await Promise.all(list.map((f, idx) => funnelsService.updateFunnel(f.id, { order: idx + 1 } as UpdateFunnelInput)));
        toast({ title: 'Ordem atualizada', description: 'Salvo via atualização individual.' });
      } catch (err2: any) {
        toast({ title: 'Erro ao salvar ordem', description: err2?.message || 'Não foi possível persistir a nova ordem.' });
      }
    }
  };

  // Suporte a HTML5 Drag & Drop
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [funnelHoverIndex, setFunnelHoverIndex] = useState<number | null>(null);

  /**
   * Handler de início do arraste
   */
  const onDragStartRow = (index: number) => (e: React.DragEvent<HTMLTableRowElement>) => {
    setDragIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  /**
   * Handler durante arraste (permite dropar e destaca alvo)
   */
  const onDragOverRow = (toIndex: number) => (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    setFunnelHoverIndex(toIndex);
    e.dataTransfer.dropEffect = 'move';
  };

  /**
   * Handler de drop na linha alvo
   */
  const onDropRow = (toIndex: number) => (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    const fromIndexStr = e.dataTransfer.getData('text/plain');
    const fromIndex = Number(fromIndexStr);
    handleReorderFunnels(fromIndex, toIndex);
    setDragIndex(null);
    setFunnelHoverIndex(null);
  };

  /**
   * Handler ao sair da linha durante arraste (remove destaque)
   */
  const onDragLeaveRow = () => {
    setFunnelHoverIndex(null);
  };

  /**
   * saveStageInline
   * pt-BR: Persiste alterações inline de uma etapa via hook de atualização.
   * en-US: Persists inline changes to a stage using the update hook.
   */
  const saveStageInline = async (stageId: string, partial: Partial<UpdateStageInput>) => {
    if (!selectedFunnel) return;
    try {
      await updateStageMutation.mutateAsync({ stageId, data: partial as UpdateStageInput });
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar etapa', description: err?.message || 'Falha ao salvar alterações.' });
    }
  };

  /**
   * setStageLocal
   * pt-BR: Atualiza o estado local de uma etapa com valores editados.
   * en-US: Updates local stage state with edited values.
   */
  const setStageLocal = (stageId: string, partial: Partial<StageRecord>) => {
    setOrderedStages(prev => prev.map(s => (s.id === stageId ? { ...s, ...partial } : s)));
  };

  const confirmDeleteFunnel = async () => {
    if (!deletingFunnel) return;
    try {
      await deleteFunnelMutation.mutateAsync(deletingFunnel.id);
      setDeletingFunnel(null);
      if (selectedFunnel?.id === deletingFunnel.id) setSelectedFunnel(null);
    } catch (err: any) {
      // pt-BR: Erros já são tratados pelo hook de exclusão com toast.
      // en-US: Errors are already handled by the delete hook with a toast.
    }
  };

  const confirmDeleteStage = async () => {
    if (!selectedFunnel || !deletingStage) return;
    try {
      await deleteStageMutation.mutateAsync(deletingStage.id);
      setDeletingStage(null);
    } catch (err: any) {
      // pt-BR: Erros já são tratados pelo hook de exclusão de etapa com toast.
      // en-US: Errors are already handled by the stage delete hook with a toast.
    }
  };

  /**
   * SelectedFunnelBanner
   * pt-BR: Exibe informações do funil atualmente selecionado dentro do modal de etapa.
   * en-US: Displays the currently selected funnel info within the stage modal.
   */
  const SelectedFunnelBanner: React.FC<{ funnel: FunnelRecord | null }> = ({ funnel }) => {
    if (!funnel) return null;
    const color = funnel.color || '#3b82f6';
    const areaLabel = funnel.settings?.place === 'atendimento' ? 'Atendimento' : 'Vendas';
    return (
      <div className="flex items-center gap-3 bg-muted border rounded-md p-3 mb-4">
        <span
          aria-label="Funnel color"
          className="inline-block h-4 w-4 rounded-full border"
          style={{ backgroundColor: color }}
        />
        <div className="text-sm">
          <div className="font-medium">
            Funil selecionado • Selected funnel: <span className="underline">{funnel.name}</span>
          </div>
          <div className="text-muted-foreground">
            Área/Area: {areaLabel} • ID: {funnel.id}
          </div>
        </div>
      </div>
    );
  };

  /**
   * renderFunnelAreaBadge
   * pt-BR: Renderiza um badge indicando a área do funil (Vendas/Atendimento).
   * en-US: Renders a badge indicating the funnel area (Sales/Support).
   */
  const renderFunnelAreaBadge = (funnel: FunnelRecord) => {
    const strategy = FunnelStrategyFactory.getStrategy(funnel);
    const managedCount = funnel.settings?.managed_situations?.length || 0;
    return (
      <div className="flex items-center gap-1">
        <Badge variant={strategy.badgeVariant} className="text-xs">
          {strategy.badgeLabel}
        </Badge>
        {strategy.supportsSituations && managedCount > 0 && (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            {managedCount} situação(ões)
          </Badge>
        )}
      </div>
    );
  };

  /**
   * FunnelStagesSection
   * pt-BR: Seção que lista as etapas de um funil específico.
   * en-US: Section that lists stages for a specific funnel.
   */
  const FunnelStagesSection: React.FC<{
    funnel: FunnelRecord;
    onAddStage: (f: FunnelRecord) => void;
    onEditStage: (f: FunnelRecord, s: StageRecord) => void;
    onDeleteStage: (f: FunnelRecord, s: StageRecord) => void;
    /**
     * isExpanded (controlled)
     * pt-BR: Estado controlado vindo do pai para expandir/recolher.
     * en-US: Controlled state from parent to expand/collapse.
     */
    isExpanded?: boolean;
    /**
     * onToggleExpand
     * pt-BR: Callback para alternar expansão do funil.
     * en-US: Callback to toggle funnel expansion.
     */
    onToggleExpand?: () => void;
  }> = ({ funnel, onAddStage, onEditStage, onDeleteStage, isExpanded = false, onToggleExpand }) => {

    /**
     * useStagesList
     * pt-BR: Busca as etapas do funil somente quando expandido (lazy-loading via enabled).
     * en-US: Fetches funnel stages only when expanded (lazy-loading via enabled).
     */
    /**
     * sectionParams
     * pt-BR: Memoiza os parâmetros por seção para evitar GET em cada ação.
     * en-US: Memoizes per-section params to avoid GET on every action.
     */
    const sectionParams = useMemo(() => ({ page: 1, per_page: 50 }), []);
    const updateStageMutation = useUpdateStage(funnel.id);
    const updateFunnelMutation = useUpdateFunnel();
    const { data: stagesData, isLoading } = useStagesList(
      funnel.id,
      sectionParams,
      { enabled: isExpanded, refetchOnWindowFocus: false, refetchOnReconnect: false }
    );
    const stages = useMemo(() => (stagesData as any)?.data ?? [], [stagesData]);
    const safeStages = useMemo(() => (stages || []).filter((s): s is StageRecord => !!s && (s as any).id !== undefined), [stages]);

    // Estado local para DnD
    const [localStages, setLocalStages] = useState<StageRecord[]>([]);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);

    useEffect(() => {
      // pt-BR: Garante que não haja itens indefinidos na lista.
      // en-US: Ensures there are no undefined items in the list.
      setLocalStages(safeStages);
    }, [safeStages]);

    /**
     * moveItem
     * pt-BR: Move um item na lista de 'from' para 'to'.
     * en-US: Move an item in the list from 'from' to 'to'.
     */
    const moveItem = (from: number, to: number) => {
      const next = [...localStages];
      const [moved] = next.splice(from, 1);
      // pt-BR: Se índice inválido, não insere item indefinido.
      // en-US: If index invalid, avoid inserting undefined item.
      if (moved === undefined) {
        return next;
      }
      next.splice(to, 0, moved);
      // Atualiza ordem localmente para refletir nova posição
      const withOrder = next.map((s, i) => ({ ...s, order: i + 1 }));
      setLocalStages(withOrder);
      return withOrder;
    };

    /**
     * Handlers de DnD
     * pt-BR: Tratadores para iniciar, sobrevoar, soltar e sair do drag.
     * en-US: Handlers to start, over, drop, and leave drag.
     */
    const onDragStartRow = (idx: number) => (e: React.DragEvent) => {
      setDragIndex(idx);
      e.dataTransfer.effectAllowed = 'move';
    };
    const onDragOverRow = (idx: number) => (e: React.DragEvent) => {
      e.preventDefault();
      setHoverIndex(idx);
    };
    const onDragLeaveRow = () => setHoverIndex(null);
    const onDropRow = (idx: number) => async (e: React.DragEvent) => {
      e.preventDefault();
      setHoverIndex(null);
      if (dragIndex === null) return;
      const next = moveItem(dragIndex, idx);
      setDragIndex(null);
      // Persiste a nova ordem com IDs
      try {
        await funnelsService.reorderStages(funnel.id, next.map(s => s.id));
        toast({ title: 'Etapas reordenadas', description: 'Nova ordem salva com sucesso.' });
      } catch (err: any) {
        toast({ title: 'Erro ao reordenar', description: err?.message || 'Falha ao salvar nova ordem.' });
      }
    };

    /**
     * renderStageColor
     * pt-BR: Renderiza apenas a bolinha da cor da etapa (sem texto).
     * en-US: Renders only the color dot for the stage (no text).
     */
    const renderStageColor = (color?: string) => {
      const resolved = color || funnel.color || '#3b82f6';
      return (
        <span
          aria-label="Stage color"
          className="inline-block h-4 w-4 rounded-full border"
          style={{ backgroundColor: resolved }}
        />
      );
    };

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleExpand?.()}
                className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                aria-expanded={isExpanded}
                aria-controls={`funnel-${funnel.id}-stages`}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <InlineEditName
                value={funnel.name}
                className="text-base font-semibold"
                onSave={async (newName) => {
                  await updateFunnelMutation.mutateAsync({
                    id: funnel.id,
                    data: { name: newName },
                  });
                  toast({ title: 'Nome do funil atualizado!' });
                }}
              />
              {renderFunnelAreaBadge(funnel)}
              <Badge variant="secondary" className="ml-2">{localStages.length} etapas</Badge>
            </div>
            <Button size="sm" onClick={() => onAddStage(funnel)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Adicionar Etapa
            </Button>
          </CardTitle>
          <CardDescription>
            {funnel.description || 'Etapas cadastradas para este funil.'}
          </CardDescription>
        </CardHeader>
        {isExpanded && (
        <CardContent id={`funnel-${funnel.id}-stages`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">&nbsp;</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-16">Ordem</TableHead>
                <TableHead className="w-20">Cor</TableHead>
                <TableHead className="w-28">Automações</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="text-right w-24 whitespace-nowrap">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-muted-foreground">Carregando etapas...</TableCell>
                </TableRow>
              )}
              {!isLoading && localStages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-muted-foreground">Nenhuma etapa cadastrada</TableCell>
                </TableRow>
              )}
              {!isLoading && localStages.map((stage, idx) => {
                const acts = (stage as any).settings?.actions || { onEnter: [], onExit: [] };
                const cEnter = Array.isArray(acts.onEnter) ? acts.onEnter.filter((a:any)=> a.enabled!==false).length : 0;
                const cExit = Array.isArray(acts.onExit) ? acts.onExit.filter((a:any)=> a.enabled!==false).length : 0;
                const totalActs = cEnter + cExit;
                return (
                <TableRow
                  key={stage.id}
                  draggable={true}
                  onDragStart={onDragStartRow(idx)}
                  onDragOver={onDragOverRow(idx)}
                  onDrop={onDropRow(idx)}
                  onDragLeave={onDragLeaveRow}
                  className={`${hoverIndex === idx ? 'bg-accent/20' : ''}`}
                >
                  <TableCell className="text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <InlineEditName
                      value={stage.name}
                      onSave={async (newName) => {
                        await updateStageMutation.mutateAsync({
                          stageId: stage.id,
                          data: { name: newName, funnel_id: funnel.id },
                        });
                        setLocalStages((prev) =>
                          prev.map((s) => (s.id === stage.id ? { ...s, name: newName } : s))
                        );
                        toast({ title: 'Nome da etapa atualizado!' });
                      }}
                    />
                    <div className="text-xs text-muted-foreground">ID: {stage.id}</div>
                  </TableCell>
                  <TableCell>{Number(stage.order ?? idx + 1)}</TableCell>
                  <TableCell>{renderStageColor(stage.color)}</TableCell>
                  <TableCell>
                    {totalActs > 0 ? (
                      <span className="flex gap-1">
                        {cEnter>0 && <Badge variant="outline" className="text-xs"><LogIn className="h-3 w-3 mr-1" />{cEnter}</Badge>}
                        {cExit>0 && <Badge variant="outline" className="text-xs"><LogOut className="h-3 w-3 mr-1" />{cExit}</Badge>}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(stage.active ?? true) ? (
                      <Badge variant="default">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        onClick={() => onEditStage(funnel, stage)}
                        title="Editar etapa"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onDeleteStage(funnel, stage)}
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
        </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="container mx-auto space-y-6 pb-24">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" /> Configurações de Funis
          </CardTitle>
          <CardDescription>Crie, edite e exclua funis para organizar suas pipelines de vendas e atendimento.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar funis..." className="pl-8" />
            </div>
            <Select value={placeFilter} onValueChange={setPlaceFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos os funis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os funis</SelectItem>
                <SelectItem value="clientes">Clientes / Leads</SelectItem>
                <SelectItem value="matriculas">Matrículas / Alunos</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => navigate('/admin/settings/stages/create')} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Novo Funil
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">&nbsp;</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[240px] whitespace-nowrap">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFunnels.map((funnel, idx) => (
                <TableRow
                  key={funnel.id}
                  className={`${selectedFunnel?.id === funnel.id ? 'bg-muted/50' : ''} ${funnelHoverIndex === idx ? 'bg-accent/20' : ''}`}
                  draggable={!debouncedSearch.trim()}
                  onDragStart={onDragStartRow(idx)}
                  onDragOver={onDragOverRow(idx)}
                  onDrop={onDropRow(idx)}
                  onDragLeave={onDragLeaveRow}
                >
                  <TableCell className="text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                  </TableCell>
                  <TableCell className="cursor-pointer" onClick={() => setSelectedFunnel(funnel)}>
                    <div className="flex items-center gap-2">
                      <InlineEditName
                        value={funnel.name}
                        onSave={async (newName) => {
                          await updateFunnelMutation.mutateAsync({
                            id: funnel.id,
                            data: { name: newName },
                          });
                          toast({ title: 'Nome do funil atualizado!' });
                        }}
                      />
                      {renderFunnelAreaBadge(funnel)}
                    </div>
                    <div className="text-xs text-muted-foreground">ID: {funnel.id}</div>
                  </TableCell>
                  <TableCell>{funnel.description || '-'}</TableCell>
                  <TableCell>
                    {(funnel.isActive ?? funnel.active) ? <Badge variant="default">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {(() => {
                        const strategy = FunnelStrategyFactory.getStrategy(funnel);
                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(strategy.targetRoute(funnel.id))}
                            title={`Gerenciar no Kanban (${strategy.label})`}
                            className="h-8 gap-1.5 text-xs font-medium border-primary/30 hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors"
                          >
                            <Kanban className="h-3.5 w-3.5" />
                            <span>Kanban</span>
                          </Button>
                        );
                      })()}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openStageForFunnel(funnel)}
                        title="Adicionar nova etapa a este funil"
                        className="h-8 gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline font-medium">+ Etapa</span>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setSelectedFunnel(selectedFunnel?.id === funnel.id ? null : funnel)}>
                            <ListOrdered className="h-4 w-4 mr-2 text-primary" />
                            {selectedFunnel?.id === funnel.id ? 'Ocultar Etapas' : 'Ver Etapas'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/admin/settings/stages/edit/${funnel.id}`)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar Funil
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeletingFunnel(funnel)} className="text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir Funil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredFunnels.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Nenhum funil encontrado</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {debouncedSearch.trim() && (
            <p className="text-xs text-muted-foreground mt-2">
              Arrastar e soltar desativado durante a busca. Limpe o filtro para reordenar.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5" /> Etapas por Funil
          </CardTitle>
          <CardDescription>Visualize as etapas agrupadas dentro de cada funil.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Button variant="outline" size="sm" onClick={expandAllFunnels}>Expandir todos</Button>
            <Button variant="outline" size="sm" onClick={collapseAllFunnels}>Recolher todos</Button>
          </div>
          {filteredFunnels.map((f) => (
            <FunnelStagesSection
              key={f.id}
              funnel={f}
              onAddStage={(funil) => openStageForFunnel(funil)}
              onEditStage={(funil, etapa) => {
                // pt-BR: Passe o funil diretamente para evitar alerta de seleção.
                // en-US: Pass funnel directly to avoid selection alert.
                openStageModal(etapa, funil);
              }}
              onDeleteStage={(funil, etapa) => {
                // pt-BR: Defina o funil e abra o diálogo de exclusão.
                // en-US: Set funnel then open delete dialog.
                setSelectedFunnel(funil);
                setDeletingStage(etapa);
              }}
              isExpanded={expandedFunnelIds.has(f.id)}
              onToggleExpand={() => toggleExpandFunnel(f.id)}
            />
          ))}
          {filteredFunnels.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum funil encontrado para listar etapas.</p>
          )}
        </CardContent>
      </Card>

      {/* Modal de Funil */}
      <Dialog open={isFunnelModalOpen} onOpenChange={setIsFunnelModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFunnel ? 'Editar Funil' : 'Novo Funil'}</DialogTitle>
            <DialogDescription>Defina nome, descrição, cor, configurações e status do funil.</DialogDescription>
          </DialogHeader>
          <Form {...funnelForm}>
            <form onSubmit={funnelForm.handleSubmit(onSubmitFunnel)} className="space-y-4">
              <FormField name="name" control={funnelForm.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Vendas B2B" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="description" control={funnelForm.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descrição do funil" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="color" control={funnelForm.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <FormControl>
                    <Input type="color" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="entity_type" control={funnelForm.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Entidade Organizada</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'clientes'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a entidade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FunnelStrategyFactory.getAllStrategies().map((strat) => (
                        <SelectItem key={strat.entityType} value={strat.entityType}>
                          <div className="flex flex-col py-0.5">
                            <span className="font-medium">{strat.label}</span>
                            <span className="text-xs text-muted-foreground">{strat.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {funnelForm.watch('entity_type') === 'matriculas' && (
                <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-medium text-sm">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      <span>Situações de Matrícula Gerenciadas (Select Múltiplo)</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => {
                          const allIds = situacoesList.map(s => s.id);
                          funnelForm.setValue('managed_situations', allIds);
                        }}
                      >
                        Todas
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => {
                          funnelForm.setValue('managed_situations', []);
                        }}
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecione quais situações de matrícula este funil irá exibir e organizar no Kanban de Suporte.
                  </p>

                  {isLoadingSituacoes && (
                    <div className="text-xs text-muted-foreground py-2">Carregando situações...</div>
                  )}

                  {!isLoadingSituacoes && situacoesList.length === 0 && (
                    <div className="text-xs text-muted-foreground py-2">Nenhuma situação encontrada no sistema.</div>
                  )}

                  {!isLoadingSituacoes && situacoesList.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-48 overflow-y-auto pr-1">
                      {situacoesList.map((sit) => {
                        const selectedList = (funnelForm.watch('managed_situations') || []) as (string | number)[];
                        const isChecked = selectedList.some(id => String(id) === String(sit.id));
                        return (
                          <label
                            key={String(sit.id)}
                            className="flex items-center gap-2 text-xs border rounded p-2 cursor-pointer hover:bg-accent/40 transition-colors"
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                const current = (funnelForm.getValues('managed_situations') || []) as (string | number)[];
                                if (checked) {
                                  funnelForm.setValue('managed_situations', [...current, sit.id]);
                                } else {
                                  funnelForm.setValue(
                                    'managed_situations',
                                    current.filter(id => String(id) !== String(sit.id))
                                  );
                                }
                              }}
                            />
                            <span className="font-medium text-foreground">{sit.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Settings estruturados em switches */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField name="autoAdvance" control={funnelForm.control} render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Avanço automático</FormLabel>
                    <FormControl>
                      <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="requiresApproval" control={funnelForm.control} render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Requer aprovação</FormLabel>
                    <FormControl>
                      <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="notificationEnabled" control={funnelForm.control} render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Notificações habilitadas</FormLabel>
                    <FormControl>
                      <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField name="isActive" control={funnelForm.control} render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel>Ativo</FormLabel>
                  <FormControl>
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormActionBar 
                mode="edit" 
                fixed={false}
                onCancel={closeFunnelModal}
                showCancel={true}
                showSubmit={true}
              />
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal de Etapa */}
      <Dialog open={isStageModalOpen} onOpenChange={setIsStageModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStage ? 'Editar Etapa' : 'Nova Etapa'}</DialogTitle>
            <DialogDescription>Configure nome, ordem, cor e automações de situação.</DialogDescription>
          </DialogHeader>
          {/* Feedback visual do funil selecionado */}
          <SelectedFunnelBanner funnel={selectedFunnel} />
          <Form {...stageForm}>
            <form onSubmit={stageForm.handleSubmit(onSubmitStage)} className="space-y-4">
              <FormField name="name" control={stageForm.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Qualificação" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="description" control={stageForm.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descrição da etapa" {...field} />
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
                    <FormLabel>Cor</FormLabel>
                    <FormControl>
                      <Input type="color" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField name="active" control={stageForm.control} render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel>Ativo</FormLabel>
                  <FormControl>
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Separator className="my-2" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Automações de Situação (Matrículas)</h4>
                  </div>
                  {selectedFunnelStrategy?.entityType === 'clientes' && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                      Funil de Clientes
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Ao arrastar o card para esta etapa, o sistema pode alterar a situação da matrícula. Configure ações para entrada e saída.</p>

                {selectedFunnelStrategy?.entityType === 'clientes' ? (
                  <div className="rounded-md bg-amber-50 dark:bg-amber-950/40 p-3 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300">
                    Este funil organiza <strong>Clientes (Leads)</strong>. Automações de situação de matrícula são aplicáveis em funis de <strong>Matrículas</strong>.
                  </div>
                ) : (
                  <Tabs value={stageActionsTab} onValueChange={(v)=> setStageActionsTab(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="onEnter" className="flex items-center gap-1"><LogIn className="h-3 w-3" /> Ao entrar ({stageActionsOnEnter.length})</TabsTrigger>
                      <TabsTrigger value="onExit" className="flex items-center gap-1"><LogOut className="h-3 w-3" /> Ao sair ({stageActionsOnExit.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="onEnter" className="space-y-3 mt-3">
                      {stageActionsOnEnter.length === 0 && <p className="text-xs text-muted-foreground border border-dashed rounded p-3 text-center">Nenhuma automação ao entrar. Clique em + para adicionar.</p>}
                      {stageActionsOnEnter.map((act) => (
                        <StageActionCard
                          key={act.id}
                          act={act}
                          trigger="onEnter"
                          funnelsList={funnels}
                          situacoesList={situacoesList}
                          managedSituationsList={managedSituationsListModal}
                          otherSituationsList={otherSituationsListModal}
                          isLoadingSituacoes={isLoadingSituacoes}
                          onUpdate={(patch) => updateStageAction('onEnter', act.id, patch)}
                          onRemove={() => removeStageAction('onEnter', act.id)}
                        />
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => addStageAction('onEnter')} className="w-full"><Plus className="h-4 w-4 mr-1" /> Adicionar ação ao entrar</Button>
                    </TabsContent>
                    <TabsContent value="onExit" className="space-y-3 mt-3">
                      {stageActionsOnExit.length === 0 && <p className="text-xs text-muted-foreground border border-dashed rounded p-3 text-center">Nenhuma automação ao sair.</p>}
                      {stageActionsOnExit.map((act) => (
                        <StageActionCard
                          key={act.id}
                          act={act}
                          trigger="onExit"
                          funnelsList={funnels}
                          situacoesList={situacoesList}
                          managedSituationsList={managedSituationsListModal}
                          otherSituationsList={otherSituationsListModal}
                          isLoadingSituacoes={isLoadingSituacoes}
                          onUpdate={(patch) => updateStageAction('onExit', act.id, patch)}
                          onRemove={() => removeStageAction('onExit', act.id)}
                        />
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => addStageAction('onExit')} className="w-full"><Plus className="h-4 w-4 mr-1" /> Adicionar ação ao sair</Button>
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

      {/* Confirmações de exclusão */}
      <AlertDialog open={!!deletingFunnel} onOpenChange={(open) => !open && setDeletingFunnel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir funil?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é irreversível e removerá o funil.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingFunnel(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFunnel}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingStage} onOpenChange={(open) => !open && setDeletingStage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etapa?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é irreversível e removerá a etapa do funil.</AlertDialogDescription>
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