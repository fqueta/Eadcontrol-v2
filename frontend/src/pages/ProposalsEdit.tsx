import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useClientById, useClientsList } from '@/hooks/clients';
import { useUsersList, useUser } from '@/hooks/users';
import { useEnrollment, useUpdateEnrollment } from '@/hooks/enrollments';
import { useEnrollmentSituationsList } from '@/hooks/enrollmentSituations';
import { coursesService } from '@/services/coursesService';
import { turmasService } from '@/services/turmasService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
// Removido: installmentsService — não buscamos mais tabelas de parcelamento
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, User, GraduationCap, DollarSign, AlignLeft, Save, CheckCircle2, CreditCard, Users, Pencil, Info } from 'lucide-react';
import { Combobox, useComboboxOptions } from '@/components/ui/combobox';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import SelectGeraValor from '@/components/school/SelectGeraValor';
import { currencyApplyMask, currencyRemoveMaskToNumber, currencyRemoveMaskToString } from '@/lib/masks/currency';
import BudgetPreview from '@/components/school/BudgetPreview';

/**
 * ProposalEditSchema
 * pt-BR: Esquema do formulário de edição de proposta.
 * en-US: Schema for the proposal editing form.
 */
  const proposalEditSchema = z.object({
    id_cliente: z.string().min(1, 'Selecione o cliente'),
    id_curso: z.string().min(1, 'Selecione o curso'),
    id_turma: z.string().min(1, 'Selecione a turma'),
  // Removido: parcelamento_id — não usamos mais tabelas de parcelamento
  // Adicionado: parcelas — quantidade de parcelas para preview/persistência
    // pt-BR: Controle simples de parcelamento: flag e contagem.
    // en-US: Simple installment control: flag and count.
    parcelada: z.boolean().optional(),
    parcelas: z.string().optional(),
  obs: z.string().optional(),
  id_consultor: z.string().min(1, 'Selecione o consultor'),
  gera_valor: z.string().optional(),
  // pt-BR: Novo campo para vincular a situação via select (GET /situacoes-matricula)
  // en-US: New field to bind situation via select (GET /situacoes-matricula)
  situacao_id: z.string().optional(),
  id_responsavel: z.string().optional(),
  orc_json: z.string().optional(),
  desconto: z.string().optional(),
  inscricao: z.string().optional(),
  subtotal: z.string().optional(),
  total: z.string().optional(),
  validade: z.string().optional(),
  // Novo campo do formulário para meta.texto_desconto
  // New form field backing meta.texto_desconto
  meta_texto_desconto: z.string().optional(),
  id: z.string().optional(),
});

type ProposalEditFormData = z.infer<typeof proposalEditSchema>;

/**
 * ProposalsEdit
 * pt-BR: Página para editar propostas existentes usando o endpoint `/matriculas/:id`.
 * en-US: Page to edit existing proposals using the `/matriculas/:id` endpoint.
 */
