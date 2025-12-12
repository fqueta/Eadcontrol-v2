import React, { useEffect, useMemo, useState } from 'react';
import { Layers, Plus, NotebookPen, MoreHorizontal, Eye, MessageSquare, FileText } from 'lucide-react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Combobox, useComboboxOptions } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useFunnelsList, useStagesList } from '@/hooks/funnels';
import { useUsersList } from '@/hooks/users';
import { useAuth } from '@/contexts/AuthContext';
import { FunnelRecord, StageRecord } from '@/types/pipelines';
import { useClientsList, useUpdateClient } from '@/hooks/clients';
import { useEnrollmentsList, useUpdateEnrollment } from '@/hooks/enrollments';
import { ClientRecord } from '@/types/clients';
import { EnrollmentRecord } from '@/types/enrollments';
import { getMockClientsForStages } from '@/mocks/clients';
import { clientsService } from '@/services/clientsService';
import { CreateClientAttendanceInput } from '@/types/attendance';
import { useToast } from '@/hooks/use-toast';
import { phoneApplyMask, phoneRemoveMask } from '@/lib/masks/phone-apply-mask';
import * as attendanceLogsService from '@/services/attendanceLogsService';

/**
 * hexToRgba
 * pt-BR: Converte uma cor hexadecimal para rgba com alpha. Escopo de arquivo
 *        para ser reutilizada por diferentes componentes.
 * en-US: Converts a hexadecimal color to rgba with alpha. File-level scope
 *        so it can be reused across components.
 */
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

/**
 * formatBRL
 * pt-BR: Formata número para moeda BRL com separadores locais.
 * en-US: Formats a number into BRL currency with local separators.
 */
const formatBRL = (value: number): string => {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  } catch {
    return `R$ ${(value || 0).toFixed(2)}`;
  }
};

/**
 * getClientAmountBRL
 * pt-BR: Obtém um possível valor em BRL do cliente (quando disponível).
 * en-US: Extracts a possible BRL amount from client data (when available).
 */
const getClientAmountBRL = (client: ClientRecord): number => {
  const p = (client as any).preferencias || {};
  const c = (client as any).config || {};
  const candidates = [
    p?.pipeline?.amount_brl,
    p?.pipeline?.valor_brl,
    c?.amount_brl,
    c?.valor_brl,
    c?.amount,
  ];
  const hit = candidates.find((v) => typeof v === 'number' && !Number.isNaN(v));
  return (hit as number) || 0;
};

/**
 * getEnrollmentAmountBRL
 * pt-BR: Obtém um possível valor em BRL da matrícula (quando disponível).
 * en-US: Extracts a possible BRL amount from enrollment data (when available).
 */
