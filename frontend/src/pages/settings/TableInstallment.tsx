import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Badge } from '@/components/ui/badge';
import { Combobox, useComboboxOptions } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { coursesService } from '@/services/coursesService';
import { turmasService } from '@/services/turmasService';
import { installmentsService, buildInstallmentUrlencoded } from '@/services/installmentsService';
import { InstallmentParcel, InstallmentPayload, InstallmentRecord, InstallmentTx2Config } from '@/types/installments';
import { PaginatedResponse } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { currencyApplyMask, currencyRemoveMaskToString } from '@/lib/masks/currency';

/**
 * TableInstallment
 * pt-BR: Página de gerenciamento das tabelas de parcelamentos, vinculadas a cursos e/ou turmas.
 * en-US: Management page for installment tables, linked to courses and/or classes.
 */
export default function TableInstallment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  /**
   * route mode detection
   * pt-BR: Detecta se a página está no modo dedicado (create/edit) via rota.
   * en-US: Detects whether the page is in dedicated (create/edit) mode via route.
   */
  const pathname = location.pathname || '';
  const routeId = params.id as string | undefined;
  const isCreateRoute = pathname.endsWith('/admin/settings/table-installment/create');
  const isEditRoute = /\/admin\/settings\/table-installment\/.+\/edit$/.test(pathname) && !!routeId;

  // Estado do formulário
  // Modo de edição: quando setado, o submit fará UPDATE em vez de CREATE
  const [editingId, setEditingId] = useState<string | null>(null);
  // Controle de visibilidade do formulário
  // pt-BR: Quando falso, ocultamos o card para permitir ver apenas a lista.
  // en-US: When false, hides the form card to show only the list.
  const [showForm, setShowForm] = useState<boolean>(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [ativo, setAtivo] = useState<'s' | 'n' | 'y'>('s');
  const [obs, setObs] = useState('');
  // Tipo do Curso — oculto no UI, mantido interno para compatibilidade de API
  const [tipoCurso, setTipoCurso] = useState('4');
  /**
   * formErrors
   * pt-BR: Armazena mensagens de erro de validação por campo (ex.: nome).
   * en-US: Stores validation error messages per field (e.g., nome).
   */
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  /**
   * finishAfterSaveRef
   * pt-BR: Controla se após salvar deve finalizar (fechar/navegar) ou continuar na página.
   * en-US: Controls whether to finish (close/navigate) or continue on page after saving.
   */
  const finishAfterSaveRef = useRef(false);

  /**
   * parseApiError
   * pt-BR: Extrai `message` e `errors` do erro lançado pelo fetch (BaseApiService),
   *        retornando um texto amigável e um mapa de erros por campo.
   * en-US: Extracts `message` and `errors` from the error thrown by fetch (BaseApiService),
   *        returning a friendly text and a field error map.
   */
  const parseApiError = (err: any): { message: string; fieldErrors: Record<string, string>; details: string[] } => {
    const body = (err && (err.body || err.response?.data)) || {};
    const msg = String(body?.message || err?.message || 'Erro de validação');
    const errorsObj: Record<string, string[] | string> = body?.errors || {};
    const fieldErrors: Record<string, string> = {};
    const details: string[] = [];
    if (errorsObj && typeof errorsObj === 'object') {
      Object.entries(errorsObj).forEach(([field, messages]) => {
        const firstMsg = Array.isArray(messages) ? String(messages[0] || '') : String(messages || '');
        if (firstMsg) {
          fieldErrors[field] = firstMsg;
          details.push(firstMsg);
        }
      });
    }
    return { message: msg, fieldErrors, details };
  };

  // Seleção de turmas: adicionar uma por vez via combobox, acumulando lista
  const [classSearch, setClassSearch] = useState('');
  const [classToAdd, setClassToAdd] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  // Parcelas (linhas dinâmicas)
  const [parcelas, setParcelas] = useState<InstallmentParcel[]>([
    { index: 1, parcela: '6', tipo_entrada: '', entrada: '', juros: '', valor: '', desconto: '' },
  ]);

  /**
   * computePerParcelValue
   * pt-BR: Calcula o valor por parcela a partir do valor total (campo acima) dividido pelo número de parcelas.
   * en-US: Computes per-installment value from the main total divided by the number of installments.
   */
  const computePerParcelValue = (totalMasked: string, nStr: string) => {
    try {
      const n = parseInt(String(nStr).replace(/\D+/g, ''), 10);
      if (!n || !totalMasked) return '';
      const totalNumber = Number(currencyRemoveMaskToString(totalMasked));
      if (!isFinite(totalNumber) || totalNumber <= 0) return '';
      const per = totalNumber / n;
      return currencyApplyMask(String(per.toFixed(2)), 'pt-BR', 'BRL');
    } catch {
      return '';
    }
  };

  /**
   * autoApplyPerParcelOnTotalChange
   * pt-BR: Quando o valor total é alterado, recalcula automaticamente o valor de cada parcela (se houver N. Parcelas válido).
   * en-US: When the main total changes, automatically recalculates each line's value (if a valid number of installments exists).
   */
  useEffect(() => {
    if (!valor) return;
    setParcelas(prev => prev.map((pp) => {
      const nextValor = computePerParcelValue(valor, pp.parcela);
      return nextValor ? { ...pp, valor: nextValor } : pp;
    }));
  }, [valor]);

  // Configuração tx2 (linhas dinâmicas)
  const [configTx2, setConfigTx2] = useState<InstallmentTx2Config[]>([
    { name_label: 'Desconto de Pontualidade Mensalidade', name_valor: 'R$1.000,00 de desconto na mensalidade para pagamentos até a data de vencimento.' }
  ]);

  /**
   * discountValidation
   * pt-BR: Valida que o desconto da parcela nunca seja maior que o valor da parcela.
   *        Usa o valor da própria parcela ou, se vazio, calcula a partir do total e "Total Parcelas".
   * en-US: Validates that a parcel's discount never exceeds the parcel value.
   *        Uses the parcel's own value or, if empty, computes from total and "Total Parcelas".
   */
  const invalidDiscountIndices = useMemo(() => {
    const set = new Set<number>();
    parcelas.forEach((p) => {
      const descontoNum = Number(currencyRemoveMaskToString(p.desconto || '0')) || 0;
      const valueMasked = p.valor || computePerParcelValue(valor, p.parcela);
      const valueNum = Number(currencyRemoveMaskToString(valueMasked || '0')) || 0;
      if (descontoNum > valueNum && valueNum > 0) {
        set.add(p.index);
      }
    });
    return set;
  }, [parcelas, valor]);

  const hasInvalidDiscount = useMemo(() => invalidDiscountIndices.size > 0, [invalidDiscountIndices]);

  /**
   * fetchCourses
   * pt-BR: Busca cursos para popular o combobox de curso.
   * en-US: Fetch courses to populate the course combobox.
   */
  const coursesQuery = useQuery({
    queryKey: ['courses', 'list', { page: 1, per_page: 200 }],
    queryFn: async () => coursesService.listCourses({ page: 1, per_page: 200 }),
  });

  const courseItems = (coursesQuery.data as PaginatedResponse<any> | undefined)?.data || [];
  const courseOptions = useComboboxOptions(courseItems, 'id', 'nome');

  /**
   * courseNameById
   * pt-BR: Mapa memoizado para obter o nome do curso a partir do ID na listagem.
   * en-US: Memoized map to get the course name from its ID in the listing.
   */
  const courseNameById = useMemo(() => {
    const map = new Map<string, string>();
    courseItems.forEach((c: any) => map.set(String(c.id), String(c.nome ?? c.name ?? '')));
    return map;
  }, [courseItems]);

  /**
   * hydrateFromSelectedCourse
   * pt-BR: Ao selecionar um curso, carrega `valor` e `tipo_curso` (config) a partir dos dados do curso.
   * en-US: When a course is selected, loads `valor` and `tipo_curso` (config) from the course data.
   */
  useEffect(() => {
    if (!selectedCourseId) return;
    const c = courseItems.find((it: any) => String(it.id) === String(selectedCourseId));
    if (!c) return;
    // Valor do curso: usa string já formatada do backend se disponível
    if (c.valor) setValor(String(c.valor));
    // Tipo do curso: usa `tipo` quando presente
    if (c.tipo) setTipoCurso(String(c.tipo));
  }, [selectedCourseId, courseItems]);

  /**
   * fetchClasses
   * pt-BR: Busca turmas filtradas pelo curso selecionado.
   * en-US: Fetch classes filtered by the selected course.
   */
  const classesQuery = useQuery({
    queryKey: ['turmas', 'list', { page: 1, per_page: 200, id_curso: selectedCourseId || undefined, search: classSearch || undefined }],
    queryFn: async () => turmasService.listTurmas({ page: 1, per_page: 200, id_curso: selectedCourseId ? Number(selectedCourseId) : undefined, search: classSearch || undefined }),
    enabled: !!selectedCourseId,
  });

  const classItems = (classesQuery.data as PaginatedResponse<any> | undefined)?.data || [];
  const classOptions = useComboboxOptions(classItems, 'id', 'nome');

  /**
   * getOptionRange
   * pt-BR: Calcula dinamicamente o intervalo de opções (índices) disponível para o campo "Opção".
   *        Pelo menos 1–10; aumenta conforme o número de linhas e o maior índice utilizado.
   * en-US: Dynamically computes the available option index range for the "Opção" field.
   *        At least 1–10; grows with the number of rows and the highest used index.
   */
  const getOptionRange = (items: InstallmentParcel[]) => {
    const used = items.map((p) => Number(p.index)).filter((n) => Number.isFinite(n));
    const maxUsed = used.length ? Math.max(...used) : 0;
    const lengthPlusOne = items.length + 1;
    const upper = Math.max(maxUsed + 1, lengthPlusOne, 10);
    return Array.from({ length: upper }, (_, i) => i + 1);
  };

  /**
   * optionRangeMemo
   * pt-BR: Intervalo memoizado para alimentar o Select de "Opção".
   * en-US: Memoized range to feed the "Opção" Select.
   */
  const optionRangeMemo = useMemo(() => getOptionRange(parcelas), [parcelas]);

  /**
   * addClassToSelection
   * pt-BR: Adiciona a turma selecionada ao conjunto previsao_turma[], evitando duplicados.
   * en-US: Adds the selected class to previsao_turma[], avoiding duplicates.
   */
  const addClassToSelection = () => {
    if (!classToAdd) return;
    setSelectedClassIds((prev) => prev.includes(classToAdd) ? prev : [...prev, classToAdd]);
    setClassToAdd('');
  };

  /**
   * removeClassFromSelection
   * pt-BR: Remove uma turma da seleção.
   * en-US: Removes a class from the selection.
   */
  const removeClassFromSelection = (id: string) => {
    setSelectedClassIds((prev) => prev.filter((x) => x !== id));
  };

  /**
   * addParcelaRow
   * pt-BR: Adiciona uma nova linha de parcela, escolhendo índice seguinte.
   * en-US: Adds a new parcel row, choosing the next index.
   */
  const addParcelaRow = () => {
    /**
     * getNextAvailableOptionIndex
     * pt-BR: Retorna o primeiro índice disponível dentro do intervalo dinâmico calculado.
     * en-US: Returns the first available index inside the dynamically computed range.
     */
    const getNextAvailableOptionIndex = (items: InstallmentParcel[]) => {
      const range = getOptionRange(items);
      for (const n of range) {
        if (!items.some((p) => Number(p.index) === n)) return n;
      }
      return range[range.length - 1];
    };
    const nextIndex = getNextAvailableOptionIndex(parcelas);
    setParcelas((prev) => [...prev, { index: nextIndex, parcela: '', tipo_entrada: '%', entrada: '', juros: '', valor: '', desconto: '' }]);
  };

  /**
   * removeParcelaRow
   * pt-BR: Remove uma linha de parcela pelo índice.
   * en-US: Removes a parcel row by index.
   */
  const removeParcelaRow = (idx: number) => {
    setParcelas((prev) => prev.filter((p) => p.index !== idx));
  };

  /**
   * addTx2Row
   * pt-BR: Adiciona nova linha de configuração tx2.
   * en-US: Adds a new tx2 config row.
   */
  const addTx2Row = () => {
    setConfigTx2((prev) => [...prev, { name_label: '', name_valor: '' }]);
  };

  /**
   * removeTx2Row
   * pt-BR: Remove linha da configuração tx2.
   * en-US: Removes a tx2 config row.
   */
  const removeTx2Row = (i: number) => {
    setConfigTx2((prev) => prev.filter((_, idx) => idx !== i));
  };

  /**
   * renderAtivoBadge
   * pt-BR: Renderiza um badge amigável para o valor de ativo ('s'/'n').
   * en-US: Renders a friendly badge for the active value ('s'/'n').
   */
  const renderAtivoBadge = (v?: 's' | 'n' | 'y') => {
    if (v === 's' || v === 'y') {
      return <Badge variant="default">Ativo</Badge>;
    }
    if (v === 'n') {
      return <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">-</Badge>;
  };

  /**
   * createMutation
   * pt-BR: Muta para criar a tabela de parcelamentos via POST urlencoded.
   * en-US: Mutation to create installment table via urlencoded POST.
   */
  const createMutation = useMutation({
    mutationFn: async (payload: InstallmentPayload) => {
      const data = buildInstallmentUrlencoded(payload);
      return installmentsService.createFormUrlEncoded(data);
    },
    onSuccess: () => {
      // Limpa erros ao concluir com sucesso
      setFormErrors({});
      qc.invalidateQueries({ queryKey: ['installments', 'list'] });
      // Resetar formulário
      setNome(''); setValor(''); setObs(''); setSelectedClassIds([]); setEditingId(null);
      // pt-BR: Decide finalizar ou continuar baseado em finishAfterSaveRef.
      // en-US: Decide to finish or continue based on finishAfterSaveRef.
      if (finishAfterSaveRef.current) {
        // pt-BR: Fecha formulário antes de navegar para a listagem.
        // en-US: Close form before navigating back to listing.
        setShowForm(false);
        navigate('/admin/settings/table-installment');
      } else {
        // Continuar editando na mesma rota/modal
        setShowForm(true);
      }
    },
    onError: (error: any) => {
      /**
       * handleApiValidationErrors (create)
       * pt-BR: Usa parseApiError para refletir exatamente a resposta do backend.
       * en-US: Uses parseApiError to reflect backend response exactly.
       */
      const { message, fieldErrors, details } = parseApiError(error);
      setFormErrors(fieldErrors);
      const description = [message, ...details].filter(Boolean).join(' — ');
      toast({ title: 'Erro ao criar parcelamento', description, variant: 'destructive' });
    }
  });

  /**
   * updateMutation
   * pt-BR: Atualiza tabela de parcelamentos via PUT urlencoded.
   * en-US: Updates installment table via urlencoded PUT.
   */
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: InstallmentPayload }) => {
      const data = buildInstallmentUrlencoded({ ...payload, id });
      return installmentsService.updateFormUrlEncoded(id, data);
    },
    onSuccess: () => {
      // Limpa erros ao concluir com sucesso
      setFormErrors({});
      qc.invalidateQueries({ queryKey: ['installments', 'list'] });
      setEditingId(null);
      toast({ title: 'Parcelamento atualizado', description: 'As alterações foram salvas com sucesso.' });
      // pt-BR: Finaliza ou continua conforme finishAfterSaveRef.
      // en-US: Finish or continue based on finishAfterSaveRef.
      if (finishAfterSaveRef.current) {
        // pt-BR: Fecha formulário antes de navegar para a listagem.
        // en-US: Close form before navigating back to listing.
        setShowForm(false);
        navigate('/admin/settings/table-installment');
      } else {
        setShowForm(true);
      }
    },
    onError: (error: any) => {
      /**
       * handleApiValidationErrors (update)
       * pt-BR: Usa parseApiError para refletir exatamente a resposta do backend.
       * en-US: Uses parseApiError to reflect backend response exactly.
       */
      const { message, fieldErrors, details } = parseApiError(error);
      setFormErrors(fieldErrors);
      const description = [message, ...details].filter(Boolean).join(' — ');
      toast({ title: 'Erro ao atualizar parcelamento', description, variant: 'destructive' });
    }
  });

  /**
   * deleteMutation
   * pt-BR: Exclui um parcelamento por ID e atualiza a listagem.
   * en-US: Deletes an installment by ID and refreshes the listing.
   */
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => installmentsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['installments', 'list'] });
      toast({ title: 'Parcelamento excluído', description: 'O registro foi removido com sucesso.' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao excluir', description: err?.message || 'Não foi possível excluir o registro.', variant: 'destructive' });
    }
  });

  /**
   * listQuery
   * pt-BR: Lista tabelas de parcelamentos.
   * en-US: Lists installment tables.
   */
  const listQuery = useQuery({
    queryKey: ['installments', 'list', { page: 1, per_page: 20 }],
    queryFn: async () => installmentsService.list({ page: 1, per_page: 20 }),
  });

  /**
   * handleSubmit
   * pt-BR: Monta o payload estruturado e envia.
   * en-US: Builds the structured payload and submits.
   */
  /**
   * handleSubmit
   * pt-BR: Submete formulário; decide entre CREATE ou UPDATE conforme `editingId`.
   * en-US: Submits the form; decides between CREATE or UPDATE based on `editingId`.
   */
  /**
   * handleSubmit
   * pt-BR: Normaliza valores monetários (remove máscara) e envia o payload.
   * en-US: Normalizes monetary values (remove mask) and submits the payload.
   */
  const handleSubmit = async () => {
    // Normaliza campo principal de valor
    const valorSend = valor ? currencyRemoveMaskToString(valor) : '';
    // Normaliza valores dentro de parcelas
    const parcelasSend: InstallmentParcel[] = (parcelas || []).map((p) => ({
      ...p,
      valor: p.valor ? currencyRemoveMaskToString(p.valor) : p.valor,
      desconto: p.desconto ? currencyRemoveMaskToString(p.desconto) : p.desconto,
    }));
    const payload: InstallmentPayload = {
      id_curso: selectedCourseId,
      nome,
      previsao_turma_ids: selectedClassIds,
      valor: valorSend,
      ativo,
      obs,
      tipo_curso: tipoCurso,
      parcelas: parcelasSend,
      config_tx2: configTx2,
    };
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  /**
   * handleBack
   * pt-BR: Volta para a lista de tabelas e fecha o formulário.
   * en-US: Goes back to the table list and closes the form.
   */
  const handleBack = () => {
    navigate('/admin/settings/table-installment');
    setShowForm(false);
    setEditingId(null);
  };

  /**
   * handleSaveContinue
   * pt-BR: Salva e mantém a página aberta para continuar editando.
   * en-US: Saves and keeps the page open to continue editing.
   */
  const handleSaveContinue = async () => {
    finishAfterSaveRef.current = false;
    await handleSubmit();
  };

  /**
   * handleSaveFinish
   * pt-BR: Salva e finaliza, retornando para a listagem.
   * en-US: Saves and finishes, returning to the listing.
   */
  const handleSaveFinish = async () => {
    finishAfterSaveRef.current = true;
    await handleSubmit();
  };

  /**
   * startEdit
   * pt-BR: Carrega dados do registro selecionado e popula o formulário para edição.
   * en-US: Loads selected record and populates the form for editing.
   */
  const startEdit = async (id: string) => {
    const rec = await installmentsService.getById(id);
    setEditingId(String(rec.id));
    // pt-BR: Mostra o formulário ao iniciar a edição.
    // en-US: Show the form when starting an edit.
    setShowForm(true);
    setSelectedCourseId(String(rec.id_curso ?? ''));
    setNome(String(rec.nome ?? ''));
    const cfg: any = (rec as any)?.config || {};
    // Valor: usa config.valor (mascarado) se disponível; senão rec.valor
    setValor(String((cfg.valor ?? rec.valor ?? '') || ''));
    setAtivo((String(rec.ativo ?? 's') as any));
    setObs(String(rec.obs ?? ''));
    setTipoCurso(String((rec.tipo_curso ?? cfg.tipo_curso ?? '4')));
    // Previsão de turmas: tenta raiz e depois config.previsao_turma
    const previsoes = ((rec as any)?.previsao_turma_ids as any) ?? cfg.previsao_turma ?? [];
    setSelectedClassIds(Array.isArray(previsoes) ? previsoes.map((v: any) => String(v)) : []);
    // Parcelas: usa rec.parcelas[] se existir; senão normaliza config.parcelas { index: {...} }
    const recParcelas: any[] = (rec as any)?.parcelas ?? [];
    if (Array.isArray(recParcelas) && recParcelas.length > 0) {
      setParcelas(recParcelas as any);
    } else if (cfg.parcelas && typeof cfg.parcelas === 'object') {
      const arr = Object.entries(cfg.parcelas).map(([k, v]: [string, any]) => ({
        index: Number(k),
        parcela: String(v?.parcela ?? ''),
        tipo_entrada: String(v?.tipo_entrada ?? '%'),
        entrada: String(v?.entrada ?? ''),
        juros: String(v?.juros ?? ''),
        valor: String(v?.valor ?? ''),
        desconto: String(v?.desconto ?? ''),
      }));
      setParcelas(arr.length ? arr : [{ index: 1, parcela: '6', tipo_entrada: '%', entrada: '', juros: '', valor: '', desconto: '' }]);
    } else {
      setParcelas([{ index: 1, parcela: '6', tipo_entrada: '%', entrada: '', juros: '', valor: '', desconto: '' }]);
    }
    // Config tx2: tenta rec.config_tx2[] e depois config.tx2[]
    const tx2 = (rec as any)?.config_tx2 ?? cfg.tx2 ?? [];
    setConfigTx2(Array.isArray(tx2) ? tx2 : []);
  };

  /**
   * handleDeleteClick
   * pt-BR: Pede confirmação e dispara a exclusão do registro.
   * en-US: Asks for confirmation and triggers record deletion.
   */
  const handleDeleteClick = async (id: string) => {
    const ok = window.confirm('Excluir este parcelamento? Esta ação não pode ser desfeita.');
    if (!ok) return;
    await deleteMutation.mutateAsync(id);
    if (editingId === id) {
      resetForm();
      // pt-BR: Fechamos o formulário se o item em edição foi excluído.
      // en-US: Close the form if the item being edited was deleted.
      if (isEditRoute) {
        navigate('/admin/settings/table-installment');
      } else {
        setShowForm(false);
      }
    }
  };

  /**
   * resetForm
   * pt-BR: Limpa formulário e sai do modo de edição.
   * en-US: Clears form and exits edit mode.
   */
  const resetForm = () => {
    setEditingId(null);
    setSelectedCourseId('');
    setNome('');
    setValor('');
    setAtivo('s');
    setObs('');
    // Mantém valor interno padrão
    setSelectedClassIds([]);
    setParcelas([{ index: 1, parcela: '6', tipo_entrada: '%', entrada: '', juros: '', valor: '', desconto: '' }]);
    setConfigTx2([{ name_label: 'Desconto de Pontualidade Mensalidade', name_valor: 'R$1.000,00 de desconto na mensalidade para pagamentos até a data de vencimento.' }]);
  };

  /**
   * open form based on route
   * pt-BR: Abre o formulário automaticamente conforme rota dedicada (create/edit).
   * en-US: Automatically opens the form based on dedicated route (create/edit).
   */
  useEffect(() => {
    if (isCreateRoute) {
      resetForm();
      setShowForm(true);
    } else if (isEditRoute && routeId) {
      startEdit(routeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateRoute, isEditRoute, routeId]);

  return (
    // pt-BR: Usa container padrão para igualar espaçamento/largura ao ProposalsEdit.
    // en-US: Use standard container to match spacing/width with ProposalsEdit.
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tabelas de Parcelamentos</h1>
        {/* pt-BR: Exibe ação de adicionar apenas na listagem para manter paridade visual.
            en-US: Show add action only on listing to keep visual parity. */}
        {(!isCreateRoute && !isEditRoute) && (
          <Button type="button" onClick={() => { navigate('/admin/settings/table-installment/create'); }}>
            Adicionar parcelamento
          </Button>
        )}
      </div>

  {(showForm && (isCreateRoute || isEditRoute)) && (
  <Card>
        <CardHeader>
          <CardTitle>{editingId ? `Editar Parcelamento #${editingId}` : 'Novo Parcelamento'}</CardTitle>
          <CardDescription>
            {editingId ? 'Atualize os dados do parcelamento selecionado.' : 'Vincule ao curso e às turmas, configure parcelas e textos (tx2).'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Curso */}
            <div>
              <Label>Curso</Label>
              <Combobox
                options={courseOptions}
                value={selectedCourseId}
                onValueChange={(val) => setSelectedCourseId(val)}
                placeholder="Selecione o curso"
                emptyText={coursesQuery.isLoading ? 'Carregando...' : 'Nenhum curso encontrado'}
                loading={coursesQuery.isLoading}
              />
            </div>

            {/* Nome */}
            <div>
              <Label>Nome</Label>
              <Input placeholder="Desconto de Pontualidade" value={nome} onChange={(e) => setNome(e.target.value)} />
              {formErrors?.nome && (
                <p className="text-sm text-destructive mt-1">{formErrors.nome}</p>
              )}
            </div>

            {/* Valor */}
            <div>
              <Label>Valor</Label>
              <Input
                placeholder="R$ 0,00"
                inputMode="numeric"
                value={valor}
                onChange={(e) => setValor(currencyApplyMask(e.target.value, 'pt-BR', 'BRL'))}
              />
              {formErrors?.valor && (
                <p className="text-sm text-destructive mt-1">{formErrors.valor}</p>
              )}
            </div>

            {/* Ativo */}
            <div>
              <Label>Ativo</Label>
              <div className="flex items-center gap-3 py-2">
                <Switch
                  id="ativo-switch"
                  checked={ativo === 's'}
                  onCheckedChange={(checked) => setAtivo(checked ? 's' : 'n')}
                />
                <span className="text-sm text-muted-foreground">{ativo === 's' ? 'Sim' : 'Não'}</span>
              </div>
            </div>

            {/* Tipo do Curso removido do UI por solicitação */}

            
          </div>

          {/* Turmas vinculadas */}
          <div className="mt-6 space-y-3">
            <Label>Turmas vinculadas ao curso (previsão)</Label>
            <p className="text-xs text-muted-foreground">Se nenhuma turma for escolhida, a tabela será aplicada a todas as turmas do curso selecionado.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
              <Combobox
                options={classOptions}
                value={classToAdd}
                onValueChange={setClassToAdd}
                placeholder={selectedCourseId ? 'Selecionar turma do curso' : 'Selecione um curso primeiro'}
                emptyText={classesQuery.isLoading ? 'Carregando...' : 'Digite para filtrar'}
                loading={classesQuery.isLoading || classesQuery.isFetching}
                onSearch={setClassSearch}
                searchTerm={classSearch}
                debounceMs={250}
                disabled={!selectedCourseId}
              />
              <div>
                <Button type="button" onClick={addClassToSelection} disabled={!classToAdd}>Adicionar turma</Button>
              </div>
              <div className="md:col-span-1">
                <div className="flex flex-wrap gap-2">
                  {selectedClassIds.map((cid) => (
                    <span key={cid} className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-2 py-1 rounded">
                      {cid}
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => removeClassFromSelection(cid)}>Remover</Button>
                    </span>
                  ))}
                  {selectedClassIds.length === 0 && (
                    <span className="text-xs text-muted-foreground">Nenhuma turma adicionada</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Parcelas */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <Label>Parcelas</Label>
              <Button type="button" onClick={addParcelaRow}>Adicionar parcela</Button>
            </div>
            <div className="space-y-3">
              {parcelas.map((p, idx) => (
                <div key={p.index} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                  <div>
                    <Label>Opção</Label>
                    {/*
                      Select de 1 a 10 para o índice da opção
                      1–10 options select for the option index
                    */}
                    <Select
                      value={String(p.index)}
                      onValueChange={(v) => setParcelas(prev => prev.map((pp, i) => i === idx ? { ...pp, index: Number(v) } : pp))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {optionRangeMemo.map((n) => {
                          const disabled = parcelas.some((pp, i) => i !== idx && Number(pp.index) === n);
                          return (
                            <SelectItem key={n} value={String(n)} disabled={disabled}>{n}</SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Total Parcelas</Label>
                    {/*
                      Select 1–12 para quantidade total de parcelas.
                      1–12 options select for total installments.
                    */}
                    <Select
                      value={String(p.parcela || '')}
                      onValueChange={(v) => {
                        setParcelas(prev => prev.map((pp, i) => {
                          if (i !== idx) return pp;
                          const next = { ...pp, parcela: v };
                          // Auto-cálculo: se o valor total (campo acima) estiver preenchido, recalcula o valor da linha
                          if (valor) {
                            next.valor = computePerParcelValue(valor, v) || next.valor;
                          }
                          return next;
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* <div>
                    <Label>Tipo Entrada</Label>
                    <Input value={p.tipo_entrada} onChange={(e) => setParcelas(prev => prev.map((pp, i) => i === idx ? { ...pp, tipo_entrada: e.target.value } : pp))} />
                  </div>
                  <div>
                    <Label>Entrada</Label>
                    <Input value={p.entrada || ''} onChange={(e) => setParcelas(prev => prev.map((pp, i) => i === idx ? { ...pp, entrada: e.target.value } : pp))} />
                  </div> */}
                  {/* <div>
                    <Label>Juros</Label>
                    <Input value={p.juros || ''} onChange={(e) => setParcelas(prev => prev.map((pp, i) => i === idx ? { ...pp, juros: e.target.value } : pp))} />
                  </div> */}
                  <div>
                    <Label>Valor <span className="text-muted-foreground text-xs">(Se não preenchido, será o valor do curso)</span></Label>
                    <Input
                      value={p.valor || ''}
                      inputMode="numeric"
                      onChange={(e) => {
                        const masked = currencyApplyMask(e.target.value, 'pt-BR', 'BRL');
                        setParcelas(prev => prev.map((pp, i) => i === idx ? { ...pp, valor: masked } : pp));
                      }}
                    />
                  </div>
                  {/* Desconto (componente moeda) */}
                  <div>
                    <Label>Desconto</Label>
                    <Input
                      value={p.desconto || ''}
                      inputMode="numeric"
                      onChange={(e) => {
                        const masked = currencyApplyMask(e.target.value, 'pt-BR', 'BRL');
                        setParcelas(prev => prev.map((pp, i) => i === idx ? { ...pp, desconto: masked } : pp));
                      }}
                    />
                    {invalidDiscountIndices.has(p.index) && (
                      <div className="text-red-600 text-xs mt-1">Desconto não pode ser maior que o Valor.</div>
                    )}
                  </div>
                  <div className="md:col-span-4 flex justify-end">
                    <Button type="button" variant="outline" onClick={() => removeParcelaRow(p.index)}>Remover</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Config tx2 */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <Label>Configuração tx2</Label>
              <Button type="button" onClick={addTx2Row}>Adicionar texto</Button>
            </div>
            <div className="space-y-3">
              {configTx2.map((c, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
                  <div>
                    <Label>Label</Label>
                    <Input value={c.name_label} onChange={(e) => setConfigTx2(prev => prev.map((cc, i) => i === idx ? { ...cc, name_label: e.target.value } : cc))} />
                  </div>
                  <div>
                    <Label>Valor/Descrição</Label>
                    <Input value={c.name_valor} onChange={(e) => setConfigTx2(prev => prev.map((cc, i) => i === idx ? { ...cc, name_valor: e.target.value } : cc))} />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <Button type="button" variant="outline" onClick={() => removeTx2Row(idx)}>Remover</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2">
          {/* Obs */}
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <RichTextEditor
                value={obs}
                onChange={setObs}
                placeholder="Adicione observações formatadas (negrito, listas, etc.)"
              />
            </div>
          </div>
          {/* Espaço para o rodapé fixo não cobrir o conteúdo */}
          <div className="h-16" />
        </CardContent>
      </Card>
      )}

      {/* Rodapé fixo com ações (igual ao ProposalsEdit) */}
      {(showForm && (isCreateRoute || isEditRoute)) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-50">
          <div className="container mx-auto flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={handleBack}>
              Voltar
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                onClick={handleSaveContinue}
                disabled={(createMutation.isPending || updateMutation.isPending) || !selectedCourseId || !nome || hasInvalidDiscount}
              >
                Salvar e Continuar
              </Button>
              <Button
                type="button"
                onClick={handleSaveFinish}
                disabled={(createMutation.isPending || updateMutation.isPending) || !selectedCourseId || !nome || hasInvalidDiscount}
              >
                Salvar e Finalizar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de parcelamentos */}
      {(!isCreateRoute && !isEditRoute) && (
      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
          <CardDescription>Parcelamentos cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-2 px-2">ID</th>
                  <th className="py-2 px-2">Nome</th>
                  <th className="py-2 px-2">Curso</th>
                  <th className="py-2 px-2">Valor</th>
                  <th className="py-2 px-2">Ativo</th>
                  <th className="py-2 px-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(listQuery.data as PaginatedResponse<InstallmentRecord> | undefined)?.data?.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="py-2 px-2">{it.id}</td>
                    <td className="py-2 px-2">{it.nome}</td>
                    <td className="py-2 px-2">{courseNameById.get(String(it.id_curso)) || String(it.id_curso) || '-'}</td>
                    <td className="py-2 px-2">{it.valor || '-'}</td>
                    <td className="py-2 px-2">{renderAtivoBadge(it.ativo)}</td>
                    <td className="py-2 px-2 text-right">
                      <div className="inline-flex gap-2 justify-end">
                        <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => navigate(`/admin/settings/table-installment/${it.id}/edit`)}>Editar</Button>
                        <Button variant="destructive" size="sm" className="h-7 px-2" onClick={() => handleDeleteClick(String(it.id))}>Excluir</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {((listQuery.data as PaginatedResponse<InstallmentRecord> | undefined)?.data?.length || 0) === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">Nenhum registro encontrado</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}