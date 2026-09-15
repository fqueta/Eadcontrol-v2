import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, Mail, Phone, MapPin, User, Building, Calendar, GraduationCap, Briefcase, FileText, DollarSign, Edit, Plus, UserPlus, Clock, Activity, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { useClientById, usePromoteClient } from '@/hooks/clients';
import { getMockClientById } from '@/mocks/clients';
import { ClientRecord } from '@/types/clients';
import { useFunnel, useStagesList } from '@/hooks/funnels';
import { phoneApplyMask } from '@/lib/masks/phone-apply-mask';
import { useEnrollmentsList, useDeleteEnrollment } from '@/hooks/enrollments';
import EnrollmentTable from '@/components/enrollments/EnrollmentTable';
import { AccountsReceivableTable } from '@/components/financial/AccountsReceivableTable';
import { useClientLogs } from '@/hooks/clients';
import { currencyRemoveMaskToNumber } from '@/lib/masks/currency';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { coursesService } from '@/services/coursesService';
import { useTurmasList } from '@/hooks/turmas';



/**
 * Página de visualização detalhada de um cliente específico
 * Exibe todas as informações do cadastro do cliente de forma organizada
 */
export default function ClientView() {

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  // pt-BR: Flag para ativar uso de dados mockados
  // en-US: Flag to enable mocked data usage
  const useMock = import.meta.env.VITE_USE_MOCK_CLIENTS === 'true';
  // Hooks para buscar e atualizar cliente
  const { data: clientResponse, isLoading: isLoadingClient, error, isError, isSuccess } = useClientById(id!);
  const promoteClientMutation = usePromoteClient();
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  /**
   * Normaliza o formato da resposta do cliente
   * pt-BR: A API pode retornar o cliente direto ou dentro de `data`.
   * en-US: API may return the client directly or wrapped under `data`.
   */
  const client: ClientRecord | null = useMock
    ? getMockClientById(id!)
    : (() => {
        const raw: any = clientResponse as any;
        if (!raw) return null;
        if (raw && typeof raw === 'object' && 'data' in raw && raw.data && !Array.isArray(raw.data)) {
          return raw.data as ClientRecord;
        }
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          return raw as ClientRecord;
        }
        return null;
      })();
  const link_admin:string = 'admin';
  // Log para debug em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log('Client data:', client);
  }

  /**
   * Busca dados do Funil e Etapa para exibição no card "Atendimento".
   * - Evita chamadas quando em modo mock.
   * - Faz lookup da etapa pelo `stage_id` no resultado paginado.
   */
  const funnelId = client?.config?.funnelId || '';
  const stageId = client?.config?.stage_id || '';
  const funnelQuery = useFunnel(funnelId, {
    enabled: !!funnelId && !useMock,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const stagesQuery = useStagesList(funnelId, { per_page: 100 }, {
    enabled: !!funnelId && !useMock,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const funnelName = (useMock ? 'Funil de Leads (mock)' : (funnelQuery.data?.name || funnelId || 'Não informado'));
  const stageName = (() => {
    if (useMock) return stageId ? `Etapa ${stageId}` : 'Não informado';
    const list = (stagesQuery.data as any)?.data || [];
    const found = list.find((s: any) => s.id === stageId);
    return found?.name || (stageId || 'Não informado');
  })();

  /**
   * useEnrollmentsList (client scope)
   * pt-BR: Carrega matrículas vinculadas ao cliente atual, filtrando por `id_cliente`.
   * en-US: Loads enrollments linked to the current client, filtering by `id_cliente`.
   */
  const clientId = (client as any)?.id;
  // Paginação e filtros
  const [pageEnroll, setPageEnroll] = useState<number>(1);
  const [perPageEnroll, setPerPageEnroll] = useState<number>(10);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [situacaoFilter, setSituacaoFilter] = useState<'all' | 'int' | 'mat'>('all');

  const enrollmentListParams = {
    page: pageEnroll,
    per_page: perPageEnroll,
    id_cliente: clientId,
    situacao: situacaoFilter,
    id_curso: selectedCourseId !== 'all' && selectedCourseId ? selectedCourseId : undefined,
    id_turma: selectedClassId !== 'all' && selectedClassId ? selectedClassId : undefined,
  } as any;
  const { data: enrollmentsResp, isLoading: isEnrollmentsLoading, isFetching: isEnrollmentsFetching, refetch: refetchEnrollments } = useEnrollmentsList(enrollmentListParams, { enabled: !!clientId });
  const enrollments = Array.isArray(enrollmentsResp?.data) ? (enrollmentsResp!.data as any[]) : [];

  /**
   * interestedList (client scope)
   * pt-BR: Carrega matrículas com situacao='int' (interessados).
   */
  const [pageInterest, setPageInterest] = useState<number>(1);
  const [perPageInterest, setPerPageInterest] = useState<number>(10);
  const interestListParams = {
    situacao: 'int',
    page: pageInterest,
    per_page: perPageInterest,
    id_cliente: clientId,
  } as any;
  const { data: interestResp, isLoading: isInterestLoading, isFetching: isInterestFetching, refetch: refetchInterests } = useEnrollmentsList(interestListParams, { enabled: !!clientId });
  const interestedCourses = Array.isArray(interestResp?.data) ? (interestResp!.data as any[]) : [];

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedEnroll, setSelectedEnroll] = useState<any>(null);

  const deleteMutation = useDeleteEnrollment({
    onSuccess: () => {
      toast({ title: 'Matrícula excluída', description: 'A matrícula foi removida com sucesso.' });
      refetchEnrollments();
      refetchInterests();
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao excluir', description: err?.message || 'Tente novamente.', variant: 'destructive' });
    },
  });

  /**
   * getClientLogs (client scope)
   * pt-BR: Carrega histórico de eventos do cliente.
   */
  const { data: logsResp, isLoading: isLogsLoading } = useClientLogs(clientId, { per_page: 20 }, {
    enabled: !!clientId && !useMock,
  });
  const logs = Array.isArray(logsResp?.data) ? (logsResp!.data as any[]) : [];

  /**
   * resolveEnrollmentAmountBRL
   * pt-BR: Formata valor monetário (total/subtotal/amount_brl) em BRL para exibição.
   * en-US: Formats monetary value (total/subtotal/amount_brl) in BRL for display.
   */
  function resolveEnrollmentAmountBRL(enroll: any): string {
    try {
      const raw = enroll?.amount_brl ?? enroll?.total ?? enroll?.subtotal ?? '';
      const num = typeof raw === 'string' ? currencyRemoveMaskToNumber(raw) : Number(raw) || 0;
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    } catch {
      const fallback = Number(enroll?.amount_brl || 0);
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(fallback);
    }
  }

  /**
   * handleAddEnrollmentClick
   * pt-BR: Abre a página de criação de proposta/matrícula para o cliente atual.
   * en-US: Opens the proposal/enrollment creation page for the current client.
   */
  function handleAddEnrollmentClick() {
    const idCliente = String((client as any)?.id || '');
    const qs = new URLSearchParams({ id_cliente: idCliente });
    navigate(`/admin/sales/proposals/create?${qs.toString()}`, { state: { from: location } });
  }

  /**
   * handleViewEnrollment
   * pt-BR: Navega para visualização da proposta/matrícula.
   * en-US: Navigates to proposal/enrollment view.
   */
  function handleViewEnrollment(enroll: any) {
    const id = String(enroll?.id || '');
    if (!id) return;
    const returnTo = `${location.pathname}${location.search || ''}`;
    navigate(`/admin/school/enrollments/view/${id}`, { state: { returnTo } });
  }

  /**
   * handleEditEnrollment
   * pt-BR: Navega para edição da proposta/matrícula.
   * en-US: Navigates to proposal/enrollment edit.
   */
  function handleEditEnrollment(enroll: any, tab?: string) {
    const id = String(enroll?.id || '');
    if (!id) return;
    const query = tab ? `?tab=${tab}` : '';
    const returnTo = `${location.pathname}${location.search || ''}`;
    navigate(`/admin/sales/proposals/edit/${id}${query}`, { state: { returnTo } });
  }

  function handleDeleteEnrollment(enroll: any) {
    setSelectedEnroll(enroll);
    setDeleteOpen(true);
  }

  /**
   * Courses and Classes filters
   * pt-BR: Carrega opções de cursos e turmas para filtros locais.
   * en-US: Loads course and class options for local filters.
   */
  const { data: coursesResp } = useQuery({
    queryKey: ['cursos', 'list', 200],
    queryFn: async () => coursesService.listCourses({ page: 1, per_page: 200 }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const courseItems = (coursesResp?.data || []) as any[];

  const { data: classesResp } = useTurmasList({ page: 1, per_page: 200, id_curso: selectedCourseId !== 'all' && selectedCourseId ? selectedCourseId : undefined }, {
    enabled: selectedCourseId !== 'all' && !!selectedCourseId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const classItems = (classesResp?.data || []) as any[];
  /**
   * detectFunnelIdFromClient
   * pt-BR: Tenta detectar o funil do cliente a partir de diferentes caminhos
   *        usados pela API e normaliza para string.
   * en-US: Attempts to detect client's funnel from different API paths and
   *        normalizes to string.
   */
  const detectFunnelIdFromClient = (c: ClientRecord | null): string | null => {
    if (!c) return null;
    const p: any = (c as any).preferencias || {};
    const cfg: any = (c as any).config || {};
    const candidates = [
      cfg?.funnelId,
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
   * getReturnUrl
   * pt-BR: Determina a URL de retorno priorizando `state.from` (página de origem),
   *        depois `?returnTo` na query string, com fallback para o funil atual
   *        ou lista de clientes.
   * en-US: Determines the return URL prioritizing `state.from` (origin page),
   *        then `?returnTo` query param, falling back to current funnel or
   *        clients list.
   */
  const getReturnUrl = (): string => {
    const from = (location.state as any)?.from;
    if (from && typeof from === 'object') {
      const path = String(from.pathname || '/');
      const search = String(from.search || '');
      const hash = String(from.hash || '');
      return `${path}${search}${hash}`;
    }
    const returnTo = searchParams.get('returnTo');
    if (returnTo && returnTo.startsWith('/')) {
      try {
        const decoded = decodeURIComponent(returnTo);
        if (decoded.startsWith('/')) return decoded;
      } catch {}
    }
    const funnelFromQuery = searchParams.get('funnel') || '';
    const fallbackFunnel = detectFunnelIdFromClient(client) || '';
    const targetFunnel = funnelFromQuery || fallbackFunnel;
    if (targetFunnel) {
      return `/${link_admin}/customers/leads?funnel=${encodeURIComponent(String(targetFunnel))}`;
    }
    return `/${link_admin}/clients`;
  };
  /**
   * handleBack
   * pt-BR: Navega de volta para a página de atendimento (kanban), preservando
   *        o funil previamente aberto via `?funnel=`. Se o parâmetro não estiver
   *        presente (acesso direto), usa o funil do cliente como fallback.
   * en-US: Navigates back to the attendance (kanban) page, preserving the
   *        previously opened funnel via `?funnel=`. If the parameter is absent
   *        (direct access), falls back to the client's funnel.
   */
  const handleBack = () => {
    navigate(getReturnUrl());
  };

  /**
   * Navega para a página de edição do cliente
   */
  const handleEdit = () => {
    // Preserva o funil atual na query string ao ir para edição
    // pt-BR: Se houver `?funnel=` na URL atual, repassa para a edição.
    // en-US: If `?funnel=` exists in current URL, forward it to the edit page.
    const funnelFromQuery = searchParams.get('funnel') || '';
    const fallbackFunnel = detectFunnelIdFromClient(client) || '';
    const targetFunnel = funnelFromQuery || fallbackFunnel;
    const q = targetFunnel ? `?funnel=${encodeURIComponent(String(targetFunnel))}` : '';
    // Também envia o estado de origem para a página de edição
    navigate(`/${link_admin}/clients/${id}/edit${q}`, { state: { from: location } });
  };

  /**
   * Formata a data para exibição no formato brasileiro
   */
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informado';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  /**
   * Formata o CEP para exibição
   */
  const formatCEP = (cep: string) => {
    if (!cep) return 'Não informado';
    return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  /**
   * Formata CPF para exibição
   */
  const formatCPF = (cpf: string) => {
    if (!cpf) return 'Não informado';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  /**
   * Formata CNPJ para exibição
   */
  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return 'Não informado';
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  /**
   * Formata telefone para exibição
   */
  const formatPhone = (phone: string) => {
    const cleaned = (phone || '').replace(/\D/g, '');
    const masked = phoneApplyMask(cleaned);
    return masked || 'Não informado';
  };

  if (!useMock && isLoadingClient) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando informações do cliente...</p>
        </div>
      </div>
    );
  }

  // Função para determinar o tipo de erro e mensagem apropriada
  const getErrorInfo = () => {
    // pt-BR: Ao usar mocks, não exibir telas de erro originadas da API
    // en-US: When using mocks, suppress API-originated error screens
    if (useMock) return null;
    if (!error && !client && !isLoadingClient) {
      return {
        title: 'Cliente não encontrado',
        message: 'O cliente solicitado não foi encontrado ou não existe.',
        type: 'not-found'
      };
    }
    
    if (error) {
      const errorWithStatus = error as Error & { status?: number };
      
      switch (errorWithStatus.status) {
        case 404:
          return {
            title: 'Cliente não encontrado',
            message: 'O cliente com este ID não existe no sistema.',
            type: 'not-found'
          };
        case 500:
          return {
            title: 'Erro interno do servidor',
            message: 'Ocorreu um erro interno no servidor. Tente novamente em alguns minutos ou entre em contato com o suporte.',
            type: 'server-error'
          };
        case 403:
          return {
            title: 'Acesso negado',
            message: 'Você não tem permissão para visualizar este cliente.',
            type: 'forbidden'
          };
        case 401:
          return {
            title: 'Não autorizado',
            message: 'Sua sessão expirou. Faça login novamente.',
            type: 'unauthorized'
          };
        default:
          return {
            title: 'Erro ao carregar cliente',
            message: error.message || 'Ocorreu um erro inesperado ao carregar as informações do cliente.',
            type: 'generic'
          };
      }
    }
    
    return null;
  };

  const errorInfo = getErrorInfo();
  
  if (errorInfo) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              {/* Ícone baseado no tipo de erro */}
              <div className="flex justify-center">
                {errorInfo.type === 'server-error' && (
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                )}
                {errorInfo.type === 'not-found' && (
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.5-.935-6.072-2.456M15 21H9a2 2 0 01-2-2V5a2 2 0 012-2h6a2 2 0 012 2v14a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
                {(errorInfo.type === 'forbidden' || errorInfo.type === 'unauthorized') && (
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                )}
                {errorInfo.type === 'generic' && (
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{errorInfo.title}</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {errorInfo.message}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleBack} variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para lista
                </Button>
                
                {errorInfo.type === 'server-error' && (
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="default"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Tentar novamente
                  </Button>
                )}
                
                {errorInfo.type === 'unauthorized' && (
                  <Button 
                    onClick={() => {
                      localStorage.removeItem('token');
                      window.location.href = '/auth/login';
                    }} 
                    variant="default"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Fazer login
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verificação adicional de segurança
  if (!client) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.5-.935-6.072-2.456M15 21H9a2 2 0 01-2-2V5a2 2 0 012-2h6a2 2 0 012 2v14a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Cliente não encontrado</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  O cliente solicitado não foi encontrado ou não existe.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleBack} variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para lista
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-3 space-y-3.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <Button onClick={handleBack} variant="outline" size="sm" className="shrink-0 h-8 text-xs">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Voltar
          </Button>
          <div className="overflow-hidden">
            <h1 className="text-xl font-bold truncate">{client.name}</h1>
            <p className="text-muted-foreground text-xs">
              {client.tipo_pessoa === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'} • ID: {client.id}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <Badge variant={
            client.status === 'actived' ? 'default' : 
            client.status === 'inactived' ? 'destructive' : 
            'secondary'
          }>
            {client.status === 'actived' ? 'Ativo' : 
             client.status === 'inactived' ? 'Inativo' : 
             'Pré-cadastro'}
          </Badge>
          <Button 
            onClick={() => setIsPromoteModalOpen(true)} 
            variant="outline" 
            size="sm"
            disabled={promoteClientMutation.isPending}
            className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8 text-xs"
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Promover
          </Button>
          <Button onClick={handleEdit} variant="default" size="sm" className="h-8 text-xs">
            <Edit className="mr-1.5 h-3.5 w-3.5" />
            Editar
          </Button>
        </div>
      </div>

      {/* Top Grid: Info, Atendimento e Contato */}
      <div className="grid gap-3.5 md:grid-cols-3">
        {/* Informações Básicas */}
        <Card className="h-full shadow-sm">
          <CardHeader className="py-2 px-3 text-primary border-b bg-muted/10">
            <CardTitle className="flex items-center text-sm font-bold">
              <User className="mr-2 h-4 w-4" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 grid grid-cols-2 gap-2 text-xs">
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Nome</label>
              <p className="font-semibold text-foreground truncate">{client.name || 'Não informado'}</p>
            </div>
            
            {client.tipo_pessoa === 'pj' && client.razao && (
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Razão Social</label>
                <p className="text-foreground truncate">{client.razao}</p>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Documento</label>
              <p className="font-mono text-foreground font-medium">
                {client.tipo_pessoa === 'pf' 
                  ? formatCPF(client.cpf) 
                  : formatCNPJ(client.cnpj)
                }
              </p>
            </div>

            {client.config?.rg && client.tipo_pessoa === 'pf' && (
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">RG</label>
                <p className="text-foreground">{client.config.rg}</p>
              </div>
            )}

            {client.tipo_pessoa === 'pf' && (
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Gênero</label>
                <p className="text-foreground">
                  {client.genero === 'm' ? 'Masculino' : 
                   client.genero === 'f' ? 'Feminino' : 'Não informado'}
                </p>
              </div>
            )}

            {client.config?.nascimento && (
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Nascimento</label>
                <p className="text-foreground">{formatDate(client.config.nascimento)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Atendimento (Funil e Etapa) */}
        <Card className="h-full shadow-sm">
          <CardHeader className="py-2 px-3 text-primary border-b bg-muted/10">
            <CardTitle className="flex items-center text-sm font-bold">
              <Briefcase className="mr-2 h-4 w-4" />
              Atendimento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2 text-xs">
            <div className="bg-muted/30 p-2 rounded border">
              <label className="text-[10px] font-bold text-muted-foreground uppercase block">Funil</label>
              <p className="font-semibold text-foreground truncate">{funnelName}</p>
            </div>
            <div className="bg-muted/30 p-2 rounded border">
              <label className="text-[10px] font-bold text-muted-foreground uppercase block">Etapa</label>
              <p className="font-semibold text-foreground truncate">{stageName}</p>
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card className="h-full shadow-sm">
          <CardHeader className="py-2 px-3 text-primary border-b bg-muted/10">
            <CardTitle className="flex items-center text-sm font-bold">
              <Phone className="mr-2 h-4 w-4" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2 text-xs">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Email</label>
              <p className="flex items-center mt-0.5 text-foreground font-medium truncate">
                <Mail className="mr-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{client.email || 'Não informado'}</span>
              </p>
            </div>

            {client.config?.celular && (
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Celular / WhatsApp</label>
                <p className="flex items-center mt-0.5 text-foreground font-medium">
                  <Phone className="mr-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {formatPhone(client.config.celular)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Card Único: Cursos de Interesse & Matrículas */}
      <Card className="border-primary/20 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 px-3 border-b bg-muted/20 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="flex items-center text-base font-bold text-foreground">
              <GraduationCap className="mr-2 h-5 w-5 text-primary" />
              Cursos de Interesse & Matrículas
            </CardTitle>
            <div className="flex items-center gap-1 bg-background border rounded-md p-0.5 ml-2">
              <Button
                size="sm"
                variant={situacaoFilter === 'all' ? 'default' : 'ghost'}
                className="h-6 text-[11px] px-2 rounded-sm"
                onClick={() => { setSituacaoFilter('all'); setPageEnroll(1); }}
              >
                Todos ({enrollmentsResp?.total ?? enrollments.length})
              </Button>
              <Button
                size="sm"
                variant={situacaoFilter === 'int' ? 'default' : 'ghost'}
                className="h-6 text-[11px] px-2 rounded-sm text-orange-700 hover:text-orange-800"
                onClick={() => { setSituacaoFilter('int'); setPageEnroll(1); }}
              >
                Interesses
              </Button>
              <Button
                size="sm"
                variant={situacaoFilter === 'mat' ? 'default' : 'ghost'}
                className="h-6 text-[11px] px-2 rounded-sm text-emerald-700 hover:text-emerald-800"
                onClick={() => { setSituacaoFilter('mat'); setPageEnroll(1); }}
              >
                Matrículas
              </Button>
            </div>
          </div>
          <Button size="sm" onClick={handleAddEnrollmentClick} className="shadow-sm h-7 text-xs px-3">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Novo interesse / curso
          </Button>
        </CardHeader>
        <CardContent className="p-3 space-y-2.5">
          {/* Barra de Filtros Compacta */}
          <div className="flex flex-col md:flex-row gap-2 items-center justify-between bg-muted/20 p-2 rounded-md border text-xs">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto flex-1">
              <div className="w-full sm:w-48">
                <Select value={selectedCourseId} onValueChange={(val) => { setSelectedCourseId(val); setSelectedClassId('all'); setPageEnroll(1); }}>
                  <SelectTrigger className="h-7 text-xs bg-background">
                    <SelectValue placeholder="Todos os Cursos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Cursos</SelectItem>
                    {courseItems.map((c: any) => (
                      <SelectItem key={String(c.id)} value={String(c.id)}>{String(c?.titulo || c?.nome || c?.name || c.id)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-40">
                <Select value={selectedClassId} onValueChange={(val) => { setSelectedClassId(val); setPageEnroll(1); }}>
                  <SelectTrigger className="h-7 text-xs bg-background">
                    <SelectValue placeholder="Todas as Turmas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Turmas</SelectItem>
                    {classItems.map((t: any) => (
                      <SelectItem key={String(t.id)} value={String(t.id)}>{String(t?.nome || t?.name || t.id)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Por pág:</span>
              <Select value={String(perPageEnroll)} onValueChange={(val) => { setPerPageEnroll(Number(val)); setPageEnroll(1); }}>
                <SelectTrigger className="h-7 w-16 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 ml-2">
                <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setPageEnroll((p) => Math.max(1, p - 1))} disabled={pageEnroll <= 1 || isEnrollmentsFetching}>
                  Anterior
                </Button>
                <span className="text-xs font-medium px-1 min-w-[45px] text-center">Pág. {pageEnroll}</span>
                <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setPageEnroll((p) => Math.min(enrollmentsResp?.last_page || 1, p + 1))} disabled={pageEnroll >= (enrollmentsResp?.last_page || 1) || isEnrollmentsFetching}>
                  Próxima
                </Button>
              </div>
            </div>
          </div>

          {/* Tabela Unificada com Coluna de Situação */}
          <div className="rounded-md border bg-background overflow-hidden">
            <EnrollmentTable
              items={enrollments}
              isLoading={isEnrollmentsLoading}
              isFetching={isEnrollmentsFetching}
              onView={handleViewEnrollment}
              onEdit={handleEditEnrollment}
              onDelete={handleDeleteEnrollment}
              resolveAmountBRL={resolveEnrollmentAmountBRL}
            />
          </div>
        </CardContent>
      </Card>

      {/* Faturas deste contato */}
      <Card className="shadow-sm">
        <CardContent className="p-3">
          <AccountsReceivableTable categories={[]} clientId={client.id} title="Faturas deste contato" />
        </CardContent>
      </Card>

      {/* Grid Inferior: Endereço, Dados Adicionais e Sistema */}
      <div className="grid gap-3.5 md:grid-cols-3">
        {/* Endereço */}
        <Card className="h-full shadow-sm">
          <CardHeader className="py-2 px-3 text-primary border-b bg-muted/10">
            <CardTitle className="flex items-center text-sm font-bold">
              <MapPin className="mr-2 h-4 w-4" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2 text-xs">
            {client.config?.cep && (
              <div className="flex justify-between items-start border-b pb-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">CEP</label>
                <p className="font-medium text-foreground">{formatCEP(client.config.cep)}</p>
              </div>
            )}

            {client.config?.endereco && (
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block">Logradouro / Número</label>
                <p className="text-foreground">
                  {client.config.endereco}
                  {client.config?.numero && `, ${client.config.numero}`}
                </p>
              </div>
            )}

            {client.config?.complemento && (
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block">Complemento</label>
                <p className="text-foreground">{client.config.complemento}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1 border-t">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block">Bairro</label>
                <p className="text-foreground">{client.config?.bairro || '-'}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block">Cidade/UF</label>
                <p className="text-foreground">
                  {client.config?.cidade && client.config?.uf 
                    ? `${client.config.cidade}/${client.config.uf}`
                    : client.config?.cidade || client.config?.uf || '-'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados Adicionais */}
        <Card className="h-full shadow-sm">
          <CardHeader className="py-2 px-3 text-primary border-b bg-muted/10">
            <CardTitle className="flex items-center text-sm font-bold">
              <FileText className="mr-2 h-4 w-4" />
              Dados Adicionais
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2 text-xs">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block">Escolaridade</label>
              <p className="flex items-center text-foreground font-medium mt-0.5">
                <GraduationCap className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                {client.config?.escolaridade || 'Não informada'}
              </p>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block">Profissão</label>
              <p className="flex items-center text-foreground font-medium mt-0.5">
                <Briefcase className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                {client.config?.profissao || 'Não informada'}
              </p>
            </div>

            <Separator />

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Destaques</label>
              <div className="flex flex-wrap gap-1.5">
                {client.is_alloyal && <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">Clube Alloyal</Badge>}
                {client.status === 'actived' && <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 text-[10px]">Ativo</Badge>}
                {client.tipo_pessoa === 'pj' && <Badge variant="outline" className="text-[10px]">PJ</Badge>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Observações & Sistema */}
        <Card className="bg-muted/10 h-full shadow-sm">
          <CardHeader className="py-2 px-3 border-b bg-muted/20">
            <CardTitle className="flex items-center text-sm font-bold text-muted-foreground">
              <Calendar className="mr-2 h-4 w-4" />
              Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2 text-xs">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block">Observações</label>
              <p className="text-muted-foreground italic truncate">
                {client.config?.observacoes ? `"${client.config.observacoes}"` : 'Nenhuma observação registrada.'}
              </p>
            </div>
            <div className="flex justify-between items-center text-[11px] pt-1.5 border-t">
              <span className="font-semibold text-muted-foreground uppercase">Data de Cadastro</span>
              <span>{formatDate(client.created_at)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-semibold text-muted-foreground uppercase">Última Atualização</span>
              <span>{formatDate(client.updated_at)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline de Eventos */}
      <Card className="border-none shadow-md overflow-hidden bg-background">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/10 pb-4">
          <CardTitle className="flex items-center text-xl font-bold flex-1">
            <Activity className="mr-3 h-6 w-6 text-primary" />
            Linha do Tempo de Atividades
          </CardTitle>
          <div className="text-xs text-muted-foreground">Últimos eventos registrados</div>
        </CardHeader>
        <CardContent className="pt-6 relative">
          <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-border rounded-full" />
          <div className="space-y-6 relative">
            
            {isLogsLoading ? (
               <div className="flex gap-6 group">
                <div className="flex-1 space-y-1.5 pb-2 ml-14">
                  <span className="font-bold text-sm text-foreground">Carregando eventos...</span>
                </div>
               </div>
            ) : logs.length > 0 ? (
              logs.map((log) => {
                let Icon = Activity;
                let bgClass = "bg-gray-50 text-gray-500 border-background";
                let title = "Evento";
                let description = "";

                if (log.event_type === 'view') {
                  Icon = LogIn;
                  bgClass = "bg-indigo-50 text-indigo-500 border-background";
                  title = "Visualização";
                  description = "Realizou uma visualização no sistema.";
                } else if (log.event_type === 'login') {
                  Icon = LogIn;
                  bgClass = "bg-indigo-50 text-indigo-500 border-background";
                  title = "Login no Sistema";
                  description = log.description || "Realizou login com sucesso.";
                } else if (log.event_type === 'whatsapp_contact') {
                  Icon = Phone;
                  bgClass = "bg-green-50 text-green-500 border-background";
                  title = "Contato via WhatsApp";
                  description = "Iniciou um contato pelo WhatsApp.";
                } else {
                  title = log.event_type || "Atividade Registrada";
                  description = log.description || "Nova atividade no sistema.";
                }

                return (
                  <div key={log.id} className="flex gap-6 group">
                    <div className="relative">
                      <div className={`h-10 w-10 rounded-full border-4 flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform ${bgClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1.5 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">{title}</span>
                        <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>
                );
              })
            ) : (
                <div className="flex gap-6 group">
                  <div className="flex-1 space-y-1.5 pb-2 ml-14">
                    <span className="font-bold text-sm text-foreground text-muted-foreground">Nenhum evento registrado ainda.</span>
                  </div>
                </div>
            )}

            {/* Evento base de criação da conta sempre no final da timeline, se existir o cliente */}
            {!useMock && client && (
              <div className="flex gap-6 group">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-blue-50 border-4 border-background flex items-center justify-center text-blue-500 shadow-sm relative z-10 group-hover:scale-110 transition-transform">
                    <UserPlus className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">Cadastro Realizado</span>
                    <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{formatDate(client.created_at)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Registro do cliente criado no sistema.</p>
                </div>
              </div>
            )}
            
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isPromoteModalOpen} onOpenChange={setIsPromoteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Confirmar Promoção
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja promover o cliente <strong>{client.name}</strong> para usuário?
              <br />
              Esta ação concederá acesso ao painel administrativo com permissões de usuário regular.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                promoteClientMutation.mutate(client.id, {
                  onSuccess: () => {
                    navigate("/admin/users");
                  }
                });
                setIsPromoteModalOpen(false);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirmar Promoção
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete enrollment alert */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl p-8">
          <AlertDialogHeader className="space-y-3">
            <AlertDialogTitle className="text-2xl font-black tracking-tight text-red-600">Excluir Matrícula?</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium text-muted-foreground">
              Esta ação removerá todos os registros associados à matrícula <span className="text-foreground font-bold">#{selectedEnroll?.id}</span>. Este processo é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 rounded-xl border-slate-200 font-bold px-6">Manter Registro</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!selectedEnroll?.id) return;
                deleteMutation.mutate(String(selectedEnroll.id), {
                  onSettled: () => setDeleteOpen(false),
                });
              }}
              className="h-12 rounded-xl bg-red-600 hover:bg-red-700 font-black px-8 shadow-lg shadow-red-200 transition-all active:scale-95"
            >
              Excluir Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

