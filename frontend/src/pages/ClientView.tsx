import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, Mail, Phone, MapPin, User, Building, Calendar, GraduationCap, Briefcase, FileText, DollarSign, Edit, Plus, UserPlus } from 'lucide-react';
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
import { useEnrollmentsList } from '@/hooks/enrollments';
import EnrollmentTable from '@/components/enrollments/EnrollmentTable';
import { currencyRemoveMaskToNumber } from '@/lib/masks/currency';
import { useQuery } from '@tanstack/react-query';
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

  const enrollmentListParams = {
    page: pageEnroll,
    per_page: perPageEnroll,
    id_cliente: clientId,
    id_curso: selectedCourseId !== 'all' && selectedCourseId ? selectedCourseId : undefined,
    id_turma: selectedClassId !== 'all' && selectedClassId ? selectedClassId : undefined,
  } as any;
  const { data: enrollmentsResp, isLoading: isEnrollmentsLoading, isFetching: isEnrollmentsFetching } = useEnrollmentsList(enrollmentListParams, { enabled: !!clientId });
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
  const { data: interestResp, isLoading: isInterestLoading, isFetching: isInterestFetching } = useEnrollmentsList(interestListParams, { enabled: !!clientId });
  const interestedCourses = Array.isArray(interestResp?.data) ? (interestResp!.data as any[]) : [];

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
    navigate(`/admin/sales/proposals/view/${id}`);
  }

  /**
   * handleEditEnrollment
   * pt-BR: Navega para edição da proposta/matrícula.
   * en-US: Navigates to proposal/enrollment edit.
   */
  function handleEditEnrollment(enroll: any) {
    const id = String(enroll?.id || '');
    if (!id) return;
    navigate(`/admin/sales/proposals/edit/${id}`);
  }

  /**
   * handleDeleteEnrollment
   * pt-BR: Encaminha para a listagem de matrículas, onde a exclusão está disponível.
   * en-US: Redirects to the enrollments listing, where deletion is available.
   */
  function handleDeleteEnrollment(enroll: any) {
    const id = String(enroll?.id || '');
    const qs = id ? new URLSearchParams({ search: id }) : new URLSearchParams();
    navigate(`/admin/school/enroll?${qs.toString()}`);
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button onClick={handleBack} variant="outline" size="sm" className="shrink-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div className="overflow-hidden">
            <h1 className="text-2xl font-bold truncate">{client.name}</h1>
            <p className="text-muted-foreground text-sm">
              {client.tipo_pessoa === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'} • ID: {client.id}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
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
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Promover
          </Button>
          <Button onClick={handleEdit} variant="default" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>
      </div>

      {/* Top Grid: Info, Atendimento e Contato */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Informações Básicas */}
        <Card className="h-full">
          <CardHeader className="pb-2 text-primary">
            <CardTitle className="flex items-center text-lg">
              <User className="mr-2 h-5 w-5" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</label>
              <p className="text-sm font-medium">{client.name || 'Não informado'}</p>
            </div>
            
            {client.tipo_pessoa === 'pj' && client.razao && (
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Razão Social</label>
                <p className="text-sm">{client.razao}</p>
              </div>
            )}
            
            {client.config?.nome_fantasia && (
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome Fantasia</label>
                <p className="text-sm">{client.config.nome_fantasia}</p>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documento</label>
              <p className="text-sm font-mono tracking-tight">
                {client.tipo_pessoa === 'pf' 
                  ? formatCPF(client.cpf) 
                  : formatCNPJ(client.cnpj)
                }
              </p>
            </div>

            {client.config?.rg && client.tipo_pessoa === 'pf' && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">RG</label>
                <p className="text-sm">{client.config.rg}</p>
              </div>
            )}

            {client.tipo_pessoa === 'pf' && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gênero</label>
                <p className="text-sm">
                  {client.genero === 'm' ? 'Masculino' : 
                   client.genero === 'f' ? 'Feminino' : 'Não informado'}
                </p>
              </div>
            )}

            {client.config?.nascimento && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nascimento</label>
                <p className="text-sm">{formatDate(client.config.nascimento)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Atendimento (Funil e Etapa) */}
        <Card className="h-full">
          <CardHeader className="pb-2 text-primary">
            <CardTitle className="flex items-center text-lg">
              <Briefcase className="mr-2 h-5 w-5" />
              Atendimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/30 p-3 rounded-lg border">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Funil</label>
              <p className="text-sm font-medium">{funnelName}</p>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg border">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Etapa</label>
              <p className="text-sm font-medium">{stageName}</p>
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card className="h-full">
          <CardHeader className="pb-2 text-primary">
            <CardTitle className="flex items-center text-lg">
              <Phone className="mr-2 h-5 w-5" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Principal</label>
              <p className="text-sm flex items-center mt-0.5">
                <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="truncate">{client.email || 'Não informado'}</span>
              </p>
            </div>

            {client.config?.celular && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Celular / WhatsApp</label>
                <p className="text-sm flex items-center mt-0.5">
                  <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                  {formatPhone(client.config.celular)}
                </p>
              </div>
            )}

            {client.config?.telefone_residencial && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fixo</label>
                <p className="text-sm flex items-center mt-0.5">
                  <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                  {formatPhone(client.config.telefone_residencial)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Matrículas - LARGURA TOTAL */}
      <Card className="border-primary/20 shadow-md overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
          <CardTitle className="flex items-center text-xl font-bold">
            <GraduationCap className="mr-3 h-6 w-6 text-primary" />
            Matrículas
          </CardTitle>
          <Button size="sm" onClick={handleAddEnrollmentClick} className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> Nova matrícula
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Filtros de curso e turma */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-end bg-muted/30 p-4 rounded-lg border">
            <div className="w-full md:w-auto flex-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Curso</label>
              <Select value={selectedCourseId} onValueChange={(val) => { setSelectedCourseId(val); setSelectedClassId('all'); setPageEnroll(1); }}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Selecione um curso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Cursos</SelectItem>
                  {courseItems.map((c: any) => (
                    <SelectItem key={String(c.id)} value={String(c.id)}>{String(c?.titulo || c?.nome || c?.name || c.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-auto flex-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Turma</label>
              <Select value={selectedClassId} onValueChange={(val) => { setSelectedClassId(val); setPageEnroll(1); }}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Turmas</SelectItem>
                  {classItems.map((t: any) => (
                    <SelectItem key={String(t.id)} value={String(t.id)}>{String(t?.nome || t?.name || t.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-auto flex flex-row items-center gap-3">
              <div className="w-24">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Por página</label>
                <Select value={String(perPageEnroll)} onValueChange={(val) => { setPerPageEnroll(Number(val)); setPageEnroll(1); }}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <Button variant="outline" size="sm" onClick={() => setPageEnroll((p) => Math.max(1, p - 1))} disabled={pageEnroll <= 1}>
                  Anterior
                </Button>
                <span className="text-xs font-medium min-w-[60px] text-center">Pág. {pageEnroll}</span>
                <Button variant="outline" size="sm" onClick={() => setPageEnroll((p) => p + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-md border bg-background">
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

      {/* Cursos de Interesse */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
          <CardTitle className="flex items-center text-xl font-bold text-orange-700">
            <GraduationCap className="mr-3 h-6 w-6 text-orange-500" />
            Cursos de Interesse
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleAddEnrollmentClick} className="border-orange-200 hover:bg-orange-50 text-orange-700">
            <Plus className="mr-2 h-4 w-4" /> Novo interesse
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="rounded-md border bg-background">
            <EnrollmentTable
              items={interestedCourses}
              isLoading={isInterestLoading}
              isFetching={isInterestFetching}
              resolveAmountBRL={resolveEnrollmentAmountBRL}
              onView={handleViewEnrollment}
              onEdit={handleEditEnrollment}
              onDelete={() => {}}
            />
          </div>
          
          {/* Paginação do card de interesses */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPageInterest(p => Math.max(1, p - 1))} 
                disabled={pageInterest <= 1 || isInterestFetching}
              >
                Anterior
              </Button>
              <span className="text-xs font-medium min-w-[60px] text-center">Pág. {pageInterest}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPageInterest(p => Math.min(interestResp?.last_page || 1, p + 1))} 
                disabled={pageInterest >= (interestResp?.last_page || 1) || isInterestFetching}
              >
                Próxima
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Por página</span>
              <Select value={String(perPageInterest)} onValueChange={(v) => { setPerPageInterest(Number(v)); setPageInterest(1); }}>
                <SelectTrigger className="h-8 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-muted-foreground ml-2">Total: {interestResp?.total || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Endereço */}
        <Card className="h-full">
          <CardHeader className="pb-2 text-primary">
            <CardTitle className="flex items-center text-lg">
              <MapPin className="mr-2 h-5 w-5" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {client.config?.cep && (
              <div className="flex justify-between items-start border-b border-muted pb-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">CEP</label>
                <p className="text-sm font-medium">{formatCEP(client.config.cep)}</p>
              </div>
            )}

            {client.config?.endereco && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-0.5 block">Logradouro / Número</label>
                <p className="text-sm">
                  {client.config.endereco}
                  {client.config?.numero && `, ${client.config.numero}`}
                </p>
              </div>
            )}

            {client.config?.complemento && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-0.5 block">Complemento</label>
                <p className="text-sm">{client.config.complemento}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-0.5 block">Bairro</label>
                <p className="text-sm">{client.config?.bairro || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-0.5 block">Cidade/UF</label>
                <p className="text-sm">
                  {client.config?.cidade && client.config?.uf 
                    ? `${client.config.cidade}/${client.config.uf}`
                    : client.config?.cidade || client.config?.uf || '-'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações Profissionais/Acadêmicas E Integrations */}
        <div className="space-y-6 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 space-y-0">
          <Card className="h-full">
            <CardHeader className="pb-2 text-primary">
              <CardTitle className="flex items-center text-lg">
                <FileText className="mr-2 h-5 w-5" />
                Dados Adicionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Escolaridade</label>
                <p className="text-sm flex items-center">
                  <GraduationCap className="mr-2 h-4 w-4 text-muted-foreground" />
                  {client.config?.escolaridade || 'Não informada'}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Profissão</label>
                <p className="text-sm flex items-center">
                  <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                  {client.config?.profissao || 'Não informada'}
                </p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Destaques</label>
                <div className="flex flex-wrap gap-2">
                  {client.is_alloyal && <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">Clube Alloyal</Badge>}
                  {client.status === 'actived' && <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">Ativo</Badge>}
                  {client.tipo_pessoa === 'pj' && <Badge variant="outline">PJ</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alloyal / Ativação (Inline column) */}
          <div className="space-y-6">
            {client.is_alloyal && (
              <Card className="border-blue-100 bg-blue-50/10">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-blue-700 text-lg font-bold">
                    <Building className="mr-2 h-5 w-5" />
                    Integração Clube
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-y-3 text-sm">
                  <div>
                    <label className="text-[10px] font-bold text-blue-800/60 uppercase">Login Club</label>
                    <p className="truncate font-medium">{client.is_alloyal.email || '-'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-blue-800/60 uppercase">Ativado em</label>
                    <p className="font-medium">{formatDate(client.is_alloyal.activated_at)}</p>
                  </div>
                  {client.points !== undefined && (
                    <div className="col-span-2 flex items-center justify-between border-t border-blue-100 pt-2 mt-1">
                      <span className="text-blue-800 font-bold">Pontos Acumulados</span>
                      <Badge className="bg-blue-600 font-bold">{client.points}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {(client.status as any) === 'pre_registred' && (client as any).link_active_cad && (
              <Card className="border-orange-100 bg-orange-50/10">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-orange-700 text-lg">
                    <FileText className="mr-2 h-5 w-5" />
                    Ativação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open((client as any).link_active_cad, '_blank')}
                    className="w-full border-orange-200 hover:bg-orange-100 hover:text-orange-800 text-orange-700 shadow-sm"
                  >
                    Acessar Link de Ativação
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Footer: Observações e Sistema */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Observações */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <FileText className="mr-2 h-5 w-5" />
              Observações Internas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {client.config?.observacoes ? (
              <p className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/20 p-4 rounded-md border italic">
                "{client.config.observacoes}"
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Nenhuma observação registrada.</p>
            )}
          </CardContent>
        </Card>

        {/* Informações do Sistema */}
        <Card className="bg-muted/10 h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg text-muted-foreground">
              <Calendar className="mr-2 h-5 w-5" />
              Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-muted-foreground uppercase">Data de Cadastro</span>
              <span>{formatDate(client.created_at)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-muted-foreground uppercase">Última Atualização</span>
              <span>{formatDate(client.updated_at)}</span>
            </div>
            <div className="flex justify-between items-center text-xs border-t pt-2">
              <span className="font-semibold text-muted-foreground uppercase">Referência Técnica</span>
              <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded">{client.id}</span>
            </div>
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}

