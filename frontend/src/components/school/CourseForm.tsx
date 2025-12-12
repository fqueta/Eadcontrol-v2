import { useEffect, useMemo, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, X, GripVertical, ChevronDown, ChevronLeft, Save, Loader2, Eye, ExternalLink, Copy } from 'lucide-react';
import { ImageUpload } from '@/components/lib/ImageUpload';
import { useNavigate } from 'react-router-dom';
import { coursesService } from '@/services/coursesService';
import { fileStorageService, type FileStorageItem } from '@/services/fileStorageService';
import MediaLibraryModal from '@/components/media/MediaLibraryModal';
import { useQuery } from '@tanstack/react-query';
import { aircraftSettingsService } from '@/services/aircraftSettingsService';
import { CoursePayload, CourseRecord, CourseModule } from '@/types/courses';
import { modulesService } from '@/services/modulesService';
import { activitiesService } from '@/services/activitiesService';
import EnrollmentTable from '@/components/enrollments/EnrollmentTable';
import { useEnrollmentsList } from '@/hooks/enrollments';
import { usersService } from '@/services/usersService';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { currencyApplyMask, currencyRemoveMaskToNumber, currencyRemoveMaskToString } from '@/lib/masks/currency';

/**
 * CourseForm
 * pt-BR: Formulário tabulado para criar/editar cursos. Agrupa campos em abas
 *        (Informações, Valores, Configurações, Aeronaves, Módulos).
 * en-US: Tabbed form to create/edit courses. Groups fields into tabs
 *        (Info, Pricing, Config, Aircrafts, Modules).
 */
