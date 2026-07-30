import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Layers, Plus, MoreHorizontal, Eye, FileText, UserRoundX, Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Combobox, useComboboxOptions } from '@/components/ui/combobox';
import { useFunnelsList, useStagesList } from '@/hooks/funnels';
import { useEnrollmentsList, useUpdateEnrollment } from '@/hooks/enrollments';
import { useAuth } from '@/contexts/AuthContext';
import { FunnelRecord, StageRecord } from '@/types/pipelines';
import { EnrollmentRecord } from '@/types/enrollments';
import { useToast } from '@/hooks/use-toast';

const hexToRgba = (hex?: string, alpha: number = 1): string | undefined => {
  if (!hex) return undefined;
  const normalized = hex.trim().replace('#', '');
  const isShort = normalized.length === 3;
  const rHex = isShort ? normalized[0] + normalized[0] : normalized.slice(0, 2);
  const gHex = isShort ? normalized[1] + normalized[1] : normalized.slice(2, 4);
  const bHex = isShort ? normalized[2] + normalized[2] : normalized.slice(4, 6);
  const r = parseInt(rHex, 16);
  const g = parseInt(gHex, 16);
  const b = parseInt(bHex, 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return undefined;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(alpha, 1))})`;
};

const formatBRL = (value: number): string => {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  } catch {
    return `R$ ${(value || 0).toFixed(2)}`;
  }
};

const getEnrollmentAmountBRL = (enroll: EnrollmentRecord): number => {
  const p = (enroll as any).preferencias || {};
  const c = (enroll as any).config || {};
  const normalizeToNumber = (v: any): number | undefined => {
    if (v === undefined || v === null) return undefined;
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string') {
      const s = v.replace(/\./g, '').replace(',', '.');
      const n = parseFloat(s);
      if (!Number.isNaN(n)) return n;
    }
    return undefined;
  };
  const rawCandidates = [
    p?.pipeline?.amount_brl,
    p?.pipeline?.valor_brl,
    c?.amount_brl,
    c?.valor_brl,
    (enroll as any)?.amount_brl,
    (enroll as any)?.subtotal,
    (enroll as any)?.total,
  ];
  const hit = rawCandidates
    .map((v) => normalizeToNumber(v))
    .find((v) => typeof v === 'number' && !Number.isNaN(v));
  return (hit as number) || 0;
};

const extractEnrollmentFunnelId = (enroll: EnrollmentRecord): string | null => {
  const p: any = (enroll as any).preferencias || {};
  const cfg: any = (enroll as any).config || {};
  const candidates = [
    (enroll as any)?.funnel_id,
    (enroll as any)?.funnelId,
    cfg?.funnelId,
    p?.pipeline?.funnelId,
    p?.funnelId,
  ];
  for (const v of candidates) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s.length > 0) return s;
  }
  return null;
};

const extractEnrollmentStageId = (enroll: EnrollmentRecord): string | null => {
  const p: any = (enroll as any).preferencias || {};
  const cfg: any = (enroll as any).config || {};
  const candidates = [
    (enroll as any)?.stage_id,
    (enroll as any)?.stageId,
    cfg?.stage_id,
    p?.pipeline?.stage_id,
    p?.stage_id,
  ];
  for (const v of candidates) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s.length > 0) return s;
  }
  return null;
};

export default function SupportLeads() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canManageFlow = Number(user?.permission_id ?? 999) <= 5;

  const { data: funnelsData, isLoading: funnelsLoading } = useFunnelsList({ page: 1, per_page: 50 });
  const funnels = useMemo(() => funnelsData?.data ?? [], [funnelsData?.data]);
  const supportFunnels = useMemo(() => funnels.filter((f) => f.settings?.place === 'atendimento'), [funnels]);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialFunnelFromUrl = useMemo(() => searchParams.get('funnel') || null, [searchParams]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(initialFunnelFromUrl);

  const firstSupportId = useMemo(() => {
    const id = supportFunnels[0]?.id;
    return id !== undefined && id !== null ? String(id) : null;
  }, [supportFunnels]);

  useEffect(() => {
    if (!selectedFunnelId && !initialFunnelFromUrl && firstSupportId) {
      setSelectedFunnelId(firstSupportId);
    }
  }, [selectedFunnelId, initialFunnelFromUrl, firstSupportId]);

  useEffect(() => {
    if (!selectedFunnelId) return;
    const next = new URLSearchParams(searchParams);
    next.set('funnel', selectedFunnelId);
    setSearchParams(next, { replace: true } as any);
  }, [selectedFunnelId, searchParams, setSearchParams]);

  const { data: stagesData, isLoading: stagesLoading } = useStagesList(
    selectedFunnelId || '',
    { page: 1, per_page: 100 },
    { enabled: !!selectedFunnelId }
  );
  const stages = useMemo(() => stagesData?.data ?? [], [stagesData?.data]);

  const selectedFunnel = useMemo(() => (
    funnels.find((f) => String(f.id) === String(selectedFunnelId || '')) ?? null
  ), [funnels, selectedFunnelId]);
  const selectedFunnelColor = selectedFunnel?.color;

  const [dense, setDense] = useState<boolean>(false);

  const { data: enrollmentsData } = useEnrollmentsList(
    { page: 1, per_page: 200, situacao: 'mat' },
    { enabled: !!selectedFunnelId }
  );
  const allEnrollments = useMemo<EnrollmentRecord[]>(() => (
    Array.isArray(enrollmentsData?.data) ? (enrollmentsData!.data as EnrollmentRecord[]) : []
  ), [enrollmentsData]);

  const [localEnrollments, setLocalEnrollments] = useState<EnrollmentRecord[]>([]);
  useEffect(() => {
    setLocalEnrollments(allEnrollments);
  }, [allEnrollments]);

  const updateEnrollmentMutation = useUpdateEnrollment();

  const enrollmentsByStage = useMemo(() => {
    const allowedStageIds = new Set(stages.map((s) => String(s.id)));
    const map = new Map<string, EnrollmentRecord[]>();
    for (const enroll of localEnrollments) {
      const fid = String(extractEnrollmentFunnelId(enroll) || '');
      if (selectedFunnelId) {
        if (!fid || fid !== String(selectedFunnelId)) continue;
      }
      const sid = String(extractEnrollmentStageId(enroll) || '');
      if (!sid) continue;
      if (!allowedStageIds.has(sid)) continue;
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid)!.push(enroll);
    }
    return map;
  }, [localEnrollments, stages, selectedFunnelId]);

  const [draggingEnrollment, setDraggingEnrollment] = useState<{ enrollmentId: string | null; fromStageId: string | null }>({ enrollmentId: null, fromStageId: null });
  const [dropTargetStageId, setDropTargetStageId] = useState<string | null>(null);
  const [recentlyMovedEnrollmentId, setRecentlyMovedEnrollmentId] = useState<string | null>(null);

  const onEnrollmentDragStart = (enroll: EnrollmentRecord) => {
    const fromId = extractEnrollmentStageId(enroll);
    setDraggingEnrollment({ enrollmentId: String(enroll.id), fromStageId: fromId });
  };

  const onEnrollmentDragEnd = () => {
    setDraggingEnrollment({ enrollmentId: null, fromStageId: null });
    setDropTargetStageId(null);
  };

  const onDropEnrollmentOnStage = (toStageId: string) => {
    if (!draggingEnrollment.enrollmentId) return;
    const idx = localEnrollments.findIndex((e) => String(e.id) === String(draggingEnrollment.enrollmentId));
    if (idx < 0) return;
    const base = localEnrollments[idx];
    const currentStageId = String(extractEnrollmentStageId(base) || '');
    if (currentStageId === String(toStageId)) {
      onEnrollmentDragEnd();
      return;
    }

    const next: EnrollmentRecord = {
      ...base,
      funnel_id: selectedFunnelId || (base as any)?.funnel_id || (base as any)?.funnelId || null as any,
      stage_id: toStageId as any,
      config: {
        ...(base as any).config,
        funnelId: selectedFunnelId || (base as any)?.config?.funnelId || null,
        stage_id: toStageId as any,
      } as any,
    };
    setLocalEnrollments((prev) => {
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
    setRecentlyMovedEnrollmentId(String(base.id));

    updateEnrollmentMutation.mutate({ id: String(base.id), data: { funnel_id: selectedFunnelId, stage_id: toStageId } as any }, {
      onSuccess: () => {
        setTimeout(() => setRecentlyMovedEnrollmentId(null), 400);
      },
      onError: () => {
        setLocalEnrollments((prev) => {
          const copy = [...prev];
          copy[idx] = base;
          return copy;
        });
        setRecentlyMovedEnrollmentId(null);
      },
    });

    onEnrollmentDragEnd();
  };

  const removeFromFlow = (enrollmentId: string) => {
    const idx = localEnrollments.findIndex((e) => String(e.id) === String(enrollmentId));
    if (idx < 0) return;
    const base = localEnrollments[idx];
    const updated: EnrollmentRecord = {
      ...base,
      funnel_id: null as any,
      stage_id: null as any,
      config: { ...(base as any).config, funnelId: null, stage_id: null } as any,
    };
    setLocalEnrollments((prev) => {
      const copy = [...prev];
      copy[idx] = updated;
      return copy;
    });
    updateEnrollmentMutation.mutate({ id: String(enrollmentId), data: { funnel_id: null, stage_id: null } as any }, {
      onError: () => {
        setLocalEnrollments((prev) => {
          const copy = [...prev];
          copy[idx] = base;
          return copy;
        });
      },
    });
  };

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addTargetStageId, setAddTargetStageId] = useState('');
  const [enrollmentSearchTerm, setEnrollmentSearchTerm] = useState('');

  const { data: searchEnrollmentsData } = useEnrollmentsList(
    { page: 1, per_page: 50, situacao: 'mat', search: enrollmentSearchTerm || undefined },
    { enabled: addDialogOpen }
  );
  const searchEnrollments = useMemo(() => (
    Array.isArray(searchEnrollmentsData?.data) ? (searchEnrollmentsData!.data as EnrollmentRecord[]) : []
  ), [searchEnrollmentsData]);

  const enrollmentInFlowIds = useMemo(() => {
    if (!selectedFunnelId) return new Set<string>();
    const ids = new Set<string>();
    for (const enroll of localEnrollments) {
      const fid = String(extractEnrollmentFunnelId(enroll) || '');
      if (fid === String(selectedFunnelId)) ids.add(String(enroll.id));
    }
    return ids;
  }, [localEnrollments, selectedFunnelId]);

  const addableEnrollments = useMemo(() => (
    searchEnrollments.filter((e) => !enrollmentInFlowIds.has(String(e.id)))
  ), [searchEnrollments, enrollmentInFlowIds]);

  const enrollmentComboboxOptions = useComboboxOptions(addableEnrollments, 'id', (e: EnrollmentRecord) => {
    const name = (e as any)?.cliente_nome || (e as any)?.student_name || (e as any)?.name || `Matrícula ${e.id}`;
    const course = (e as any)?.curso_nome || (e as any)?.course_name || '';
    return course ? `${name} - ${course}` : name;
  });

  const [selectedEnrollmentToAdd, setSelectedEnrollmentToAdd] = useState('');

  const addToFlow = async () => {
    if (!selectedEnrollmentToAdd || !addTargetStageId || !selectedFunnelId || !canManageFlow) return;
    try {
      await updateEnrollmentMutation.mutateAsync({
        id: selectedEnrollmentToAdd,
        data: { funnel_id: selectedFunnelId, stage_id: addTargetStageId } as any,
      });
      const added = searchEnrollments.find((e) => String(e.id) === String(selectedEnrollmentToAdd));
      if (added) {
        const entry: EnrollmentRecord = {
          ...added,
          funnel_id: selectedFunnelId as any,
          stage_id: addTargetStageId as any,
          config: { ...(added as any).config, funnelId: selectedFunnelId, stage_id: addTargetStageId } as any,
        };
        setLocalEnrollments((prev) => [...prev, entry]);
      }
      setSelectedEnrollmentToAdd('');
      setEnrollmentSearchTerm('');
      setAddDialogOpen(false);
      toast({ title: 'Matrícula adicionada ao flow' });
    } catch {
      toast({ title: 'Erro ao adicionar matrícula', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto space-y-6 pb-24">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" /> Atendimento de Alunos
          </CardTitle>
          <CardDescription>
            Kanban de acompanhamento de matrículas ativas. Gerencie o fluxo de atendimento dos alunos matriculados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="w-full max-w-xs">
              <label className="text-xs text-muted-foreground">Funil de Atendimento</label>
              <Select value={selectedFunnelId ?? undefined} onValueChange={setSelectedFunnelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um funil" />
                </SelectTrigger>
                <SelectContent>
                  {supportFunnels.map(f => (
                    <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Switch id="support-kanban-density" checked={dense} onCheckedChange={setDense} />
              <Label htmlFor="support-kanban-density" className="text-xs select-none">
                {dense ? 'Compacto' : 'Confortável'}
              </Label>
            </div>
          </div>

          {funnelsLoading && <p className="text-sm text-muted-foreground">Carregando funis...</p>}
          {!funnelsLoading && supportFunnels.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum funil de atendimento encontrado. Crie um funil com a área "atendimento" nas configurações.</p>
          )}

          {!!selectedFunnelId && (
            <div className="relative overflow-x-auto">
              <div
                className="grid gap-4 min-w-full"
                style={{ gridTemplateColumns: `repeat(${Math.max(stages.length, 1)}, minmax(260px, 1fr))` }}
              >
                {stagesLoading ? (
                  <div className="col-span-full p-4 text-sm text-muted-foreground">Carregando etapas...</div>
                ) : stages.length === 0 ? (
                  <div className="col-span-full p-4 text-sm text-muted-foreground">Nenhuma etapa cadastrada neste funil.</div>
                ) : (
                  stages.map((stage) => (
                    <SupportStageColumn
                      key={stage.id}
                      stage={stage}
                      funnelId={selectedFunnelId!}
                      funnelColor={selectedFunnelColor}
                      enrollments={enrollmentsByStage.get(String(stage.id)) || []}
                      dense={dense}
                      dropActive={dropTargetStageId === stage.id}
                      setDropTargetStageId={setDropTargetStageId}
                      onDragStart={onEnrollmentDragStart}
                      onDragEnd={onEnrollmentDragEnd}
                      onDropEnrollmentOnStage={onDropEnrollmentOnStage}
                      recentlyMovedEnrollmentId={recentlyMovedEnrollmentId}
                      canManageFlow={canManageFlow}
                      onRemoveFromFlow={removeFromFlow}
                      onAddToFlowClick={(stageId) => {
                        if (!canManageFlow) return;
                        setAddTargetStageId(stageId);
                        setSelectedEnrollmentToAdd('');
                        setEnrollmentSearchTerm('');
                        setAddDialogOpen(true);
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {addDialogOpen && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setAddDialogOpen(false)}>
              <div className="bg-background rounded-md border shadow-md w-[520px] max-w-full" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b">
                  <div className="font-medium">Adicionar matrícula ao flow</div>
                  <div className="text-xs text-muted-foreground">
                    {addTargetStageId && stages.find(s => String(s.id) === addTargetStageId)?.name
                      ? `Etapa: ${stages.find(s => String(s.id) === addTargetStageId)?.name}`
                      : 'Etapa: —'}
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-xs">Etapa de destino</label>
                    <Select value={addTargetStageId} onValueChange={setAddTargetStageId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a etapa" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs">Buscar matrícula</label>
                    <Combobox
                      options={enrollmentComboboxOptions}
                      value={selectedEnrollmentToAdd}
                      onValueChange={setSelectedEnrollmentToAdd}
                      placeholder="Pesquise pelo nome do aluno ou curso..."
                      searchPlaceholder="Digite para buscar..."
                      emptyText={enrollmentSearchTerm ? 'Nenhuma matrícula encontrada' : 'Digite para buscar matrículas'}
                      onSearch={(term) => setEnrollmentSearchTerm(term)}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="p-4 flex items-center justify-end gap-2 border-t">
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={addToFlow} disabled={!selectedEnrollmentToAdd || !addTargetStageId}>
                    Adicionar ao Flow
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SupportStageColumn({
  stage,
  funnelId,
  funnelColor,
  enrollments,
  dense,
  dropActive,
  setDropTargetStageId,
  onDragStart,
  onDragEnd,
  onDropEnrollmentOnStage,
  recentlyMovedEnrollmentId,
  canManageFlow,
  onRemoveFromFlow,
  onAddToFlowClick,
}: {
  stage: StageRecord;
  funnelId: string;
  funnelColor?: string | undefined;
  enrollments: EnrollmentRecord[];
  dense: boolean;
  dropActive: boolean;
  setDropTargetStageId: (id: string | null) => void;
  onDragStart: (enrollment: EnrollmentRecord) => void;
  onDragEnd: () => void;
  onDropEnrollmentOnStage: (toStageId: string) => void;
  recentlyMovedEnrollmentId?: string | null;
  canManageFlow: boolean;
  onRemoveFromFlow: (enrollmentId: string) => void;
  onAddToFlowClick: (stageId: string) => void;
}) {
  const stageColor = stage.color || funnelColor || '#CBD5E1';
  const totalCards = enrollments.length;
  const totalAmount = enrollments.reduce((sum, e) => sum + getEnrollmentAmountBRL(e), 0);
  const totalAmountBRL = formatBRL(totalAmount);

  return (
    <div
      className={`flex flex-col rounded-md border bg-background ${dropActive ? 'ring-2 ring-primary/50 bg-muted/20' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDropTargetStageId(stage.id); }}
      onDragLeave={() => setDropTargetStageId(null)}
      onDrop={() => onDropEnrollmentOnStage(String(stage.id))}
    >
      <div className="sticky top-0 z-10 bg-background">
        <div className="h-1 w-full rounded-t-md" style={{ backgroundColor: stageColor }} />
        <div className="flex items-center justify-between p-3 border-b" style={{ borderBottomColor: '#E5E7EB' }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-block h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: stageColor }} />
            <span className="font-medium text-sm">{stage.name}</span>
            <Badge variant="secondary" className="shrink-0">{totalCards}</Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">{totalAmountBRL}</span>
            {canManageFlow && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => onAddToFlowClick(String(stage.id))}
                title="Adicionar matrícula a esta etapa"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className={`p-3 min-h-[360px] max-h-[70vh] overflow-y-auto ${dense ? 'space-y-1.5' : 'space-y-2'}`}>
        {enrollments.length === 0 ? (
          <div className="text-xs text-muted-foreground rounded-md border border-dashed p-3">Nenhuma matrícula nesta etapa.</div>
        ) : (
          enrollments.map((e) => (
            <SupportEnrollmentCard
              key={String(e.id)}
              enrollment={e}
              dense={dense}
              funnelId={funnelId}
              onDragStart={() => onDragStart(e)}
              onDragEnd={onDragEnd}
              isRecentlyMoved={recentlyMovedEnrollmentId === String(e.id)}
              canManageFlow={canManageFlow}
              onRemoveFromFlow={onRemoveFromFlow}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SupportEnrollmentCard({
  enrollment,
  dense,
  funnelId,
  onDragStart,
  onDragEnd,
  isRecentlyMoved,
  canManageFlow,
  onRemoveFromFlow,
}: {
  enrollment: EnrollmentRecord;
  dense?: boolean;
  funnelId?: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isRecentlyMoved?: boolean;
  canManageFlow: boolean;
  onRemoveFromFlow: (enrollmentId: string) => void;
}) {
  const navigate = useNavigate();
  const title = (enrollment as any)?.cliente_nome || (enrollment as any)?.student_name || (enrollment as any)?.name || `Matrícula ${enrollment.id}`;
  const course = (enrollment as any)?.curso_nome || (enrollment as any)?.course_name || (enrollment as any)?.curso || '';
  const turma = (enrollment as any)?.turma_nome || '';
  const status = (enrollment as any)?.status || '—';
  const amountBRL = formatBRL(getEnrollmentAmountBRL(enrollment));

  const goToView = () => {
    const q = funnelId ? `?funnel=${encodeURIComponent(String(funnelId))}` : '';
    navigate(`/admin/school/enrollments/view/${encodeURIComponent(String(enrollment.id))}${q}`);
  };

  return (
    <div
      className={`rounded-md border bg-card transition-all ${dense ? 'p-2' : 'p-3'} shadow-sm hover:bg-muted/50 cursor-pointer ${isRecentlyMoved ? 'animate-[fadeIn_0.3s_ease-in] shadow-md' : ''}`}
      onClick={goToView}
      title={`Visualizar matrícula ${enrollment.id}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center justify-between">
        <div className="font-medium text-sm truncate" title={title}>{title}</div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs">{status}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-7 w-7 items-center justify-center rounded-md border hover:bg-muted" onClick={(e) => e.stopPropagation()} title="Ações">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); goToView(); }}>
                <Eye className="mr-2 h-4 w-4" /> Visualizar
              </DropdownMenuItem>
              {canManageFlow && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFromFlow(String(enrollment.id));
                  }}
                  className="text-destructive"
                >
                  <UserRoundX className="mr-2 h-4 w-4" /> Remover do Flow
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="text-xs text-muted-foreground truncate mt-1" title={course}>{course || 'Curso não informado'}</div>
      {turma && (
        <div className="text-[11px] text-muted-foreground truncate mt-1" title={turma}>{turma}</div>
      )}
      <div className="text-xs text-muted-foreground mt-1">{amountBRL}</div>
    </div>
  );
}