const getEnrollmentAmountBRL = (enroll: EnrollmentRecord): number => {
  const p = (enroll as any).preferencias || {};
  const c = (enroll as any).config || {};
  /**
   * normalizeToNumber
   * pt-BR: Converte valores numéricos possivelmente em string (ex.: "17.820,00") para número.
   * en-US: Converts possibly string numbers (e.g., "17.820,00") into a numeric value.
   */
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

/**
 * AtendimentoFunnelCard
 * pt-BR: Componente filho que exibe um card de funil de atendimento e suas etapas.
 *        Move o uso de hooks (useStagesList) para o nível superior do componente filho,
 *        evitando chamadas de hooks dentro de loops ou condições (Rules of Hooks).
 * en-US: Child component that renders a support-area funnel card and its stages.
 *        Moves hooks usage (useStagesList) to the child's top level to prevent
 *        calling hooks inside loops or conditions (Rules of Hooks).
 */
// Removido: AtendimentoFunnelCard
// pt-BR: O componente de card de funil foi removido, pois a página agora
//        usa um layout de colunas (kanban) diretamente com seleção de funil.
// en-US: The funnel card component was removed; the page now renders
//        a kanban-style column layout directly with funnel selection.

/**
 * CustomersLeads
 * pt-BR: Página para exibir funis e etapas da área de atendimento em /admin/customers/leads.
 * en-US: Page to display support-area funnels and stages at /admin/customers/leads.
 */
/**
 * CustomersLeads
 * pt-BR: Página para exibir funis e etapas com filtro por área (atendimento ou vendas).
 *        Por padrão, filtra funis da área de atendimento.
 * en-US: Page to display funnels and stages filtered by area (support or sales).
 *        Defaults to filtering support-area funnels.
 */
export default function CustomersLeads({ place = 'atendimento' }: { place?: 'vendas' | 'atendimento' }) {
  /**
   * useAuth
   * pt-BR: Obtém o usuário atual para definir o consultor padrão no modal.
   * en-US: Gets the current user to set the default consultant in the modal.
   */
  const { user } = useAuth();
  /**
   * useToast
   * pt-BR: Hook para feedback visual ao registrar atendimento.
   * en-US: Hook for visual feedback when logging attendance.
   */
  const { toast } = useToast();
  /**
   * useFunnelsList
   * pt-BR: Busca funis e filtra client-side pela área indicada (place).
   * en-US: Fetch funnels and client-side filter by the provided area (place).
   */
  const { data: funnelsData, isLoading } = useFunnelsList({ page: 1, per_page: 50 });
  const funnels = useMemo(() => funnelsData?.data ?? [], [funnelsData?.data]);
  const filteredFunnels = useMemo(() => (
    funnels.filter((f) => f.settings?.place === place)
  ), [funnels, place]);

  /**
   * selectedFunnelId
   * pt-BR: Mantém o funil de atendimento selecionado para montar as colunas (kanban).
   * en-US: Holds the selected support-area funnel to build the columns (kanban).
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFunnelFromUrl = useMemo(() => searchParams.get('funnel') || null, [searchParams]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(initialFunnelFromUrl);
  /**
   * firstFilteredId
   * pt-BR: Obtém o primeiro funil da área selecionada e normaliza o ID para string
   *        para evitar mismatch de tipos com o componente Select.
   * en-US: Gets the first funnel of the selected area and normalizes the ID to string
   *        to avoid type mismatch with the Select component.
   */
  const firstFilteredId = useMemo(() => {
    const id = filteredFunnels[0]?.id;
    return id !== undefined && id !== null ? String(id) : null;
  }, [filteredFunnels]);
  useEffect(() => {
    /**
     * pt-BR: Define um funil padrão caso nenhum esteja selecionado ou na URL.
     * en-US: Sets a default funnel if none is selected or present in the URL.
     */
    if (!selectedFunnelId && !initialFunnelFromUrl && firstFilteredId) {
      setSelectedFunnelId(firstFilteredId);
    }
  }, [selectedFunnelId, initialFunnelFromUrl, firstFilteredId]);

  useEffect(() => {
    /**
     * syncSelectedFunnelToUrl
     * pt-BR: Sincroniza o funil selecionado com a URL (?funnel=ID) para que
     *        ao navegar para outra tela e voltar, o estado seja preservado.
     * en-US: Syncs selected funnel to the URL (?funnel=ID) so when navigating
     *        away and coming back, the state is preserved.
     */
    if (!selectedFunnelId) return;
    const next = new URLSearchParams(searchParams);
    next.set('funnel', selectedFunnelId);
    // Usa replace para não poluir o histórico com mudanças de filtro
    setSearchParams(next, { replace: true } as any);
  }, [selectedFunnelId]);

  /**
   * useStagesList
   * pt-BR: Carrega etapas do funil selecionado. Mantém hooks no topo do componente.
   * en-US: Loads stages of the selected funnel. Keeps hooks at the top level.
   */
  const { data: stagesData, isLoading: stagesLoading } = useStagesList(
    selectedFunnelId || '',
    { page: 1, per_page: 100 },
    { enabled: !!selectedFunnelId }
  );
  const stages = useMemo(() => stagesData?.data ?? [], [stagesData?.data]);

  /**
   * selectedFunnelColor
   * pt-BR: Obtém a cor do funil selecionado para estilizar as colunas.
   * en-US: Gets the selected funnel color to style the columns.
   */
  /**
   * selectedFunnel
   * pt-BR: Localiza o funil selecionado comparando IDs como string para evitar
   *        problemas quando a API retorna número e a UI usa string.
   * en-US: Finds the selected funnel comparing IDs as strings to avoid issues
   *        when the API returns numbers but the UI uses strings.
   */
  const selectedFunnel = useMemo(() => (
    funnels.find((f) => String(f.id) === String(selectedFunnelId || '')) ?? null
  ), [funnels, selectedFunnelId]);
  const selectedFunnelColor = selectedFunnel?.color;

  /**
   * useClientsList
   * pt-BR: Carrega uma lista de clientes para renderizar como cards nas colunas.
   *        Se houver metadados que indiquem a etapa (ex.: preferencias.pipeline.stage_id),
   *        os clientes serão distribuídos por coluna; caso contrário, lista vazia.
   * en-US: Loads the clients list to render as cards in columns.
   *        If metadata indicates stage (e.g., preferencias.pipeline.stage_id),
   *        clients are grouped by column; otherwise, empty lists.
   */
  const USE_MOCK = (import.meta.env.VITE_USE_MOCK_CLIENTS as string | undefined) === 'true';
  const { data: clientsData } = useClientsList({ page: 1, per_page: 100 });
  const updateClientMutation = useUpdateClient();
  // console.log('clientsData', clientsData);
  /**
   * densityMode
   * pt-BR: Alterna entre visual “Confortável” e “Compacto” para os cards.
   * en-US: Toggle between “Comfortable” and “Compact” visuals for cards.
   */
  const [dense, setDense] = useState<boolean>(false);
  /**
   * pt-BR: Controla exibição do painel de diagnóstico detalhado.
   * en-US: Controls display of the detailed diagnostics panel.
   */
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  

  /**
   * buildMockClientsForUI
   * pt-BR: Gera clientes mockados distribuídos nas etapas do funil selecionado.
   *        Centraliza a criação de mocks para manter consistência e facilitar ajustes.
   * en-US: Generates mocked clients distributed across the selected funnel stages.
   *        Centralizes mock creation to keep consistency and simplify future tweaks.
   */
  const buildMockClientsForUI = (
    funnelId: string,
    stageIds: string[],
    count: number = 18
  ): ClientRecord[] => {
    console.log('buildMockClientsForUI', funnelId, stageIds, count);
    if (!funnelId || stageIds.length === 0) return [];
    return getMockClientsForStages(funnelId, stageIds, count);
  };
  /**
   * allClients
   * pt-BR: Quando a flag VITE_USE_MOCK_CLIENTS=true, usa clientes mockados
   *        distribuídos pelas etapas carregadas; caso contrário, usa dados da API.
   * en-US: When VITE_USE_MOCK_CLIENTS=true, uses mocked clients distributed
   *        across loaded stages; otherwise, uses API data.
   */
  const allClients = useMemo<ClientRecord[]>(() => {
    if (USE_MOCK && selectedFunnelId && stages.length > 0) {
      const stageIds = stages.map((s) => s.id);
      return buildMockClientsForUI(selectedFunnelId, stageIds, 18);
    }
    return Array.isArray(clientsData?.data) ? clientsData!.data : [];
  }, [USE_MOCK, selectedFunnelId, stages, clientsData?.data]);
  // console.log('allClients', allClients);
  /**
   * localClients
   * pt-BR: Estado local dos clientes exibidos, permitindo atualização otimista ao arrastar/soltar.
   * en-US: Local state of displayed clients, enabling optimistic update on drag-and-drop.
   */
  const [localClients, setLocalClients] = useState<ClientRecord[]>([]);
  useEffect(() => {
    setLocalClients(allClients);
  }, [allClients]);

  /**
   * situacaoForFunnel
   * pt-BR: Determina o filtro `situacao` das matrículas conforme o funil selecionado.
   *        - Funil 2: interessados (`situacao = "int"`)
   *        - Funil 3: matriculados (`situacao = "mat"`)
   *        - Outros: sem filtro específico
   * en-US: Determines enrollment `situacao` filter based on selected funnel.
   *        - Funnel 2: interested (`situacao = "int"`)
   *        - Funnel 3: enrolled (`situacao = "mat"`)
   *        - Others: no specific filter
   */
  const situacaoForFunnel = useMemo(() => {
    if (!selectedFunnelId) return undefined as any;
    const fid = String(selectedFunnelId);
    if (fid === '2') return 'int';
    if (fid === '3') return 'mat';
    return undefined as any;
  }, [selectedFunnelId]);

  /**
   * enrollmentListParams
   * pt-BR: Parâmetros de listagem de matrículas, incluindo `situacao` quando aplicável.
   * en-US: Enrollment listing params, including `situacao` when applicable.
   */
  const enrollmentListParams = useMemo(() => ({
    page: 1,
    per_page: 100,
    ...(situacaoForFunnel ? { situacao: situacaoForFunnel } : {}),
  }), [situacaoForFunnel]);

  /**
   * useEnrollmentsList
   * pt-BR: Carrega lista de matrículas com filtro dinâmico pela área de vendas.
   * en-US: Loads enrollments list with dynamic filter for sales area.
   */
  const { data: enrollmentsData } = useEnrollmentsList(enrollmentListParams, { enabled: place === 'vendas' && !!selectedFunnelId });
  const updateEnrollmentMutation = useUpdateEnrollment();
  const allEnrollments = useMemo<EnrollmentRecord[]>(() => (
    Array.isArray(enrollmentsData?.data) ? (enrollmentsData!.data as EnrollmentRecord[]) : []
  ), [enrollmentsData?.data]);
  const [localEnrollments, setLocalEnrollments] = useState<EnrollmentRecord[]>([]);
  useEffect(() => {
    if (place === 'vendas') setLocalEnrollments(allEnrollments);
  }, [place, allEnrollments]);

  /**
   * loadLastAttendanceFromStorage
   * pt-BR: Carrega do localStorage o último atendimento por cliente e
   *        atualiza o mapa em memória para exibição nos cards.
   * en-US: Loads from localStorage the last attendance per client and
   *        updates the in-memory map for displaying on cards.
   */
  const loadLastAttendanceFromStorage = () => {
    try {
      const logs = attendanceLogsService.loadAll();
      if (!Array.isArray(logs) || logs.length === 0) {
        setLastAttendanceByClient({});
        return;
      }
      const latestByClient: Record<string, { timestamp: string; observation?: string }> = {};
      for (const log of logs) {
        const cid = String(log.clientId || '');
        if (!cid || !log.timestamp) continue;
        const prev = latestByClient[cid]?.timestamp;
        if (!prev || (log.timestamp > prev)) {
          latestByClient[cid] = { timestamp: log.timestamp, observation: log.observation };
        }
      }
      const next: Record<string, { timestamp: string; observation?: string }> = {};
      for (const c of localClients) {
        const cid = String(c.id);
        if (latestByClient[cid]) next[cid] = latestByClient[cid];
      }
      setLastAttendanceByClient(next);
    } catch {
      // Silencia erros de leitura do storage para não interromper a UI
    }
  };

  /**
   * pt-BR: Atualiza o mapa de último atendimento sempre que a lista local muda.
   * en-US: Refreshes last attendance map whenever local client list changes.
   */
  useEffect(() => {
    loadLastAttendanceFromStorage();
  }, [localClients]);
  // console.log('localClients', localClients);
  /**
   * extractFunnelId
   * pt-BR: Tenta detectar o funil (funnelId) do cliente a partir de `config`
   *        ou caminhos alternativos em `preferencias`. Mantém compatibilidade
   *        com respostas da API que retornam `config.funnelId` como string.
   * en-US: Attempts to detect the client's funnel (funnelId) from `config`
   *        or alternative paths in `preferencias`. Keeps compatibility with
   *        API responses that return `config.funnelId` as string.
   */
  /**
   * extractFunnelId
   * pt-BR: Detecta o funil do cliente, aceitando valores string ou number, e normaliza para string.
   * en-US: Detects the client's funnel, accepting string or number values, normalizing to string.
   */
  const extractFunnelId = (client: ClientRecord): string | null => {
    const p = (client as any).preferencias || {};
    const c = (client as any).config || {};
    const candidates = [
      c?.funnelId,
      p?.pipeline?.funnelId,
      p?.atendimento?.funnelId,
      p?.funnelId,
    ];
    for (const v of candidates) {
      if (v === undefined || v === null) continue;
      const s = String(v).trim();
      if (s.length > 0) return s;
    }
    return null;
  };

  /**
   * extractStageId
   * pt-BR: Tenta detectar um possível mapeamento de etapa no cliente.
   *        Procura chaves comuns em `preferencias` ou `config`.
   * en-US: Attempts to detect a stage mapping in a client.
   *        Looks for common keys inside `preferencias` or `config`.
   */
  /**
   * extractStageId
   * pt-BR: Detecta a etapa do cliente, aceitando valores string ou number, e normaliza para string.
   * en-US: Detects the client's stage, accepting string or number values, normalizing to string.
   */
  const extractStageId = (client: ClientRecord): string | null => {
    const p = (client as any).preferencias || {};
    const c = (client as any).config || {};
    const candidates = [
      c?.stage_id,
      p?.pipeline?.stage_id,
      p?.atendimento?.stage_id,
      p?.stage_id,
    ];
    for (const v of candidates) {
      if (v === undefined || v === null) continue;
      const s = String(v).trim();
      if (s.length > 0) return s;
    }
    return null;
  };

  /**
   * extractEnrollmentFunnelId
   * pt-BR: Detecta funil associado à matrícula.
   * en-US: Detects associated funnel for an enrollment.
   */
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

  /**
   * extractEnrollmentStageId
   * pt-BR: Detecta etapa associada à matrícula.
   * en-US: Detects associated stage for an enrollment.
   */
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
  // console.log('extractStageId', allClients.map(extractStageId));
  
  /**
   * clientsByStage
   * pt-BR: Agrupa clientes por `stage_id` detectado, filtrando pelo funil
   *        selecionado (`selectedFunnelId`) e garantindo que a etapa exista
   *        no funil corrente.
   * en-US: Groups clients by detected `stage_id`, filtering by the selected
   *        funnel (`selectedFunnelId`) and ensuring the stage belongs to the
   *        current funnel.
   */
  const clientsByStage = useMemo(() => {
    /**
     * clientsByStage
     * pt-BR: FILTRA E AGRUPA estritamente por funil selecionado e etapas do funil.
     *        Apenas clientes com `config.funnelId === selectedFunnelId` e `stage_id`
     *        pertencente às etapas carregadas desse funil são exibidos.
     * en-US: STRICTLY FILTERS and groups by selected funnel and its stages.
     *        Only clients with `config.funnelId === selectedFunnelId` and a `stage_id`
     *        that belongs to the loaded stages of that funnel are displayed.
     */
    const allowedStageIds = new Set(stages.map((s) => String(s.id)));
    const map = new Map<string, ClientRecord[]>();
    for (const client of localClients) {
      const fid = String(extractFunnelId(client) || '');
      if (selectedFunnelId) {
        // Ignora clientes de outro funil ou sem funil definido
        if (!fid || fid !== String(selectedFunnelId)) continue;
      }

      const sid = String(extractStageId(client) || '');
      if (!sid) continue;
      // Garante que a etapa pertença ao funil corrente
      if (!allowedStageIds.has(sid)) continue;

      if (!map.has(sid)) map.set(sid, []);
      map.get(sid)!.push(client);
    }
    return map;
  }, [localClients, stages, selectedFunnelId]);

  /**
   * enrollmentsByStage
   * pt-BR: Agrupa matrículas por `stage_id` no funil selecionado (somente vendas).
   * en-US: Groups enrollments by `stage_id` within selected funnel (sales only).
   */
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

  /**
   * summary
   * pt-BR: Resumo sempre visível com funil selecionado, contagem total de clientes,
   *        contagem visível no Kanban e IDs de etapas do funil atual.
   * en-US: Always-visible summary showing selected funnel, total clients,
   *        visible count in Kanban, and current funnel stage IDs.
   */
  const summary = useMemo(() => {
    const stageIds = stages.map((s) => String(s.id));
    const total = place === 'vendas' ? localEnrollments.length : localClients.length;
    const visibleMap = place === 'vendas' ? enrollmentsByStage : clientsByStage;
    const visibleTotal = visibleMap instanceof Map
      ? Array.from(visibleMap.values()).reduce((acc, arr) => acc + (arr?.length || 0), 0)
      : 0;
    return {
      selectedFunnelId: selectedFunnelId ? String(selectedFunnelId) : '(nenhum)',
      stageIds,
      totalClients: total,
      visibleTotal,
    };
  }, [stages, localClients, localEnrollments, clientsByStage, enrollmentsByStage, selectedFunnelId, place]);

  /**
   * stageTotals
   * pt-BR: Calcula o total de cards e valor por etapa para exibir no cabeçalho do funil.
   * en-US: Computes per-stage card count and amount to show in the funnel header.
   */
  const stageTotals = useMemo(() => {
    return stages.map((s) => {
      const arr = place === 'vendas'
        ? (enrollmentsByStage.get(String(s.id)) || [])
        : (clientsByStage.get(String(s.id)) || []);
      const count = arr.length;
      const amount = place === 'vendas'
        ? (arr as EnrollmentRecord[]).reduce((sum, e) => sum + getEnrollmentAmountBRL(e), 0)
        : (arr as ClientRecord[]).reduce((sum, c) => sum + getClientAmountBRL(c), 0);
      return { id: String(s.id), name: s.name, count, amountBRL: formatBRL(amount) };
    });
  }, [stages, clientsByStage, enrollmentsByStage, place]);

  /**
   * diagnostics
   * pt-BR: Contadores diagnósticos para explicar por que clientes não aparecem:
   *  - outOfFunnel: clientes cujo `config.funnelId` difere do funil selecionado
   *  - invalidStage: clientes com `stage_id` que não pertence às etapas do funil
   * en-US: Diagnostic counters to explain why clients are filtered out:
   *  - outOfFunnel: clients whose `config.funnelId` differs from selected funnel
   *  - invalidStage: clients with `stage_id` not belonging to this funnel’s stages
   */
  const diagnostics = useMemo(() => {
    const allowedStageIds = new Set(stages.map((s) => String(s.id)));
    let outOfFunnel = 0;
    let invalidStage = 0;
    let emptyStage = 0;
    for (const client of localClients) {
      const fid = String(extractFunnelId(client) || '');
      const sid = String(extractStageId(client) || '');
      if (selectedFunnelId) {
        if (!fid || fid !== String(selectedFunnelId)) outOfFunnel++;
        else if (!sid) emptyStage++;
        else if (!allowedStageIds.has(sid)) invalidStage++;
      }
    }
    return { outOfFunnel, invalidStage, emptyStage, total: localClients.length };
  }, [localClients, stages, selectedFunnelId]);

  /**
   * diagnosticsDetails
   * pt-BR: Lista de clientes excluídos do Kanban com motivo, para auditoria.
   * en-US: Lists clients excluded from Kanban with reason for auditing.
   */
  const diagnosticsDetails = useMemo(() => {
    const allowedStageIds = new Set(stages.map((s) => String(s.id)));
    const rows = [] as Array<{
      id: string;
      name: string;
      funnelId: string;
      stageId: string;
      reason: 'fora_do_funil' | 'etapa_invalida' | 'stage_vazio';
    }>;
    for (const client of localClients) {
      const fid = String(extractFunnelId(client) || '');
      const sid = String(extractStageId(client) || '');
      let reason: 'fora_do_funil' | 'etapa_invalida' | 'stage_vazio' | undefined;
      if (selectedFunnelId) {
        if (!fid || fid !== String(selectedFunnelId)) reason = 'fora_do_funil';
        else if (!sid) reason = 'stage_vazio';
        else if (!allowedStageIds.has(sid)) reason = 'etapa_invalida';
      }
      if (reason) {
        const name = (client as any)?.name ?? (client as any)?.nome ?? (client as any)?.config?.name ?? String(client.id);
        rows.push({ id: String(client.id), name, funnelId: fid || '(vazio)', stageId: sid || '(vazio)', reason });
      }
    }
    return rows;
  }, [localClients, stages, selectedFunnelId]);
  // console.log('clientsByStage', clientsByStage); 
  /**
   * Drag state and handlers
   * pt-BR: Controla o cliente arrastado e aplica atualização otimista ao soltar em uma coluna.
   * en-US: Controls the dragged client and applies optimistic update when dropping on a column.
   */
  const [dragging, setDragging] = useState<{ clientId: string | null; fromStageId: string | null }>({ clientId: null, fromStageId: null });
  const [dropTargetStageId, setDropTargetStageId] = useState<string | null>(null);
  const [recentlyMovedId, setRecentlyMovedId] = useState<string | null>(null);
  /**
   * draggingEnrollment
   * pt-BR: Controle de arraste específico para matrículas (área de vendas).
   * en-US: Drag control specific to enrollments (sales area).
   */
  const [draggingEnrollment, setDraggingEnrollment] = useState<{ enrollmentId: string | null; fromStageId: string | null }>({ enrollmentId: null, fromStageId: null });
  const [recentlyMovedEnrollmentId, setRecentlyMovedEnrollmentId] = useState<string | null>(null);

  /**
   * attendanceDialog state
   * pt-BR: Controla o modal de registro de atendimento.
   * en-US: Controls the attendance logging dialog.
   */
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [attendanceForClient, setAttendanceForClient] = useState<ClientRecord | null>(null);
  const [attendanceObservation, setAttendanceObservation] = useState('');
  const [attendanceChannel, setAttendanceChannel] = useState<string>('email');
  // pt-BR: Etapa alvo ao registrar atendimento (permite mudança de etapa)
  // en-US: Target stage when registering attendance (allows stage change)
  const [attendanceTargetStageId, setAttendanceTargetStageId] = useState<string>('');
  const [attendanceDuration, setAttendanceDuration] = useState<string>('');
  const [attendanceTagsText, setAttendanceTagsText] = useState<string>('');

  /**
   * addLeadDialog state
   * pt-BR: Controla o modal de criação rápida de lead.
   * en-US: Controls the quick lead creation modal.
   */
  const [addLeadDialogOpen, setAddLeadDialogOpen] = useState<boolean>(false);
  const [addLeadFunnelId, setAddLeadFunnelId] = useState<string>('');
  const [addLeadStageId, setAddLeadStageId] = useState<string>('');
  const [addLeadName, setAddLeadName] = useState<string>('');
  const [addLeadEmail, setAddLeadEmail] = useState<string>('');
  const [addLeadEmailError, setAddLeadEmailError] = useState<string | null>(null);
  const [addLeadPhone, setAddLeadPhone] = useState<string>('');
  const [addLeadConsultantId, setAddLeadConsultantId] = useState<string>('');
  // Estados de validação
  const isNameInvalid = useMemo(() => (addLeadName.trim().length === 0), [addLeadName]);
  const isPhoneInvalid = useMemo(() => {
    const len = phoneRemoveMask(addLeadPhone).length;
    return len < 10 || len > 15;
  }, [addLeadPhone]);
  // Busca dinâmica para consultores
  const [consultantSearchTerm, setConsultantSearchTerm] = useState<string>('');

  /**
   * useUsersList
   * pt-BR: Busca usuários do sistema (apenas consultores) para preencher o select.
   * en-US: Fetches system users (consultants only) to populate the select.
   */
  const { data: consultantsPaginated, isLoading: isLoadingConsultants } = useUsersList({ consultores: true, per_page: 200, sort: 'name', search: consultantSearchTerm });
  const consultantOptions = useMemo(() => consultantsPaginated?.data ?? [], [consultantsPaginated]);
  // Garante que o consultor atualmente selecionado apareça nas opções
  const mergedConsultants = useMemo(() => {
    const list = consultantOptions.slice();
    if (addLeadConsultantId && !list.some(u => String(u.id) === addLeadConsultantId) && user?.id) {
      list.unshift({ id: String(user.id), name: user.name } as any);
    }
    return list;
  }, [consultantOptions, addLeadConsultantId, user]);
  const consultantComboboxOptions = useComboboxOptions(mergedConsultants, 'id', 'name');

  /**
   * handleLeadCreationError
   * pt-BR: Trata erros da API ao criar lead, destacando validações de campo
   *        como e-mail já utilizado.
   * en-US: Handles API errors when creating a lead, highlighting field
   *        validations such as email already used.
   */
  const handleLeadCreationError = (err: any) => {
    try {
      const body = err?.body || {};
      const message = body?.message || String(err?.message || 'Erro ao criar lead');
      const errors = body?.errors || {};

      // Limpa erros anteriores
      setAddLeadEmailError(null);

      // Validação específica: e-mail já utilizado
      const emailErrors: string[] = Array.isArray(errors?.email) ? errors.email : [];
      if (emailErrors.length > 0) {
        const msg = emailErrors[0];
        setAddLeadEmailError(msg);
        toast({ title: 'Erro de validação', description: msg, variant: 'destructive' });
        return;
      }

      // Fallback genérico
      toast({ title: message, description: 'Verifique os campos e tente novamente.', variant: 'destructive' });
    } catch {
      toast({ title: 'Erro ao criar lead', description: 'Falha inesperada ao processar erro.', variant: 'destructive' });
    }
  };

  /**
   * lastAttendanceByClient
   * pt-BR: Cache em memória do último atendimento por cliente.
   * en-US: In-memory cache of the last attendance per client.
   */
  const [lastAttendanceByClient, setLastAttendanceByClient] = useState<Record<string, { timestamp: string; observation?: string }>>({});

  /**
   * onCardDragStart
   * pt-BR: Inicia o arraste de um card, registrando o cliente e a etapa de origem.
   * en-US: Starts dragging a card, recording the client and the source stage.
   */
  const onCardDragStart = (client: ClientRecord) => {
    const fromId = extractStageId(client);
    setDragging({ clientId: client.id, fromStageId: fromId });
  };

  /**
   * onCardDragEnd
   * pt-BR: Encerra o estado de arraste se não houver drop válido.
   * en-US: Ends drag state if there is no valid drop.
   */
  const onCardDragEnd = () => {
    setDragging({ clientId: null, fromStageId: null });
    setDropTargetStageId(null);
  };

  /**
   * onEnrollmentDragStart
   * pt-BR: Inicia o arraste de um card de matrícula, registrando a etapa de origem.
   * en-US: Starts dragging an enrollment card, recording the source stage.
   */
  const onEnrollmentDragStart = (enroll: EnrollmentRecord) => {
    const fromId = extractEnrollmentStageId(enroll);
    setDraggingEnrollment({ enrollmentId: String(enroll.id), fromStageId: fromId });
  };

  /**
   * onEnrollmentDragEnd
   * pt-BR: Finaliza arraste da matrícula e limpa alvo de drop.
   * en-US: Ends enrollment drag and clears drop target.
   */
  const onEnrollmentDragEnd = () => {
    setDraggingEnrollment({ enrollmentId: null, fromStageId: null });
    setDropTargetStageId(null);
  };

  /**
   * onDropEnrollmentOnStage
   * pt-BR: Solta uma matrícula em uma etapa; aplica atualização otimista e persiste via API.
   * en-US: Drops an enrollment on a stage; applies optimistic update and persists via API.
   */
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
      // Atualiza campos de conveniência no topo e dentro de config, mantendo funil
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

    // Persistência via API; em caso de erro, reverte estado local
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

  /**
   * onDropOnStage
   * pt-BR: Solta o card em uma coluna de etapa, move otimisticamente e persiste se não for mock.
   * en-US: Drops the card on a stage column, moves optimistically and persists if not mock.
   */
  const onDropOnStage = (toStageId: string) => {
    if (!dragging.clientId) return;
    const clientIdx = localClients.findIndex((c) => c.id === dragging.clientId);
    if (clientIdx < 0) return;
    const client = localClients[clientIdx];
    const currentStageId = extractStageId(client);
    if (currentStageId === toStageId) {
      onCardDragEnd();
      return;
    }

    // Otimista: atualiza stage_id e funnelId no estado local
    const nextClient: ClientRecord = {
      ...client,
      config: {
        ...client.config,
        funnelId: selectedFunnelId || client.config?.funnelId || null,
        stage_id: toStageId,
      },
    };
    setLocalClients((prev) => {
      const copy = [...prev];
      copy[clientIdx] = nextClient;
      return copy;
    });
    setRecentlyMovedId(client.id);

    // Persistência quando não for mock
    if (!USE_MOCK) {
      updateClientMutation.mutate({
        id: client.id,
        data: {
          config: {
            ...client.config,
            funnelId: selectedFunnelId || client.config?.funnelId || null,
            stage_id: toStageId,
          },
        },
      }, {
        onSuccess: () => {
          setTimeout(() => setRecentlyMovedId(null), 400);
        },
        onError: () => {
          // Reverte em caso de erro
          setLocalClients((prev) => {
            const copy = [...prev];
            copy[clientIdx] = client;
            return copy;
          });
          setRecentlyMovedId(null);
        },
      });
    } else {
      // Mock: apenas animação
      setTimeout(() => setRecentlyMovedId(null), 400);
    }

    onCardDragEnd();
  };

  /**
   * openAttendanceDialog
   * pt-BR: Abre o modal para registrar atendimento de um cliente.
   * en-US: Opens dialog to register an attendance for a client.
   */
  const openAttendanceDialog = (client: ClientRecord) => {
    setAttendanceForClient(client);
    setAttendanceObservation('');
    setAttendanceChannel('email');
    // Define etapa padrão como a etapa atual do cliente (se existir)
    const currentStage = String(extractStageId(client) || '');
    setAttendanceTargetStageId(currentStage);
    setAttendanceDuration('');
    setAttendanceTagsText('');
    setAttendanceDialogOpen(true);
  };

  /**
   * submitAttendance
   * pt-BR: Persiste registro de atendimento com observação opcional e, se
   *        uma nova etapa for selecionada, atualiza imediatamente o estado
   *        local do cliente (mudança visual no kanban).
   * en-US: Persists attendance log with optional observation and, if a new
   *        stage is selected, immediately updates the client's local state
   *        (visual change on the kanban).
   */
  const submitAttendance = async () => {
    if (!attendanceForClient) return;
    const enableStageSelection = Boolean(selectedFunnelId);
    const payload: CreateClientAttendanceInput = {
      channel: attendanceChannel || 'email',
      observation: attendanceObservation.trim() || undefined,
      metadata: {
        duration: attendanceDuration ? Number(attendanceDuration) : undefined,
        tags: attendanceTagsText ? attendanceTagsText.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      },
      funnelId: selectedFunnelId || String(attendanceForClient?.config?.funnelId || ''),
      // pt-BR: Só envia stage_id se houver funil selecionado.
      // en-US: Only send stage_id when a funnel is selected.
      stage_id: enableStageSelection && attendanceTargetStageId ? attendanceTargetStageId : undefined,
    };
    try {
      await clientsService.registerAttendance(String(attendanceForClient.id), payload);

      // Atualiza imediatamente o estado local se a etapa mudou
      const clientId = String(attendanceForClient.id);
      const currentStageId = String(extractStageId(attendanceForClient) || '');
      const targetStageId = String(attendanceTargetStageId || '');
      if (targetStageId && targetStageId !== currentStageId) {
        const idx = localClients.findIndex((c) => String(c.id) === clientId);
        if (idx >= 0) {
          const base = localClients[idx];
          const updated: ClientRecord = {
            ...base,
            config: {
              ...base.config,
              funnelId: selectedFunnelId || base.config?.funnelId || null,
              stage_id: targetStageId,
            },
          };
          setLocalClients((prev) => {
            const copy = [...prev];
            copy[idx] = updated;
            return copy;
          });
          setRecentlyMovedId(clientId);
          setTimeout(() => setRecentlyMovedId(null), 400);
        }
      }

      const ts = new Date().toISOString();
      setLastAttendanceByClient((prev) => ({ ...prev, [String(attendanceForClient!.id)]: { timestamp: ts, observation: payload.observation } }));

      // Persistência local
      // pt-BR: Grava um log simples no localStorage para manter o último atendimento visível após recarregar.
      // en-US: Writes a simple log to localStorage so the last attendance remains visible after reload.
      try {
        attendanceLogsService.add({
          clientId: String(attendanceForClient!.id),
          observation: payload.observation,
          agentId: user?.id ? String(user.id) : undefined,
        });
      } catch {
        // Silencia erros de storage
      }

      setAttendanceDialogOpen(false);
      setAttendanceForClient(null);
      setAttendanceObservation('');
      toast({ title: 'Atendimento registrado', description: payload.observation ? 'Observação salva.' : 'Registrado sem observação.' });
    } catch (e: any) {
      toast({ title: 'Erro ao registrar atendimento', description: String(e?.message || 'Verifique a conexão com a API'), variant: 'destructive' });
    }
  };

  // console.log('clientsByStage', clientsByStage);
  return (
    <div className="container mx-auto space-y-6 pb-24">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" /> {place === 'vendas' ? 'Funis de Vendas' : 'Leads de Atendimento'}
          </CardTitle>
          <CardDescription>
            {`Funis e etapas da área de ${place === 'vendas' ? 'vendas' : 'atendimento'}, para acompanhamento.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Controls: selecionar funil de atendimento */}
          <div className="flex items-center gap-3 mb-4 w-full max-w-xs">
            <div className="w-full max-w-xs">
              <label className="text-xs text-muted-foreground">{place === 'vendas' ? 'Funil de Vendas' : 'Funil de Atendimento'}</label>
              <Select value={selectedFunnelId ?? undefined} onValueChange={setSelectedFunnelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um funil" />
                </SelectTrigger>
                <SelectContent>
                  {filteredFunnels.map(f => (
                    <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          {/* <div className="ml-auto">
            <Button className="flex items-center gap-2" disabled>
              <Plus className="h-4 w-4" /> Criar
            </Button>
          </div> */}

            {/* Toggle de densidade */}
            <div className="flex items-center gap-2 ml-4">
              <Switch id="kanban-density" checked={dense} onCheckedChange={setDense} />
              <Label htmlFor="kanban-density" className="text-xs select-none">
                {dense ? 'Compacto' : 'Confortável'}
              </Label>
            </div>
          </div>

          {/* Diagnóstico: contadores de exclusão */}
          {/**
           * Diagnostics badges
           * pt-BR: Exibe contadores para clientes fora do funil selecionado e
           *        com etapa inválida no funil atual, ajudando a entender listas vazias.
           * en-US: Shows counters for clients outside selected funnel and
           *        with invalid stage for current funnel, helping explain empty lists.
           */}
       

          {/**
           * summary panel
           * pt-BR: Painel de resumo sempre visível para contexto imediato.
           * en-US: Always-visible summary panel for immediate context.
           */}
          {/* <div className="flex flex-wrap items-center gap-3 mb-3">
            <Badge variant="outline" className="text-xs">
              Funil selecionado: {summary.selectedFunnelId}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Clientes carregados: {summary.totalClients}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Visíveis no Kanban: {summary.visibleTotal}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Etapas: {summary.stageIds.length > 0 ? summary.stageIds.join(', ') : '(nenhuma)'}
            </Badge>
            {stageTotals.length > 0 && (
              <div className="w-full overflow-x-auto">
                <div className="flex items-center gap-2 mt-1">
                  {stageTotals.map((t) => (
                    <Badge key={t.id} variant="secondary" className="text-xs whitespace-nowrap">
                      {t.name}: {t.count} • {t.amountBRL}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div> */}

          {/**
           * diagnostics panel
           * pt-BR: Painel detalhado listando clientes excluídos e o motivo.
           * en-US: Detailed panel listing excluded clients and the reason.
           */}
          {/* {showDiagnostics && diagnosticsDetails.length > 0 && (
            <div className="mb-4 border rounded-md p-3">
              <div className="text-xs mb-2">
                Total excluídos: {diagnosticsDetails.length}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left">
                      <th className="py-1 px-2">Cliente</th>
                      <th className="py-1 px-2">ID</th>
                      <th className="py-1 px-2">FunnelId</th>
                      <th className="py-1 px-2">StageId</th>
                      <th className="py-1 px-2">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnosticsDetails.map((row) => (
                      <tr key={`${row.id}-${row.stageId}`} className="border-t">
                        <td className="py-1 px-2">{row.name}</td>
                        <td className="py-1 px-2">{row.id}</td>
                        <td className="py-1 px-2">{row.funnelId}</td>
                        <td className="py-1 px-2">{row.stageId}</td>
                        <td className="py-1 px-2">
                          {row.reason === 'fora_do_funil'
                            ? 'Fora do funil selecionado'
                            : row.reason === 'stage_vazio'
                              ? 'Stage/etapa não informada'
                              : 'Etapa fora do funil atual'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )} */}

          {/* Estados de carregamento/empty */}
          {isLoading && <p className="text-sm text-muted-foreground">Carregando funis...</p>}
          {!isLoading && filteredFunnels.length === 0 && (
            <p className="text-sm text-muted-foreground">{`Nenhum funil de ${place === 'vendas' ? 'vendas' : 'atendimento'} encontrado.`}</p>
          )}

          {!!selectedFunnelId && (
            <div className="relative overflow-x-auto">
              {/* Kanban grid de colunas das etapas */}
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
                    place === 'vendas' ? (
                      <StageColumnSales
                        key={stage.id}
                        stage={stage}
                        funnelId={selectedFunnelId!}
                        funnelColor={selectedFunnelColor}
                        dense={dense}
                        enrollments={enrollmentsByStage.get(String(stage.id)) || []}
                        dropActive={dropTargetStageId === stage.id}
                        setDropTargetStageId={setDropTargetStageId}
                        onDragStart={onEnrollmentDragStart}
                        onDragEnd={onEnrollmentDragEnd}
                        onDropEnrollmentOnStage={onDropEnrollmentOnStage}
                        recentlyMovedEnrollmentId={recentlyMovedEnrollmentId}
                      />
                    ) : (
                      <StageColumn
                        key={stage.id}
                        stage={stage}
                        funnelId={selectedFunnelId!}
                        funnelColor={selectedFunnelColor}
                        dense={dense}
                        clients={clientsByStage.get(String(stage.id)) || []}
                        onDropOnStage={onDropOnStage}
                        onDragStart={onCardDragStart}
                        onDragEnd={onCardDragEnd}
                        onRegisterAttendance={openAttendanceDialog}
                        onAddLeadClick={(fId, sId) => {
                          /**
                           * handleOpenAddLeadDialog
                           * pt-BR: Abre modal de novo lead com funil/etapa e consultor padrão.
                           * en-US: Opens new lead modal with funnel/stage and default consultant.
                           */
                          setAddLeadFunnelId(String(fId));
                          setAddLeadStageId(String(sId));
                          setAddLeadName('');
                          setAddLeadEmail('');
                          setAddLeadEmailError(null);
                          setAddLeadPhone('');
                          setAddLeadConsultantId(user?.id ? String(user.id) : '');
                          setAddLeadDialogOpen(true);
                        }}
                        dropActive={dropTargetStageId === stage.id}
                        setDropTargetStageId={setDropTargetStageId}
                        recentlyMovedId={recentlyMovedId}
                        lastAttendanceByClient={lastAttendanceByClient}
                      />
                    )
                  ))
                )}
              </div>
            </div>
          )}

          {/* Modal simples de registro de atendimento */}
          {attendanceDialogOpen && attendanceForClient && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setAttendanceDialogOpen(false)}>
              <div className="bg-background rounded-md border shadow-md w-[520px] max-w-full" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b">
                  <div className="font-medium">Registrar atendimento</div>
                  <div className="text-xs text-muted-foreground">Cliente: {attendanceForClient.name}</div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs">Canal</label>
                      <select className="w-full rounded-md border p-2 text-sm" value={attendanceChannel} onChange={(e) => setAttendanceChannel(e.target.value)}>
                        <option value="email">Email</option>
                        <option value="phone">Telefone</option>
                        <option value="chat">Chat</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="in_person">Presencial</option>
                        <option value="other">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs">Etapa do funil</label>
                      <select
                        className="w-full rounded-md border p-2 text-sm"
                        value={attendanceTargetStageId}
                        onChange={(e) => setAttendanceTargetStageId(e.target.value)}
                        disabled={!selectedFunnelId}
                      >
                        {!selectedFunnelId ? (
                          <option value="">Selecione um funil para escolher a etapa</option>
                        ) : (
                          stages.map((s) => (
                            <option key={s.id} value={String(s.id)}>
                              {s.name}
                            </option>
                          ))
                        )}
                      </select>
                      {!selectedFunnelId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Selecione um funil de atendimento para alterar a etapa.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs">Duração (min, opcional)</label>
                      <input type="number" min={0} className="w-full rounded-md border p-2 text-sm" value={attendanceDuration} onChange={(e) => setAttendanceDuration(e.target.value)} placeholder="15" />
                    </div>
                    <div>
                      <label className="text-xs">Tags (opcional)</label>
                      <input className="w-full rounded-md border p-2 text-sm" value={attendanceTagsText} onChange={(e) => setAttendanceTagsText(e.target.value)} placeholder="prioridade,suporte" />
                    </div>
                  </div>
                  <label className="text-xs">Observação (opcional)</label>
                  <textarea
                    className="w-full min-h-[100px] rounded-md border p-2 text-sm"
                    placeholder="Se desejar, descreva o atendimento prestado..."
                    value={attendanceObservation}
                    onChange={(e) => setAttendanceObservation(e.target.value)}
                  />
                </div>
                <div className="p-4 flex items-center justify-end gap-2 border-t">
                  <Button variant="outline" onClick={() => setAttendanceDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={submitAttendance}>Registrar</Button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de criação rápida de lead */}
          {addLeadDialogOpen && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setAddLeadDialogOpen(false)}>
              <div className="bg-background rounded-md border shadow-md w-[520px] max-w-full" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b">
                  <div className="font-medium">Novo lead</div>
                  <div className="text-xs text-muted-foreground">Funil: {addLeadFunnelId} • Etapa: {addLeadStageId}</div>
                </div>
                <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs">Nome completo</label>
                      <input
                        className={`w-full rounded-md border p-2 text-sm ${isNameInvalid ? 'border-destructive' : ''}`}
                        value={addLeadName}
                        onChange={(e) => setAddLeadName(e.target.value)}
                        placeholder="Ex.: João da Silva"
                        aria-invalid={isNameInvalid}
                      />
                      {isNameInvalid && (
                        <p className="text-xs text-destructive mt-1">Nome é obrigatório</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs">Email</label>
                      <input
                        type="email"
                        className={`w-full rounded-md border p-2 text-sm ${addLeadEmailError ? 'border-destructive' : ''}`}
                        value={addLeadEmail}
                        onChange={(e) => { setAddLeadEmail(e.target.value); setAddLeadEmailError(null); }}
                        placeholder="email@exemplo.com"
                        aria-invalid={!!addLeadEmailError}
                      />
                      {addLeadEmailError && (
                        <p className="text-xs text-destructive mt-1">{addLeadEmailError}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs">Telefone</label>
                      <input
                        className={`w-full rounded-md border p-2 text-sm ${isPhoneInvalid ? 'border-destructive' : ''}`}
                        value={addLeadPhone}
                        onChange={(e) => setAddLeadPhone(phoneApplyMask(e.target.value))}
                        placeholder="+55 (11) 99999-9999"
                        aria-invalid={isPhoneInvalid}
                      />
                      {isPhoneInvalid && (
                        <p className="text-xs text-destructive mt-1">Telefone inválido</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs">Consultor</label>
                      <Combobox
                        options={consultantComboboxOptions}
                        value={addLeadConsultantId}
                        onValueChange={(v) => setAddLeadConsultantId(v)}
                        placeholder="Selecione um consultor"
                        searchPlaceholder="Pesquisar consultores..."
                        emptyText="Nenhum consultor encontrado."
                        loading={isLoadingConsultants}
                        onSearch={(term) => setConsultantSearchTerm(term)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  {/* Hidden fields to keep funnel/stage in the form state */}
                  <input type="hidden" name="funnelId" value={addLeadFunnelId} />
                  <input type="hidden" name="stage_id" value={addLeadStageId} />
                </div>
                <div className="p-4 flex items-center justify-end gap-2 border-t">
                  <Button variant="outline" onClick={() => setAddLeadDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={async () => {
                    // Validação simples antes de enviar
                    if (isNameInvalid || isPhoneInvalid) {
                      toast({ title: 'Campos obrigatórios', description: 'Preencha nome e telefone válidos.', variant: 'destructive' });
                      return;
                    }
                    // submitAddLead
                    /**
                     * submitAddLead
                     * pt-BR: Envia criação de cliente simplificada com funil/etapa definidos.
                     * en-US: Sends simplified client creation with predefined funnel/stage.
                     */
                    try {
                      const payload: any = {
                        autor: addLeadConsultantId || undefined,
                        config: {
                          bairro: '', celular: '', cep: '', cidade: '', complemento: '', endereco: '', escolaridade: '', nascimento: '', nome_fantasia: '', numero: '', observacoes: '',
                         stage_id: addLeadStageId || '', funnelId: addLeadFunnelId || '', profissao: '', rg: '', telefone_residencial: '', tipo_pj: '', uf: ''
                        },
                         email: addLeadEmail || '',
                        telefone: phoneRemoveMask(addLeadPhone) || '',
                         genero: 'ni',
                         name: addLeadName || '',
                         password: 'ferqueta',
                         status: 'actived',
                         tipo_pessoa: 'pf',
                       };
                      const created = await clientsService.createClient(payload);
                      // Insere no estado local e fecha modal
                      setLocalClients((prev) => [created, ...prev]);
                      setAddLeadDialogOpen(false);
                      setAddLeadName(''); setAddLeadEmail(''); setAddLeadPhone(''); setAddLeadConsultantId('');
                      toast({ title: 'Lead criado', description: `Cliente ${created.name} adicionado em ${addLeadStageId}.` });
                    } catch (e: any) {
                      // Trata erros de validação (ex.: email já utilizado) e outras falhas da API
                      handleLeadCreationError(e);
                    }
                  }}>Criar</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * StageColumn
 * pt-BR: Coluna do kanban para uma etapa do funil de atendimento.
 *        Exibe cabeçalho com nome e contador (placeholder) e área de cartões.
 * en-US: Kanban column for a support funnel stage.
 *        Shows header with name and counter (placeholder) and cards area.
 */
function StageColumn({
  stage,
  funnelId,
  funnelColor,
  clients,
  dense,
  onDropOnStage,
  onDragStart,
  onDragEnd,
  onRegisterAttendance,
  onAddLeadClick,
  dropActive,
  setDropTargetStageId,
  recentlyMovedId,
  lastAttendanceByClient,
}: {
  stage: StageRecord;
  funnelId: string;
  funnelColor?: string | undefined;
  clients: ClientRecord[];
  dense: boolean;
  onDropOnStage: (toStageId: string) => void;
  onDragStart: (client: ClientRecord) => void;
  onDragEnd: () => void;
  onRegisterAttendance: (client: ClientRecord) => void;
  onAddLeadClick: (funnelId: string, stageId: string) => void;
  dropActive: boolean;
  setDropTargetStageId: (id: string | null) => void;
  recentlyMovedId: string | null;
  lastAttendanceByClient: Record<string, { timestamp: string; observation?: string }>;
}) {
  /**
   * StageColumn
   * pt-BR: Coluna de etapa com cabeçalho, botão de adicionar lead e lista de cards.
   * en-US: Stage column with header, add-lead button, and list of cards.
   */
  const navigate = useNavigate();

  /**
   * handleAddLead
   * pt-BR: Navega para criação de cliente com parâmetros de funil/etapa.
   * en-US: Navigates to client creation with funnel/stage params.
   */
  const handleAddLead = () => {
    onAddLeadClick(String(funnelId), String(stage.id));
  };

  const totalCards = clients.length;
  const totalAmount = clients.reduce((sum, c) => sum + getClientAmountBRL(c), 0);
  const totalAmountBRL = formatBRL(totalAmount);
  // pt-BR: Cor visual da etapa (fallback para cor do funil).
  // en-US: Visual color for the stage (fallback to funnel color).
  const stageColor = stage.color || funnelColor || '#CBD5E1';

  return (
    <div
      className={`flex flex-col rounded-md border bg-background ${
        // Drag-over visual feedback
        dropActive ? 'ring-2 ring-primary/50 bg-muted/20' : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDropTargetStageId(stage.id);
      }}
      onDragLeave={() => setDropTargetStageId(null)}
      onDrop={() => onDropOnStage(stage.id)}
    >
      {/* Cabeçalho da coluna (sticky) */}
      {/*
       * Header border only
       * pt-BR: Mantém apenas a cor na borda inferior do header.
       * en-US: Keep only color on the header bottom border.
       */}
      <div className="sticky top-0 z-10 bg-background">
        {/* pt-BR: Barrinha superior que reflete a cor da etapa; en-US: Top bar reflecting stage color */}
        <div className="h-1 w-full rounded-t-md" style={{ backgroundColor: stageColor }} />
        <div
          className="flex items-center justify-between p-3 border-b"
          style={{ borderBottomColor: '#E5E7EB' }}
        >
          <div className="flex items-center gap-2">
            {/* pt-BR: Indicador de cor ao lado do nome; en-US: Color swatch beside the name */}
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: stageColor }}
            />
            <span className="font-medium text-sm">{stage.name}</span>
            <Badge variant="secondary">{totalCards}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{totalAmountBRL}</span>
            {/* Dropdown de ações da coluna */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {/*
                 * onAddLeadClick
                 * pt-BR: Ação de adicionar lead na etapa atual.
                 * en-US: Action to add a lead in the current stage.
                 */}
                <DropdownMenuItem onClick={handleAddLead}>
                  <Plus className="h-4 w-4 mr-2" /> Adicionar lead
                </DropdownMenuItem>
                {/* Itens futuros (placeholders) */}
                <DropdownMenuItem disabled>
                  <NotebookPen className="h-4 w-4 mr-2" /> Editar etapa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Área de cartões */}
      {/*
       * Cards area with vertical scroll
       * pt-BR: Define uma altura máxima responsiva e rolagem suave.
       * en-US: Sets a responsive max height and smooth scrolling.
       */}
      <div className={`p-3 min-h-[360px] max-h-[70vh] overflow-y-auto ${dense ? 'space-y-1.5' : 'space-y-2'}`}>
        {clients.length === 0 ? (
          <div className="text-xs text-muted-foreground rounded-md border border-dashed p-3">Nenhum lead nesta etapa.</div>
        ) : (
          clients.map((client) => (
            <ClientKanbanCard
              key={client.id}
              client={client}
              funnelId={funnelId}
              onDragStart={() => onDragStart(client)}
              onDragEnd={onDragEnd}
              onRegisterAttendance={() => onRegisterAttendance(client)}
              isRecentlyMoved={recentlyMovedId === client.id}
              dense={dense}
              lastAttendanceTimestamp={lastAttendanceByClient[String(client.id)]?.timestamp}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * ClientKanbanCard
 * pt-BR: Card simples para representar um cliente dentro da coluna.
 *        Mostra nome, email e status, e navega para a rota de visualização.
 * en-US: Simple card representing a client inside the column.
 *        Shows name, email, and status, and navigates to the view route.
 */
/**
 * ClientKanbanCard
 * pt-BR: Card do cliente com estilos responsivos à densidade (compacto/confortável).
 * en-US: Client card with styles responsive to density (compact/comfortable).
 */
/**
 * ClientKanbanCard
 * pt-BR: Card do cliente com ação para registrar atendimento (observação opcional).
 * en-US: Client card with action to register attendance (optional observation).
 */
/**
 * ClientKanbanCard
 * pt-BR: Card do cliente dentro do kanban. Inclui navegação para a página
 *        de detalhes, preservando o funil ativo via query string.
 * en-US: Client card inside the kanban. Includes navigation to the details
 *        page, preserving the active funnel via query string.
 */
function ClientKanbanCard({ client, funnelId, onDragStart, onDragEnd, onRegisterAttendance, isRecentlyMoved, dense, lastAttendanceTimestamp }: { client: ClientRecord; funnelId: string; onDragStart?: () => void; onDragEnd?: () => void; onRegisterAttendance?: () => void; isRecentlyMoved?: boolean; dense?: boolean; lastAttendanceTimestamp?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  /**
   * Dropdown actions feedback
   * pt-BR: Usa toast para feedback rápido nas ações que ainda serão implementadas.
   * en-US: Uses toast for quick feedback on actions that are yet to be implemented.
   */
  const { toast } = useToast();

  /**
   * goToView
   * pt-BR: Navega para a página de detalhes do cliente, anexando `?funnel=`
   *        com o funil corrente para que o botão Voltar retorne ao mesmo funil.
   * en-US: Navigates to the client's details page, appending `?funnel=` with
   *        current funnel so the Back button returns to the same funnel.
   */
  const goToView = () => {
    const q = funnelId ? `?funnel=${encodeURIComponent(String(funnelId))}` : '';
    // Envia state.from para que a View/Edição saibam voltar à origem
    navigate(`/admin/clients/${client.id}/view${q}`, { state: { from: location } });
  };

  /**
   * handleCreateProposal
   * pt-BR: Navega para a página de criação de proposta, enviando `id_cliente` via
   *        query string e associando o botão Voltar à página atual de leads.
   * en-US: Navigates to the proposal creation page, sending `id_cliente` via
   *        query string and associating the Back button to the current leads page.
   */
  function handleCreateProposal() {
    const returnTo = `${location.pathname}${location.search}`;
    const qs = new URLSearchParams({ id_cliente: String(client.id) });
    navigate(`/admin/sales/proposals/create?${qs.toString()}`, { state: { returnTo, funnelId } });
  }

  const statusLabel = (() => {
    const map: Record<string, string> = {
      actived: 'Ativo',
      inactived: 'Inativo',
      pre_registred: 'Pré-cadastro',
    };
    return map[client.status] || client.status;
  })();

  return (
    <div
      className={`rounded-md border bg-card transition-all cursor-pointer ${dense ? 'p-2' : 'p-3'} shadow-sm ${
        isRecentlyMoved ? 'animate-[fadeIn_0.3s_ease-in] shadow-md' : ''
      } hover:bg-muted/50 hover:shadow-md active:scale-[0.97]`}
      onClick={goToView}
      title={`Visualizar cliente ${client.name}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center justify-between">
        <div className="font-medium text-sm truncate">{client.name}</div>
        {/* Right-side actions: status + dropdown */}
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs">{statusLabel}</Badge>
          {/*
           * DropdownMenu on card
           * pt-BR: Menu com opções Detalhes, Conversas, Propostas.
           * en-US: Menu with options Details, Conversations, Proposals.
           */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-7 w-7 items-center justify-center rounded-md border hover:bg-muted"
                onClick={(e) => e.stopPropagation()}
                title="Ações"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); goToView(); }}>
                <Eye className="mr-2 h-4 w-4" /> Detalhes
              </DropdownMenuItem>
              {/* pt-BR: Editar mantendo contexto do funil; en-US: Edit preserving funnel context */}
              <DropdownMenuItem onClick={(e) => { 
                e.stopPropagation(); 
                const q = funnelId ? `?funnel=${encodeURIComponent(String(funnelId))}` : ''; 
                navigate(`/admin/clients/${client.id}/edit${q}`);
              }}>
                <MessageSquare className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast({ title: 'Conversas', description: 'Em breve: histórico de conversas do cliente.' }); }}>
                <MessageSquare className="mr-2 h-4 w-4" /> Conversas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCreateProposal(); }}>
                <FileText className="mr-2 h-4 w-4" /> Propostas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="text-xs text-muted-foreground truncate mt-1">{client.email || 'Sem email'}</div>
      {lastAttendanceTimestamp && (
        <div className="text-[11px] text-muted-foreground mt-1">Último atendimento: {new Date(lastAttendanceTimestamp).toLocaleString('pt-BR')}</div>
      )}
      {client.autor_name && (
        <div className="text-[11px] text-muted-foreground mt-1">Owner: {client.autor_name}</div>
      )}
      <div className="mt-2 flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-7"
          onClick={(e) => { e.stopPropagation(); onRegisterAttendance && onRegisterAttendance(); }}
          title="Registrar atendimento"
        >
          <NotebookPen className="h-4 w-4 mr-1" /> Registrar
        </Button>
      </div>
    </div>
  );
}

/**
 * EnrollmentKanbanCard
 * pt-BR: Card simples de matrícula para a área de vendas.
 * en-US: Simple enrollment card for the sales area.
 */
/**
 * EnrollmentKanbanCard
 * pt-BR: Card de matrícula com ações de visualizar/editar e contexto de funil.
 * en-US: Enrollment card with view/edit actions and funnel context.
 */
function EnrollmentKanbanCard({ enrollment, dense, funnelId, onDragStart, onDragEnd, isRecentlyMoved }: { enrollment: EnrollmentRecord; dense?: boolean; funnelId?: string; onDragStart?: () => void; onDragEnd?: () => void; isRecentlyMoved?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;

  const title = (enrollment as any)?.cliente_nome || (enrollment as any)?.student_name || (enrollment as any)?.name || `Matrícula ${enrollment.id}`;
  const course = (enrollment as any)?.curso_nome || (enrollment as any)?.course_name || (enrollment as any)?.curso || '';
  const turma = (enrollment as any)?.turma_nome || '';
  const status = (enrollment as any)?.status || '—';
  const amountBRL = formatBRL(getEnrollmentAmountBRL(enrollment));

  /**
   * goToView
   * pt-BR: Navega para visualizar proposta/matrícula mantendo contexto de funil.
   * en-US: Navigates to view proposal/enrollment while keeping funnel context.
   */
  const goToView = () => {
    const q = funnelId ? `?funnel=${encodeURIComponent(String(funnelId))}` : '';
    navigate(`/admin/sales/proposals/view/${encodeURIComponent(String(enrollment.id))}${q}`, { state: { returnTo } });
  };
  /**
   * goToEdit
   * pt-BR: Navega para editar proposta/matrícula mantendo contexto de funil.
   * en-US: Navigates to edit proposal/enrollment while keeping funnel context.
   */
  const goToEdit = () => {
    const q = funnelId ? `?funnel=${encodeURIComponent(String(funnelId))}` : '';
    navigate(`/admin/sales/proposals/edit/${encodeURIComponent(String(enrollment.id))}${q}`, { state: { returnTo } });
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
              <DropdownMenuItem onClick={goToView}>
                <Eye className="mr-2 h-4 w-4" /> Visualizar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={goToEdit}>
                <FileText className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
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

/**
 * StageColumnSales
 * pt-BR: Coluna do kanban para uma etapa do funil de vendas (matrículas).
 * en-US: Kanban column for a sales funnel stage (enrollments).
 */
function StageColumnSales({
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
}) {
  // useNavigate/useLocation para permitir abrir criação de propostas e retornar ao funil
  // pt-BR: Navega para a página de criação de propostas, carregando o estado atual para voltar.
  // en-US: Navigates to the proposal creation page, carrying current location to enable going back.
  const navigate = useNavigate();
  const location = useLocation();

  const stageColor = stage.color || funnelColor || '#CBD5E1';
  const totalCards = enrollments.length;
  const totalAmount = enrollments.reduce((sum, e) => sum + getEnrollmentAmountBRL(e), 0);
  const totalAmountBRL = formatBRL(totalAmount);

  /**
   * handleAddProposal
   * pt-BR: Abre a página de criação de propostas e passa IDs de funil e etapa
   *        para permitir preencher os campos correspondentes e voltar ao funil atual.
   * en-US: Opens the proposal creation page and passes funnel and stage IDs
   *        so the form fields are prefilled and enables returning to current funnel.
   */
  function handleAddProposal() {
    const returnTo = `${location.pathname}${location.search}`;
    navigate('/admin/sales/proposals/create', {
      state: { returnTo, funnelId, stageId: String(stage.id) },
    });
  }

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
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: stageColor }} />
            <span className="font-medium text-sm">{stage.name}</span>
            <Badge variant="secondary">{totalCards}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{totalAmountBRL}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={handleAddProposal}>
                  <Plus className="h-4 w-4 mr-2" /> Adicionar propostas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <div className={`p-3 min-h-[360px] max-h-[70vh] overflow-y-auto ${dense ? 'space-y-1.5' : 'space-y-2'}`}>
        {enrollments.length === 0 ? (
          <div className="text-xs text-muted-foreground rounded-md border border-dashed p-3">Nenhuma matrícula nesta etapa.</div>
        ) : (
          enrollments.map((e) => (
            <EnrollmentKanbanCard
              key={String(e.id)}
              enrollment={e}
              dense={dense}
              funnelId={funnelId}
              onDragStart={() => onDragStart(e)}
              onDragEnd={onDragEnd}
              isRecentlyMoved={recentlyMovedEnrollmentId === String(e.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
