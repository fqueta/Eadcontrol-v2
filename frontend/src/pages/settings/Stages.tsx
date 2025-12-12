import React, { useMemo, useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, Layers, ListOrdered, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { FormActionBar } from '@/components/common/FormActionBar';

import { FunnelRecord, StageRecord, CreateFunnelInput, UpdateFunnelInput, CreateStageInput, UpdateStageInput, FunnelSettings } from '@/types/pipelines';
import { useFunnelsList, useCreateFunnel, useUpdateFunnel, useDeleteFunnel, useStagesList, useCreateStage, useUpdateStage, useDeleteStage } from '@/hooks/funnels';
import { funnelsService } from '@/services/funnelsService';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from '@/hooks/use-toast';

/**
 * Stages — Configuração de Funis e Etapas
 * pt-BR: Página para gerenciar funis (pipelines) e suas etapas.
 * en-US: Page to manage funnels (pipelines) and their stages.
 */
export default function Stages() {
  // Listagem e estado
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
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

  // Filtragem client-side
  /**
   * filteredFunnels
   * pt-BR: Filtra funis pelo termo com debounce, melhorando UX em digitação rápida.
   * en-US: Filters funnels by the debounced term, improving UX on rapid typing.
   */
  const filteredFunnels = useMemo(() => {
    if (!debouncedSearch.trim()) return orderedFunnels;
    const s = debouncedSearch.toLowerCase();
    return orderedFunnels.filter(f => f.name.toLowerCase().includes(s) || (f.description || '').toLowerCase().includes(s));
  }, [orderedFunnels, debouncedSearch]);

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
    place: z.enum(['vendas', 'atendimento']),
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
  const stages = useMemo(() => stagesData?.data ?? [], [stagesData?.data]);

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

  // Handlers — Funis
  /**
   * openFunnelModal
   * pt-BR: Abre o modal de funil com dados padrão ou do funil editado.
   * en-US: Opens funnel modal with default values or the edited funnel.
   */
  const openFunnelModal = (funnel?: FunnelRecord) => {
    if (funnel) {
      setEditingFunnel(funnel);
      funnelForm.reset({
        name: funnel.name,
        description: funnel.description || '',
        color: funnel.color || '#3b82f6',
        isActive: (funnel.isActive ?? funnel.active) ?? true,
        autoAdvance: funnel.settings?.autoAdvance ?? true,
        requiresApproval: funnel.settings?.requiresApproval ?? false,
        notificationEnabled: funnel.settings?.notificationEnabled ?? true,
        place: funnel.settings?.place ?? 'vendas',
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
   * pt-BR: Cria/atualiza funil usando campos name, description, color, isActive e settings.
   * en-US: Creates/updates funnel using fields name, description, color, isActive and settings.
   */
  const onSubmitFunnel = async (data: FunnelFormData) => {
    try {
      // Monta objeto de configurações estruturado
      const settingsObj: FunnelSettings = {
        autoAdvance: data.autoAdvance ?? true,
        requiresApproval: data.requiresApproval ?? false,
        notificationEnabled: data.notificationEnabled ?? true,
        place: data.place,
      };
      const payload: CreateFunnelInput | UpdateFunnelInput = {
        name: data.name,
        description: data.description || '',
        color: data.color,
        isActive: data.isActive ?? true,
        settings: settingsObj,
      };
      if (editingFunnel) {
        // Atualiza funil com corpo corretamente estruturado
        // pt-BR: O hook genérico de update exige { id, data }. Antes não enviava 'data', causando ausência de body.
        // en-US: The generic update hook requires { id, data }. Previously 'data' was missing, causing an empty body.
        await updateFunnelMutation.mutateAsync({ id: editingFunnel.id, data: payload as UpdateFunnelInput });
      } else {
        await createFunnelMutation.mutateAsync(payload as CreateFunnelInput);
      }
      closeFunnelModal();
    } catch (err: any) {
      // pt-BR: Erros já são tratados pelo hook genérico (useGenericApi) com toast.
      // en-US: Errors are already handled by the generic hook with a toast.
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

    if (stage) {
      setEditingStage(stage);
      stageForm.reset({
        name: stage.name,
        description: stage.description || '',
        order: stage.order ?? 0,
        color: stage.color || currentFunnel.color || '#3b82f6',
        active: !!stage.active,
      });
    } else {
      setEditingStage(null);
      stageForm.reset({ name: '', description: '', order: (stages.length || 0) + 1, color: currentFunnel.color || '#3b82f6', active: true });
    }
    setIsStageModalOpen(true);
  };

  const closeStageModal = () => {
    setIsStageModalOpen(false);
    setEditingStage(null);
    stageForm.reset();
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
    try {
      const payload: CreateStageInput | UpdateStageInput = {
        name: data.name,
        description: data.description || '',
        order: data.order ?? 0,
        color: data.color || selectedFunnel.color || '#3b82f6',
        active: data.active ?? true,
      };
      if (editingStage) {
        // pt-BR: Envia o ID do funil para o novo endpoint plano de etapas
        // en-US: Send funnel ID for the new flat stages endpoint
        (payload as UpdateStageInput).funnel_id = selectedFunnel.id;
        await updateStageMutation.mutateAsync({ stageId: editingStage.id, data: payload as UpdateStageInput });
      } else {
        // pt-BR: Incluir `funnel_id` para criação via endpoint plano `/stages`
        // en-US: Include `funnel_id` for creation via flat endpoint `/stages`
        (payload as CreateStageInput).funnel_id = selectedFunnel.id;
        await createStageMutation.mutateAsync(payload as CreateStageInput);
      }
      closeStageModal();
    } catch (err: any) {
      // pt-BR: Erros já são tratados pelos hooks de etapas com toast.
      // en-US: Errors are already handled by stage hooks with a toast.
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
    const place = funnel.settings?.place === 'atendimento' ? 'Atendimento' : 'Vendas';
    const variant = funnel.settings?.place === 'atendimento' ? 'secondary' : 'default';
    return (
      <Badge variant={variant} className="text-xs">
        {place}
      </Badge>
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
    const { data: stagesData, isLoading } = useStagesList(
      funnel.id,
      sectionParams,
      { enabled: isExpanded, refetchOnWindowFocus: false, refetchOnReconnect: false }
    );
    const stages = useMemo(() => stagesData?.data ?? [], [stagesData?.data]);
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
            <button
              type="button"
              onClick={() => onToggleExpand?.()}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              aria-expanded={isExpanded}
              aria-controls={`funnel-${funnel.id}-stages`}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span>{funnel.name}</span>
              {renderFunnelAreaBadge(funnel)}
              <Badge variant="secondary" className="ml-2">{localStages.length} etapas</Badge>
            </button>
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
                <TableHead className="w-24">Ordem</TableHead>
                <TableHead className="w-32">Cor</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="text-right w-40">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">Carregando etapas...</TableCell>
                </TableRow>
              )}
              {!isLoading && localStages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">Nenhuma etapa cadastrada</TableCell>
                </TableRow>
              )}
              {!isLoading && localStages.map((stage, idx) => (
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
                    <div className="font-medium">{stage.name}</div>
                    <div className="text-xs text-muted-foreground">ID: {stage.id}</div>
                  </TableCell>
                  <TableCell>{Number(stage.order ?? idx + 1)}</TableCell>
                  <TableCell>{renderStageColor(stage.color)}</TableCell>
                  <TableCell>
                    {(stage.active ?? true) ? (
                      <Badge variant="default">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => onEditStage(funnel, stage)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDeleteStage(funnel, stage)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
          <CardDescription>Crie, edite e exclua funis para organizar sua pipeline de vendas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar funis..." className="pl-8" />
            </div>
            <Button onClick={() => openFunnelModal()} className="flex items-center gap-2">
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
                <TableHead className="text-right">Ações</TableHead>
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
                      <span className="font-medium">{funnel.name}</span>
                      {renderFunnelAreaBadge(funnel)}
                    </div>
                    <div className="text-xs text-muted-foreground">ID: {funnel.id}</div>
                  </TableCell>
                  <TableCell>{funnel.description || '-'}</TableCell>
                  <TableCell>
                    {(funnel.isActive ?? funnel.active) ? <Badge variant="default">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedFunnel(funnel)} title="Ver etapas deste funil">
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openStageForFunnel(funnel)} title="Adicionar etapa neste funil">
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openFunnelModal(funnel)} title="Editar funil">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeletingFunnel(funnel)} title="Excluir funil">
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
                <FormField name="place" control={funnelForm.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Área do funil</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a área" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vendas">Vendas</SelectItem>
                        <SelectItem value="atendimento">Atendimento</SelectItem>
                      </SelectContent>
                    </Select>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingStage ? 'Editar Etapa' : 'Nova Etapa'}</DialogTitle>
            <DialogDescription>Configure nome, ordem e cor.</DialogDescription>
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