export function CourseForm({
  initialData,
  onSubmit,
  isSubmitting,
}: {
  initialData?: CourseRecord | CoursePayload | null;
  onSubmit: (data: CoursePayload) => Promise<void> | void;
  isSubmitting?: boolean;
}) {
  /**
   * saving
   * pt-BR: Controla o estado de carregamento dos botões de salvar (spinner).
   * en-US: Controls loading state of save buttons (spinner).
   */
  const [saving, setSaving] = useState<'stay' | 'exit' | null>(null);
  /**
   * autoSlugEnabled
   * pt-BR: Controla se o slug deve ser gerado automaticamente a partir do nome.
   *        Desliga quando há um slug explícito vindo do backend ou quando o usuário
   *        altera manualmente o campo de slug.
   * en-US: Controls whether the slug should be auto-generated from the name.
   *        Turns off when a backend-provided slug exists or when the user
   *        manually edits the slug field.
   */
  const [autoSlugEnabled, setAutoSlugEnabled] = useState<boolean>(true);
  const navigate = useNavigate();
  /**
   * mediaOpen
   * pt-BR: Controla a abertura do modal da biblioteca de mídia para escolher imagem de capa.
   * en-US: Controls opening of the media library modal to choose cover image.
   */
  const [mediaOpen, setMediaOpen] = useState<boolean>(false);

  /**
   * getCourseFormTabStorageKey
   * pt-BR: Gera a chave de armazenamento da aba ativa com base no ID do curso
   *        (ou 'new' quando criando). Usada para restaurar a mesma aba ao voltar
   *        de páginas de preview ou navegações.
   * en-US: Generates the storage key for the active tab based on course ID
   *        (or 'new' when creating). Used to restore the same tab when returning
   *        from preview pages or navigations.
   */
  /**
   * id
   * pt-BR: ID do curso em edição; usa 'new' quando criando.
   * en-US: ID of the course being edited; uses 'new' when creating.
   */
  const id = (initialData as any)?.id ?? 'new';

  /**
   * courseNumericId
   * pt-BR: ID numérico do curso atual, usado para filtrar matrículas.
   * en-US: Numeric ID of the current course, used to filter enrollments.
   */
  const courseNumericId = useMemo(() => {
    const cid = (initialData as any)?.id;
    const num = Number(cid);
    return Number.isFinite(num) ? num : undefined;
  }, [initialData]);

  const getCourseFormTabStorageKey = () => `courseform:activeTab:${String(id)}`;

  /**
   * activeTab
   * pt-BR: Controla a aba ativa de forma controlada e persiste em sessionStorage.
   *        Tenta ler primeiro do parâmetro de URL `?tab=`, depois de sessionStorage,
   *        e por fim usa 'info' como padrão.
   * en-US: Controls active tab in a controlled way and persists to sessionStorage.
   *        Tries to read from URL param `?tab=` first, then sessionStorage,
   *        and finally falls back to 'info'.
   */
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const urlTab = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('tab')
        : null;
      if (urlTab) return urlTab;
      const stored = typeof window !== 'undefined'
        ? window.sessionStorage.getItem(getCourseFormTabStorageKey())
        : null;
      return stored || 'info';
    } catch {
      return 'info';
    }
  });

  /**
   * pt-BR: Sempre que a aba ativa mudar, salva em sessionStorage e reflete no URL
   *        via replaceState, sem navegar (mantém histórico limpo).
   * en-US: Whenever active tab changes, save to sessionStorage and reflect in URL
   *        via replaceState without navigation (keeps history clean).
   */
  useEffect(() => {
    try {
      const key = getCourseFormTabStorageKey();
      window.sessionStorage.setItem(key, activeTab);
      const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
      const currentTab = new URLSearchParams(currentSearch).get('tab');
      if (currentTab !== activeTab) {
        const params = new URLSearchParams(currentSearch);
        params.set('tab', activeTab);
        navigate({ search: `?${params.toString()}` }, { replace: false });
      }
    } catch {}
  }, [activeTab, initialData, navigate]);

  /**
   * saveAndStay
   * pt-BR: Salva o curso e mantém na página, exibindo loader durante o processamento.
   * en-US: Saves the course and stays on the page, showing a loader while processing.
   */
  const saveAndStay = async () => {
    setSaving('stay');
    const normalized = normalizePayload(form.getValues());
    try {
      if ((initialData as any)?.id) {
        await coursesService.updateCourse(String((initialData as any).id), normalized);
      } else {
        await coursesService.createCourse(normalized);
      }
      toast({ title: 'Salvo', description: 'Curso salvo. Você permanece na página.' });
    } catch (e: any) {
      applyServerErrors(e);
      toast({ title: 'Erro ao salvar', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  /**
   * saveAndExit
   * pt-BR: Salva o curso e retorna para a listagem, exibindo loader durante o processamento.
   * en-US: Saves the course and navigates back to the list, showing a loader while processing.
   */
  const saveAndExit = async () => {
    setSaving('exit');
    const normalized = normalizePayload(form.getValues());
    try {
      if ((initialData as any)?.id) {
        await coursesService.updateCourse(String((initialData as any).id), normalized);
      } else {
        await coursesService.createCourse(normalized);
      }
      navigate('/admin/school/courses');
    } catch (e: any) {
      applyServerErrors(e);
      toast({ title: 'Erro ao salvar', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  /**
   * goToPreview
   * pt-BR: Abre a página pública do curso por slug. Requer slug/token.
   *        Ao navegar, envia um sinal para recarregar a página do preview.
   * en-US: Opens the public course page by slug. Requires slug/token.
   *        Sends a signal to reload the preview page upon navigation.
   */
  const goToPreview = () => {
    // Prioriza campos de slug; alguns backends usam `token` como slug.
    const slug = (initialData as any)?.slug || (initialData as any)?.token;
    if (!slug) {
      toast({ title: 'Preview indisponível', description: 'Defina o slug do curso e salve para habilitar o preview público.', variant: 'destructive' });
      return;
    }
    // Envia `state.forceReload = true` e parâmetro `reload=1` para forçar
    // recarga única ao abrir a página de preview.
    navigate(`/admin/school/courses/${String(initialData?.id)}/preview?reload=1`, { state: { forceReload: true } });
  };

  /**
   * buildStudentPreviewUrl
   * pt-BR: Monta o URL absoluto para a visualização do aluno. Passa a priorizar
   *        o valor atual do campo `slug` no formulário (reactivo), depois usa
   *        `initialData.slug`, em seguida `initialData.token`, e por fim `id`.
   * en-US: Builds the absolute URL for the student view. Prioritizes the current
   *        form `slug` value (reactive), then falls back to `initialData.slug`,
   *        then `initialData.token`, and finally `id`.
   */
  const buildStudentPreviewUrl = (): { href: string; absolute: string } => {
    // Obtém o valor atual do campo 'slug' de forma reativa.
    const currentSlug = form.watch('slug');
    const fallbackSlug = (initialData as any)?.slug || (initialData as any)?.token || String((initialData as any)?.id || '');
    const slug = currentSlug || fallbackSlug;
    const href = slug ? `/aluno/cursos/${slug}` : '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const absolute = href ? `${origin}${href}` : '';
    return { href, absolute };
  };

  /**
   * copyText
   * pt-BR: Copia um texto para o clipboard e exibe um toast de confirmação.
   * en-US: Copies text to clipboard and shows a confirmation toast.
   */
  const copyText = async (text: string) => {
    if (!text) {
      toast({ title: 'Link indisponível', description: 'Defina o slug/token e salve o curso.', variant: 'destructive' });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Link copiado', description: text });
    } catch (e: any) {
      toast({ title: 'Falha ao copiar', description: String(e?.message || e || 'Tente novamente'), variant: 'destructive' });
    }
  };
  /**
   * uploadCourseCover
   * pt-BR: Helper que envia a imagem de capa do curso ao backend e retorna a URL definitiva.
   * en-US: Helper that uploads the course cover image to the backend and returns the final URL.
   */
  const uploadCourseCover = async (file: File): Promise<string> => {
    // pt-BR: Ajustado para usar a rota documentada `POST /file-storage`.
    // en-US: Adjusted to use documented route `POST /file-storage`.
    const resp: any = await fileStorageService.upload(file);
    // Tenta normalizar diferentes formatos de resposta
    const url = typeof resp === 'string' ? resp : (resp?.url ?? resp?.data?.url ?? resp?.data?.data?.url);
    if (!url) {
      throw new Error('URL não retornada pelo upload de capa');
    }
    return url;
  };

  /**
   * handleSelectImageFromLibrary
   * pt-BR: Aplica item selecionado da biblioteca ao formulário (URL, título e file_id).
   * en-US: Applies selected media item to the form (URL, title and file_id).
   */
  const handleSelectImageFromLibrary = (item: FileStorageItem) => {
    const finalUrl = item?.file?.url || item?.url || fileStorageService.downloadUrl(item.id);
    // pt-BR: Armazena exclusivamente em `config.cover.*`.
    // en-US: Store exclusively under `config.cover.*`.
    form.setValue('config.cover.url', finalUrl || '', { shouldValidate: true });
    form.setValue('config.cover.file_id', item.id as any, { shouldValidate: true });
    form.setValue('config.cover.title', (item.title || item.name || form.getValues('titulo') || '') as any, { shouldValidate: false });
    setMediaOpen(false);
  };

  /**
   * toSlug
   * pt-BR: Converte texto em slug URL-safe (remove acentos/espaços/char especiais).
   * en-US: Converts text to URL-safe slug (removes diacritics/spaces/special chars).
   */
  const toSlug = (text: string) => {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  
  /**
   * courseSchema
   * pt-BR: Valida campos principais e valores monetários (aba "Valores").
   * en-US: Validates core fields and monetary values ("Valores" tab).
   */
  const moduleSchema = z.object({
    /**
     * title
     * pt-BR: Título (aluno).
     * en-US: Title (student-facing).
     */
    title: z.string().min(1, 'Título é obrigatório'),
    /**
     * name
     * pt-BR: Nome interno (admin).
     * en-US: Internal name (admin-facing).
     */
    name: z.string().min(1, 'Nome interno é obrigatório'),
    /**
     * tipo_duracao
     * pt-BR: Unidade de duração do módulo (seg/min/hrs).
     * en-US: Module duration unit (seg/min/hrs).
     */
    tipo_duracao: z.enum(['seg','min','hrs']).optional(),
    /**
     * duration
     * pt-BR: Duração numérica em string.
     * en-US: Numeric duration in string.
     */
    duration: z.string().min(1),
    /**
     * content
     * pt-BR: Conteúdo do módulo.
     * en-US: Module content.
     */
    content: z.string().optional(),
    /**
     * description
     * pt-BR: Descrição do módulo.
     * en-US: Module description.
     */
    description: z.string().optional(),
    /**
     * active
     * pt-BR: Marcador de módulo ativo ("s" ou "n").
     * en-US: Module active flag ("s" or "n").
     */
    active: z.enum(['s','n']).optional(),
    // Campos extras usados apenas na UI do curso
    valor: z.string().optional(),
    aviao: z.array(z.string()).optional(),
    /**
     * module_id
     * pt-BR: Referência opcional a módulo existente.
     * en-US: Optional reference to existing module.
     */
    module_id: z.string().optional(),
    /**
     * atividades
     * pt-BR: Lista validada de atividades do módulo.
     * en-US: Validated activities list for the module.
     */
    atividades: z
      .array(
        z.object({
          titulo: z.string().min(1, 'Título da atividade é obrigatório'),
          tipo: z.enum(['video', 'quiz', 'leitura', 'arquivo', 'tarefa']),
          descricao: z.string().optional(),
          duracao: z.string().optional(),
          unidade_duracao: z.enum(['seg', 'min', 'hrs']).optional(),
          requisito: z.string().optional(),
          active: z.enum(['s','n']).optional(),
          activity_id: z.string().optional(),
          /**
           * video_source / video_url
           * pt-BR: Campos opcionais exibidos quando tipo="video" (YouTube/Vimeo + URL).
           * en-US: Optional fields shown when type="video" (YouTube/Vimeo + URL).
           */
          video_source: z.enum(['youtube','vimeo']).optional(),
          video_url: z.string().url('URL inválida').optional().or(z.string().min(0).optional()),
          /**
           * arquivo_url
           * pt-BR: URL do arquivo quando tipo="arquivo" (PDF/TXT/DOC, etc.).
           * en-US: File URL when type="arquivo" (PDF/TXT/DOC, etc.).
           */
          arquivo_url: z.string().url('URL inválida').optional().or(z.string().min(0).optional()),
        })
      )
      .optional(),
  });
  const courseSchema = z.object({
    nome: z.string().min(1, 'Nome interno é obrigatório'),
    titulo: z.string().min(1, 'Título é obrigatório'),
    /**
     * slug
     * pt-BR: Slug do curso usado na API e nas URLs públicas.
     * en-US: Course slug used by the API and public URLs.
     */
    slug: z.string().optional(),
    ativo: z.enum(['s', 'n']).optional(),
    publicar: z.enum(['s', 'n']).optional(),
    /**
     * duracao
     * pt-BR: Valor sempre inteiro, ajustado conforme unidade (seg/min/hrs).
     * en-US: Value must be an integer, adjusted by unit (sec/min/hr).
     */
    duracao: z
      .coerce.string()
      .min(1, 'Duração é obrigatória')
      .refine((v) => /^\d+$/.test(String(v).trim()), 'Duração deve ser um número inteiro'),
    /**
     * unidade_duracao
     * pt-BR: Agora suporta seg/min/hrs.
     * en-US: Now supports seg/min/hrs.
     */
    unidade_duracao: z.enum(['seg', 'min', 'hrs'], { required_error: 'Unidade é obrigatória' }),
    tipo: z.string().min(1, 'Tipo é obrigatório'),
    /**
     * descricao_curso / observacoes / instrutor
     * pt-BR: Campos opcionais de descrição, observações e instrutor.
     * en-US: Optional description, notes and instructor fields.
     */
    // Campos de descrição: mantemos alias `descricao` para UI e
    // o campo original `descricao_curso` para compatibilidade.
    descricao: z.string().optional(),
    descricao_curso: z.string().optional(),
    observacoes: z.string().optional(),
    instrutor: z.string().optional(),

    inscricao: z
      .string()
      .optional()
      .refine((v) => v === undefined || currencyRemoveMaskToNumber(v) >= 0, 'Inscrição inválida'),
    valor: z
      .string()
      .optional()
      .refine((v) => v === undefined || currencyRemoveMaskToNumber(v) >= 0, 'Valor inválido'),
    parcelas: z
      .enum(['1','2','3','4','5','6','7','8','9','10','11','12'])
      .optional(),
    valor_parcela: z
      .string()
      .optional()
      .refine((v) => v === undefined || currencyRemoveMaskToNumber(v) >= 0, 'Valor da parcela inválido'),

    aeronaves: z.array(z.string()).optional(),
    modulos: z.array(moduleSchema),
    /**
     * perguntas
     * pt-BR: Lista opcional de perguntas e respostas.
     * en-US: Optional list of Q&A.
     */
    perguntas: z
      .array(
        z.object({
          pergunta: z.string().min(1, 'Pergunta é obrigatória'),
          resposta: z.string().optional(),
        })
      )
      .optional(),
  });

  const { toast } = useToast();
  const form = useForm<CoursePayload>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      nome: '',
      titulo: '',
      slug: '',
      ativo: 's',
      publicar: 'n',
      duracao: '0',
      unidade_duracao: 'hrs',
      tipo: '2',
      descricao: '',
      descricao_curso: '',
      observacoes: '',
      instrutor: '',
      config: {
        proximo_curso: '',
        gratis: 'n',
        comissao: '0,00',
        tx2: [{ name_label: '', name_valor: '' }],
        tipo_desconto_taxa: 'v',
        desconto_taxa: '',
        pagina_divulgacao: '',
        video: '',
        pagina_venda: { link: '', label: '' },
        adc: { recheck: 'n', recorrente: 'n', cor: 'FFFFFF' },
        ead: { id_eadcontrol: '' },
        /**
         * cover
         * pt-BR: Objeto de capa do curso (url, file_id, title).
         * en-US: Course cover object (url, file_id, title).
         */
        cover: { url: '', file_id: undefined as any, title: '' },
      },
      inscricao: '0,00',
      valor: '0,00',
      parcelas: '1',
      valor_parcela: '0,00',
      aeronaves: [],
      modulos: [],
    perguntas: [],
  },
  });

  /**
   * autoSlugFromName
   * pt-BR: Atualiza o campo slug quando o Nome interno é editado.
   * en-US: Updates slug when Internal name is edited.
   */
  const watchedNome = form.watch('nome');
  const watchedSlug = form.watch('slug');
  useEffect(() => {
    // Só gera slug automaticamente quando habilitado e há um nome válido.
    // Only auto-generate slug when enabled and there is a valid name.
    if (!autoSlugEnabled) return;
    if (watchedNome) {
      form.setValue('slug', toSlug(watchedNome));
    }
  }, [watchedNome, autoSlugEnabled]);

  /**
   * applyInitialData
   * pt-BR: Aplica dados iniciais no formulário quando em modo edição.
   * en-US: Applies initial form data when in edit mode.
   */
  useEffect(() => {
    if (!initialData) return;
    const c = initialData as CourseRecord;

    /**
     * normalizeUnit
     * pt-BR: Normaliza unidade de duração do backend para enum aceito.
     * en-US: Normalizes backend duration unit to accepted enum.
     */
    const normalizeUnit = (u?: string) => {
      const s = String(u || '').toLowerCase();
      if (s.startsWith('seg')) return 'seg';
      if (s.startsWith('min')) return 'min';
      if (s.startsWith('hr')) return 'hrs';
      return 'hrs';
    };

    /**
     * mapBackendActivityToUi
     * pt-BR: Converte a atividade do backend (type_activities, type_duration, content)
     *        para o shape interno usado pela UI do curso (titulo, tipo, unidade_duracao,
     *        video_url/arquivo_url/descricao).
     * en-US: Converts backend activity (type_activities, type_duration, content)
     *        into the internal shape used by the course UI (titulo, tipo,
     *        unidade_duracao, video_url/arquivo_url/descricao).
     */
    const mapBackendActivityToUi = (a: any) => {
      const tipo = String(a?.type_activities ?? '').toLowerCase();
      const rawContent = String(a?.content ?? '');
      const content = rawContent.replace(/`/g, '').trim();
      const isVideo = tipo === 'video';
      const isArquivo = tipo === 'arquivo';
      const video_source = isVideo
        ? (content.toLowerCase().includes('vimeo') ? 'vimeo' : 'youtube')
        : undefined;
      return {
        titulo: a?.title ?? a?.name ?? '',
        tipo: (tipo || 'video') as any,
        descricao: isVideo || isArquivo ? (a?.description ?? '') : ((a?.description ?? '') || content),
        duracao: String(a?.duration ?? ''),
        unidade_duracao: normalizeUnit(a?.type_duration),
        requisito: '',
        active: (a?.active as any) ?? 's',
        activity_id: a?.id ? String(a.id) : undefined,
        video_source,
        video_url: isVideo ? content : undefined,
        arquivo_url: isArquivo ? content : undefined,
      };
    };

    /**
     * clampParcelas
     * pt-BR: Garante parcelas entre 1 e 12 e como string.
     * en-US: Ensures parcels between 1 and 12 and as string.
     */
    const clampParcelas = (p?: any) => {
      const n = parseInt(String(p ?? '1'), 10);
      if (!isFinite(n) || n < 1) return '1';
      if (n > 12) return '12';
      return String(n);
    };

    const maskCurrencyIfNumeric = (v: any) => {
      if (v === null || v === undefined) return '';
      return typeof v === 'number' ? currencyApplyMask(String(v), 'pt-BR', 'BRL') : String(v);
    };

    const normalized = {
      ...c,
      duracao: String((c as any).duracao ?? ''),
      unidade_duracao: normalizeUnit((c as any).unidade_duracao),
      parcelas: clampParcelas((c as any).parcelas),
      inscricao: maskCurrencyIfNumeric((c as any).inscricao),
      valor: maskCurrencyIfNumeric((c as any).valor),
      valor_parcela: maskCurrencyIfNumeric((c as any).valor_parcela),
      // Prefere `descricao` se existir; fallback para `descricao_curso`.
      descricao: (c as any).descricao ?? (c as any).descricao_curso ?? '',
      descricao_curso: (c as any).descricao_curso ?? (c as any).descricao ?? '',
      observacoes: (c as any).observacoes ?? '',
      instrutor: (c as any).instrutor ?? '',
      config: {
        proximo_curso: c.config?.proximo_curso ?? '',
        gratis: c.config?.gratis ?? 'n',
        comissao: c.config?.comissao ?? '',
        tx2: c.config?.tx2?.length ? c.config.tx2 : [{ name_label: '', name_valor: '' }],
        tipo_desconto_taxa: c.config?.tipo_desconto_taxa ?? 'v',
        desconto_taxa: c.config?.desconto_taxa ?? '',
        pagina_divulgacao: c.config?.pagina_divulgacao ?? '',
        video: c.config?.video ?? '',
        pagina_venda: c.config?.pagina_venda ?? { link: '', label: '' },
        adc: c.config?.adc ?? { recheck: 'n', recorrente: 'n', cor: 'FFFFFF' },
        ead: c.config?.ead ?? { id_eadcontrol: '' },
        cover: {
          url: String(c.config?.cover?.url || '').trim(),
          file_id: c.config?.cover?.file_id,
          title: c.config?.cover?.title || (c as any).titulo || (c as any).nome || '',
        },
      },
      aeronaves: c.aeronaves ?? [],
      modulos: (c.modulos ?? []).map((m: any) => ({
        // Mantém campos base do módulo no padrão já aceito pelo schema
        title: m?.title ?? m?.name ?? '',
        name: m?.name ?? m?.title ?? '',
        tipo_duracao: normalizeUnit(m?.tipo_duracao),
        duration: String(m?.duration ?? ''),
        content: m?.content ?? '',
        description: m?.description ?? '',
        active: (m?.active as any) ?? 's',
        module_id: m?.module_id ? String(m.module_id) : undefined,
        valor: maskCurrencyIfNumeric(m?.valor),
        // Converte atividades vindas do backend para o shape da UI
        atividades: Array.isArray(m?.atividades) ? m.atividades.map(mapBackendActivityToUi) : [],
      })),
      perguntas: (c as any).perguntas ?? [],
    } as any;

    form.reset(normalized);
    // Define se o slug deve continuar sendo gerado automaticamente.
    // Enable auto slug only if it's empty or already derived from the name.
    const initialAuto = !normalized.slug || normalized.slug === toSlug(normalized.nome || '');
    setAutoSlugEnabled(!!initialAuto);
    // Recalcula valor da parcela quando editando
    recalcInstallment(normalized.valor, normalized.parcelas);
  }, [initialData]);

  // Removido: sincronização de título da imagem de capa. Campo oculto.

  // Aeronaves para seleção
  const aircraftsQuery = useQuery({
    queryKey: ['aeronaves', 'list', 200],
    queryFn: async () => aircraftSettingsService.list({ page: 1, per_page: 200 }),
  });
  const aircraftOptions = useMemo(
    () => (aircraftsQuery.data?.data ?? []).map((a: any) => ({ id: String(a.id), nome: a.nome ?? a.codigo ?? String(a.id) })),
    [aircraftsQuery.data]
  );

  // --- Usuários (Instrutores) ---
  const usersQuery = useQuery({
    queryKey: ['users','list',200],
    /**
     * queryFn — usersQuery
     * pt-BR: Busca lista de usuários para seleção como instrutores.
     * en-US: Fetches users list for instructor selection.
     */
    queryFn: async () => usersService.listUsers({ page: 1, per_page: 200, sort: 'name' }),
  });

  // --- Módulos existentes ---
  const modulesQuery = useQuery({
    queryKey: ['modules','list',200],
    /**
     * queryFn — modulesQuery
     * pt-BR: Busca lista de módulos existentes para reaproveitamento.
     * en-US: Fetches existing modules list for reuse.
     */
    queryFn: async () => modulesService.list({ page: 1, per_page: 200 }),
  });
  const moduleOptions = useMemo(() => (
    (modulesQuery.data?.data ?? []).map((m: any) => ({ id: String(m.id), title: m.title ?? String(m.name ?? m.id) }))
  ), [modulesQuery.data]);
  const moduleComboboxOptions = useMemo(() => (
    moduleOptions.map((m: any) => ({ value: m.id, label: m.title }))
  ), [moduleOptions]);

  // --- Atividades existentes ---
  const activitiesQuery = useQuery({
    queryKey: ['activities','list',200],
    /**
     * queryFn — activitiesQuery
     * pt-BR: Busca lista de atividades existentes para reaproveitamento.
     * en-US: Fetches existing activities list for reuse.
     */
    queryFn: async () => activitiesService.list({ page: 1, per_page: 200 }),
  });
  const activityOptions = useMemo(() => (
    (activitiesQuery.data?.data ?? []).map((a: any) => ({ id: String(a.id), title: a.title ?? String(a.name ?? a.id), type: a.type_activities, duration: a.duration, unit: a.type_duration, description: a.description, content: a.content }))
  ), [activitiesQuery.data]);
  const activityComboboxOptions = useMemo(() => (
    activityOptions.map((a: any) => ({ value: a.id, label: a.title, description: a.type }))
  ), [activityOptions]);

  /**
   * Combobox local values
   * pt-BR: Estados locais para limpar a seleção após adicionar itens dos bancos.
   * en-US: Local states to clear selection after adding items from banks.
   */
  const [moduleBankValue, setModuleBankValue] = useState<string>('');
  const [activityBankValue, setActivityBankValue] = useState<Record<number, string>>({});

  /**
   * addModule
   * pt-BR: Adiciona um módulo ao curso.
   * en-US: Adds a module to the course.
   */
  const addModule = () => {
    const current = form.getValues('modulos') ?? [];
    const next: CourseModule = {
      title: '',
      name: '',
      tipo_duracao: 'seg',
      duration: '1',
      content: '',
      description: '',
      active: 's',
      valor: '',
      aviao: [],
      atividades: [],
    } as any;
    form.setValue('modulos', [...current, next]);
  };

  /**
   * addModuleFromBank
   * pt-BR: Adiciona um módulo existente (lista/banco) ao currículo.
   * en-US: Adds an existing module (list/bank) to the curriculum.
   */
  const addModuleFromBank = (moduleId: string) => {
    const selected = (modulesQuery.data?.data ?? []).find((m: any) => String(m.id) === String(moduleId));
    const current = form.getValues('modulos') ?? [];
    const next: CourseModule = {
      title: selected?.title || '',
      name: selected?.name || selected?.title || '',
      tipo_duracao: selected?.tipo_duracao || 'seg',
      duration: String(selected?.duration ?? ''),
      content: selected?.content || '',
      description: selected?.description || '',
      active: (typeof selected?.active === 'boolean') ? (selected.active ? 's' : 'n') : ((selected?.active || 's') as any),
      valor: '',
      aviao: [],
      atividades: [],
      module_id: String(selected?.id || moduleId),
    } as any;
    form.setValue('modulos', [...current, next]);
  };

  /**
   * generateDefaultCurriculum
   * pt-BR: Gera uma estrutura padrão de currículo para o curso no campo `modulos`,
   *        incluindo módulos de Introdução, Conteúdo, Avaliação e Materiais.
   *        Usa `config.video` como fonte do vídeo de boas-vindas quando disponível.
   * en-US: Generates a default curriculum structure for the course in `modulos`,
   *        including Introduction, Content, Assessment and Materials modules.
   *        Uses `config.video` as the welcome video source when available.
   */
  const generateDefaultCurriculum = () => {
    const current = form.getValues('modulos') ?? [];
    const courseData: any = form.getValues();
    const welcomeVideoUrl = courseData?.config?.video || '';

    const defaultModules: CourseModule[] = [
      {
        etapa: 'etapa1' as any,
        title: 'Introdução',
        name: 'Introdução',
        tipo_duracao: 'min' as any,
        duration: '10',
        description: 'Apresentação do curso, objetivos e cronograma.',
        active: 's' as any,
        valor: '',
        aviao: [],
        atividades: [
          {
            titulo: 'Boas-vindas',
            tipo: 'video' as any,
            descricao: 'Mensagem inicial e overview do curso.',
            unidade_duracao: 'min' as any,
            duracao: '5',
            video_source: 'url',
            video_url: String(welcomeVideoUrl || ''),
          } as any,
          {
            titulo: 'Objetivos do Curso',
            tipo: 'leitura' as any,
            descricao: 'Lista de objetivos e competências esperadas.',
            unidade_duracao: 'min' as any,
            duracao: '5',
            content: 'Ao final, você será capaz de...'
          } as any,
        ],
      } as any,
      {
        etapa: 'etapa1' as any,
        title: 'Conteúdo Principal',
        name: 'Conteúdo Principal',
        tipo_duracao: 'min' as any,
        duration: '60',
        description: 'Aulas centrais do curso organizadas em atividades.',
        active: 's' as any,
        valor: '',
        aviao: [],
        atividades: [
          {
            titulo: 'Aula 1 — Introdução ao Tema',
            tipo: 'video' as any,
            descricao: 'Conceitos iniciais e contextualização.',
            unidade_duracao: 'min' as any,
            duracao: '20',
            video_source: 'url',
            video_url: '',
          } as any,
          {
            titulo: 'Leitura — Guia Rápido',
            tipo: 'leitura' as any,
            descricao: 'Resumo dos pontos-chaves apresentados na aula.',
            unidade_duracao: 'min' as any,
            duracao: '10',
            content: 'Resumo e referências complementares.'
          } as any,
          {
            titulo: 'Exercício Prático',
            tipo: 'tarefa' as any,
            descricao: 'Aplicação dos conceitos em um pequeno exercício.',
            unidade_duracao: 'min' as any,
            duracao: '30',
            content: 'Descreva sua solução e anexos, se houver.'
          } as any,
        ],
      } as any,
      {
        etapa: 'etapa2' as any,
        title: 'Avaliação',
        name: 'Avaliação',
        tipo_duracao: 'min' as any,
        duration: '20',
        description: 'Avaliação para mensurar aprendizado e retenção.',
        active: 's' as any,
        valor: '',
        aviao: [],
        atividades: [
          {
            titulo: 'Quiz de Verificação',
            tipo: 'quiz' as any,
            descricao: 'Perguntas objetivas sobre os conteúdos estudados.',
            unidade_duracao: 'min' as any,
            duracao: '20',
          } as any,
        ],
      } as any,
      {
        etapa: 'etapa2' as any,
        title: 'Materiais Complementares',
        name: 'Materiais Complementares',
        tipo_duracao: 'min' as any,
        duration: '15',
        description: 'Leituras adicionais, links e arquivos para aprofundamento.',
        active: 's' as any,
        valor: '',
        aviao: [],
        atividades: [
          {
            titulo: 'Artigo recomendado',
            tipo: 'link' as any,
            descricao: 'Leitura complementar externa.',
            unidade_duracao: 'min' as any,
            duracao: '15',
            url: '',
          } as any,
        ],
      } as any,
    ];

    const next = current.length > 0 ? [...current, ...defaultModules] : defaultModules;
    form.setValue('modulos', next, { shouldValidate: true });
  };

  /**
   * removeModule
   * pt-BR: Remove um módulo pelo índice.
   * en-US: Removes a module by index.
   */
  const removeModule = (index: number) => {
    const current = [...(form.getValues('modulos') ?? [])];
    current.splice(index, 1);
    form.setValue('modulos', current);
    recalcCourseDuration();
  };

  /**
   * addActivity
   * pt-BR: Adiciona uma atividade ao módulo informado.
   * en-US: Adds an activity to the given module.
   */
  const addActivity = (moduleIndex: number) => {
    const modules = [...(form.getValues('modulos') ?? [])];
    const activities = [...(modules[moduleIndex]?.atividades ?? [])];
    activities.push({ titulo: '', tipo: 'video', descricao: '', duracao: '', unidade_duracao: 'seg', video_source: 'youtube', video_url: '' });
    modules[moduleIndex] = { ...modules[moduleIndex], atividades: activities } as any;
    form.setValue('modulos', modules);
    recalcCourseDuration();
  };

  /**
   * removeActivity
   * pt-BR: Remove uma atividade do módulo pelo índice.
   * en-US: Removes an activity from module by index.
   */
  const removeActivity = (moduleIndex: number, activityIndex: number) => {
    const modules = [...(form.getValues('modulos') ?? [])];
    const activities = [...(modules[moduleIndex]?.atividades ?? [])];
    activities.splice(activityIndex, 1);
    modules[moduleIndex] = { ...modules[moduleIndex], atividades: activities } as any;
    form.setValue('modulos', modules);
    recalcCourseDuration();
  };

  /**
   * quickAddActivity
   * pt-BR: Atalho para adicionar atividade com tipo pré-definido (Lição/Leitura ou Teste/Quiz).
   * en-US: Shortcut to add an activity with a predefined type (Lesson/Read or Test/Quiz).
   */
  const quickAddActivity = (moduleIndex: number, preset: 'leitura' | 'quiz') => {
    const modules = [...(form.getValues('modulos') ?? [])];
    const activities = [...(modules[moduleIndex]?.atividades ?? [])];
    activities.push({ titulo: '', tipo: preset, descricao: '', duracao: '', unidade_duracao: 'seg', active: 's' });
    modules[moduleIndex] = { ...modules[moduleIndex], atividades: activities } as any;
    form.setValue('modulos', modules);
    recalcCourseDuration();
  };

  /**
   * Drag & Drop state
   * pt-BR: Estados e utilitários para arrastar e soltar (reordenar) módulos e atividades.
   * en-US: State and helpers for drag-and-drop reordering of modules and activities.
   */
  const [dragModuleIdx, setDragModuleIdx] = useState<number | null>(null);
  const [dragActivity, setDragActivity] = useState<{ moduleIdx: number; activityIdx: number } | null>(null);

  /**
   * collapsedModules
   * pt-BR: Controla quais módulos estão colapsados, usando um Set de índices.
   * en-US: Controls which modules are collapsed, using a Set of indices.
   */
  const [collapsedModules, setCollapsedModules] = useState<Set<number>>(new Set());

  /**
   * toggleModuleCollapse
   * pt-BR: Alterna o estado de colapso de um módulo específico.
   * en-US: Toggles collapse state for a specific module.
   */
  const toggleModuleCollapse = (index: number) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  /**
   * collapseAllModules
   * pt-BR: Colapsa todos os módulos visíveis.
   * en-US: Collapses all visible modules.
   */
  const collapseAllModules = () => {
    const count = (form.getValues('modulos') ?? []).length;
    const all = new Set<number>();
    for (let i = 0; i < count; i++) all.add(i);
    setCollapsedModules(all);
  };

  /**
   * expandAllModules
   * pt-BR: Expande todos os módulos (remove colapso).
   * en-US: Expands all modules (removes collapse).
   */
  const expandAllModules = () => setCollapsedModules(new Set());

  /**
   * collapsedActivities
   * pt-BR: Controla o colapso de cada atividade por módulo.
   * en-US: Controls collapse state for each activity per module.
   */
  const [collapsedActivities, setCollapsedActivities] = useState<Record<string, boolean>>({});

  /**
   * activityKey
   * pt-BR: Gera uma chave única para a atividade.
   * en-US: Generates a unique key for the activity.
   */
  const activityKey = (moduleIdx: number, activityIdx: number) => `${moduleIdx}:${activityIdx}`;

  /**
   * toggleActivityCollapse
   * pt-BR: Alterna o colapso da atividade alvo.
   * en-US: Toggles collapse for target activity.
   */
  const toggleActivityCollapse = (moduleIdx: number, activityIdx: number) => {
    const key = activityKey(moduleIdx, activityIdx);
    setCollapsedActivities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /**
   * collapseAllActivitiesInModule
   * pt-BR: Colapsa todas as atividades do módulo indicado.
   * en-US: Collapses all activities of the given module.
   */
  const collapseAllActivitiesInModule = (moduleIdx: number) => {
    const mods = form.getValues('modulos') ?? [];
    const acts = (mods[moduleIdx]?.atividades ?? []) as any[];
    setCollapsedActivities((prev) => {
      const next = { ...prev };
      acts.forEach((_, aIdx) => {
        next[activityKey(moduleIdx, aIdx)] = true;
      });
      return next;
    });
  };

  /**
   * expandAllActivitiesInModule
   * pt-BR: Expande todas as atividades do módulo indicado.
   * en-US: Expands all activities of the given module.
   */
  const expandAllActivitiesInModule = (moduleIdx: number) => {
    const mods = form.getValues('modulos') ?? [];
    const acts = (mods[moduleIdx]?.atividades ?? []) as any[];
    setCollapsedActivities((prev) => {
      const next = { ...prev };
      acts.forEach((_, aIdx) => {
        next[activityKey(moduleIdx, aIdx)] = false;
      });
      return next;
    });
  };

  /**
   * reorderModules
   * pt-BR: Reordena a lista de módulos movendo do índice `from` para `to`.
   * en-US: Reorders modules list by moving index `from` to `to`.
   */
  const reorderModules = (from: number, to: number) => {
    if (from === to || from == null || to == null) return;
    const mods = [...(form.getValues('modulos') ?? [])];
    const [m] = mods.splice(from, 1);
    mods.splice(to, 0, m);
    form.setValue('modulos', mods);
    recalcCourseDuration();
  };

  /**
   * reorderActivities
   * pt-BR: Reordena atividades dentro de um módulo.
   * en-US: Reorders activities within a module.
   */
  const reorderActivities = (moduleIndex: number, from: number, to: number) => {
    if (from === to || from == null || to == null) return;
    const mods = [...(form.getValues('modulos') ?? [])];
    const acts = [...(mods[moduleIndex]?.atividades ?? [])];
    const [a] = acts.splice(from, 1);
    acts.splice(to, 0, a);
    mods[moduleIndex] = { ...mods[moduleIndex], atividades: acts } as any;
    form.setValue('modulos', mods);
    recalcCourseDuration();
  };

  /**
   * addActivityFromBank
   * pt-BR: Adiciona uma atividade escolhida do "Content Bank" (lista de atividades existentes).
   * en-US: Adds an activity selected from the "Content Bank" (existing activities list).
   */
  const addActivityFromBank = (moduleIndex: number, activityId: string) => {
    const selected = activityOptions.find((opt) => opt.id === activityId);
    const typeMap: Record<string,string> = { video: 'video', apostila: 'arquivo', avaliacao: 'quiz' };
    const presetType = typeMap[String(selected?.type || '').toLowerCase()] || 'video';
    const modules = [...(form.getValues('modulos') ?? [])];
    const activities = [...(modules[moduleIndex]?.atividades ?? [])];
    activities.push({
      activity_id: activityId,
      titulo: selected?.title || '',
      tipo: presetType,
      duracao: selected?.duration || '',
      unidade_duracao: selected?.unit || 'seg',
      descricao: selected?.description || '',
      active: 's',
      ...(presetType === 'video' ? {
        video_source: ((selected?.content || '') as string).toLowerCase().includes('vimeo') ? 'vimeo' : 'youtube',
        video_url: String(selected?.content || ''),
      } : presetType === 'arquivo' ? {
        arquivo_url: String(selected?.content || ''),
      } : {}),
    } as any);
    modules[moduleIndex] = { ...modules[moduleIndex], atividades: activities } as any;
    form.setValue('modulos', modules);
    recalcCourseDuration();
  };

  /**
   * parseYouTubeVideoId
   * pt-BR: Extrai o ID do vídeo do YouTube a partir de várias formas de URL.
   * en-US: Extracts YouTube video ID from multiple URL formats.
   */
  function parseYouTubeVideoId(url: string): string | null {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.replace('/', '').trim();
        return id || null;
      }
      if (u.hostname.includes('youtube.com')) {
        const v = u.searchParams.get('v');
        if (v) return v;
        // Handle embed/shorts
        const parts = u.pathname.split('/').filter(Boolean);
        const idx = parts.findIndex((p) => p === 'embed' || p === 'shorts');
        if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * ensureYouTubeApi
   * pt-BR: Carrega a API IFrame do YouTube se ainda não estiver disponível.
   * en-US: Loads YouTube IFrame API if not already available.
   */
  async function ensureYouTubeApi(): Promise<void> {
    const w = window as any;
    if (w.YT && w.YT.Player) return;
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existing) {
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        s.async = true;
        s.onerror = () => reject(new Error('Falha ao carregar YouTube API'));
        document.head.appendChild(s);
      }
      const checkInterval = setInterval(() => {
        if (w.YT && w.YT.Player) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 200);
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Timeout ao carregar YouTube API'));
      }, 8000);
    });
  }

  /**
   * fetchYouTubeDuration
   * pt-BR: Obtém a duração do vídeo (em segundos) usando a API IFrame do YouTube.
   * en-US: Gets video duration (in seconds) using YouTube IFrame API.
   */
  async function fetchYouTubeDuration(videoId: string): Promise<number> {
    await ensureYouTubeApi();
    const w = window as any;
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);
    return new Promise<number>((resolve, reject) => {
      try {
        const player = new w.YT.Player(container, {
          videoId,
          events: {
            onReady: () => {
              try {
                // Poll até obter duração > 0, pois em alguns casos
                // getDuration retorna 0 imediatamente após onReady.
                const start = Date.now();
                const poll = () => {
                  const seconds = Number(player.getDuration() || 0);
                  if (seconds > 0) {
                    try { player.destroy(); } catch {}
                    container.remove();
                    resolve(seconds);
                  } else if (Date.now() - start < 4000) {
                    setTimeout(poll, 200);
                  } else {
                    try { player.destroy(); } catch {}
                    container.remove();
                    resolve(0);
                  }
                };
                poll();
              } catch (e) {
                player.destroy();
                container.remove();
                reject(e);
              }
            },
            onError: (e: any) => {
              try { player.destroy(); } catch {}
              container.remove();
              reject(new Error(`Erro YouTube (${String(e)})`));
            },
          },
        });
      } catch (e) {
        container.remove();
        reject(e);
      }
    });
  }

  /**
   * fetchVimeoDuration
   * pt-BR: Obtém a duração via oEmbed do Vimeo (segundos) com URL normalizada.
   * en-US: Gets duration via Vimeo oEmbed (seconds) using normalized URL.
   */
  async function fetchVimeoDuration(videoUrl: string): Promise<number> {
    /**
     * parseVimeoVideoParts
     * pt-BR: Extrai ID e hash de privacidade das URLs do Vimeo (vimeo.com e player.vimeo.com).
     * en-US: Extracts ID and privacy hash from Vimeo URLs (vimeo.com and player.vimeo.com).
     */
    const parseVimeoVideoParts = (url: string): { id: string; hash?: string } | null => {
      try {
        const u = new URL(url);
        const clean = (s: string) => s.split('?')[0].split('#')[0];
        if (u.hostname.includes('vimeo.com')) {
          const parts = clean(u.pathname).split('/').filter(Boolean);
          if (parts.length >= 1 && /^\d+$/.test(parts[0])) {
            const id = parts[0];
            const hash = parts[1] && /^[a-zA-Z0-9]+$/.test(parts[1]) ? parts[1] : (u.searchParams.get('h') || undefined);
            return { id, hash };
          }
        }
        if (u.hostname.includes('player.vimeo.com')) {
          const parts = clean(u.pathname).split('/').filter(Boolean); // e.g., video/{id}
          const idx = parts.findIndex((p) => p === 'video');
          const id = idx >= 0 && parts[idx + 1] ? parts[idx + 1] : '';
          const hash = u.searchParams.get('h') || undefined;
          if (id && /^\d+$/.test(id)) return { id, hash };
        }
        return null;
      } catch {
        return null;
      }
    };

    const parts = parseVimeoVideoParts(videoUrl);
    const id = parts?.id;
    const hash = parts?.hash;

    // 1) oEmbed com URL do vídeo (sem/with hash)
    const primary = parts ? `https://vimeo.com/${id}` : videoUrl;
    const oembedPrimary = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(primary)}`;
    const resPrimary = await fetch(oembedPrimary);
    if (resPrimary.ok) {
      const data: any = await resPrimary.json();
      // Detecta restrição de domínio (403) reportada no oEmbed
      const domainRestricted = Number(data?.domain_status_code || 0) === 403;
      const d = Number(data?.duration || 0);
      if (d > 0) return d;
      // Se veio sem duração (p.ex. domain_status_code 403), tentar player config
      if (id) {
        const cfgUrl = `https://player.vimeo.com/video/${id}/config${hash ? `?h=${hash}` : ''}`;
        try {
          const cfgRes = await fetch(cfgUrl);
          if (cfgRes.ok) {
            const cfg: any = await cfgRes.json();
            const cd = Number((cfg?.video?.duration ?? cfg?.duration) || 0);
            if (cd > 0) return cd;
          }
        } catch {}
      }
    }

    // 2) oEmbed com URL contendo hash (vídeo privado)
    if (id && hash) {
      const fallbackUrl = `https://vimeo.com/${id}/${hash}`;
      const oembedFallback = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(fallbackUrl)}`;
      const resFallback = await fetch(oembedFallback);
      if (resFallback.ok) {
        const data2: any = await resFallback.json();
        const d2 = Number(data2?.duration || 0);
        if (d2 > 0) return d2;
      }
      // 3) player config com hash
      const cfgUrl2 = `https://player.vimeo.com/video/${id}/config${hash ? `?h=${hash}` : ''}`;
      try {
        const cfgRes2 = await fetch(cfgUrl2);
        if (cfgRes2.ok) {
          const cfg2: any = await cfgRes2.json();
          const cd2 = Number((cfg2?.video?.duration ?? cfg2?.duration) || 0);
          if (cd2 > 0) return cd2;
        }
      } catch {}
    }
    /**
     * Player SDK fallback
     * pt-BR: Como último recurso, tenta instanciar o Vimeo Player SDK em um iframe
     *        fora da tela e ler a duração via `getDuration()`.
     * en-US: As a final fallback, instantiate Vimeo Player SDK in an offscreen iframe
     *        and read duration via `getDuration()`.
     */
    if (id) {
      try {
        const PlayerMod = await import('@vimeo/player');
        const Player = PlayerMod.default as any;
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
        iframe.src = `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ''}`;
        document.body.appendChild(iframe);
        const player = new Player(iframe);
        const duration = await new Promise<number>((resolve, reject) => {
          player.on('loaded', async () => {
            try {
              const d = await player.getDuration();
              resolve(Number(d || 0));
            } catch (e) {
              reject(e);
            }
          });
          player.on('error', (e: any) => reject(new Error(`Vimeo Player error: ${String(e)}`)));
        });
        try { player.destroy(); } catch {}
        iframe.remove();
        if (duration > 0) return duration;
      } catch {}
    }

    // Mensagem mais clara quando há restrição de domínio
    throw new Error('Falha ao obter duração do Vimeo (oEmbed/config/Player SDK). O vídeo pode estar bloqueado para incorporação no seu domínio. No Vimeo: Settings → Privacy → Where can this video be embedded? Adicione seu domínio (produção/dev via túnel).');
  }

  /**
   * importVideoDuration
   * pt-BR: Importa a duração automaticamente com base em video_source e video_url.
   * en-US: Automatically imports duration based on video_source and video_url.
   */
  async function importVideoDuration(moduleIdx: number, activityIdx: number) {
    const modules = form.getValues('modulos') ?? [];
    const a = modules[moduleIdx]?.atividades?.[activityIdx] ?? {};
    if (!a || a.tipo !== 'video') return;
    // Default: assume YouTube when source is undefined to avoid requiring select change
    const source = ((a as any).video_source as string | undefined) || 'youtube';
    const url = String((a as any).video_url || '').trim();
    if (!url) return;
    try {
      let seconds = 0;
      if (source === 'youtube') {
        const id = parseYouTubeVideoId(url);
        if (!id) throw new Error('Não foi possível extrair o ID do YouTube');
        seconds = await fetchYouTubeDuration(id);
      } else if (source === 'vimeo') {
        seconds = await fetchVimeoDuration(url);
      }
      if (seconds > 0) {
        setActivityField(moduleIdx, activityIdx, 'duracao', String(Math.round(seconds)));
        setActivityField(moduleIdx, activityIdx, 'unidade_duracao', 'seg');
        toast({ title: 'Duração importada', description: `Vídeo com ${Math.round(seconds)} segundos.` });
      }
    } catch (e: any) {
      toast({ title: 'Falha ao importar duração', description: String(e?.message || e), variant: 'destructive' });
    }
  }

  /**
   * handleActivityFileUpload
   * pt-BR: Faz upload de arquivo para atividade do tipo "arquivo" e salva a URL em arquivo_url.
   * en-US: Uploads a file for "arquivo" activity type and saves the URL in arquivo_url.
   */
  async function handleActivityFileUpload(moduleIdx: number, activityIdx: number, file?: File | null) {
    if (!file) return;
    try {
      const res: any = await fileStorageService.upload(file, { scope: 'activity' });
      const url = res?.url || res?.data?.url || res?.path || res?.data?.path || '';
      if (!url) throw new Error('Upload sem URL retornada');
      setActivityField(moduleIdx, activityIdx, 'arquivo_url', String(url));
      toast({ title: 'Arquivo enviado', description: 'URL registrada na atividade.' });
    } catch (e: any) {
      toast({ title: 'Falha no upload', description: String(e?.message || e), variant: 'destructive' });
    }
  }

  /**
   * importVideoTitle
   * pt-BR: Importa título e descrição do vídeo a partir do link.
   *        YouTube: usa Data API (se VITE_YOUTUBE_API_KEY estiver definida),
   *        senão faz fallback para oEmbed apenas do título.
   *        Vimeo: usa oEmbed e tenta preencher também a descrição.
   * en-US: Imports video title and description from the URL.
   *        YouTube: uses Data API (if VITE_YOUTUBE_API_KEY is set),
   *        otherwise falls back to oEmbed for title only.
   *        Vimeo: uses oEmbed and attempts to fill description as well.
   */
  async function importVideoTitle(moduleIdx: number, activityIdx: number) {
    const modules = form.getValues('modulos') ?? [];
    const a = modules[moduleIdx]?.atividades?.[activityIdx] ?? {};
    if (!a || a.tipo !== 'video') return;
    // Default: assume YouTube when source is undefined to avoid requiring select change
    const source = ((a as any).video_source as string | undefined) || 'youtube';
    const url = String((a as any).video_url || '').trim();
    if (!url) return;
    try {
      let title = '';
      let description = '';
      if (source === 'youtube') {
        const apiKey = String((import.meta as any)?.env?.VITE_YOUTUBE_API_KEY || '').trim();
        const id = parseYouTubeVideoId(url);
        if (!id) throw new Error('Não foi possível extrair o ID do YouTube');
        if (apiKey) {
          const endpoint = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(id)}&key=${encodeURIComponent(apiKey)}`;
          const res = await fetch(endpoint);
          if (!res.ok) throw new Error('Falha ao consultar YouTube Data API');
          const data = await res.json();
          const item = Array.isArray((data as any)?.items) ? (data as any).items[0] : null;
          const snip = item?.snippet || {};
          title = String(snip?.title || '');
          description = String(snip?.description || '');
        } else {
          // Fallback: oEmbed para título
          const endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
          const res = await fetch(endpoint);
          if (!res.ok) throw new Error('Falha ao consultar oEmbed do YouTube');
          const data = await res.json();
          title = String((data as any)?.title || '');
          // YouTube oEmbed não fornece descrição; manter vazio
          description = '';
        }
      } else if (source === 'vimeo') {
        // Normaliza URL (id/hash) antes de consultar oEmbed para maior compatibilidade
        const parseVimeoVideoParts = (u: string): { id: string; hash?: string } | null => {
          try {
            const urlObj = new URL(u);
            const clean = (s: string) => s.split('?')[0].split('#')[0];
            if (urlObj.hostname.includes('vimeo.com')) {
              const parts = clean(urlObj.pathname).split('/').filter(Boolean);
              if (parts.length >= 1 && /^\d+$/.test(parts[0])) {
                const id = parts[0];
                const hash = parts[1] && /^[a-zA-Z0-9]+$/.test(parts[1]) ? parts[1] : (urlObj.searchParams.get('h') || undefined);
                return { id, hash };
              }
            }
            if (urlObj.hostname.includes('player.vimeo.com')) {
              const parts = clean(urlObj.pathname).split('/').filter(Boolean);
              const idx = parts.findIndex((p) => p === 'video');
              const id = idx >= 0 && parts[idx + 1] ? parts[idx + 1] : '';
              const hash = urlObj.searchParams.get('h') || undefined;
              if (id && /^\d+$/.test(id)) return { id, hash };
            }
            return null;
          } catch {
            return null;
          }
        };

        const parts = parseVimeoVideoParts(url);
        const primary = parts ? `https://vimeo.com/${parts.id}` : url;
        const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(primary)}`);
        let data: any = null;
        if (res.ok) {
          data = await res.json();
        } else if (parts?.hash) {
          const fallbackUrl = `https://vimeo.com/${parts.id}/${parts.hash}`;
          const res2 = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(fallbackUrl)}`);
          if (!res2.ok) throw new Error('Falha ao consultar oEmbed do Vimeo');
          data = await res2.json();
        } else {
          throw new Error('Falha ao consultar oEmbed do Vimeo');
        }
        title = String((data as any)?.title || '');
        description = String((data as any)?.description || '');

        // Fallback com player config quando o oEmbed não retorna metadados
        if ((!title || !title.trim()) || (!description || !description.trim())) {
          if (parts?.id) {
            const cfgUrl = `https://player.vimeo.com/video/${parts.id}/config${parts.hash ? `?h=${parts.hash}` : ''}`;
            try {
              const cfgRes = await fetch(cfgUrl);
              if (cfgRes.ok) {
                const cfg: any = await cfgRes.json();
                const cfgTitle = String(cfg?.video?.title || '');
                const cfgDesc = String(cfg?.video?.description || cfg?.video?.description_html || '');
                if (!title.trim() && cfgTitle) title = cfgTitle;
                if (!description.trim() && cfgDesc) description = cfgDesc;
              }
            } catch {}
          }
        }
      }
      if (title.trim()) {
        setActivityField(moduleIdx, activityIdx, 'titulo', title.trim());
        if (description.trim()) {
          setActivityField(moduleIdx, activityIdx, 'descricao', description.trim());
          toast({ title: 'Título e descrição importados', description: `"${title.trim()}"` });
        } else {
          toast({ title: 'Título importado', description: `"${title.trim()}"` });
        }
      }
    } catch (e: any) {
      toast({ title: 'Falha ao importar título', description: String(e?.message || e), variant: 'destructive' });
    }
  }

  /**
   * setActivityField
   * pt-BR: Atualiza um campo específico da atividade.
   * en-US: Updates a specific field of the activity.
   */
  const setActivityField = (
    moduleIndex: number,
    activityIndex: number,
    field: 'titulo' | 'tipo' | 'descricao' | 'duracao' | 'unidade_duracao' | 'requisito' | 'active' | 'video_source' | 'video_url' | 'arquivo_url',
    value: string
  ) => {
    const modules = [...(form.getValues('modulos') ?? [])];
    const activities = [...(modules[moduleIndex]?.atividades ?? [])];
    const target = { ...(activities[activityIndex] ?? {}) } as any;
    target[field] = value;
    activities[activityIndex] = target;
    modules[moduleIndex] = { ...modules[moduleIndex], atividades: activities } as any;
    form.setValue('modulos', modules);
    recalcCourseDuration();
  };

  /**
   * ModuleAircraftSelect
   * pt-BR: Seletor múltiplo de aeronaves por linha de módulo.
   * en-US: Per-row module aircraft multi-select component.
   */
  const ModuleAircraftSelect = ({
    value,
    onChange,
  }: {
    value: string[];
    onChange: (next: string[]) => void;
  }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return aircraftOptions;
      return aircraftOptions.filter((a) => a.nome.toLowerCase().includes(q));
    }, [query, aircraftOptions]);

    const label = value.length
      ? aircraftOptions
          .filter((a) => value.includes(a.id))
          .map((a) => a.nome)
          .join(', ')
      : 'Selecione uma aeronave';

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="justify-between w-full">
            <span className="truncate">{label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[420px] p-2">
          <div className="space-y-2">
            <Input placeholder="Buscar aeronave..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <ScrollArea className="h-52">
              <div className="space-y-1">
                {filtered.map((a) => {
                  const checked = value.includes(a.id);
                  return (
                    <label key={a.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => {
                          const next = new Set(value);
                          if (c) next.add(a.id); else next.delete(a.id);
                          onChange(Array.from(next));
                        }}
                      />
                      <span className="text-sm">{a.nome}</span>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="flex items-center justify-between pt-1">
              <Button type="button" variant="ghost" onClick={() => onChange([])}>Limpar</Button>
              <Button type="button" onClick={() => setOpen(false)}>Concluir</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  /**
   * handleSubmit
   * pt-BR: Encaminha valores do formulário para o callback externo.
   * en-US: Forwards form values to external submit callback.
   */
  /**
   * normalizePayload
   * pt-BR: Normaliza campos monetários e numéricos do payload antes do envio.
   * en-US: Normalizes monetary and numeric fields in payload before submission.
   */
  const normalizePayload = (raw: CoursePayload): CoursePayload => {
    /**
     * toMoney
     * pt-BR: Remove máscara monetária preservando duas casas decimais.
     * en-US: Strips currency mask keeping two decimal places.
     */
    const toMoney = (s?: string) => (s ? currencyRemoveMaskToString(String(s)) : '0.00');

    /**
     * normalizeDurationByUnit
     * pt-BR: Garante duração inteira conforme unidade selecionada.
     * en-US: Ensures integer duration according to selected unit.
     */
    const normalizeDurationByUnit = (duracao?: any, unidade?: string) => {
      const num = Number(String(duracao ?? '0').replace(',', '.'));
      if (!isFinite(num)) return '0';
      // Integers are required by backend regardless of unit; round sensibly
      const rounded = Math.round(num);
      return String(rounded);
    };

    /**
     * mapActivityToRequestedPayload
     * pt-BR: Mapeia atividade interna para o payload solicitado pelo backend.
     * en-US: Maps internal activity to the requested backend payload.
     */
  const mapActivityToRequestedPayload = (a: any) => ({
      /**
       * pt-BR: Inclui activity_id quando houver reaproveitamento.
       * en-US: Includes activity_id when reusing existing activity.
       */
      activity_id: a?.activity_id,
      title: a?.titulo ?? '',
      name: a?.titulo ?? '',
      type_duration: a?.unidade_duracao ?? '',
      type_activities: a?.tipo ?? '',
      duration: a?.duracao ?? '',
      /**
       * pt-BR: Para vídeo, envia a URL em content; caso contrário, usa descricao.
       * en-US: For video, send URL in content; otherwise, use description.
       */
      content: (a?.tipo === 'video') ? (a?.video_url ?? '') : (a?.tipo === 'arquivo') ? (a?.arquivo_url ?? '') : (a?.descricao ?? ''),
      description: a?.descricao ?? '',
      active: a?.active ?? 's',
    });

    /**
     * mapModuleToRequestedPayload
     * pt-BR: Mapeia módulo interno para o payload solicitado com campos exigidos.
     * en-US: Maps internal module to requested payload with required fields.
     */
    const normalizedModules = (raw.modulos || []).map((m: any) => {
      const activities = (m?.atividades || []).map(mapActivityToRequestedPayload);
      return {
        /**
         * pt-BR: Inclui module_id quando houver reaproveitamento.
         * en-US: Includes module_id when reusing existing module.
         */
        module_id: m?.module_id,
        title: m?.title ?? '',
        name: m?.name ?? m?.title ?? '',
        tipo_duracao: m?.tipo_duracao ?? 'seg',
        duration: m?.duration ?? '',
        description: m?.description ?? '',
        active: m?.active ?? 's',
        /**
         * Mantém array de atividades usando o novo shape por item.
         * Keeps activities array using the new item shape.
         */
        atividades: activities,
      };
    });

    return {
      ...raw,
      // pt-BR: Envia duração inteira conforme unidade; antes aceitava decimais.
      // en-US: Send integer duration per unit; previously accepted decimals.
      duracao: normalizeDurationByUnit(raw?.duracao, raw?.unidade_duracao),
      inscricao: toMoney(raw.inscricao),
      valor: toMoney(raw.valor),
      valor_parcela: toMoney(raw.valor_parcela),
      config: {
        ...raw.config,
        comissao: toMoney(raw.config?.comissao || ''),
        desconto_taxa: raw.config?.desconto_taxa ? toMoney(raw.config.desconto_taxa) : '',
        /**
         * cover
         * pt-BR: Persiste imagem de capa sob `config.cover` com url, file_id e title.
         * en-US: Persist cover image under `config.cover` with url, file_id and title.
         */
        cover: (() => {
          const url = String(raw?.config?.cover?.url || '').trim();
          const fileId = raw?.config?.cover?.file_id ?? undefined;
          const title = raw?.config?.cover?.title || raw?.titulo || raw?.nome || '';
          if (!url && !fileId && !title) return raw?.config?.cover;
          return { url, file_id: fileId, title } as any;
        })(),
      },
      /**
       * modulos
       * pt-BR: Substitui lista de módulos pelo formato exigido (title, name, tipo_duracao, duration, description, active).
       *        Removemos `content` em módulo para evitar duplicação com `description`.
       * en-US: Replaces modules list with required format (title, name, tipo_duracao, duration, description, active).
       *        Removed module `content` to avoid duplication with `description`.
       */
      modulos: normalizedModules as any,
    } as any;
  };

  /**
   * handleSubmit
   * pt-BR: Aplica normalização e encaminha valores do formulário.
   * en-US: Applies normalization and forwards form values to callback.
   */
  const handleSubmit = (data: CoursePayload) => {
    const normalized = normalizePayload(data);
    return onSubmit(normalized);
  };

  /**
   * normalizeDecimalString
   * pt-BR: Normaliza números decimais no formato string, trocando vírgula por ponto.
   * en-US: Normalizes decimal numbers in string form, replacing comma with dot.
   */
  const normalizeDecimalString = (v?: string) => {
    try {
      const s = String(v ?? '').trim().replace(',', '.');
      if (!s) return '';
      const n = Number(s);
      if (!isFinite(n)) return s;
      return /\./.test(s) ? String(Number(n.toFixed(2))) : String(n);
    } catch {
      return String(v ?? '');
    }
  };

  /**
   * onInvalid
   * pt-BR: Exibe mensagem amigável quando validação falha (ex.: módulo sem título).
   * en-US: Shows a friendly message when validation fails (e.g., module without title).
   */
  const onInvalid = () => {
    const errors = form.formState.errors as any;
    const hasModuleTitleError = Array.isArray(errors?.modulos) && errors.modulos.some((e: any) => e?.titulo);
    toast({
      title: 'Erro de validação',
      description: hasModuleTitleError ? 'Preencha o título em todos os módulos.' : 'Verifique os campos obrigatórios.',
      variant: 'destructive',
    });
  };

  /**
   * applyServerErrors
   * pt-BR: Converte erros do backend (ex.: "modulos.0.atividades.2.title")
   *        em erros do react-hook-form, exibindo nos campos corretos.
   * en-US: Converts backend errors (e.g., "modulos.0.atividades.2.title")
   *        to react-hook-form errors and shows them on respective fields.
   */
  const applyServerErrors = (err: any) => {
    const rawErrors = (err?.errors) || (err?.data?.errors) || (err?.response?.data?.errors);
    if (!rawErrors || typeof rawErrors !== 'object') return;

    const mapFieldName = (field: string, mIdx?: number, aIdx?: number) => {
      switch (field) {
        case 'title':
        case 'name':
          return 'titulo';
        case 'type_activities':
          return 'tipo';
        case 'type_duration':
          return 'unidade_duracao';
        case 'duration':
          return 'duracao';
        case 'content': {
          // Decide destino conforme tipo da atividade
          if (typeof mIdx === 'number' && typeof aIdx === 'number') {
            const tipo = form.getValues(`modulos.${mIdx}.atividades.${aIdx}.tipo` as any) as string;
            if (tipo === 'video') return 'video_url';
            if (tipo === 'arquivo') return 'arquivo_url';
            return 'descricao';
          }
          return 'descricao';
        }
        default:
          return field; // fallback: mantém nome
      }
    };

    Object.entries(rawErrors).forEach(([path, messages]) => {
      const msg = Array.isArray(messages) ? String(messages[0]) : String(messages);
      const parts = String(path).split('.');
      // Ex.: modulos.0.atividades.2.title
      let targetPath = path as string;
      if (parts[0] === 'modulos') {
        const mIdx = Number(parts[1]);
        if (parts[2] === 'atividades') {
          const aIdx = Number(parts[3]);
          const field = parts[4] ?? '';
          const mapped = mapFieldName(field, mIdx, aIdx);
          targetPath = `modulos.${mIdx}.atividades.${aIdx}.${mapped}`;
        } else {
          const field = parts[2] ?? '';
          const mapped = mapFieldName(field);
          targetPath = `modulos.${parts[1]}.${mapped}`;
        }
      } else {
        // Campos de nível raiz
        const field = parts[0] ?? '';
        const mapped = mapFieldName(field);
        targetPath = mapped;
      }

      try {
        form.setError(targetPath as any, { type: 'server', message: msg });
      } catch {}
    });
  };

  /**
   * RequiredMark
   * pt-BR: Indicador visual para marcar campos obrigatórios.
   * en-US: Visual indicator to mark required fields.
   */
  const RequiredMark = () => (<span className="text-red-600 ml-1">*</span>);

  /**
   * recalcInstallment
   * pt-BR: Recalcula o valor da parcela dividindo o Valor pelo número de parcelas.
   * en-US: Recalculates installment value by dividing total Value by parcels.
   */
  const recalcInstallment = (base?: string, parcelas?: string) => {
    const total = currencyRemoveMaskToNumber(base || '');
    const n = parseInt(String(parcelas || '').trim(), 10);
    if (!total || !n || Number.isNaN(n) || n <= 0) {
      const maskedZero = currencyApplyMask('0', 'pt-BR', 'BRL');
      form.setValue('valor_parcela', maskedZero, { shouldValidate: true });
      return;
    }
    const each = total / n;
    const masked = currencyApplyMask(String(each.toFixed(2)), 'pt-BR', 'BRL');
    form.setValue('valor_parcela', masked, { shouldValidate: true });
  };

  /**
   * recalcCourseDuration
   * pt-BR: Recalcula a duração total do curso com base nos módulos/atividades
   *        e atualiza o campo `duracao` na unidade selecionada.
   * en-US: Recalculates total course duration from modules/activities and
   *        updates the `duracao` field using the selected unit.
   */
  const recalcCourseDuration = () => {
    try {
      const mods = form.getValues('modulos') ?? [];
      const unit = form.getValues('unidade_duracao') || 'hrs';
      const totalSecs = (mods as any[]).reduce((acc, m) => acc + getModuleTotalSeconds(m), 0);
      let valueStr = '0';
      if (unit === 'hrs') {
        /**
         * pt-BR: Horas devem ser inteiras para compatibilidade com backend.
         * en-US: Hours must be integers for backend compatibility.
         */
        const hrs = Math.round(totalSecs / 3600);
        valueStr = String(isFinite(hrs) ? hrs : 0);
      } else if (unit === 'min') {
        /**
         * pt-BR: Minutos arredondados ao inteiro mais próximo.
         * en-US: Minutes rounded to the nearest integer.
         */
        const mins = Math.round(totalSecs / 60);
        valueStr = String(isFinite(mins) ? mins : 0);
      } else {
        const secs = Math.round(totalSecs);
        valueStr = String(isFinite(secs) ? secs : 0);
      }
      form.setValue('duracao', valueStr);
    } catch {}
  };

  /**
   * Watchers: módulos e unidade
   * pt-BR: Sempre que módulos/atividades ou a unidade mudarem, atualiza a duração.
   * en-US: Whenever modules/activities or unit change, updates the duration.
   */
  const watchedModules = form.watch('modulos');
  useEffect(() => { recalcCourseDuration(); }, [watchedModules]);
  const watchedUnit = form.watch('unidade_duracao');
  useEffect(() => { recalcCourseDuration(); }, [watchedUnit]);
  // pt-BR: Executa uma vez ao montar para inicializar duração conforme unidade inicial.
  // en-US: Run once on mount to initialize duration per initial unit.
  useEffect(() => { recalcCourseDuration(); }, []);

  /**
   * CourseEnrollmentsTab
   * pt-BR: Aba que lista as matrículas do curso, incluindo a coluna Situação.
   * en-US: Tab that lists course enrollments, including the Situation column.
   */
  function CourseEnrollmentsTab({ courseId }: { courseId?: number }) {
    const { data: enrollmentsResp, isLoading } = useEnrollmentsList(
      { page: 1, per_page: 50, id_curso: courseId },
      { enabled: !!courseId, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false, refetchOnReconnect: false }
    );
    const items = useMemo(() => (enrollmentsResp?.data || enrollmentsResp?.items || []) as any[], [enrollmentsResp]);

    if (!courseId) {
      return (
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Salve o curso para visualizar as matrículas.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Matrículas do curso</h3>
          <p className="text-xs text-muted-foreground">Listagem de alunos matriculados e sua situação.</p>
        </div>
        <EnrollmentTable items={items} isLoading={isLoading} />
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit, onInvalid)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)} className="w-full">
          <TabsList>
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="image">Imagem</TabsTrigger>
            <TabsTrigger value="pricing">Valores/Parcelas</TabsTrigger>
            <TabsTrigger value="content">Conteúdo</TabsTrigger>
            <TabsTrigger value="config">Configurações</TabsTrigger>
            <TabsTrigger value="questions">Perguntas</TabsTrigger>
            <TabsTrigger value="enrollments">Matrículas</TabsTrigger>
          </TabsList>
          <p className="text-xs text-muted-foreground mt-2">Campos marcados com <span className="text-red-600">*</span> são obrigatórios.</p>

          {/* Informações */}
          <TabsContent value="info" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome interno<RequiredMark /></Label>
                <Input placeholder="Nome interno (admin)" {...form.register('nome')} className={form.formState.errors?.nome ? 'border-red-500' : ''} />
                {form.formState.errors?.nome && (
                  <p className="text-xs text-red-600">{String(form.formState.errors.nome.message)}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Slug (Gerado do Nome interno; você pode ajustar manualmente.)</Label>
                <Input
                  placeholder="slug-do-curso"
                  value={form.watch('slug') || ''}
                  onChange={(e) => {
                    // Desativa geração automática ao editar manualmente.
                    // Disable auto-generation when manually editing.
                    setAutoSlugEnabled(false);
                    form.setValue('slug', toSlug(e.target.value));
                  }}
                />
                {/* <p className="text-xs text-muted-foreground">Gerado do Nome interno; você pode ajustar manualmente.</p> */}
              </div>
              <div className="space-y-2">
                <Label>Título (aluno)<RequiredMark /></Label>
                <Input placeholder="Título que aparece para o aluno" {...form.register('titulo')} className={form.formState.errors?.titulo ? 'border-red-500' : ''} />
                {form.formState.errors?.titulo && (
                  <p className="text-xs text-red-600">{String(form.formState.errors.titulo.message)}</p>
                )}
              </div>
              {/* Instrutor como Select alimentado por GET /users */}
              <div className="space-y-2">
                <Label>Instrutor</Label>
                <Select value={form.watch('instrutor') || ''} onValueChange={(v) => form.setValue('instrutor', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione um instrutor" /></SelectTrigger>
                  <SelectContent>
                    {((usersQuery.data?.data ?? []) as any[]).map((u: any) => (
                      <SelectItem key={String(u.id)} value={String(u.id)}>{u.name ?? String(u.id)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label>Ativar</Label>
                    <p className="text-xs text-muted-foreground">Disponibiliza o curso</p>
                  </div>
                  <Switch
                    checked={form.watch('ativo') === 's'}
                    onCheckedChange={(checked) => form.setValue('ativo', checked ? 's' : 'n')}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5"><Label>Publicar</Label></div>
                  <Switch
                    checked={form.watch('publicar') === 's'}
                    onCheckedChange={(checked) => form.setValue('publicar', checked ? 's' : 'n')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Duração<RequiredMark /></Label>
                <Input placeholder="0" readOnly title="Calculado automaticamente a partir do conteúdo" {...form.register('duracao')} className={form.formState.errors?.duracao ? 'border-red-500' : ''} />
                {form.formState.errors?.duracao && (
                  <p className="text-xs text-red-600">{String(form.formState.errors.duracao.message)}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Unidade de duração<RequiredMark /></Label>
                <Select value={form.watch('unidade_duracao')} onValueChange={(v) => form.setValue('unidade_duracao', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seg">Segundo(s)</SelectItem>
                    <SelectItem value="min">Minuto(s)</SelectItem>
                    <SelectItem value="hrs">Hora(s)</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors?.unidade_duracao && (
                  <p className="text-xs text-red-600">{String((form.formState.errors as any).unidade_duracao?.message)}</p>
                )}
              </div>

              
          {/* Descrição com WYSIWYG e Observações como Textarea */}
          <div className="space-y-2 md:col-span-2">
            <Label>Descrição</Label>
            <RichTextEditor
              value={form.watch('descricao') || ''}
              onChange={(html) => {
                // Atualiza ambos os campos para compatibilidade com API e UI
                form.setValue('descricao', html, { shouldValidate: true });
                form.setValue('descricao_curso', html, { shouldValidate: true });
              }}
              placeholder="Descrição do curso"
            />
          </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Observações</Label>
                <Textarea rows={5} placeholder="Observações internas" {...form.register('observacoes')} />
                {form.formState.errors?.observacoes && (
                  <p className="text-xs text-red-600">{String((form.formState.errors as any).observacoes?.message)}</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Imagem */}
          <TabsContent value="image" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Imagem de capa do curso</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => setMediaOpen(true)}>Escolher imagem</Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      form.setValue('imagem_url', '', { shouldValidate: true });
                      form.setValue('imagem_file_id', undefined as any, { shouldValidate: true });
                      form.setValue('imagem_titulo', '', { shouldValidate: false });
                    }}
                  >
                    Limpar imagem
                  </Button>
                  {form.watch('config.cover.file_id') ? (
                    <span className="text-xs text-muted-foreground">ID selecionado: {String(form.watch('config.cover.file_id'))}</span>
                  ) : null}
                </div>
                <ImageUpload
                  name="config.cover.url"
                  label="Imagem de capa"
                  value={form.watch('config.cover.url') || ''}
                  onChange={(val) => form.setValue('config.cover.url', val || '', { shouldValidate: true })}
                  onUpload={uploadCourseCover}
                  maxSize={5}
                  className="max-w-2xl"
                />
              </div>
              {Boolean(form.watch('config.cover.url')) && (
                <div className="md:col-span-2">
                  <img src={form.watch('config.cover.url')!} alt="Pré-visualização" className="max-h-48 rounded border" />
                </div>
              )}
            </div>
            {/* Modal de Biblioteca de Mídia */}
            <MediaLibraryModal
              open={mediaOpen}
              onClose={() => setMediaOpen(false)}
              onSelect={handleSelectImageFromLibrary}
              defaultFilters={{ mime: 'image' }}
            />
          </TabsContent>

          {/* Valores/Parcelas */}
          <TabsContent value="pricing" className="space-y-4 pt-4">
            {/**
             * PricingTab
             * pt-BR: Aba dedicada para cadastrar valores (inscrição, valor total) e parcelamentos.
             * en-US: Dedicated tab to register pricing (enrollment, total value) and installments.
             */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Inscrição</Label>
                <Input
                  placeholder="R$ 0,00"
                  value={form.watch('inscricao') || ''}
                  onChange={(e) => {
                    /**
                     * applyBRLMaskForEnrollment
                     * pt-BR: Aplica máscara BRL ao valor de inscrição.
                     * en-US: Applies BRL mask to enrollment amount.
                     */
                    const v = currencyApplyMask(e.target.value, 'pt-BR', 'BRL');
                    form.setValue('inscricao', v, { shouldValidate: true });
                  }}
                  className={form.formState.errors?.inscricao ? 'border-red-500' : ''}
                />
                {form.formState.errors?.inscricao && (
                  <p className="text-xs text-red-600">{String(form.formState.errors.inscricao.message)}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  placeholder="R$ 900,00"
                  value={form.watch('valor') || ''}
                  onChange={(e) => {
                    /**
                     * applyBRLMaskForTotal
                     * pt-BR: Aplica máscara BRL ao valor total do curso e recalcula parcela.
                     * en-US: Applies BRL mask to total price and recalculates installment.
                     */
                    const v = currencyApplyMask(e.target.value, 'pt-BR', 'BRL');
                    form.setValue('valor', v, { shouldValidate: true });
                    recalcInstallment(v, form.getValues('parcelas'));
                  }}
                  className={form.formState.errors?.valor ? 'border-red-500' : ''}
                />
                {form.formState.errors?.valor && (
                  <p className="text-xs text-red-600">{String(form.formState.errors.valor.message)}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Select value={form.watch('parcelas') || ''} onValueChange={(v) => {
                  form.setValue('parcelas', v, { shouldValidate: true });
                  recalcInstallment(form.getValues('valor'), v);
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="7">7</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="9">9</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="11">11</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors?.parcelas && (
                  <p className="text-xs text-red-600">{String(form.formState.errors.parcelas.message)}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Valor da parcela</Label>
                <Input
                  placeholder="R$ 900,00"
                  value={form.watch('valor_parcela') || ''}
                  onChange={(e) => {
                    /**
                     * applyBRLMaskForInstallment
                     * pt-BR: Aplica máscara BRL ao valor de cada parcela.
                     * en-US: Applies BRL mask to each installment value.
                     */
                    const v = currencyApplyMask(e.target.value, 'pt-BR', 'BRL');
                    form.setValue('valor_parcela', v, { shouldValidate: true });
                  }}
                  readOnly
                  className={form.formState.errors?.valor_parcela ? 'border-red-500' : ''}
                />
                {form.formState.errors?.valor_parcela && (
                  <p className="text-xs text-red-600">{String(form.formState.errors.valor_parcela.message)}</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Configurações */}
          <TabsContent value="config" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Próximo curso</Label><Input {...form.register('config.proximo_curso')} /></div>
              <div className="space-y-2">
                <Label>Grátis</Label>
                <Select value={form.watch('config.gratis')} onValueChange={(v) => form.setValue('config.gratis', v as any)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent><SelectItem value="s">Sim</SelectItem><SelectItem value="n">Não</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Comissão</Label><Input placeholder="3,00" {...form.register('config.comissao')} /></div>
              <div className="space-y-2"><Label>Tipo desconto taxa</Label>
                <Select value={form.watch('config.tipo_desconto_taxa')} onValueChange={(v) => form.setValue('config.tipo_desconto_taxa', v as any)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent><SelectItem value="v">Valor</SelectItem><SelectItem value="p">Percentual</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Desconto taxa</Label><Input {...form.register('config.desconto_taxa')} /></div>
              <div className="space-y-2 md:col-span-3"><Label>Página de divulgação</Label><Input {...form.register('config.pagina_divulgacao')} /></div>
              <div className="space-y-2 md:col-span-3"><Label>Vídeo (YouTube)</Label><Input placeholder="https://..." {...form.register('config.video')} /></div>
              <div className="space-y-2"><Label>Página de venda (link)</Label><Input {...form.register('config.pagina_venda.link')} /></div>
              <div className="space-y-2"><Label>Página de venda (label)</Label><Input {...form.register('config.pagina_venda.label')} /></div>
              <div className="space-y-2"><Label>ADC: Recheck</Label>
                <Select value={form.watch('config.adc.recheck')} onValueChange={(v) => form.setValue('config.adc.recheck', v as any)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent><SelectItem value="s">Sim</SelectItem><SelectItem value="n">Não</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>ADC: Recorrente</Label>
                <Select value={form.watch('config.adc.recorrente')} onValueChange={(v) => form.setValue('config.adc.recorrente', v as any)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent><SelectItem value="s">Sim</SelectItem><SelectItem value="n">Não</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>ADC: Cor (hex)</Label><Input placeholder="FFFFFF" {...form.register('config.adc.cor')} /></div>
              <div className="space-y-2"><Label>EAD: ID EADControl</Label><Input {...form.register('config.ead.id_eadcontrol')} /></div>
            </div>
          </TabsContent>

          {/* Aeronaves — removido do layout principal para alinhar com a imagem (mantemos seleção por módulo) */}

          {/* Conteúdo (Currículo em seções) */}
          <TabsContent value="content" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Currículo</h3>
                <p className="text-xs text-muted-foreground">
                  Details {(form.watch('modulos') ?? []).length} Módulos
                  {(() => {
                    const mods = (form.watch('modulos') ?? []) as any[];
                    const totalSecs = mods.reduce((acc, m) => acc + getModuleTotalSeconds(m), 0);
                    const label = totalSecs ? ` • Total ${formatDuration(totalSecs)}` : '';
                    return label;
                  })()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={addModule}><Plus className="h-4 w-4 mr-2" />Adicionar Módulo</Button>
                <Button type="button" variant="secondary" onClick={generateDefaultCurriculum}>Gerar Currículo</Button>
                {/* Botão para colapsar/expandir todos os módulos */}
                {(() => {
                  const total = (form.watch('modulos') ?? []).length;
                  const allCollapsed = total > 0 && collapsedModules.size === total;
                  return (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => (allCollapsed ? expandAllModules() : collapseAllModules())}
                    >
                      {allCollapsed ? 'Expandir todos' : 'Colapsar todos'}
                    </Button>
                  );
                })()}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="secondary">Banco de Módulos</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[360px]">
                    <div className="space-y-2">
                      <Label>Escolha um módulo</Label>
                      <Combobox
                        options={moduleComboboxOptions}
                        value={moduleBankValue}
                        onValueChange={(v) => {
                          setModuleBankValue(v);
                          addModuleFromBank(v);
                          // limpa para permitir nova seleção imediata
                          setModuleBankValue('');
                        }}
                        placeholder="Selecione"
                        searchPlaceholder="Pesquisar módulos..."
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {(form.watch('modulos') ?? []).map((m, idx) => (
              <div
                key={idx}
                className="rounded-md border"
                draggable
                onDragStart={() => setDragModuleIdx(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragModuleIdx != null) reorderModules(dragModuleIdx, idx);
                  setDragModuleIdx(null);
                }}
              >
                {/* Header da seção */}
                <div className="flex items-center justify-between px-3 py-2 bg-muted">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={(m as any).title || ''}
                      onChange={(e) => {
                        const curr = [...(form.getValues('modulos') ?? [])];
                        curr[idx] = { ...curr[idx], title: e.target.value, name: e.target.value } as any;
                        form.setValue('modulos', curr);
                      }}
                      placeholder="Título do módulo"
                      className="h-8 w-[280px]"
                    />
                  </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{(m.atividades ?? []).length} Itens</span>
                  {(() => {
                    const totalSecs = getModuleTotalSeconds(m);
                    const label = totalSecs ? formatDuration(totalSecs) : '';
                    return label ? <span className="text-xs text-muted-foreground">• {label}</span> : null;
                  })()}
                  {/* Botão para colapsar módulo individual */}
                    <Button type="button" variant="ghost" size="icon" onClick={() => toggleModuleCollapse(idx)}>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    {/* Remover módulo do currículo */}
                    <Button type="button" variant="destructive" size="sm" onClick={() => removeModule(idx)}>
                      <X className="h-4 w-4 mr-2" /> Remover módulo
                    </Button>
                  </div>
                </div>

                {/* Corpo da seção */}
                <div id={`section-body-${idx}`} className={`p-3 space-y-3 ${collapsedModules.has(idx) ? 'hidden' : ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="space-y-2">
                      <Label>Tipo de duração<RequiredMark /></Label>
                      <Select value={(m as any).tipo_duracao || 'seg'} onValueChange={(v) => {
                        const curr = [...(form.getValues('modulos') ?? [])];
                        curr[idx] = { ...curr[idx], tipo_duracao: v } as any;
                        form.setValue('modulos', curr);
                        recalcCourseDuration();
                      }}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="seg">Segundo(s)</SelectItem>
                          <SelectItem value="min">Minuto(s)</SelectItem>
                          <SelectItem value="hrs">Hora(s)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Duração</Label>
                      <Input value={(m as any).duration || ''} onChange={(e) => {
                        const curr = [...(form.getValues('modulos') ?? [])];
                        curr[idx] = { ...curr[idx], duration: e.target.value } as any;
                        form.setValue('modulos', curr);
                        recalcCourseDuration();
                      }} />
                    </div>
                    {/* Campo 'Valor' do módulo removido conforme solicitação */}
                    {/* Campo Aeronaves removido conforme solicitação */}
                    <div className="space-y-2">
                      <Label>Ativo</Label>
                      <div className="flex items-center gap-2">
                        <Switch checked={((m as any).active || 's') === 's'} onCheckedChange={(c) => {
                          const curr = [...(form.getValues('modulos') ?? [])];
                          curr[idx] = { ...curr[idx], active: c ? 's' : 'n' } as any;
                          form.setValue('modulos', curr);
                        }} />
                        <span className="text-xs text-muted-foreground">{(((m as any).active || 's') === 's') ? 'Ativo' : 'Inativo'}</span>
                      </div>
                    </div>
                    <div className="md:col-span-6 space-y-2">
                      <Label>Descrição do módulo</Label>
                      {/* Editor WYSIWYG para conteúdo/descrição do módulo */}
                      <RichTextEditor
                        value={(m as any).description || ''}
                        onChange={(html) => {
                          const curr = [...(form.getValues('modulos') ?? [])];
                          curr[idx] = { ...curr[idx], description: html } as any;
                          form.setValue('modulos', curr);
                        }}
                        placeholder="Detalhes do módulo"
                      />
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" onClick={() => quickAddActivity(idx, 'leitura')}>Nova Lição</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => quickAddActivity(idx, 'quiz')}>Novo Teste</Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" size="sm" variant="outline">Banco de Conteúdos</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[360px]">
                        <div className="space-y-2">
                          <Label>Escolha uma atividade</Label>
                          <Combobox
                            options={activityComboboxOptions}
                            value={activityBankValue[idx] || ''}
                            onValueChange={(v) => {
                              setActivityBankValue((prev) => ({ ...prev, [idx]: v }));
                              addActivityFromBank(idx, v);
                              // limpa para permitir nova seleção imediata no mesmo módulo
                              setActivityBankValue((prev) => ({ ...prev, [idx]: '' }));
                            }}
                            placeholder="Selecione"
                            searchPlaceholder="Pesquisar conteúdos..."
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    {(() => {
                      const acts = (m.atividades ?? []);
                      const allCollapsed = acts.length > 0 && acts.every((_, aIdx) => Boolean(collapsedActivities[activityKey(idx, aIdx)]));
                      return (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => (allCollapsed ? expandAllActivitiesInModule(idx) : collapseAllActivitiesInModule(idx))}
                        >
                          {allCollapsed ? 'Expandir atividades' : 'Colapsar atividades'}
                        </Button>
                      );
                    })()}
                  </div>

                  {/* Lista de itens */}
                  <div className="space-y-3">
                    {(m.atividades ?? []).map((a, aIdx) => {
                      const key = activityKey(idx, aIdx);
                      const collapsed = Boolean(collapsedActivities[key]);
                      return (
                        <div
                          key={aIdx}
                          className="rounded-md border shadow-sm bg-background"
                          draggable
                          onDragStart={() => setDragActivity({ moduleIdx: idx, activityIdx: aIdx })}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (dragActivity && dragActivity.moduleIdx === idx) {
                              reorderActivities(idx, dragActivity.activityIdx, aIdx);
                            }
                            setDragActivity(null);
                          }}
                        >
                          <div className="text-[11px] text-muted-foreground px-3 pt-2">Início da atividade</div>
                          <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-t-md border-b">
                            <div className="flex items-center gap-3">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{a.titulo?.trim() ? a.titulo : `Atividade ${aIdx + 1}`}</span>
                              <Badge variant="outline">{a.tipo || '—'}</Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button type="button" variant="ghost" size="icon" onClick={() => toggleActivityCollapse(idx, aIdx)} aria-label="Colapsar atividade">
                                {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeActivity(idx, aIdx)} aria-label="Remover atividade">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {!collapsed && (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-3">
                              <div className="md:col-span-3 space-y-2">
                               <Label>Título<RequiredMark /></Label>
                                <Input className="h-9" value={a.titulo || ''} onChange={(e) => setActivityField(idx, aIdx, 'titulo', e.target.value)} />
                                {form.formState?.errors?.modulos?.[idx]?.atividades?.[aIdx]?.titulo && (
                                  <p className="text-xs text-red-600">{String((form.formState.errors as any).modulos?.[idx]?.atividades?.[aIdx]?.titulo?.message || '')}</p>
                                )}
                              </div>
                              <div className="md:col-span-2 space-y-2">
                                <Label>Tipo<RequiredMark /></Label>
                                <Select value={a.tipo || 'video'} onValueChange={(v) => setActivityField(idx, aIdx, 'tipo', v)}>
                                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="video">Vídeo</SelectItem>
                                    <SelectItem value="leitura">Leitura</SelectItem>
                                    <SelectItem value="quiz">Quiz</SelectItem>
                                    <SelectItem value="arquivo">Arquivo</SelectItem>
                                    <SelectItem value="tarefa">Tarefa</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {a.tipo === 'video' && (
                                <>
                                  <div className="md:col-span-2 space-y-2">
                                    <Label>Origem do vídeo</Label>
                                    <Select value={(a as any).video_source || 'youtube'} onValueChange={(v) => { setActivityField(idx, aIdx, 'video_source', v); const url = String((a as any).video_url || '').trim(); if (url) importVideoDuration(idx, aIdx); }}>
                                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="youtube">YouTube</SelectItem>
                                        <SelectItem value="vimeo">Vimeo</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="md:col-span-5 space-y-2">
                                    <Label>URL do vídeo</Label>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        className="h-9"
                                        value={(a as any).video_url || ''}
                                        onChange={(e) => setActivityField(idx, aIdx, 'video_url', e.target.value)}
                                        onBlur={() => importVideoDuration(idx, aIdx)}
                                        onPaste={() => setTimeout(() => importVideoDuration(idx, aIdx), 0)}
                                        placeholder="https://youtube.com/... ou https://vimeo.com/..."
                                      />
                                      {Boolean(String((a as any).video_url || '').trim()) && (
                                        <>
                                          <Button type="button" size="sm" variant="secondary" onClick={() => importVideoDuration(idx, aIdx)}>
                                            Carregar duração
                                          </Button>
                                          <Button type="button" size="sm" variant="outline" onClick={() => importVideoTitle(idx, aIdx)}>
                                            Carregar título e descrição
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                    {!import.meta.env.VITE_YOUTUBE_API_KEY && ((a as any).video_source === 'youtube') && (
                                      <p className="text-[11px] text-muted-foreground mt-1">
                                        YouTube: sem chave <code>VITE_YOUTUBE_API_KEY</code>, apenas o título será importado.
                                      </p>
                                    )}
                                  </div>
                                </>
                              )}
                              {a.tipo === 'arquivo' && (
                                <>
                                  <div className="md:col-span-6 space-y-2">
                                    <Label>Enviar arquivo (drag & drop)</Label>
                                    <div
                                      onDragOver={(e) => { e.preventDefault(); }}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        const f = e.dataTransfer?.files?.[0];
                                        if (f) handleActivityFileUpload(idx, aIdx, f);
                                      }}
                                      className="border border-dashed rounded-md p-4 text-center text-sm text-muted-foreground"
                                    >
                                      Arraste e solte aqui, ou selecione abaixo.
                                    </div>
                                  </div>
                                  
                                  <div className="md:col-span-6 space-y-2">
                                    <Label>Arquivo</Label>
                                    <Input type="file" accept=".pdf,.txt,.doc,.docx,.odt" onChange={(e) => handleActivityFileUpload(idx, aIdx, e.target.files?.[0] || null)} />
                                    <p className="text-xs text-muted-foreground">Após o upload, a URL é salva na atividade.</p>
                                  </div>
                                  <div className="md:col-span-6 space-y-2">
                                    <Label>URL do arquivo</Label>
                                    <Input className="h-9" value={(a as any).arquivo_url || ''} onChange={(e) => setActivityField(idx, aIdx, 'arquivo_url', e.target.value)} placeholder="https://.../arquivo.pdf" />
                                  </div>
                                </>
                              )}
                              <div className="md:col-span-2 space-y-2">
                                <Label>Duração</Label>
                                <Input className="h-9" value={a.duracao || ''} onChange={(e) => setActivityField(idx, aIdx, 'duracao', e.target.value)} placeholder="ex.: 300" />
                              </div>
                              <div className="md:col-span-2 space-y-2">
                                <Label>Unidade</Label>
                                <Select value={a.unidade_duracao || 'seg'} onValueChange={(v) => setActivityField(idx, aIdx, 'unidade_duracao', v)}>
                                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="seg">Segundo(s)</SelectItem>
                                    <SelectItem value="min">Minuto(s)</SelectItem>
                                    <SelectItem value="hrs">Hora(s)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="md:col-span-2 space-y-2">
                                <Label>Ativo</Label>
                                <div className="flex items-center gap-2">
                                  <Switch checked={((a as any).active || 's') === 's'} onCheckedChange={(c) => setActivityField(idx, aIdx, 'active', c ? 's' : 'n')} />
                                  <span className="text-xs text-muted-foreground">{(((a as any).active || 's') === 's') ? 'Ativo' : 'Inativo'}</span>
                                </div>
                              </div>
                              <div className="md:col-span-12 space-y-2">
                                <Label>Descrição</Label>
                                <RichTextEditor value={a.descricao || ''} onChange={(html) => setActivityField(idx, aIdx, 'descricao', html)} placeholder="Detalhes da atividade" />
                              </div>
                            </div>
                          )}

                          <div className="text-[11px] text-muted-foreground px-3 pb-2">Fim da atividade</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Matrículas */}
          <TabsContent value="enrollments" className="space-y-4 pt-4">
            {/**
             * EnrollmentsTabContent
             * pt-BR: Renderiza a tabela de matrículas do curso com coluna Situação.
             * en-US: Renders course enrollments table with Situation column.
             */}
            <CourseEnrollmentsTab courseId={courseNumericId} />
          </TabsContent>

          {/* Perguntas */}
          <TabsContent value="questions" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Perguntas e respostas</h3>
              <Button type="button" variant="outline" onClick={() => {
                /**
                 * addQuestion
                 * pt-BR: Adiciona uma pergunta vazia na lista.
                 * en-US: Adds an empty question to the list.
                 */
                const qs = [...(form.getValues('perguntas') ?? [])];
                qs.push({ pergunta: '', resposta: '' });
                form.setValue('perguntas', qs);
              }}><Plus className="h-4 w-4 mr-2" />Adicionar pergunta</Button>
            </div>
            {(form.watch('perguntas') ?? []).map((q, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border rounded-md p-3">
                <div className="md:col-span-6 space-y-2">
                  <Label>Pergunta<RequiredMark /></Label>
                  <Input value={q.pergunta || ''} onChange={(e) => {
                    const qs = [...(form.getValues('perguntas') ?? [])];
                    qs[idx] = { ...qs[idx], pergunta: e.target.value };
                    form.setValue('perguntas', qs);
                  }} />
                </div>
                <div className="md:col-span-6 space-y-2">
                  <Label>Resposta</Label>
                  <Textarea rows={3} value={q.resposta || ''} onChange={(e) => {
                    const qs = [...(form.getValues('perguntas') ?? [])];
                    qs[idx] = { ...qs[idx], resposta: e.target.value };
                    form.setValue('perguntas', qs);
                  }} />
                </div>
                <div className="md:col-span-12 flex items-center justify-end">
                  <Button type="button" variant="ghost" size="icon" onClick={() => {
                    /**
                     * removeQuestion
                     * pt-BR: Remove a pergunta pelo índice.
                     * en-US: Removes a question by index.
                     */
                    const qs = [...(form.getValues('perguntas') ?? [])];
                    qs.splice(idx, 1);
                    form.setValue('perguntas', qs);
                  }}><X className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <Separator />
        {/* Barra fixa de ações no rodapé (layout atualizado) */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
            {/* Lado esquerdo: Cancelar */}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => navigate('/admin/school/courses')}>
                <ChevronLeft className="h-4 w-4 mr-2" />Cancelar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={goToPreview}
            disabled={!Boolean((initialData as any)?.slug || (initialData as any)?.token)}
            title={!Boolean((initialData as any)?.slug || (initialData as any)?.token) ? 'Informe o slug e salve para habilitar o preview público' : undefined}
              >
                <Eye className="h-4 w-4 mr-2" />Preview do curso
              </Button>
              {(() => {
                const { href, absolute } = buildStudentPreviewUrl();
                return href ? (
                  <div className="flex items-center gap-2 ml-2">
                    <a href={href} target="_blank" rel="noreferrer" className="text-sm text-violet-700 underline flex items-center">
                      <ExternalLink className="h-4 w-4 mr-1" /> Visualização do aluno
                    </a>
                    <Button type="button" variant="outline" size="sm" onClick={() => copyText(absolute)} title="Copiar link da visualização do aluno">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground ml-2">Defina o slug/token e salve para gerar link do aluno</span>
                );
              })()}
            </div>
            {/* Lado direito: ações de salvar + novo cadastro */}
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => navigate('/admin/school/courses/create')}>
                <Plus className="h-4 w-4 mr-2" />Novo cadastro
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={saveAndStay}
                disabled={Boolean(saving)}
              >
                {saving === 'stay' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />Salvar e Continuar
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={saveAndExit}
                disabled={Boolean(saving)}
              >
                {saving === 'exit' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />Salvar e Finalizar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
  /**
   * Duration helpers
   * pt-BR: Converte duração de atividade em segundos e formata total.
   * en-US: Converts activity duration to seconds and formats total.
   */
  const toSeconds = (val: any, unit: string) => {
    const v = Number(val || 0);
    switch (String(unit || 'seg')) {
      case 'hrs': return v * 3600;
      case 'min': return v * 60;
      default: return v;
    }
  };
  const getActivitySeconds = (a: any) => toSeconds(a?.duracao ?? a?.duration ?? 0, a?.unidade_duracao ?? a?.tipo_duracao ?? 'seg');
  const getModuleTotalSeconds = (m: any) => {
    const activities: any[] = Array.isArray(m?.atividades) ? m.atividades : [];
    const sumActs = activities.reduce((acc, a) => acc + getActivitySeconds(a), 0);
    if (sumActs > 0) return sumActs;
    // fallback para duração do módulo quando não há atividades
    return toSeconds(m?.duration ?? 0, m?.tipo_duracao ?? 'seg');
  };
  /**
   * formatDuration
   * pt-BR: Formata segundos para padrão fixo "hh:mm:ss" (zero à esquerda).
   * en-US: Formats seconds to fixed "hh:mm:ss" (zero-padded).
   */
  const formatDuration = (secs: number) => {
    const s = Math.max(0, Math.floor(Number(secs || 0)));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(ss)}`;
  };