import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, MoreHorizontal, Eye, Edit, Trash2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Combobox, useComboboxOptions } from '@/components/ui/combobox';
import { useQuery } from '@tanstack/react-query';
import { coursesService } from '@/services/coursesService';
import { useTurmasList } from '@/hooks/turmas';
import { useDebounce } from '@/hooks/useDebounce';
import { useEnrollmentsList, useDeleteEnrollment, useUpdateEnrollment } from '@/hooks/enrollments';
import { useEnrollmentSituationsList } from '@/hooks/enrollmentSituations';
import { toast } from '@/hooks/use-toast';
import EnrollmentTable from '@/components/enrollments/EnrollmentTable';
// Substituído: modal de progresso por navegação para página dedicada

/**
 * Enroll
 * pt-BR: Página de listagem de matrículas. Requisita dados na API GET `/matriculas`.
 * en-US: Enrollments listing page. Fetches data from API GET `/matriculas`.
 */
/**
 * Enroll
 * pt-BR: Página de listagem de matrículas com paginação, filtros e ações. Consome GET `/matriculas`.
 * en-US: Enrollment listing page with pagination, filters and row actions. Consumes GET `/matriculas`.
 */
export default function Enroll() {
  /**
   * navigate
   * pt-BR: Hook de navegação para redirecionar à visualização/edição de propostas.
   * en-US: Navigation hook to redirect to proposals view/edit pages.
   */
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search || ''}`;
  // Estado de busca
  const [search, setSearch] = useState('');
  // Estado de paginação
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  // Estado de filtros específicos
  const [studentFilter, setStudentFilter] = useState<string>('');
  // Filtros via Combobox
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [courseSearch, setCourseSearch] = useState('');
  const [classSearch, setClassSearch] = useState('');
  /**
   * selectedSituationId
   * pt-BR: ID da situação para filtro de listagem. Inicial vazio (todas as situações).
   * en-US: Situation ID for listing filter. Starts empty (all situations).
   */
  const [selectedSituationId, setSelectedSituationId] = useState<string>('');

  /**
   * situationsQuery
   * pt-BR: Carrega opções de Situação dinamicamente do endpoint GET
   *        `/situacoes-matricula?skip_first=true&order_by=ID&order=asc`.
   * en-US: Loads Situation options dynamically from
   *        `/situacoes-matricula?skip_first=true&order_by=ID&order=asc`.
   */
  const { data: situationsData, isLoading: isLoadingSituations, isFetching: isFetchingSituations } =
    useEnrollmentSituationsList({
      page: 1,
      per_page: 200,
      skip_first: true,
      order_by: 'ID',
      order: 'asc',
    } as any);

  /**
   * situationOptions
   * pt-BR: Normaliza resposta da API em `{ value, label }`, tentando detectar o código
   *        de filtro aceito pela lista (ex.: 'mat', 'int').
   * en-US: Normalizes API response into `{ value, label }`, trying to detect the filter
   *        code expected by the list (e.g., 'mat', 'int').
   */
  const situationOptions = useMemo(() => {
    const arr = (situationsData?.data || situationsData?.items || []) as any[];
    const computeValue = (s: any) => String(
      // Prioriza ID para uso em `situacao_id`
      s?.id ?? s?.value ?? s?.sigla ?? s?.code ?? s?.codigo ?? s?.abbr
    );
    const computeLabel = (s: any) => (
      s?.label || s?.name || s?.nome || s?.description || `Situação ${String(s?.id ?? '')}`
    );
    const list = arr.map((s) => ({ value: computeValue(s), label: computeLabel(s) }));
    // Fallback quando API não retorna nada: mantém opções básicas
    return list.length ? list : [
      { value: 'mat', label: 'Matriculados' },
      { value: 'int', label: 'Interessados' },
    ];
  }, [situationsData]);

  /**
   * resolveSituationLabel
   * pt-BR: Converte código de situação em rótulo amigável.
   * en-US: Converts situation code to a human-friendly label.
   */
  /**
   * resolveSituationLabel
   * pt-BR: Resolve o rótulo a partir do código usando `situationOptions` dinâmicas.
   * en-US: Resolves label from code using dynamic `situationOptions`.
   */
  const resolveSituationLabel = (id?: string) => {
    const opt = situationOptions.find((o) => o.value === id);
    return opt ? opt.label : id || '-';
  };

  // Estado para diálogos de ação
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');

  /**
   * debouncedSearch
   * pt-BR: Debounce para evitar requisições a cada tecla.
   * en-US: Debounce to avoid firing requests on every keystroke.
   */
  const debouncedSearch = useDebounce(search, 300);

  /**
   * clearFilters
   * pt-BR: Limpa filtros do grid (Curso, Turma, Aluno) e a busca global; reinicia a página.
   * en-US: Clears grid filters (Course, Class, Student) and global search; resets page.
   */
  const clearFilters = () => {
    setSelectedCourseId('');
    setSelectedClassId('');
    setCourseSearch('');
    setClassSearch('');
    setStudentFilter('');
    setSearch('');
    // Reset para visualizar todas as situações
    setSelectedSituationId('');
    setPage(1);
  };

  /**
   * listParams
   * pt-BR: Parâmetros de listagem (página, tamanho e busca) para a API.
   * en-US: Listing params (page, size and search) for the API.
   */
  const listParams = useMemo(() => ({ 
    page, 
    per_page: perPage, 
    search: debouncedSearch || undefined,
    id_curso: selectedCourseId ? Number(selectedCourseId) : undefined,
    id_turma: selectedClassId ? Number(selectedClassId) : undefined,
    student: studentFilter || undefined,
    // pt-BR: usa `situacao_id` ao invés de `situacao`
    // en-US: use `situacao_id` instead of `situacao`
    situacao_id: selectedSituationId || undefined,
  }), [page, perPage, debouncedSearch, selectedCourseId, selectedClassId, studentFilter, selectedSituationId]);

  /**
   * useEnrollmentsList
   * pt-BR: Busca de matrículas via React Query, chamando GET `/matriculas`.
   *        Opções seguras: sem refetch em foco/reconexão e retry limitado.
   * en-US: Fetch enrollments via React Query, calling GET `/matriculas`.
   *        Safe options: no refetch on focus/reconnect and limited retry.
   */
  const { data: enrollmentsResp, isLoading, isFetching, error } = useEnrollmentsList(listParams, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount: number, err: any) => {
      if (err?.status >= 400 && err?.status < 500) return false;
      return failureCount < 1;
    },
  });

  // Hooks para ações
  const deleteMutation = useDeleteEnrollment({
    onSuccess: () => {
      toast({ title: 'Matrícula excluída', description: 'A matrícula foi removida com sucesso.' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao excluir matrícula', description: err?.message || 'Tente novamente mais tarde.', variant: 'destructive' });
    },
  });
  const updateMutation = useUpdateEnrollment({
    onSuccess: () => {
      toast({ title: 'Matrícula atualizada', description: 'Dados atualizados com sucesso.' });
      setEditOpen(false);
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao atualizar matrícula', description: err?.message || 'Verifique os campos e tente novamente.', variant: 'destructive' });
    },
  });

  // Notificação de erro
  if (error) {
    const message = (error as any)?.message || 'Falha ao carregar matrículas';
    toast({ title: 'Erro ao carregar matrículas', description: message, variant: 'destructive' });
  }

  /**
   * formatBRL
   * pt-BR: Formata valores numéricos ou strings ("17.820,00" ou "17820.00") para BRL.
   * en-US: Formats numeric or string values ("17.820,00" or "17820.00") to BRL.
   */
  const formatBRL = (v?: number | string | null) => {
    const toNumber = (x: any): number | undefined => {
      if (typeof x === 'number') return x;
      if (typeof x === 'string') {
        const s = x.trim();
        // Pattern with thousands and comma decimal (pt-BR): 17.820,00
        const br = /^\d{1,3}(\.\d{3})*(,\d+)?$/;
        // Simple dot-decimal: 17820.00
        const en = /^\d+(\.\d+)?$/;
        if (br.test(s)) return Number(s.replace(/\./g, '').replace(',', '.'));
        if (en.test(s)) return Number(s);
      }
      return undefined;
    };
    const n = toNumber(v);
    if (typeof n !== 'number' || Number.isNaN(n)) return '-';
    try {
      return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } catch {
      return String(n);
    }
  };

  /**
   * resolveAmountBRL
   * pt-BR: Resolve o valor prioritário da matrícula (meta.gera_valor_preco > total > subtotal) e formata.
   * en-US: Resolves the enrollment amount priority (meta.gera_valor_preco > total > subtotal) and formats.
   */
  const resolveAmountBRL = (enroll: any) => {
    const amount = enroll?.meta?.gera_valor_preco ?? enroll?.total ?? enroll?.subtotal ?? null;
    return formatBRL(amount);
  };

  /**
   * coursesQuery
   * pt-BR: Lista de cursos para o combobox de filtros, com suporte a busca.
   * en-US: Course list for filter combobox, with search support.
   */
  const coursesQuery = useQuery({
    queryKey: ['cursos', 'list', 200, courseSearch],
    queryFn: async () => coursesService.listCourses({ page: 1, per_page: 200, search: courseSearch }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const courseItems = (coursesQuery.data?.data || coursesQuery.data?.items || []) as any[];
  const courseOptions = useComboboxOptions(courseItems, 'id', 'nome', undefined, (c: any) => String(c?.titulo || ''));

  /**
   * classesQuery
   * pt-BR: Lista de turmas para o combobox de filtros, com busca remota.
   * en-US: Class list for filter combobox, with remote search.
   */
  const classesQuery = useTurmasList({ page: 1, per_page: 200, search: classSearch, id_curso: selectedCourseId ? Number(selectedCourseId) : undefined }, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const classItems = (classesQuery.data?.data || classesQuery.data?.items || []) as any[];
  const classOptions = useComboboxOptions(classItems, 'id', 'nome', undefined, (t: any) => String(t?.token || ''));

  const enrollments = useMemo(() => enrollmentsResp?.data || enrollmentsResp?.items || [], [enrollmentsResp]);
  const currentPage = enrollmentsResp?.current_page ?? 1;
  const lastPage = enrollmentsResp?.last_page ?? 1;
  const total = enrollmentsResp?.total ?? enrollments.length;

  /**
   * progressOpen/progressEnrollment
   * pt-BR: Controle do modal de progresso e matrícula selecionada.
   * en-US: Progress modal control and selected enrollment.
   */
  // Removido: estado do modal de progresso

  // Deriva opções de status a partir dos dados atuais
  // Removido: opções de status para filtro (não utilizado)

  /**
   * buildFiltersLegend
   * Função que monta uma legenda textual indicando quais filtros estão ativos.
   * Inclui Curso, Turma, Aluno e termo de Busca quando presentes.
   */
  const buildFiltersLegend = () => {
    const parts: string[] = [];
    if (selectedSituationId) {
      parts.push(`Situação: ${resolveSituationLabel(selectedSituationId)}`);
    }
    if (selectedCourseId) {
      const courseName = (courseItems.find((c: any) => String(c.id) === String(selectedCourseId))?.nome) || 'Curso selecionado';
      parts.push(`Curso: ${courseName}`);
    }
    if (selectedClassId) {
      const className = (classItems.find((c: any) => String(c.id) === String(selectedClassId))?.nome) || 'Turma selecionada';
      parts.push(`Turma: ${className}`);
    }
    if (studentFilter?.trim()) {
      parts.push(`Aluno: ${studentFilter.trim()}`);
    }
    if (search?.trim()) {
      parts.push(`Busca: ${search.trim()}`);
    }
    return parts.length ? `Filtros aplicados — ${parts.join(' • ')}` : 'Nenhum filtro aplicado';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Matrículas</h1>
          <p className="text-muted-foreground">Listagem de matrículas</p>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          {/* Shortcut to Interested */}
          <Button variant="outline" onClick={() => navigate('/admin/school/interested')}>Interessados</Button>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por aluno, curso, descrição"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de matrículas</CardTitle>
          <CardDescription>Listagem de matriculas</CardDescription>
          {/* Filtros */}
          {/*
           * pt-BR: Melhor disposição dos filtros. O rótulo "Filtros" fica acima,
           *        seguido pelos campos em ordem: Situação, Curso, Turma, Aluno.
           * en-US: Improved filters layout. "Filtros" label sits above, then fields
           *        ordered: Situation, Course, Class, Student.
           */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filtros</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              {/* Situação (Select)
                 pt-BR: inicia vazio para visualizar todas as situações, exibindo o placeholder.
                 en-US: starts empty to show all situations; placeholder is visible. */}
              <Select
                value={selectedSituationId || undefined}
                /**
                 * onValueChange
                 * pt-BR: Mapeia o valor especial "__all__" para limpar o filtro (string vazia) e exibir o placeholder.
                 * en-US: Maps special value "__all__" to clear the filter (empty string) and show placeholder.
                 */
                onValueChange={(v) => { setSelectedSituationId(v === '__all__' ? '' : v); setPage(1); }}
                disabled={isLoadingSituations || isFetchingSituations}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Situação" />
                </SelectTrigger>
                <SelectContent>
                  {/* Opção explícita para visualizar todas as situações */}
                  <SelectItem value="__all__">Todas as situações</SelectItem>
                  {situationOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Curso (Combobox) — esconde quando há curso selecionado */}
              {!selectedCourseId && (
                <Combobox
                  options={courseOptions}
                  value={selectedCourseId}
                  onValueChange={(val) => { 
                    setSelectedCourseId(val); 
                    setSelectedClassId(''); 
                    setClassSearch(''); 
                    setPage(1); 
                  }}
                  placeholder="Curso"
                  searchPlaceholder="Pesquisar curso pelo nome..."
                  emptyText={courseItems.length === 0 ? 'Nenhum curso encontrado' : 'Digite para filtrar'}
                  disabled={coursesQuery.isLoading}
                  loading={coursesQuery.isLoading || coursesQuery.isFetching}
                  onSearch={setCourseSearch}
                  searchTerm={courseSearch}
                  debounceMs={250}
                />
              )}
              {/* Turma (Combobox) */}
              <Combobox
                options={classOptions}
                value={selectedClassId}
                onValueChange={(val) => { setSelectedClassId(val); setPage(1); }}
                placeholder={selectedCourseId ? 'Turma (do curso selecionado)' : 'Turma'}
                searchPlaceholder="Pesquisar turma pelo nome..."
                emptyText={classItems.length === 0 ? 'Nenhuma turma encontrada' : 'Digite para filtrar'}
                disabled={classesQuery.isLoading}
                loading={classesQuery.isLoading || classesQuery.isFetching}
                onSearch={setClassSearch}
                searchTerm={classSearch}
                debounceMs={250}
              />
              {/* Aluno (Input) */}
              <Input placeholder="Aluno" value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} />
            </div>
          </div>
          {/* Legenda dos filtros aplicados */}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{buildFiltersLegend()}</span>
            {(selectedSituationId || selectedCourseId || selectedClassId || studentFilter || search) && (
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={clearFilters}>
                Limpar filtros e busca
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <EnrollmentTable
              items={enrollments}
              isLoading={isLoading}
              resolveAmountBRL={resolveAmountBRL}
              onProgress={(enroll: any) => {
                /**
                 * onProgress
                 * pt-BR: Navega para a página de progresso administrativa, preservando filtros.
                 * en-US: Navigates to the admin progress page, preserving filters.
                 */
                const courseId = String(selectedCourseId || enroll?.id_curso || enroll?.course_id || '');
                const params = new URLSearchParams();
                if (courseId) params.set('id_curso', courseId);
                if (selectedClassId) params.set('id_turma', String(selectedClassId));
                if (search?.trim()) params.set('search', search.trim());
                navigate(`/admin/school/courses/${courseId || 'curso'}/progress?${params.toString()}`);
              }}
              /**
               * onView
               * pt-BR: Abre a visualização de proposta baseada na matrícula (id).
               * en-US: Opens proposal view page based on enrollment (id).
              */
              onView={(enroll: any) => {
                navigate(`/admin/sales/proposals/view/${String(enroll.id)}`, { state: { returnTo } });
              }}
              /**
               * onEdit
               * pt-BR: Abre a edição de proposta baseada na matrícula (id).
               * en-US: Opens proposal edit page based on enrollment (id).
              */
              onEdit={(enroll: any) => {
                navigate(`/admin/sales/proposals/edit/${String(enroll.id)}`, { state: { returnTo } });
              }}
              onDelete={(enroll: any) => { setSelected(enroll); setDeleteOpen(true); }}
            />
          </div>

          {/* Pagination controls */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                title="Página anterior"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || isFetching}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">Página {currentPage} de {lastPage}</span>
              <Button
                variant="outline"
                size="icon"
                title="Próxima página"
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={currentPage >= lastPage || isFetching}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Itens por página</span>
              <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">Total: {total}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progresso: substituído por navegação para página dedicada */}

      {/* View dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da matrícula</DialogTitle>
            <DialogDescription>ID: {selected?.id}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Aluno:</span> {selected?.student_name || selected?.name || '-'}</div>
            <div><span className="text-muted-foreground">Curso:</span> {selected?.course_name || '-'}</div>
            <div><span className="text-muted-foreground">Situação:</span> {selected?.situacao || selected?.status || '-'}</div>
            <div><span className="text-muted-foreground">Valor:</span> {formatBRL(selected?.amount_brl)}</div>
            {selected?.description && <div><span className="text-muted-foreground">Descrição:</span> {selected?.description}</div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar matrícula</DialogTitle>
            <DialogDescription>ID: {selected?.id}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <span className="text-xs text-muted-foreground">Status</span>
              <Input value={editStatus} onChange={(e) => setEditStatus(e.target.value)} placeholder="Status" />
            </div>
            <div className="grid gap-1">
              <span className="text-xs text-muted-foreground">Valor (BRL)</span>
              <Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button 
                onClick={() => {
                  if (!selected?.id) return;
                  const payload: any = { status: editStatus };
                  if (editAmount !== '') payload.amount_brl = Number(editAmount);
                  updateMutation.mutate({ id: String(selected.id), data: payload });
                }}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete alert */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir matrícula</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Confirme a exclusão da matrícula ID {selected?.id}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!selected?.id) return;
                deleteMutation.mutate(String(selected.id), {
                  onSettled: () => setDeleteOpen(false),
                });
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}