export default function ProposalsEdit() {
  const { toast } = useToast();
  const { user } = useAuth();
  /**
   * queryClient
   * pt-BR: Cliente do React Query para revalidar listagens ao finalizar sem refresh.
   * en-US: React Query client to revalidate listings on finish without full refresh.
   */
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const idClienteFromUrl = searchParams.get('id_cliente') || '';

  // navState
  // pt-BR: Estado recebido via navegação contendo rota de retorno.
  // en-US: Navigation state containing the return route.
  const navState = (location?.state || {}) as { returnTo?: string; funnelId?: string; stageId?: string };

  /**
   * finishAfterSaveRef
   * pt-BR: Controla se ao salvar deve finalizar e voltar à origem com atualização.
   * en-US: Controls whether to finish and go back to origin with refresh after saving.
   */
  const finishAfterSaveRef = useRef(false);

  // UI
  const [showResponsible, setShowResponsible] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [consultantSearch, setConsultantSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [responsibleSearch, setResponsibleSearch] = useState('');

  /**
   * form
   * pt-BR: Inicializa com valores padrão; dados carregados do servidor sobrescrevem abaixo.
   * en-US: Initializes with defaults; server-loaded data overrides below.
   */
  /**
   * form
   * pt-BR: Inicializa com valores padrão; dados carregados do servidor sobrescrevem abaixo.
   * en-US: Initializes with defaults; server-loaded data overrides below.
   */
  const form = useForm<ProposalEditFormData>({
    resolver: zodResolver(proposalEditSchema),
    defaultValues: {
      id_cliente: idClienteFromUrl || '',
      id_curso: '',
      id_turma: '',
      // pt-BR: Controle de parcelamento simples (sem tabela): parcelada? e número de parcelas.
      // en-US: Simple installment control (no table): installment? and count.
      parcelada: false,
      parcelas: '12',
      obs: '',
      id_consultor: '',
      gera_valor: '',
      situacao_id: '',
      id_responsavel: user?.id || '',
      orc_json: '',
      desconto: '0,00',
      inscricao: '',
      subtotal: '',
      total: '',
      validade: '14',
      // Valor padrão vazio para meta.texto_desconto
      // Default empty value for meta.texto_desconto
      meta_texto_desconto: '',
      id: id || '',
    },
  });

  // Data sources
  const { data: clientsData, isLoading: isLoadingClients } = useClientsList(
    { per_page: 20, search: clientSearch || undefined },
    { enabled: !idClienteFromUrl }
  );
  const { data: clientDetailData } = useClientById(idClienteFromUrl, { enabled: !!idClienteFromUrl });
  // Consultores: amplia per_page para aumentar chance do consultor selecionado estar na lista
  // Consultants: widen per_page to increase chance the selected consultant is present
  const { data: consultantsData, isLoading: isLoadingConsultants } = useUsersList({ consultores: true, per_page: 200, sort: 'name', search: consultantSearch || undefined });
  const { data: responsiblesData, isLoading: isLoadingResponsibles } = useClientsList({ per_page: 50, search: responsibleSearch || undefined, permission_id: 8 } as any);

  const { data: enrollment, isLoading: isLoadingEnrollment } = useEnrollment(String(id || ''), { enabled: !!id });

  const { data: courses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['courses', 'list', 200, courseSearch],
    queryFn: async () => coursesService.listCourses({ page: 1, per_page: 200, search: courseSearch || undefined } as any),
    staleTime: 5 * 60 * 1000,
  });
  const selectedCourseId = form.watch('id_curso');
  const selectedClientId = form.watch('id_cliente');
  const { data: classes, isLoading: isLoadingClasses } = useQuery({
    queryKey: ['classes', 'list', selectedCourseId, classSearch],
    queryFn: async () => turmasService.listTurmas({ page: 1, per_page: 200, search: classSearch || undefined, id_curso: selectedCourseId ? Number(selectedCourseId) : undefined } as any),
    enabled: !!selectedCourseId,
    staleTime: 5 * 60 * 1000,
  });

  // Removido: Requisição de tabelas de parcelamento por curso (não usada mais)

  // Removido: Detalhe de tabela de parcelamento (installmentDetail) e watchers associados

  /**
   * discountRows
   * pt-BR: Linhas da tabela de desconto (parcelas, valor por parcela, desconto de pontualidade).
   * en-US: Discount table rows (total parcels, per-parcel value, punctuality discount).
   */
  const [discountRows, setDiscountRows] = useState<Array<{ parcela: string; valor: string; desconto: string }>>([]);
  /**
   * activeRowIndex
   * pt-BR: Índice da linha de desconto ativa (apenas uma linha visível/selecionável).
   * en-US: Index of the active discount row (only one row visible/selectable).
   */
  const [activeRowIndex, setActiveRowIndex] = useState<number>(0);
  /**
   * textoDescontoDirty
   * pt-BR: Marca quando o usuário editou manualmente o Texto de Desconto, para evitar sobrescrever.
   * en-US: Tracks if the user manually edited the Discount Text, to avoid overwriting.
   */
  const [textoDescontoDirty, setTextoDescontoDirty] = useState<boolean>(false);
  /**
   * lastHydratedInstallmentId
   * pt-BR: Guarda o último parcelamento_id que usamos para hidratar linhas/texto, permitindo rehidratação a cada mudança.
   * en-US: Stores the last installment_id used to hydrate rows/text, enabling rehydration on each change.
   */
  const [lastHydratedInstallmentId, setLastHydratedInstallmentId] = useState<string | null>(null);

  /**
   * clampActiveRowIndexOnRowsChange
   * pt-BR: Garante que o índice ativo seja válido quando a lista de linhas muda.
   * en-US: Ensures the active index remains valid when the rows list changes.
   */
  useEffect(() => {
    if (activeRowIndex >= (discountRows?.length || 0)) {
      setActiveRowIndex(0);
    }
  }, [discountRows, activeRowIndex]);

  /**
   * hydrateDiscountFromInstallment
   * pt-BR: Ao selecionar uma tabela, preenche Texto de Desconto com `obs` e hidrata tabela a partir de `config.parcelas`.
   * en-US: When an installment is selected, fills Discount Text with `obs` and hydrates table from `config.parcelas`.
   */
  // Removido: efeito de hidratação baseado em installmentDetail (não usamos mais tabelas)

  /**
   * situationsQuery
   * pt-BR: Carrega lista de Situações de Matrícula do endpoint '/situacoes-matricula'.
   * en-US: Loads Enrollment Situations list from '/situacoes-matricula' endpoint.
   */
  const situationsQuery = useEnrollmentSituationsList({ page: 1, per_page: 200 });
  const situationsData = situationsQuery.data;
  const isLoadingSituations = situationsQuery.isPending;

  const clientsList = useMemo(() => (clientsData?.data || []), [clientsData]);
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
  /**
   * consultantsList
   * pt-BR: Lista de consultores vinda da API (paginada).
   * en-US: Consultants list from API (paginated).
   */
  const consultantsList = useMemo(() => (consultantsData?.data || consultantsData?.items || []), [consultantsData]);
  /**
   * consultantOptions
   * pt-BR: Opções do combobox geradas a partir da lista de consultores.
   * en-US: Combobox options generated from consultants list.
   */
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

  /**
   * selectedConsultantId
   * pt-BR: Observa o valor selecionado/definido do consultor no formulário.
   * en-US: Watches the selected/loaded consultant value from the form.
   */
  const selectedConsultantId = form.watch('id_consultor');

  /**
   * selectedConsultantDetail
   * pt-BR: Busca detalhes do consultor selecionado (caso ele não esteja na página atual da lista).
   * en-US: Fetches details for the selected consultant (if not present in current list page).
   */
  const { data: selectedConsultantDetail } = useUser(String(selectedConsultantId || ''));

  /**
   * consultantOptionsWithSelected
   * pt-BR: Garante que o consultor carregado pela matrícula apareça nas opções, mesmo fora da paginação atual.
   * en-US: Ensures the enrollment’s consultant appears in options even if not in current pagination.
   */
  const consultantOptionsWithSelected = useMemo(() => {
    const exists = consultantOptions.some((o) => o.value === String(selectedConsultantId || ''));
    if (exists || !selectedConsultantDetail) return consultantOptions;
    const desc = [selectedConsultantDetail.email || '',
                  selectedConsultantDetail?.config?.celular || selectedConsultantDetail?.config?.telefone_comercial || selectedConsultantDetail?.config?.telefone_residencial || '']
                  .filter(Boolean).join(' • ');
    return [
      { value: String(selectedConsultantDetail.id), label: String(selectedConsultantDetail.name), description: desc },
      ...consultantOptions,
    ];
  }, [consultantOptions, selectedConsultantDetail, selectedConsultantId]);
  const responsiblesList = useMemo(() => (responsiblesData?.data || []), [responsiblesData]);
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
  const coursesList = useMemo(() => (courses?.data || []), [courses]);
  const classesList = useMemo(() => (classes?.data || []), [classes]);
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

  // Removido: Opções do Combobox para tabelas de parcelamento (instalments) — UI simplificada não usa mais.

  /**
   * selectedCourse
   * pt-BR: Deriva o curso selecionado para usar no SelectGeraValor e no preview.
   * en-US: Derives selected course for SelectGeraValor and preview.
   */
  const selectedCourse = useMemo(() => {
    const id = selectedCourseId ? String(selectedCourseId) : '';
    const list = coursesList || [];
    return list.find((c: any) => String(c.id) === id);
  }, [coursesList, selectedCourseId]);

  const selectedGeraValor = form.watch('gera_valor');
  const selectedModule = useMemo(() => {
    const idx = Number(String(selectedGeraValor || '').split('::')[1]);
    const mods: any[] = Array.isArray(selectedCourse?.modulos) ? selectedCourse!.modulos : [];
    return Number.isFinite(idx) && idx >= 0 ? mods[idx] : undefined;
  }, [selectedCourse, selectedGeraValor]);

  // Módulo derivado da matrícula carregada (fallback quando não há seleção atual)
  const cursoTipoFromEnrollment = String((enrollment as any)?.curso_tipo || '');
  const moduleFromEnrollment = useMemo(() => computeModulo(enrollment as any, cursoTipoFromEnrollment), [enrollment, cursoTipoFromEnrollment]);

  const selectedClient = useMemo(() => {
    if (clientDetailData && String(clientDetailData?.id || '') === String(selectedClientId || '')) {
      return clientDetailData as any;
    }
    const list = clientsList || [];
    const hit = list.find((c: any) => String(c.id) === String(selectedClientId || ''));
    return hit;
  }, [clientDetailData, clientsList, selectedClientId]);

  /**
   * normalizeMonetaryToPlain
   * pt-BR: Converte string monetária para número com ponto e 2 casas.
   * en-US: Converts monetary string into dot-decimal string with 2 decimals.
   */
  function normalizeMonetaryToPlain(input: string): string {
    const s = String(input || '').trim();
    if (!s) return '';
    return currencyRemoveMaskToString(s);
  }

  /**
   * formatCurrencyBRL
   * pt-BR: Formata número em BRL.
   * en-US: Formats number in BRL.
   */
  function formatCurrencyBRL(value: number): string {
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
    } catch {
      return `R$ ${(Number(value) || 0).toFixed(2)}`;
    }
  }

  /**
   * computeModulo
   * pt-BR: Retorna o módulo correto baseado no `curso_tipo` e no objeto `orc`.
   *        Para tipo 4, usa o primeiro item de `orc.modulos`; caso contrário, `orc.modulo`.
   * en-US: Returns the proper module based on `curso_tipo` and `orc` object.
   *        For type 4, uses first item of `orc.modulos`; otherwise, `orc.modulo`.
   */
  function computeModulo(enr: any, cursoTipo: string) {
    try {
      if (String(cursoTipo) === '4') {
        return enr?.orc?.modulos?.[0] ?? '';
      }
      return enr?.orc?.modulo ?? '';
    } catch {
      return '';
    }
  }

  /**
   * recalcTotal
   * pt-BR: Recalcula total como (subtotal + inscrição - desconto).
   * en-US: Recalculates total as (subtotal + enrollment - discount).
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
   * pt-BR: Soma N dias à data atual e formata dd/MM/yyyy.
   * en-US: Adds N days to today and formats dd/MM/yyyy.
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

  const subtotalWatched = form.watch('subtotal');
  const inscricaoWatched = form.watch('inscricao');
  const descontoWatched = form.watch('desconto');
  useEffect(() => {
    recalcTotal(subtotalWatched, inscricaoWatched, descontoWatched);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalWatched, inscricaoWatched, descontoWatched]);

  /**
   * handleGeraValorChange
   * pt-BR: Atualiza campos ao escolher módulo/valor.
   * en-US: Updates fields when choosing module/value.
   */
  function handleGeraValorChange(val: string) {
    form.setValue('gera_valor', val);
    const [price, idxStr] = String(val).split('::');
    const idx = Number(idxStr);
    const priceNormalized = normalizeMonetaryToPlain(price || '');
    const priceNumber = Number(priceNormalized || '0');
    form.setValue('subtotal', formatCurrencyBRL(priceNumber));
    const mods: any[] = Array.isArray(selectedCourse?.modulos) ? selectedCourse!.modulos : [];
    const chosen = Number.isFinite(idx) && idx >= 0 ? mods[idx] : null;
    if (chosen) {
      const orc = {
        token: Math.random().toString(16).slice(2),
        id_curso: form.getValues('id_curso'),
        id_cliente: form.getValues('id_cliente'),
        campo_id: 'id',
        modulos: [chosen],
      };
      try {
        form.setValue('orc_json', JSON.stringify(orc));
      } catch {}
    }
  }

  const classOptionsWithFallback = useMemo(() => {
    const hasSelectedCourse = !!selectedCourseId;
    const list = classOptions || [];
    if (hasSelectedCourse && list.length === 0) {
      return [{ value: '0', label: 'Aguardar turma', description: 'Sem turmas disponíveis para este curso' }];
    }
    return list;
  }, [classOptions, selectedCourseId]);

  const updateEnrollment = useUpdateEnrollment({
    onSuccess: () => {
      // pt-BR: Após salvar, decide se permanece na página ou finaliza e volta.
      // en-US: After saving, decides whether to stay or finish and go back.
      if (finishAfterSaveRef.current) {
        // pt-BR: Invalida o cache para que a listagem revalide ao retornar
        // en-US: Invalidate cache so listing revalidates upon return
        try { queryClient.invalidateQueries(); } catch {}
        if (navState?.returnTo && typeof navState.returnTo === 'string') {
          navigate(navState.returnTo);
        } else if (navState?.funnelId) {
          navigate(`/admin/sales?funnel=${navState.funnelId}`);
        } else {
          navigate('/admin/sales');
        }
      } else {
        /**
         * Toast de sucesso padronizado
         * pt-BR: Usa API de objeto do useToast.
         * en-US: Uses object-based API from useToast.
         */
        toast({ title: 'Sucesso', description: 'Proposta atualizada com sucesso!' });
      }
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
            // pt-BR: Marca erro no campo correspondente (se existir no formulário)
            // en-US: Marks error on the corresponding field (if present in the form)
            try {
              form.setError(field as any, { type: 'server', message: firstMsg });
            } catch {}
          }
        });
      }

      const description = [apiMessage, ...collectedMsgs].filter(Boolean).join(' — ');
      toast({ title: 'Erro ao atualizar proposta', description, variant: 'destructive' });
    },
  });

  /**
   * buildPayload
   * pt-BR: Constrói payload no formato aceito pela API.
   *        Inclui meta.validade e meta.gera_valor. Remove meta.gera_valor_preco.
   * en-US: Builds payload in the format accepted by the API.
   *        Includes meta.validade and meta.gera_valor. Removes meta.gera_valor_preco.
   */
  function buildPayload(values: ProposalEditFormData) {
    const payload: any = {
      id_cliente: values.id_cliente,
      id_curso: values.id_curso,
      id_turma: values.id_turma,
      obs: values.obs || '',
      id_consultor: values.id_consultor,
      // pt-BR: Envia também o campo "gera_valor" para persistir a escolha do módulo/valor
      // en-US: Also sends "gera_valor" to persist the chosen module/price
      
      id_responsavel: values.id_responsavel || '',
      desconto: normalizeMonetaryToPlain(values.desconto || '0,00') || '0.00',
      inscricao: normalizeMonetaryToPlain(values.inscricao || '') || '0.00',
      subtotal: normalizeMonetaryToPlain(values.subtotal || '') || '',
      total: normalizeMonetaryToPlain(values.total || '') || '',
      // pt-BR: Envia o novo campo situacao_id conforme seleção do usuário
      // en-US: Sends the new situacao_id field as selected by the user
      situacao_id: values.situacao_id || '',
      // pt-BR: Envia a validade (em dias) conforme valor do formulário
      // en-US: Sends validity (in days) as provided by the form
      meta: {
        validade: values.validade,
        gera_valor: values.gera_valor,
        /**
         * meta.texto_desconto
         * pt-BR: Texto livre exibido junto ao desconto (opcional).
         * en-US: Free text displayed alongside discount (optional).
         */
        texto_desconto: values.meta_texto_desconto || '',
        /**
         * meta.parcelada / meta.parcelas
         * pt-BR: Persistência do controle simples de parcelamento.
         * en-US: Persistence for simple installment control.
         */
        parcelada: !!values.parcelada,
        parcelas: String(values.parcelas || ''),
      },
      id: values.id || '',
    };
    /**
     * pt-BR: Constrói/recupera o campo "orc" e injeta os dados de parcelamento.
     * en-US: Builds/recovers "orc" and injects the installment management data.
     */
    if (values.orc_json && values.orc_json.trim().length > 0) {
      try {
        const parsed = JSON.parse(values.orc_json);
        payload.orc = parsed;
      } catch {
        toast({ title: 'Atenção', description: 'JSON de orçamento inválido. Campo ignorado.' });
      }
    }
    // pt-BR: Se não houver orc válido, gera um orc mínimo para receber parcelamento.
    // en-US: If no valid orc exists, generate a minimal one to hold installment data.
    if (!payload.orc) {
      payload.orc = {
        token: Math.random().toString(16).slice(2),
        id_curso: values.id_curso,
        id_cliente: values.id_cliente,
        campo_id: 'id',
        modulos: [],
      };
    }

    // Removido: orc.parcelamento baseado em tabela. Migração para meta.parcelada/meta.parcelas.
    // Removed: table-based orc.parcelamento. Migrated to meta.parcelada/meta.parcelas.
    return payload;
  }

  /**
   * mapEnrollmentToForm
   * pt-BR: Mapeia o registro da matrícula para preencher o formulário de edição.
   * en-US: Maps enrollment record to populate the edit form.
   */
  useEffect(() => {
    if (!enrollment) return;
    const safe = (k: string, fallback: string = '') => String((enrollment as any)[k] ?? fallback);
    const metaSafe = (k: string, fallback: string = '') => String(((enrollment as any)?.meta?.[k]) ?? fallback);
    // Aplica máscaras monetárias iniciais a partir dos dados da matrícula
    const descontoMaskedInit = formatCurrencyBRL(currencyRemoveMaskToNumber(safe('desconto', form.getValues('desconto') || '0,00')));
    const inscricaoMaskedInit = formatCurrencyBRL(currencyRemoveMaskToNumber(safe('inscricao', form.getValues('inscricao') || '')));
    const subtotalMaskedInit = formatCurrencyBRL(currencyRemoveMaskToNumber(safe('subtotal', form.getValues('subtotal') || '')));
  const totalMaskedInit = formatCurrencyBRL(currencyRemoveMaskToNumber(safe('total', form.getValues('total') || '')));
  form.reset({
      id_cliente: safe('id_cliente', form.getValues('id_cliente')),
      id_curso: safe('id_curso', form.getValues('id_curso')),
      id_turma: safe('id_turma', form.getValues('id_turma')),
      // pt-BR: Observações devem ser preenchidas a partir de `descricao` quando existir;
      //        caso contrário, usa `obs` legado.
      // en-US: Observations should be hydrated from `descricao` when present;
      //        otherwise, falls back to legacy `obs`.
      obs: safe('descricao', safe('obs')),
      id_consultor: safe('id_consultor'),
      // pt-BR: Recupera meta.gera_valor com fallback para campo raiz (compatibilidade)
      // en-US: Restores meta.gera_valor with fallback to root field for compatibility
      gera_valor: metaSafe('gera_valor', safe('gera_valor', form.getValues('gera_valor'))),
      // pt-BR: Preenche situacao_id se existir no registro
      // en-US: Fills situacao_id if present in the record
      situacao_id: safe('situacao_id', ''),
      id_responsavel: safe('id_responsavel', form.getValues('id_responsavel')),
      orc_json: JSON.stringify((enrollment as any)?.orc ?? {}),
      desconto: descontoMaskedInit,
      inscricao: inscricaoMaskedInit,
      subtotal: subtotalMaskedInit,
      total: totalMaskedInit,
      // pt-BR: Recupera meta.validade com fallback para campo raiz (compatibilidade)
      // en-US: Restores meta.validade with fallback to root field for compatibility
      validade: metaSafe('validade', safe('validade', form.getValues('validade'))),
      // pt-BR: Recupera meta.texto_desconto para preencher o novo campo do formulário
      // en-US: Restores meta.texto_desconto to populate the new form field
      meta_texto_desconto: metaSafe('texto_desconto', ''),
      // pt-BR: Recupera parcelada/parcelas dos metadados; fallback para orc.parcelamento
      // en-US: Restore parcelada/parcelas from metadata; fallback to orc.parcelamento
      parcelada: String(metaSafe('parcelada', 'false')) === 'true',
      parcelas: ((): string => {
        const fromMeta = metaSafe('parcelas', form.getValues('parcelas') || '');
        if (fromMeta && fromMeta.trim() !== '') return fromMeta;
        try {
          const parcelasOrc = String(((enrollment as any)?.orc?.parcelamento?.linhas?.[0]?.parcelas) || '');
          return parcelasOrc || form.getValues('parcelas') || '12';
        } catch {
          return form.getValues('parcelas') || '12';
        }
      })(),
      id: String(id || ''),
    });
  }, [enrollment, id]);

  /**
   * textoDescontoWatched
   * pt-BR: Observa o conteúdo do campo Texto de Desconto para atualização dinâmica do preview.
   * en-US: Watches Discount Text content for dynamic preview updates.
   */
  const textoDescontoWatched = form.watch('meta_texto_desconto');

  /**
   * getValorDescFromConfig (removido)
   * pt-BR: Removido pois não usamos mais `installmentDetail.config`.
   * en-US: Removed because `installmentDetail.config` is no longer used.
   */

  /**
   * activeRowResolved
   * pt-BR: Seleciona a primeira linha válida e completa seus campos com fallback da config, quando necessário.
   * en-US: Picks the first valid row and completes its fields using config fallback when needed.
   */
  const activeRowResolved = useMemo(() => {
    const row = (discountRows || [])[activeRowIndex] || (discountRows || []).find((r) => r.parcela) || (discountRows || [])[0] || null;
    if (!row) return null;
    const parcelaStr = String(row.parcela || '');
    const parcelaNum = Number(parcelaStr) || 0;
    const totalNum = currencyRemoveMaskToNumber(String(form.getValues('total') || '')) || 0;
    const fromTotal = parcelaNum > 0 && totalNum > 0 ? (totalNum / parcelaNum) : 0;
    const valorFromTotalMasked = fromTotal > 0 ? formatCurrencyBRL(fromTotal) : '';
    const valorMasked = String(row.valor || valorFromTotalMasked || '');
    const descontoMasked = String(row.desconto || '');
    const valorNum = currencyRemoveMaskToNumber(valorMasked) || 0;
    const descontoNum = currencyRemoveMaskToNumber(descontoMasked) || 0;
    const parcelaComDescNum = valorNum > 0 ? Math.max(valorNum - descontoNum, 0) : 0;
    const parcelaComDescMasked = parcelaComDescNum > 0 ? formatCurrencyBRL(parcelaComDescNum) : '';
    return {
      parcela: parcelaStr,
      valor: valorMasked,
      desconto: descontoMasked,
      parcelaComDesconto: parcelaComDescMasked,
    };
  }, [discountRows, activeRowIndex]);

  /**
   * resolveShortcodes
   * pt-BR: Substitui shortcodes no HTML do texto de desconto por valores dinâmicos da linha ativa.
   * en-US: Replaces shortcodes in discount text HTML with dynamic values from the active row.
   */
  function resolveShortcodes(baseHtml: string, row: { parcela?: string; valor?: string; desconto?: string } | null): string {
    const html = String(baseHtml || '');
    if (!row) return html;
    const totalParcStr = String(row.parcela || '');
    const valorParcelaStr = String(row.valor || '');
    const descPontualStr = String(row.desconto || '');
    const parcelaComDescStr = (row as any)?.parcelaComDesconto ? String((row as any).parcelaComDesconto) : '';
    return html
      .replace(/\{total_parcelas\}/gi, totalParcStr)
      .replace(/\{valor_parcela\}/gi, valorParcelaStr)
      .replace(/\{desconto_pontualidade\}/gi, descPontualStr)
      .replace(/\{parcela_com_desconto\}/gi, parcelaComDescStr);
  }

  /**
   * discountPreviewHtml
   * pt-BR: HTML do preview com shortcodes resolvidos, atualizado em tempo real.
   * en-US: Preview HTML with resolved shortcodes, updated in real time.
   */
  const discountPreviewHtml = useMemo(() => {
    return resolveShortcodes(textoDescontoWatched || '', activeRowResolved);
  }, [textoDescontoWatched, activeRowResolved]);

  /**
   * hydrateInstallmentFromOrc
   * pt-BR: Hidrata o card "Gerenciamento de Parcelamento" a partir de `enrollment.orc.parcelamento`,
   *        preenchendo `parcelamento_id`, linhas da tabela e texto de desconto, quando disponíveis.
   * en-US: Hydrates the "Installment Management" card from `enrollment.orc.parcelamento`,
   *        filling `parcelamento_id`, table rows, and discount text when available.
   */
  useEffect(() => {
    try {
      const orc: any = (enrollment as any)?.orc;
      const parcelamento = orc?.parcelamento;
      if (!parcelamento) return;

      // Hidratar linhas da tabela se existirem em orc.parcelamento.linhas
      const linhas = Array.isArray(parcelamento.linhas) ? parcelamento.linhas : [];
      if (linhas.length > 0) {
        const rows = linhas.map((l: any) => ({
          parcela: String(l.parcelas ?? l.parcela ?? ''),
          valor: l.valor ? currencyApplyMask(String(l.valor), 'pt-BR', 'BRL') : '',
          desconto: l.desconto ? currencyApplyMask(String(l.desconto), 'pt-BR', 'BRL') : '',
        }));
        setDiscountRows(rows);
      }

      const currentTexto = form.getValues('meta_texto_desconto') || '';
      if ((!currentTexto || currentTexto.trim().length === 0) && parcelamento.texto_desconto) {
        form.setValue('meta_texto_desconto', String(parcelamento.texto_desconto));
      }
    } catch {
      // Silencer
    }
  }, [enrollment, form]);

  /**
   * onSubmit
   * pt-BR: Envia atualização para `/matriculas/:id`.
   * en-US: Sends update to `/matriculas/:id`.
   */
  async function onSubmit(values: ProposalEditFormData) {
    const payload = buildPayload(values);
    await updateEnrollment.mutateAsync({ id: String(id || ''), data: payload } as any);
  }

  /**
   * handleBack
   * pt-BR: Retorna à página de origem, se disponível; senão, vai para vendas.
   * en-US: Returns to origin page if available; otherwise, goes to sales.
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

  /**
   * handleSaveContinue
   * pt-BR: Envia o formulário e permanece na página para continuar.
   * en-US: Submits the form and stays on the page to continue.
   */
  function handleSaveContinue() {
    finishAfterSaveRef.current = false;
    form.handleSubmit(onSubmit)();
  }

  /**
   * handleSaveFinish
   * pt-BR: Envia o formulário e finaliza, retornando com atualização.
   * en-US: Submits the form and finishes, returning with refresh.
   */
  function handleSaveFinish() {
    finishAfterSaveRef.current = true;
    form.handleSubmit(onSubmit)();
  }

  useEffect(() => {
    // Silently handle hydration effects
  }, [form]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBack}
          className="w-fit text-muted-foreground hover:text-foreground transition-colors -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao funil
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setShowResponsible((s) => !s)}
            className="shadow-sm border-muted-foreground/20 hover:bg-muted font-medium transition-all"
            aria-label={showResponsible ? 'Ocultar Responsável' : 'Selecionar Responsável'}
          >
            <Users className="h-4 w-4 mr-2" />
            {showResponsible ? 'Ocultar Responsável' : 'Selecionar Responsável'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground/90 flex items-center gap-3">
          <Pencil className="h-7 w-7 text-primary/70" />
          Editar Proposta
        </h2>
        <p className="text-muted-foreground text-sm font-medium">Ajuste os detalhes da proposta comercial, curso e condições financeiras.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Card 1: Dados da Proposta */}
          <Card className="border shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
            <CardHeader className="bg-muted/30 border-b py-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary/70" />
                Informações Gerais
              </CardTitle>
              <CardDescription>Identificação do cliente, consultor e a situação atual da matrícula.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
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
                          disabled={isLoadingClients || isLoadingEnrollment}
                          loading={isLoadingClients || isLoadingEnrollment}
                          onSearch={setClientSearch}
                          searchTerm={clientSearch}
                          debounceMs={250}
                        />
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Consultor */}
                <FormField
                  control={form.control}
                  name="id_consultor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consultor *</FormLabel>
                      <Combobox
                        options={consultantOptionsWithSelected}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Selecione o consultor"
                        searchPlaceholder="Pesquisar consultor pelo nome..."
                        emptyText={consultantOptionsWithSelected.length === 0 ? 'Nenhum consultor encontrado' : 'Digite para filtrar'}
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

                {/* Situação */}
                <FormField
                  control={form.control}
                  name="situacao_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Situação</FormLabel>
                      <Select value={field.value || ''} onValueChange={field.onChange} disabled={isLoadingSituations}>
                        <SelectTrigger className="w-full h-10">
                          <SelectValue placeholder="Selecione a situação" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray((situationsData as any)?.data || (situationsData as any)?.items)
                            ? (((situationsData as any).data || (situationsData as any).items).map((s: any) => (
                                <SelectItem key={String(s.id)} value={String(s.id)}>
                                  {String(s.name || s.nome || `Situação ${s.id}`)}
                                </SelectItem>
                              )))
                            : (
                              <></>
                            )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Curso e Turma */}
          <Card className="border shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
            <CardHeader className="bg-muted/30 border-b py-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary/70" />
                Curso e Turma
              </CardTitle>
              <CardDescription>Seleção do programa acadêmico e período letivo.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        onValueChange={(val) => {
                          field.onChange(val);
                          form.setValue('id_turma', '');
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
                        emptyText={!selectedCourseId ? 'Selecione um curso primeiro' : classOptionsWithFallback.length === 0 ? 'Nenhuma turma encontrada' : 'Digite para filtrar'}
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

              {showResponsible && (
                <div className="pt-4 border-t animate-in slide-in-from-top-2 duration-300">
                  <FormField
                    control={form.control}
                    name="id_responsavel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          Responsável Financeiro/Legal
                        </FormLabel>
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
            </CardContent>
          </Card>

          {/* Card 3: Financeiro / Gerar Valor */}
          <Card className="border shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
            <CardHeader className="bg-muted/30 border-b py-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary/70" />
                Detalhamento Financeiro
              </CardTitle>
              <CardDescription>Defina os valores, descontos e prazos da proposta.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* SelectGeraValor — renderiza quando turma selecionada */}
              {form.watch('id_turma') && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-3 animate-in fade-in zoom-in-95 duration-300">
                  <FormField
                    control={form.control}
                    name="gera_valor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-primary font-bold flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Gerar Valor do Curso
                        </FormLabel>
                        <SelectGeraValor
                          course={selectedCourse}
                          value={field.value}
                          onChange={handleGeraValorChange}
                          name="gera_valor"
                          disabled={!selectedCourse}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Selecione uma opção para preencher automaticamente o subtotal.</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField control={form.control} name="subtotal" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtotal</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="R$ 0,00"
                        className="font-bold text-foreground/80 h-10"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(currencyApplyMask(e.target.value, 'pt-BR', 'BRL'))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="inscricao" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa de Inscrição</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="R$ 0,00"
                        className="font-bold text-foreground/80 h-10"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(currencyApplyMask(e.target.value, 'pt-BR', 'BRL'))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="desconto" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desconto de Pontualidade</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="R$ 0,00"
                        className="font-bold text-red-600 h-10"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(currencyApplyMask(e.target.value, 'pt-BR', 'BRL'))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                <FormField control={form.control} name="total" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-black text-primary">Total da Proposta</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="R$ 0,00"
                          disabled
                          className="font-black text-2xl text-primary h-14 bg-primary/5 border-primary/20 pl-4 disabled:opacity-100 cursor-default shadow-inner"
                          value={field.value || ''}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField
                  control={form.control}
                  name="validade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-black text-foreground/70">Validade</FormLabel>
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full h-14 font-bold text-lg shadow-sm">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="7" className="font-medium p-3">7 Dias</SelectItem>
                          <SelectItem value="14" className="font-medium p-3">14 Dias</SelectItem>
                          <SelectItem value="30" className="font-medium p-3">30 Dias</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase mt-1 leading-none tracking-tighter">Expira em: <span className="text-primary">{computeValidityDate(field.value)}</span></p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

              {/**
               * ParcelamentoCard
               * pt-BR: Card para gerenciamento de parcelamento, posicionado abaixo do campo de validade.
               *        Contém o select de Tabela de Parcelamento e o campo Texto de Desconto.
               * en-US: Card for installment management, placed below the validity field.
               *        Contains the Installment Table select and the Discount Text field.
               */}

          {/* Card 4: Parcelamento */}
          <Card className="border shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
            <CardHeader className="bg-muted/30 border-b py-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary/70" />
                Condições de Parcelamento
              </CardTitle>
              <CardDescription>Defina se a proposta será parcelada e o texto descritivo.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Parcelada? */}
                <FormField
                  control={form.control}
                  name="parcelada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opção de Parcelamento</FormLabel>
                      <Select value={String(field.value ?? false)} onValueChange={(v) => field.onChange(v === 'true')}>
                        <SelectTrigger className="w-full h-10 font-semibold shadow-sm">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="false" className="p-3">À Vista (Não parcelada)</SelectItem>
                          <SelectItem value="true" className="p-3 font-bold text-primary">Parcelada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Parcelas */}
                <FormField
                  control={form.control}
                  name="parcelas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Parcelas</FormLabel>
                      <Select value={field.value || ''} onValueChange={field.onChange} disabled={!form.watch('parcelada')}>
                        <SelectTrigger className="w-full h-10 font-bold shadow-sm">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="6" className="p-3">6 Parcelas</SelectItem>
                          <SelectItem value="12" className="p-3 font-bold">12 Parcelas</SelectItem>
                          <SelectItem value="18" className="p-3">18 Parcelas</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Preview Valor da Parcela */}
                <FormItem>
                  <FormLabel>Valor da Parcela (estimativa)</FormLabel>
                  <div className="relative">
                    <Input
                      readOnly
                      className="font-black text-emerald-600 h-10 bg-emerald-50 border-emerald-100 disabled:opacity-100 cursor-default"
                      value={((): string => {
                        const isParcelada = !!form.watch('parcelada');
                        const parcelasStr = String(form.watch('parcelas') || '');
                        const parcelasNum = Number(parcelasStr) || 0;
                        const totalNum = currencyRemoveMaskToNumber(String(form.getValues('total') || '')) || 0;
                        if (!isParcelada || parcelasNum <= 0 || totalNum <= 0) return '';
                        return formatCurrencyBRL(totalNum / parcelasNum);
                      })()}
                    />
                  </div>
                </FormItem>
              </div>

              {/* Texto de Desconto (mantido) */}
              <div className="pt-4 border-t space-y-3">
                <FormField
                  control={form.control}
                  name="meta_texto_desconto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <AlignLeft className="h-4 w-4 text-primary/60" />
                        Texto de Sugestão de Pagamento / Desconto
                      </FormLabel>
                      <FormControl>
                        <div className="rounded-xl border shadow-inner bg-white overflow-hidden">
                          <RichTextEditor
                            value={field.value || ''}
                            onChange={(val) => {
                              try { setTextoDescontoDirty(true); } catch {}
                              field.onChange(val);
                            }}
                            placeholder="Digite ou edite o texto de desconto (suporta HTML)"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                  <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700 font-medium">Use tags como <code className="bg-amber-100 px-1 rounded">{"{total_parcelas}"}</code>, <code className="bg-amber-100 px-1 rounded">{"{valor_parcela}"}</code> e <code className="bg-amber-100 px-1 rounded">{"{parcela_com_desconto}"}</code> para preenchimento dinâmico no documento final.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 5: Observações */}
          <Card className="border shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
            <CardHeader className="bg-muted/30 border-b py-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <AlignLeft className="h-5 w-5 text-primary/70" />
                Observações Internas
              </CardTitle>
              <CardDescription>Notas adicionais sobre a negociação ou o aluno.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <FormField
                control={form.control}
                name="obs"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="rounded-xl border shadow-inner bg-white overflow-hidden">
                        <RichTextEditor
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder="Digite qualquer observação relevante..."
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="pt-4">
            <BudgetPreview
              title="Preview da Proposta Comercial"
              clientName={selectedClient?.name || selectedClient?.nome || ''}
              clientId={selectedClient?.id ? String(selectedClient.id) : undefined}
              clientPhone={selectedClient?.config?.celular || selectedClient?.config?.telefone_residencial || ''}
              clientEmail={selectedClient?.email || ''}
              course={selectedCourse as any}
              module={(selectedModule ?? moduleFromEnrollment) as any}
              discountLabel="Desconto de Pontualidade"
              discountAmountMasked={form.watch('desconto') || ''}
              subtotalMasked={form.watch('subtotal') || ''}
              totalMasked={form.watch('total') || ''}
              validityDate={computeValidityDate(form.watch('validade'))}
            />
          </div>

          {/* Espaço para o rodapé fixo não cobrir o conteúdo */}
          <div className="h-24" />
        </form>
      </Form>

      {/* Rodapé fixo com ações premium */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-muted/50 p-4 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="container mx-auto max-w-7xl flex items-center justify-between gap-4">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground font-semibold px-6"
          >
            Cancelar
          </Button>
          <div className="flex items-center gap-3">
            <Button 
              type="button" 
              variant="outline"
              onClick={handleSaveContinue} 
              disabled={updateEnrollment.isPending || isLoadingEnrollment}
              className="border-muted-foreground/20 hover:bg-muted font-bold min-w-[160px]"
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
            <Button 
              type="button" 
              onClick={handleSaveFinish} 
              disabled={updateEnrollment.isPending || isLoadingEnrollment}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-lg shadow-primary/20 min-w-[200px]"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Finalizar Edição
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
  // Removido: o recálculo é feito na troca do Total de Parcelas, conforme solicitado.