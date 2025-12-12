import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Removido Select: campos de Funil/Etapa/Tag serão ocultados temporariamente
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useClientById, useClientsList } from '@/hooks/clients';
import { useUsersList } from '@/hooks/users';
// Removido hooks de funis/etapas: campos desativados temporariamente
import { useCreateEnrollment } from '@/hooks/enrollments';
import { useEnrollmentSituationsList } from '@/hooks/enrollmentSituations';
import { coursesService } from '@/services/coursesService';
import { turmasService } from '@/services/turmasService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Combobox, useComboboxOptions } from '@/components/ui/combobox';
// SelectGeraValor removido: campo "Gerar Valor" não será exibido
import { currencyApplyMask, currencyRemoveMaskToNumber, currencyRemoveMaskToString } from '@/lib/masks/currency';
import BudgetPreview from '@/components/school/BudgetPreview';

/**
 * ProposalFormData
 * pt-BR: Tipos do formulário de proposta. Todos os campos são strings para facilitar binding.
 * en-US: Proposal form types. All fields as strings for convenient binding.
 */
const proposalSchema = z.object({
  id_cliente: z.string().min(1, 'Selecione o cliente'),
  id_curso: z.string().min(1, 'Selecione o curso'),
  id_turma: z.string().min(1, 'Selecione a turma'),
  /**
   * parcelamento_id
   * pt-BR: ID da Tabela de Parcelamento selecionada para o curso. Opcional.
   * en-US: Selected Installment Table ID for the course. Optional.
   */
  // Removido: parcelamento_id — campo não será mais usado
  // Adicionado: parcelas — quantidade de parcelas para preview e meta
  parcelas: z.string().optional(),
  obs: z.string().optional(),
  id_consultor: z.string().optional(),
  // Campos removidos temporariamente: tag, stage_id, funell_id
  // Campo novo opcional: valor gerado a partir de módulos do curso
  gera_valor: z.string().optional(),
  // Novo campo: identificador de situação da matrícula selecionada no formulário
  // New field: enrollment situation identifier selected from the form
  situacao_id: z.string().optional(),
  /**
   * parcelada
   * pt-BR: Indica se a proposta será parcelada ("s" ou "n"). Opcional.
   * en-US: Indicates whether the proposal is installment-based ("s" or "n"). Optional.
   */
  parcelada: z.enum(['s','n']).optional(),
  id_responsavel: z.string().optional(),
  orc_json: z.string().optional(),
  desconto: z.string().optional(),
  inscricao: z.string().optional(),
  subtotal: z.string().optional(),
  total: z.string().optional(),
  validade: z.string().optional(),
  // Campo meta_texto_desconto removido conforme solicitação
  id: z.string().optional(),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

/**
 * ProposalsCreate
 * pt-BR: Página para cadastro de propostas que antecedem a matrícula, enviando payload ao endpoint `/matriculas`.
 * en-US: Page to create proposals preceding enrollment, sending the payload to `/matriculas`.
 */
export default function ProposalsCreate() {
  const { toast } = useToast();
  const { user } = useAuth();
  /**
   * queryClient
   * pt-BR: Cliente do React Query para invalidar/atualizar cache sem refresh.
   * en-US: React Query client used to invalidate/update cache without refresh.
   */
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  // navState
  // pt-BR: Estado recebido via navegação contendo IDs do funil e da etapa.
  // en-US: Navigation state containing funnel and stage IDs.
  const navState = (location?.state || {}) as { returnTo?: string; funnelId?: string; stageId?: string };
  const [searchParams] = useSearchParams();
  const idClienteFromUrl = searchParams.get('id_cliente') || '';
  const [clientSearch, setClientSearch] = useState('');
  // Termos de busca para autocompletes
  // Search terms for autocompletes
  const [courseSearch, setCourseSearch] = useState('');
  const [consultantSearch, setConsultantSearch] = useState('');
  const [classSearch, setClassSearch] = useState('');
  // Responsável: controle de exibição e busca
  // Responsible: visibility toggle and search term
  const [showResponsible, setShowResponsible] = useState(false);
  const [responsibleSearch, setResponsibleSearch] = useState('');
  
  /**
   * finishAfterSaveRef
   * pt-BR: Sinaliza se o envio atual deve finalizar e retornar à página de origem.
   * en-US: Flags whether the current submission should finish and return to origin page.
   */
  const finishAfterSaveRef = useRef(false);

  // Form setup
  const form = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      id_cliente: idClienteFromUrl || '',
      id_curso: '',
      id_turma: '',
      // Removido: parcelamento_id (não usamos mais tabelas de parcelamento)
      // Adicionado: parcelas com default 12 (6/12/18 disponíveis na UI)
      parcelas: '12',
      obs: '',
      id_consultor: '',
      // tag, stage_id e funell_id removidos temporariamente
      // gera_valor inicia vazio; será definido quando usuário escolher a turma
      gera_valor: '',
      // pt-BR: Valor padrão vazio para situacao_id até o usuário selecionar.
      // en-US: Empty default for situacao_id until user selects.
      situacao_id: '',
      // pt-BR: Indica se a proposta será parcelada ("s" ou "n")
      // en-US: Indicates whether the proposal will be installment-based ("s" or "n")
      parcelada: 'n',
      id_responsavel: user?.id || '',
      orc_json: '',
      desconto: '0,00',
      inscricao: '',
    subtotal: '',
    total: '',
      validade: '14',
      // meta_texto_desconto removido
      id: '',
    },
  });

  // Data sources
  const { data: clientsData, isLoading: isLoadingClients } = useClientsList(
    { per_page: 20, search: clientSearch || undefined },
    { enabled: !idClienteFromUrl }
  );
  const { data: clientDetailData } = useClientById(idClienteFromUrl, { enabled: !!idClienteFromUrl });
  const { data: consultantsData, isLoading: isLoadingConsultants } = useUsersList({ consultores: true, per_page: 20, sort: 'name', search: consultantSearch || undefined });
  // Responsáveis: clientes com permission_id = 8
  // Responsibles: clients filtered by permission_id = 8
  const { data: responsiblesData, isLoading: isLoadingResponsibles } = useClientsList({ per_page: 50, search: responsibleSearch || undefined, permission_id: 8 } as any);
  // Removido: fontes de dados para funis/etapas enquanto campos não são usados

  // Courses and classes
  // Cursos: busca remota com paginação
  // Courses: remote search with pagination
  const { data: courses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['courses', 'list', 200, courseSearch],
    queryFn: async () => coursesService.listCourses({ page: 1, per_page: 200, search: courseSearch || undefined } as any),
    staleTime: 5 * 60 * 1000,
  });
  const selectedCourseId = form.watch('id_curso');
  const selectedClientId = form.watch('id_cliente');
  // Turmas: busca remota filtrando por curso selecionado
  // Classes: remote search filtered by selected course
  const { data: classes, isLoading: isLoadingClasses } = useQuery({
    queryKey: ['classes', 'list', selectedCourseId, classSearch],
    queryFn: async () => turmasService.listTurmas({ page: 1, per_page: 200, search: classSearch || undefined, id_curso: selectedCourseId ? Number(selectedCourseId) : undefined } as any),
    enabled: !!selectedCourseId,
    staleTime: 5 * 60 * 1000,
  });

  // Removido: Requisição de parcelamentos por curso (GET /parcelamentos)
  // pt-BR: Não buscamos tabelas de parcelamento ao selecionar curso, conforme solicitação.
  // en-US: Do not fetch installment tables on course selection, as requested.

  const clientsList = useMemo(() => (clientsData?.data || clientsData?.items || []), [clientsData]);
  // Mapeia clientes para opções do Combobox, incluindo descrição (email • telefone)
  const clientOptions = useComboboxOptions<any>(
    clientsList,
    'id',
    'name',
    undefined,
    (c: any) => {
      const email = c?.email || '';
      const phone = c?.config?.celular || c?.config?.telefone_residencial || '';
      return [email, phone].filter(Boolean).join(' • ');
    }
  );
  const consultantsList = useMemo(() => (consultantsData?.data || consultantsData?.items || []), [consultantsData]);
  const consultantOptions = useComboboxOptions<any>(
    consultantsList,
    'id',
    'name',
    undefined,
    (u: any) => {
      const email = u?.email || '';
      const phone = u?.config?.celular || u?.config?.telefone_comercial || u?.config?.telefone_residencial || '';
      return [email, phone].filter(Boolean).join(' • ');
    }
  );
  // Opções de responsáveis a partir de clientes com permission_id=8
  // Responsible options from clients with permission_id=8
  const responsiblesList = useMemo(() => (responsiblesData?.data || responsiblesData?.items || []), [responsiblesData]);
  const responsibleOptions = useComboboxOptions<any>(
    responsiblesList,
    'id',
    'name',
    undefined,
    (c: any) => {
      const email = c?.email || '';
      const phone = c?.config?.celular || c?.config?.telefone_residencial || '';
      return [email, phone].filter(Boolean).join(' • ');
    }
  );
  // Removido: listas de funis e etapas
  const coursesList = useMemo(() => (courses?.data || courses?.items || []), [courses]);
  const classesList = useMemo(() => (classes?.data || classes?.items || []), [classes]);
  const courseOptions = useComboboxOptions<any>(
    coursesList,
    'id',
    'titulo',
    undefined,
    (c: any) => {
      const nome = c?.nome || '';
      const valor = c?.valor ? `R$ ${c.valor}` : '';
      return [nome, valor].filter(Boolean).join(' • ');
    }
  );
  const classOptions = useComboboxOptions<any>(
    classesList,
    'id',
    'nome',
    undefined,
    (t: any) => {
      const inicio = t?.inicio || '';
      const fim = t?.fim || '';
      return [inicio && `Início: ${inicio}`, fim && `Fim: ${fim}`].filter(Boolean).join(' • ');
    }
  );

  // Removido: opções de Combobox para tabelas de parcelamento (não usadas mais)

  /**
   * normalizeSituationsList
   * pt-BR: Normaliza a resposta do hook de situações de matrícula em uma lista simples.
   * en-US: Normalizes the enrollment situations hook response into a plain list.
   */
  function normalizeSituationsList(source: any): any[] {
    const list = source?.data || source?.items || source || [];
    return Array.isArray(list) ? list : [];
  }

  /**
   * useEnrollmentSituationsList
   * pt-BR: Busca a lista de situações de matrícula usando paginação fixa
   *        conforme solicitado (GET /situacoes-matricula?page=1&per_page=1).
   * en-US: Fetches enrollment situations list using fixed pagination
   *        as requested (GET /situacoes-matricula?page=1&per_page=1).
   */
  const { data: enrollmentSituationsData, isLoading: isLoadingEnrollmentSituations } =
    useEnrollmentSituationsList({ page: 1, per_page: 1 });
  const enrollmentSituations = useMemo(() => normalizeSituationsList(enrollmentSituationsData), [enrollmentSituationsData]);

  /**
   * selectedCourse
   * pt-BR: Deriva o objeto do curso selecionado para montar opções do SelectGeraValor.
   * en-US: Derives the selected course object to build SelectGeraValor options.
   */
  const selectedCourse = useMemo(() => {
    const id = selectedCourseId ? String(selectedCourseId) : '';
    const list = coursesList || [];
    return list.find((c: any) => String(c.id) === id);
  }, [coursesList, selectedCourseId]);

  // Removido selectedModule: campo "Gerar Valor" foi retirado da UI

  /**
   * selectedClient
   * pt-BR: Obtém informações básicas do cliente selecionado para exibir no cabeçalho da proposta.
   * en-US: Gets basic info about the selected client to show in the proposal header.
   */
  const selectedClient = useMemo(() => {
    // Prioriza detalhes do cliente quando id vem por URL
    if (clientDetailData && String(clientDetailData?.id || '') === String(selectedClientId || '')) {
      return clientDetailData as any;
    }
    const list = clientsList || [];
    const hit = list.find((c: any) => String(c.id) === String(selectedClientId || ''));
    return hit;
  }, [clientDetailData, clientsList, selectedClientId]);

  /**
   * normalizeMonetaryToPlain
   * pt-BR: Converte string monetária brasileira (ex.: "23.820,00") para um
   *        número em string com ponto decimal (ex.: "23820.00"). Caso não
   *        seja possível converter, retorna string vazia.
   * en-US: Converts Brazilian monetary string (e.g., "23.820,00") into a plain
   *        number string with dot decimal (e.g., "23820.00"). Returns empty
   *        string if conversion fails.
   */
  /**
   * normalizeMonetaryToPlain
   * pt-BR: Converte string monetária (com ou sem máscara) para número com ponto e 2 casas.
   * en-US: Converts a monetary string (masked or not) into a dot-decimal string with 2 decimals.
   */
  function normalizeMonetaryToPlain(input: string): string {
    const s = String(input || '').trim();
    if (!s) return '';
    return currencyRemoveMaskToString(s);
  }

  /**
   * formatCurrencyBRL
   * pt-BR: Formata número em BRL para exibição (ex.: "R$ 23.820,00").
   * en-US: Formats a number into BRL for display (e.g., "R$ 23.820,00").
   */
  function formatCurrencyBRL(value: number): string {
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
    } catch {
      return `R$ ${(Number(value) || 0).toFixed(2)}`;
    }
  }

  /**
   * recalcTotal
   * pt-BR: Recalcula automaticamente o campo "total" como (subtotal + inscrição - desconto)
   *        utilizando valores normalizados. Se não for possível, mantém total
   *        igual ao subtotal.
   * en-US: Automatically recalculates the "total" field as (subtotal + enrollment - discount)
   *        using normalized values. If not possible, keeps total equal to subtotal.
   */
  /**
   * recalcTotal
   * pt-BR: Recalcula o campo "total" como (subtotal + inscrição - desconto) e aplica máscara BRL.
   * en-US: Recalculates "total" as (subtotal + enrollment - discount) and applies BRL mask.
   */
  function recalcTotal(sub: string, insc: string, desc: string) {
    const subNum = currencyRemoveMaskToNumber(sub || '');
    const inscNum = currencyRemoveMaskToNumber(insc || '');
    const descNum = currencyRemoveMaskToNumber(desc || '');
    const totNum = (subNum || 0) + (inscNum || 0) - (descNum || 0);
    const maskedTotal = formatCurrencyBRL(totNum);
    form.setValue('total', maskedTotal);
  }

  /**
   * computeValidityDate
   * pt-BR: Calcula e formata a data de validade somando N dias à data atual.
   *        Retorna uma string no formato brasileiro "dd/MM/yyyy" ou vazio se N inválido.
   * en-US: Computes and formats the validity end date by adding N days to today.
   *        Returns a string in Brazilian format "dd/MM/yyyy" or empty if N is invalid.
   */
  function computeValidityDate(daysStr?: string): string {
    const days = parseInt(String(daysStr ?? ''), 10);
    if (!Number.isFinite(days) || days <= 0) return '';
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  /**
   * computeInstallmentPreview
   * pt-BR: Calcula a pré-visualização do valor da parcela dividindo o total por um número fixo de parcelas.
   *        Retorna uma string monetária formatada em BRL.
   * en-US: Computes the installment value preview by dividing total by a fixed number of installments.
   *        Returns a BRL-formatted monetary string.
   */
  const DEFAULT_INSTALLMENTS_COUNT = 12;
  function computeInstallmentPreview(totalMasked?: string, count: number = DEFAULT_INSTALLMENTS_COUNT): string {
    const totNum = currencyRemoveMaskToNumber(totalMasked || '');
    const divisor = Math.max(1, count);
    const perInstallment = (totNum || 0) / divisor;
    return formatCurrencyBRL(perInstallment);
  }

  // Observa mudanças em subtotal e desconto para atualizar total
  const subtotalWatched = form.watch('subtotal');
  const inscricaoWatched = form.watch('inscricao');
  const descontoWatched = form.watch('desconto');
  useEffect(() => {
    recalcTotal(subtotalWatched, inscricaoWatched, descontoWatched);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalWatched, inscricaoWatched, descontoWatched]);

  // Removido handleGeraValorChange: campo "Gerar Valor" não será usado

  // classOptionsWithFallback
  // pt-BR: Quando o curso selecionado não possui turmas, adiciona opção "Aguardar turma" (valor "0").
  // en-US: When the selected course has no classes, add a "Wait for class" option (value "0").
  const classOptionsWithFallback = useMemo(() => {
    const hasSelectedCourse = !!selectedCourseId;
    const list = classOptions || [];
    if (hasSelectedCourse && list.length === 0) {
      return [
        {
          value: '0',
          label: 'Aguardar turma',
          description: 'Sem turmas disponíveis para este curso',
        },
      ];
    }
    return list;
  }, [classOptions, selectedCourseId]);

  // Mutation
  const createEnrollment = useCreateEnrollment({
    onSuccess: () => {
      /**
       * pt-BR: Após salvar, decide se deve permanecer na página ou finalizar e voltar.
       * en-US: After save, decide whether to stay or finish and go back.
       */
      if (finishAfterSaveRef.current) {
        // pt-BR: Invalida todas as queries para que a listagem revalide ao voltar
        // en-US: Invalidate all queries so listings revalidate when navigating back
        try { queryClient.invalidateQueries(); } catch {}
        // Navega para a origem e força atualização para feedback visual
        if (navState?.returnTo && typeof navState.returnTo === 'string') {
          navigate(navState.returnTo);
        } else if (navState?.funnelId) {
          navigate(`/admin/sales?funnel=${navState.funnelId}`);
        } else {
          navigate('/admin/sales');
        }
      } else {
        // Mantém na página e mostra confirmação
        /**
         * Toast de sucesso padronizado
         * pt-BR: Usa API de objeto do useToast.
         * en-US: Uses object-based API from useToast.
         */
        toast({ title: 'Sucesso', description: 'Proposta enviada com sucesso!' });
      }
      form.reset();
    },
    onError: (error: any) => {
      /**
       * handleApiValidationErrors
       * pt-BR: Converte resposta de validação da API em erros de formulário e toast.
       * en-US: Converts API validation response into form errors and a toast.
       */
      const data = error?.response?.data || {};
      const apiMessage: string = data?.message || 'Erro de validação';
      const errorsObj: Record<string, string[] | string> = data?.errors || {};

      const collectedMsgs: string[] = [];
      if (errorsObj && typeof errorsObj === 'object') {
        Object.entries(errorsObj).forEach(([field, messages]) => {
          const firstMsg = Array.isArray(messages) ? String(messages[0] || '') : String(messages || '');
          if (firstMsg) {
            collectedMsgs.push(firstMsg);
            // pt-BR: Marca erro no campo correspondente (se existir no formulário).
            // en-US: Marks error on the corresponding field (if present in the form).
            try {
              form.setError(field as any, { type: 'server', message: firstMsg });
            } catch {}
          }
        });
      }

      const description = [apiMessage, ...collectedMsgs].filter(Boolean).join(' — ');
      toast({ title: 'Erro ao enviar proposta', description, variant: 'destructive' });
    },
  });

  /**
   * buildPayload
   * pt-BR: Constrói o payload exatamente como a API espera, colocando
   *        "validade" e "gera_valor" dentro de "meta" e incluindo orc (JSON opcional).
   *        Remove o envio de "meta.gera_valor_preco".
   * en-US: Builds the payload exactly as the API expects, placing
   *        "validade" and "gera_valor" inside "meta" and including optional orc JSON.
   *        Removes sending of "meta.gera_valor_preco".
   */
  function buildPayload(values: ProposalFormData) {
    const payload: any = {
      id_cliente: values.id_cliente,
      id_curso: values.id_curso,
      id_turma: values.id_turma,
      // Removido: parcelamento_id no payload (não usamos mais tabelas de parcelamento)
      obs: values.obs || '',
      id_consultor: values.id_consultor || '',
      // Removido: stage_id e funell_id
      // Removido: campo legado "situacao"; usamos somente situacao_id
      // pt-BR: Envia também o identificador da Situação selecionada no formulário
      // en-US: Also sends the identifier of the selected Situation from the form
      situacao_id: values.situacao_id || '',
      id_responsavel: values.id_responsavel || '',
      // Normaliza campos monetários para formato plain number string
      desconto: normalizeMonetaryToPlain(values.desconto || '0,00') || '0.00',
      inscricao: normalizeMonetaryToPlain(values.inscricao || '') || '0.00',
      subtotal: normalizeMonetaryToPlain(values.subtotal || '') || '',
      total: normalizeMonetaryToPlain(values.total || '') || '',
      // pt-BR: Envia meta com validade, gera_valor e status parcelada
      // en-US: Sends meta containing validade, gera_valor, and parcelada status
      meta: {
        validade: values.validade,
        gera_valor: values.gera_valor,
        // Persistir flag parcelada para aparecer na edição de propostas
        parcelada: values.parcelada || 'n',
        // Opcional: persistir quantidade de parcelas escolhida
        parcelas: values.parcelas || '',
      },
      id: values.id || '',
    };

    // Removido: envio de tag[] temporariamente

    // orc como JSON opcional
    if (values.orc_json && values.orc_json.trim().length > 0) {
      try {
        const parsed = JSON.parse(values.orc_json);
        payload.orc = parsed;
      } catch (_e) {
        // se JSON inválido, ignora e avisa via toast
        /**
         * Toast de aviso padronizado
         * pt-BR: Usa título "Atenção" com descrição.
         * en-US: Uses title "Attention" with description.
         */
        toast({ title: 'Atenção', description: 'JSON de orçamento inválido. Campo ignorado.' });
      }
    } else {
      // Gera um orc mínimo com curso/cliente selecionados
      payload.orc = {
        token: Math.random().toString(16).slice(2),
        id_curso: values.id_curso,
        id_cliente: values.id_cliente,
        campo_id: 'id',
        modulos: [],
      };
    }

    // Removido: orc.parcelamento (tabela de parcelamento e texto de desconto)
    return payload;
  }

  /**
   * onSubmit
   * pt-BR: Handler de envio — monta payload e usa createEnrollment para POST em `/matriculas`.
   * en-US: Submit handler — builds payload and uses createEnrollment to POST to `/matriculas`.
   */
  async function onSubmit(values: ProposalFormData) {
    const payload = buildPayload(values);
    // Tipos do hook aceitam CreateEnrollmentInput, fazemos cast para any para compatibilidade com a API real
    await createEnrollment.mutateAsync(payload as any);
  }

  /**
   * handleSaveContinue
   * pt-BR: Envia o formulário e permanece na página para continuar editando.
   * en-US: Submits the form and keeps the user on the page to continue.
   */
  function handleSaveContinue() {
    finishAfterSaveRef.current = false;
    form.handleSubmit(onSubmit)();
  }

  /**
   * handleSaveFinish
   * pt-BR: Envia o formulário e redireciona à página de origem, atualizando-a.
   * en-US: Submits the form and redirects to the origin page, refreshing it.
   */
  function handleSaveFinish() {
    finishAfterSaveRef.current = true;
    form.handleSubmit(onSubmit)();
  }

  /**
   * handleBack
   * pt-BR: Volta ao funil de vendas de origem, usando o estado de navegação.
   * en-US: Returns to the originating sales funnel, using navigation state.
   */
  function handleBack() {
    if (navState?.returnTo && typeof navState.returnTo === 'string') {
      navigate(navState.returnTo);
      return;
    }
    if (navState?.funnelId) {
      navigate(`/admin/sales?funnel=${navState.funnelId}`);
      return;
    }
    navigate('/admin/sales');
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao funil
        </Button>
      </div>
      <Card>
        <CardHeader>
          {/*
           * HeaderWithToggle
           * pt-BR: Cabeçalho com título e botão para mostrar/ocultar o campo Responsável.
           * en-US: Header with title and button to toggle Responsible field visibility.
           */}
          <div className="flex items-center justify-between">
            <CardTitle>Nova Proposta</CardTitle>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setShowResponsible((s) => !s)}
              aria-label={showResponsible ? 'Ocultar Responsável' : 'Selecionar Responsável'}
            >
              {showResponsible ? 'Ocultar Responsável' : 'Selecionar Responsável'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Cliente */}
                <FormField
                  control={form.control}
                  name="id_cliente"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente *</FormLabel>
                      {idClienteFromUrl ? (
                        <div className="text-sm py-2 px-3 border rounded-md bg-muted/30">
                          {clientDetailData?.name ? String(clientDetailData.name) : `Cliente ${idClienteFromUrl}`}
                        </div>
                      ) : (
                        <Combobox
                          options={clientOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Selecione o cliente"
                          searchPlaceholder="Pesquisar cliente pelo nome..."
                          emptyText={clientOptions.length === 0 ? 'Nenhum cliente encontrado' : 'Digite para filtrar'}
                          disabled={isLoadingClients}
                          loading={isLoadingClients}
                          onSearch={setClientSearch}
                          searchTerm={clientSearch}
                          debounceMs={250}
                        />
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Consultor — agora opcional */}
                <FormField
                  control={form.control}
                  name="id_consultor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consultor</FormLabel>
                      <Combobox
                        options={consultantOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Selecione o consultor"
                        searchPlaceholder="Pesquisar consultor pelo nome..."
                        emptyText={consultantOptions.length === 0 ? 'Nenhum consultor encontrado' : 'Digite para filtrar'}
                        disabled={isLoadingConsultants}
                        loading={isLoadingConsultants}
                        onSearch={setConsultantSearch}
                        searchTerm={consultantSearch}
                        debounceMs={250}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Situação — agora ao lado de Cliente e Consultor */}
                <FormField
                  control={form.control}
                  name="situacao_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Situação</FormLabel>
                      <Select value={field.value || ''} onValueChange={field.onChange} disabled={isLoadingEnrollmentSituations}>
                        <SelectTrigger className="w-full h-10">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {enrollmentSituations.map((s: any) => (
                            <SelectItem key={String(s?.id)} value={String(s?.id)}>
                              {s?.label || s?.name || s?.nome || s?.description || `Situação ${String(s?.id ?? '')}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Curso */}
                <FormField
                  control={form.control}
                  name="id_curso"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Curso *</FormLabel>
                      <Combobox
                        options={courseOptions}
                        value={field.value}
                        /**
                         * onCourseChange
                         * pt-BR: Ao selecionar um curso, zera turma/parcelamento e
                         *        preenche inscrição, subtotal e total com os valores do curso.
                         * en-US: On course selection, clears class/installment and
                         *        populates enrollment, subtotal and total from course values.
                         */
                        onValueChange={(val) => {
                          // Ao mudar o curso, limpamos a turma selecionada
                          // When changing course, clear selected class
                          field.onChange(val);
                          form.setValue('id_turma', '');
                          // Removido: limpeza de parcelamento_id ao trocar curso

                          // Preenche inscrição/subtotal/total com base no curso
                          try {
                            const list = coursesList || [];
                            const hit = list.find((c: any) => String(c.id) === String(val || '')) || null;
                            const rawInscricao = hit?.inscricao ?? '';
                            const rawSubtotal = hit?.valor ?? '';
                            const inscNum = Number(currencyRemoveMaskToString(String(rawInscricao)) || '0');
                            const subNum = Number(currencyRemoveMaskToString(String(rawSubtotal)) || '0');
                            const inscMasked = formatCurrencyBRL(inscNum);
                            const subMasked = formatCurrencyBRL(subNum);
                            form.setValue('inscricao', inscMasked, { shouldValidate: true });
                            form.setValue('subtotal', subMasked, { shouldValidate: true });
                            // Recalcula total imediatamente considerando desconto atual
                            const currentDesc = form.getValues('desconto') || '';
                            recalcTotal(subMasked, inscMasked, currentDesc);
                          } catch {}
                        }}
                        placeholder="Selecione o curso"
                        searchPlaceholder="Pesquisar curso pelo nome..."
                        emptyText={courseOptions.length === 0 ? 'Nenhum curso encontrado' : 'Digite para filtrar'}
                        disabled={isLoadingCourses}
                        loading={isLoadingCourses}
                        onSearch={setCourseSearch}
                        searchTerm={courseSearch}
                        debounceMs={250}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Turma */}
                <FormField
                  control={form.control}
                  name="id_turma"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Turma *</FormLabel>
                      <Combobox
                        options={classOptionsWithFallback}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Selecione a turma"
                        searchPlaceholder="Pesquisar turma pelo nome..."
                        emptyText={
                          !selectedCourseId
                            ? 'Selecione um curso primeiro'
                            : classOptionsWithFallback.length === 0
                              ? 'Nenhuma turma encontrada'
                              : 'Digite para filtrar'
                        }
                        disabled={!selectedCourseId || isLoadingClasses}
                        loading={isLoadingClasses}
                        onSearch={setClassSearch}
                        searchTerm={classSearch}
                        debounceMs={250}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Campo de parcelamento removido conforme solicitação */}

              {/* Campo "Texto de Desconto" removido conforme solicitação */}

              {/* Toggle button moved to header (above). */}

              {showResponsible && (
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="id_responsavel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsável</FormLabel>
                        <Combobox
                          options={responsibleOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Selecione o responsável"
                          searchPlaceholder="Pesquisar responsável pelo nome..."
                          emptyText={responsibleOptions.length === 0 ? 'Nenhum responsável encontrado' : 'Digite para filtrar'}
                          disabled={isLoadingResponsibles}
                          loading={isLoadingResponsibles}
                          onSearch={setResponsibleSearch}
                          searchTerm={responsibleSearch}
                          debounceMs={250}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Campos de Funil e Etapa removidos temporariamente */}

              {/* Observações */}
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="obs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        {/**
                         * pt-BR: Usa WYSIWYG para Observações, salvando HTML em `obs`.
                         * en-US: Use WYSIWYG for Observations, saving HTML into `obs`.
                         */}
                        <RichTextEditor
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder="Digite qualquer observação"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* SelectGeraValor removido conforme solicitação */}

              {/* (relocado) Campo de Validade movido para a linha de Status/Total */}

              {/* Valores opcionais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="desconto" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desconto</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="R$ 0,00"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(currencyApplyMask(e.target.value, 'pt-BR', 'BRL'))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="inscricao" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inscrição</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="R$ 0,00"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(currencyApplyMask(e.target.value, 'pt-BR', 'BRL'))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="subtotal" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtotal</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="R$ 0,00"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(currencyApplyMask(e.target.value, 'pt-BR', 'BRL'))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="total" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="R$ 0,00"
                        value={field.value || ''}
                        readOnly
                        onChange={(e) => field.onChange(currencyApplyMask(e.target.value, 'pt-BR', 'BRL'))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {/* Parcelada? */}
                <FormField
                  control={form.control}
                  name="parcelada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parcelada?</FormLabel>
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full h-10">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="n">Não</SelectItem>
                          <SelectItem value="s">Sim</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Validade (dias) — substitui o antigo campo ID (opcional) */}
                <FormField
                  control={form.control}
                  name="validade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Validade (dias)</FormLabel>
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full h-10">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7</SelectItem>
                          <SelectItem value="14">14</SelectItem>
                          <SelectItem value="30">30</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Seleção de Parcelas e visualização quando parcelada = "s" */}
              {form.watch('parcelada') === 's' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Parcelas */}
                  <FormField
                    control={form.control}
                    name="parcelas"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parcelas</FormLabel>
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full h-10">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="6">6</SelectItem>
                            <SelectItem value="12">12</SelectItem>
                            <SelectItem value="18">18</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Preview do valor por parcela */}
                  <FormItem>
                    <FormLabel>
                      {`Valor da Parcela (${form.watch('parcelas') || '12'}x)`}
                    </FormLabel>
                    <Input
                      value={computeInstallmentPreview(
                        form.watch('total'),
                        Number(form.watch('parcelas') || '12')
                      )}
                      readOnly
                    />
                  </FormItem>
                </div>
              )}

              {/* Preview visual do orçamento (substitui o campo JSON) */}
              <BudgetPreview
                title="Proposta Comercial"
                clientName={selectedClient?.name || selectedClient?.nome || ''}
                clientId={selectedClient?.id ? String(selectedClient.id) : undefined}
                clientPhone={selectedClient?.config?.celular || selectedClient?.config?.telefone_residencial || ''}
                clientEmail={selectedClient?.email || ''}
                course={selectedCourse as any}
                discountLabel="Desconto"
                discountAmountMasked={form.watch('desconto') || ''}
                subtotalMasked={form.watch('subtotal') || ''}
                totalMasked={form.watch('total') || ''}
                validityDate={computeValidityDate(form.watch('validade'))}
              />

              {/* Espaço para o rodapé fixo não cobrir o conteúdo */}
              <div className="h-16" />
            </form>
          </Form>
        </CardContent>
      </Card>
      {/* Rodapé fixo com ações */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-50">
        <div className="container mx-auto flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={handleBack}>
            Voltar
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" onClick={handleSaveContinue} disabled={createEnrollment.isLoading}>
              Salvar e Continuar
            </Button>
            <Button type="button" onClick={handleSaveFinish} disabled={createEnrollment.isLoading}>
              Salvar e Finalizar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}