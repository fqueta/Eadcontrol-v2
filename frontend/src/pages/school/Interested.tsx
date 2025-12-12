import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Combobox, useComboboxOptions } from '@/components/ui/combobox';
import { useQuery } from '@tanstack/react-query';
import { coursesService } from '@/services/coursesService';
import { useTurmasList } from '@/hooks/turmas';
import { useDebounce } from '@/hooks/useDebounce';
import { useEnrollmentsList } from '@/hooks/enrollments';
import { toast } from '@/hooks/use-toast';
import EnrollmentTable from '@/components/enrollments/EnrollmentTable';

/**
 * Interested
 * pt-BR: Página de listagem de Interessados (matrículas com `situacao=int`).
 *        Reutiliza os componentes de Enroll, ajustando o endpoint de listagem
 *        para GET `/matriculas?situacao=int`.
 * en-US: Interested listing page (enrollments with `situacao=int`).
 *        Reuses Enroll components, adjusting the list endpoint to
 *        GET `/matriculas?situacao=int`.
 */
export default function Interested() {
  /**
   * navigate
   * pt-BR: Hook de navegação para redirecionar à visualização/edição de propostas.
   * en-US: Navigation hook to redirect to proposals view/edit pages.
   */
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search || ''}`;
  // Busca global
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Paginação
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Filtros
  const [studentFilter, setStudentFilter] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [courseSearch, setCourseSearch] = useState('');
  const [classSearch, setClassSearch] = useState('');

  /**
   * clearFilters
   * pt-BR: Limpa filtros e busca; reinicia paginação.
   * en-US: Clears filters and search; resets pagination.
   */
  const clearFilters = () => {
    setSelectedCourseId('');
    setSelectedClassId('');
    setCourseSearch('');
    setClassSearch('');
    setStudentFilter('');
    setSearch('');
    setPage(1);
  };

  /**
   * listParams
   * pt-BR: Parâmetros para GET `/matriculas?situacao=int` com paginação e filtros.
   * en-US: Params for GET `/matriculas?situacao=int` with pagination and filters.
   */
  const listParams = useMemo(() => ({
    situacao: 'int',
    page,
    per_page: perPage,
    search: debouncedSearch || undefined,
    id_curso: selectedCourseId ? Number(selectedCourseId) : undefined,
    id_turma: selectedClassId ? Number(selectedClassId) : undefined,
    student: studentFilter || undefined,
  }), [page, perPage, debouncedSearch, selectedCourseId, selectedClassId, studentFilter]);

  /**
   * useEnrollmentsList
   * pt-BR: Busca interessados (matrículas com `situacao=int`).
   * en-US: Fetch interested enrollments (`situacao=int`).
   */
  const { data: resp, isLoading, isFetching, error } = useEnrollmentsList(listParams, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount: number, err: any) => {
      if (err?.status >= 400 && err?.status < 500) return false;
      return failureCount < 1;
    },
  });

  if (error) {
    const message = (error as any)?.message || 'Falha ao carregar interessados';
    toast({ title: 'Erro ao carregar interessados', description: message, variant: 'destructive' });
  }

  /**
   * coursesQuery
   * pt-BR: Cursos para filtro (combobox), com busca.
   * en-US: Courses for filter (combobox), with search.
   */
  const coursesQuery = useQuery({
    queryKey: ['cursos', 'list', 200, courseSearch],
    queryFn: async () => coursesService.listCourses({ page: 1, per_page: 200, search: courseSearch }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const courseItems = (coursesQuery.data?.data || []) as any[];
  const courseOptions = useComboboxOptions(courseItems, 'id', 'nome', undefined, (c: any) => String(c?.titulo || ''));

  /**
   * classesQuery
   * pt-BR: Turmas para filtro (combobox), com busca remota.
   * en-US: Classes for filter (combobox), with remote search.
   */
  const classesQuery = useTurmasList({ page: 1, per_page: 200, search: classSearch, id_curso: selectedCourseId ? Number(selectedCourseId) : undefined }, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const classItems = (classesQuery.data?.data || []) as any[];
  const classOptions = useComboboxOptions(classItems, 'id', 'nome', undefined, (t: any) => String(t?.token || ''));

  /**
   * formatBRL
   * pt-BR: Formata valores para BRL.
   * en-US: Formats values to BRL.
   */
  const formatBRL = (v?: number | string | null) => {
    const toNumber = (x: any): number | undefined => {
      if (typeof x === 'number') return x;
      if (typeof x === 'string') {
        const s = x.trim();
        const br = /^\d{1,3}(\.\d{3})*(,\d+)?$/;
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
   * pt-BR: Resolve e formata o valor prioritário da matrícula.
   * en-US: Resolves and formats the enrollment amount.
   */
  const resolveAmountBRL = (enroll: any) => {
    const amount = enroll?.meta?.gera_valor_preco ?? enroll?.total ?? enroll?.subtotal ?? null;
    return formatBRL(amount);
  };

  const items = useMemo(() => resp?.data || [], [resp]);
  const currentPage = resp?.current_page ?? 1;
  const lastPage = resp?.last_page ?? 1;
  const total = resp?.total ?? items.length;

  const buildFiltersLegend = () => {
    const parts: string[] = [];
    if (selectedCourseId) {
      const courseName = (courseItems.find((c: any) => String(c.id) === String(selectedCourseId))?.nome) || 'Curso selecionado';
      parts.push(`Curso: ${courseName}`);
    }
    if (selectedClassId) {
      const className = (classItems.find((c: any) => String(c.id) === String(selectedClassId))?.nome) || 'Turma selecionada';
      parts.push(`Turma: ${className}`);
    }
    if (studentFilter?.trim()) parts.push(`Aluno: ${studentFilter.trim()}`);
    if (search?.trim()) parts.push(`Busca: ${search.trim()}`);
    return parts.length ? `Filtros aplicados — ${parts.join(' • ')}` : 'Nenhum filtro aplicado';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Interessados</h1>
          <p className="text-muted-foreground">Listagem de interessados</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por aluno, curso, descrição" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de interessados</CardTitle>
          <CardDescription>Matrículas com situação "int"</CardDescription>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filtros</span>
            </div>
            {!selectedCourseId && (
              <Combobox
                options={courseOptions}
                value={selectedCourseId}
                onValueChange={(val) => { setSelectedCourseId(val); setSelectedClassId(''); setClassSearch(''); setPage(1); }}
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
              className={selectedCourseId ? 'md:col-span-2' : ''}
            />
            <Input placeholder="Aluno" value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{buildFiltersLegend()}</span>
            {(selectedCourseId || selectedClassId || studentFilter || search) && (
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={clearFilters}>Limpar filtros e busca</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <EnrollmentTable
              items={items}
              isLoading={isLoading}
              resolveAmountBRL={(item) => resolveAmountBRL(item)}
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
              onDelete={() => {}}
            />
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" title="Página anterior" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1 || isFetching}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">Página {currentPage} de {lastPage}</span>
              <Button variant="outline" size="icon" title="Próxima página" onClick={() => setPage((p) => Math.min(lastPage, p + 1))} disabled={currentPage >= lastPage || isFetching}>
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
    </div>
  );
}