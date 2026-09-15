import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesService } from '@/services/coursesService';
import { CourseRecord } from '@/types/courses';
import { PaginatedResponse } from '@/types/index';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal, 
  Plus, 
  BookOpen, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  CheckCircle2,
  Globe,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

/**
 * Courses — CRUD de cursos com layout moderno e denso
 * pt-BR: Lista, cria, edita e exclui cursos; persiste filtros na URL.
 * en-US: Lists, creates, edits and deletes courses; persists filters in URL.
 */
type SortDir = 'asc' | 'desc';
type SortableColumn = 'id' | 'titulo' | 'ativo' | 'publicar' | 'destaque' | 'valor';

interface SortState {
  column: SortableColumn;
  dir: SortDir;
}

export default function Courses() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // --- URL Sync helpers ---
  const getInitialParamsFromURL = () => {
    const qs = new URLSearchParams(location.search);
    const per = Number(qs.get('per_page') || 10);
    const p = Number(qs.get('page') || 1);
    return {
      perPage: Number.isNaN(per) ? 10 : per,
      page: Number.isNaN(p) ? 1 : p,
      searchTerm: qs.get('search') || '',
      sortColumn: (qs.get('order_by') || 'updated_at') as SortableColumn,
      sortDir: (qs.get('sort_order') || 'desc') as SortDir,
    };
  };

  const init = getInitialParamsFromURL();
  const [perPage, setPerPage] = useState<number>(init.perPage);
  const [page, setPage] = useState<number>(init.page);
  const [searchTerm, setSearchTerm] = useState<string>(init.searchTerm);
  const [sort, setSort] = useState<SortState>({ column: init.sortColumn, dir: init.sortDir });
  const debouncedSearch = useDebounce(searchTerm, 400);

  // --- URL persistence effect ---
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    params.set('per_page', String(perPage));
    params.set('page', String(page));
    params.set('search', String(searchTerm || ''));
    params.set('order_by', sort.column);
    params.set('sort_order', sort.dir);
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [perPage, page, searchTerm, sort, location.pathname, navigate]);

  // --- Listagem de cursos ---
  const listQuery = useQuery({
    queryKey: ['courses', 'list', perPage, debouncedSearch, page, sort.column, sort.dir],
    queryFn: async (): Promise<PaginatedResponse<CourseRecord>> => {
      const params: any = { page, per_page: perPage, order_by: sort.column, sort_order: sort.dir };
      if (debouncedSearch?.trim()) params.search = debouncedSearch.trim();
      return coursesService.listCourses(params);
    },
  });

  const handleSort = useCallback((column: SortableColumn) => {
    setSort((prev) => ({
      column,
      dir: prev.column === column && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
    setPage(1);
  }, []);

  const SortIcon = ({ column }: { column: SortableColumn }) => {
    if (sort.column !== column) return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-30" />;
    return sort.dir === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3 inline" />
      : <ArrowDown className="ml-1 h-3 w-3 inline" />;
  };

  // --- KPI Stats Calculation ---
  const stats = useMemo(() => {
    const list = listQuery.data?.data || [];
    const totalCount = listQuery.data?.total ?? list.length;
    const activeCount = list.filter((c) => c.ativo === 's').length;
    const publishedCount = list.filter((c) => c.publicar === 's').length;
    const highlightedCount = list.filter((c) => c.destaque === 's').length;
    return { totalCount, activeCount, publishedCount, highlightedCount };
  }, [listQuery.data]);

  // --- Mutations ---
  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => coursesService.deleteCourse(id),
    onSuccess: () => {
      toast({ title: 'Curso excluído', description: 'Registro removido.' });
      queryClient.invalidateQueries({ queryKey: ['courses', 'list'] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao excluir', description: String(err?.message ?? 'Falha ao excluir curso'), variant: 'destructive' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: any }) => 
      coursesService.updateCourse(id, data),
    onSuccess: () => {
      toast({ title: 'Atualizado', description: 'O status do curso foi atualizado com sucesso.' });
      queryClient.invalidateQueries({ queryKey: ['courses', 'list'] });
    },
    onError: (err: any) => {
      toast({ 
        title: 'Erro ao atualizar', 
        description: String(err?.message ?? 'Não foi possível atualizar o status.'), 
        variant: 'destructive' 
      });
    },
  });

  // --- Handlers ---
  const goToCreate = () => navigate('/admin/school/courses/create');
  const goToEdit = (id: string | number) => navigate(`/admin/school/courses/${id}/edit`);
  const handleRowDoubleClick = (id: string | number) => goToEdit(id);

  const handleToggleField = (course: CourseRecord, field: 'ativo' | 'publicar' | 'destaque') => {
    const newValue = course[field] === 's' ? 'n' : 's';
    updateStatusMutation.mutate({
      id: course.id,
      data: { [field]: newValue }
    });
  };

  // --- UI helpers ---
  const resolveCoverUrl = (c: CourseRecord) => {
    const cover = String((c?.config?.cover?.url || '').trim());
    return cover || '/placeholder.svg';
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'C';
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Cursos
          </h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Gerencie o catálogo de cursos e suas configurações de exibição.
          </p>
        </div>
        <Button onClick={goToCreate} size="sm" className="h-9 px-3 gap-1.5 font-semibold shadow-sm">
          <Plus className="h-4 w-4" /> Novo curso
        </Button>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 border shadow-sm rounded-xl bg-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total de Cursos</p>
            <p className="text-xl font-black tracking-tight text-foreground mt-0.5">{stats.totalCount}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen className="h-4 w-4" />
          </div>
        </Card>

        <Card className="p-3 border shadow-sm rounded-xl bg-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ativos (Pág.)</p>
            <p className="text-xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.activeCount}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </Card>

        <Card className="p-3 border shadow-sm rounded-xl bg-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Publicados (Pág.)</p>
            <p className="text-xl font-black tracking-tight text-indigo-600 dark:text-indigo-400 mt-0.5">{stats.publishedCount}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
            <Globe className="h-4 w-4" />
          </div>
        </Card>

        <Card className="p-3 border shadow-sm rounded-xl bg-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Em Destaque (Pág.)</p>
            <p className="text-xl font-black tracking-tight text-amber-600 dark:text-amber-400 mt-0.5">{stats.highlightedCount}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border shadow-sm rounded-xl overflow-hidden bg-card">
        {/* Toolbar */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="pl-8 h-8 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                placeholder="Pesquisar por nome ou título do curso..."
              />
            </div>
            {listQuery.data?.total !== undefined && (
              <Badge variant="secondary" className="font-mono text-[11px] px-2 py-0.5 shrink-0">
                {listQuery.data.total} {listQuery.data.total === 1 ? 'curso' : 'cursos'}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[95px] h-8 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 por pág.</SelectItem>
                <SelectItem value="25">25 por pág.</SelectItem>
                <SelectItem value="50">50 por pág.</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs">
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Página anterior" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={(listQuery.data?.current_page ?? 1) <= 1 || listQuery.isFetching}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[11px] font-bold tracking-wider text-muted-foreground px-1.5">
                {listQuery.isFetching ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : `${listQuery.data?.current_page ?? page} / ${listQuery.data?.last_page ?? 1}`}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Próxima página" onClick={() => { const last = listQuery.data?.last_page ?? page; setPage((p) => Math.min(last, p + 1)); }} disabled={(listQuery.data?.current_page ?? 1) >= (listQuery.data?.last_page ?? 1) || listQuery.isFetching}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70 dark:bg-slate-800/70">
                <TableRow className="border-b border-slate-100 dark:border-slate-800">
                  <TableHead className="w-[60px] px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => handleSort('id')}>
                    ID <SortIcon column="id" />
                  </TableHead>
                  <TableHead className="w-[60px] text-center px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Capa</TableHead>
                  <TableHead className="px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => handleSort('titulo')}>
                    Título do Curso <SortIcon column="titulo" />
                  </TableHead>
                  <TableHead className="w-[85px] text-center px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => handleSort('ativo')}>
                    Ativo <SortIcon column="ativo" />
                  </TableHead>
                  <TableHead className="w-[85px] text-center px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => handleSort('publicar')}>
                    Publicar <SortIcon column="publicar" />
                  </TableHead>
                  <TableHead className="w-[85px] text-center px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => handleSort('destaque')}>
                    Destaque <SortIcon column="destaque" />
                  </TableHead>
                  <TableHead className="w-[120px] px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => handleSort('valor')}>
                    Valor <SortIcon column="valor" />
                  </TableHead>
                  <TableHead className="w-[70px] text-right px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8} className="h-12 text-center text-xs text-muted-foreground animate-pulse">Carregando cursos...</TableCell>
                    </TableRow>
                  ))
                ) : listQuery.data?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground">Nenhum curso encontrado com os filtros atuais.</TableCell>
                  </TableRow>
                ) : (
                  listQuery.data?.data?.map((c) => (
                    <TableRow key={c.id} onDoubleClick={() => handleRowDoubleClick(c.id)} className="hover:bg-muted/50 transition-colors cursor-pointer group">
                      <TableCell className="px-3 py-2 font-mono text-xs text-muted-foreground">#{c.id}</TableCell>
                      <TableCell className="px-3 py-2 text-center">
                        <Avatar className="h-8 w-8 mx-auto rounded-md ring-1 ring-slate-200 dark:ring-slate-700 shadow-none overflow-hidden">
                          <AvatarImage src={resolveCoverUrl(c)} className="object-cover" />
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">{getInitials(c.nome || c.titulo || '')}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <div className="flex flex-col max-w-[420px]">
                          <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors leading-tight truncate">{c.titulo || c.nome || '-'}</span>
                          {c.categoria && (
                            <span className="text-[10px] text-muted-foreground uppercase tracking-tight font-medium mt-0.5">{c.categoria?.replace('_', ' ')}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-center">
                        <Switch 
                          checked={c.ativo === 's'} 
                          onCheckedChange={() => handleToggleField(c, 'ativo')} 
                          disabled={updateStatusMutation.isPending}
                          className="scale-75 data-[state=checked]:bg-emerald-500"
                        />
                      </TableCell>
                      <TableCell className="px-3 py-2 text-center">
                        <Switch 
                          checked={c.publicar === 's'} 
                          onCheckedChange={() => handleToggleField(c, 'publicar')} 
                          disabled={updateStatusMutation.isPending}
                          className="scale-75 data-[state=checked]:bg-blue-500"
                        />
                      </TableCell>
                      <TableCell className="px-3 py-2 text-center">
                        <Switch 
                          checked={c.destaque === 's'} 
                          onCheckedChange={() => handleToggleField(c, 'destaque')} 
                          disabled={updateStatusMutation.isPending}
                          className="scale-75 data-[state=checked]:bg-amber-500"
                        />
                      </TableCell>
                      <TableCell className="px-3 py-2 font-bold text-xs">
                        {c.valor ? (
                          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(c.valor.replace(',', '.')))
                        ) : (
                          <span className="text-muted-foreground font-normal text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 p-1 rounded-xl shadow-lg">
                            <DropdownMenuLabel className="px-2 py-1 text-[11px] text-muted-foreground">Ações do Curso</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => goToEdit(c.id)} className="rounded-lg text-xs cursor-pointer">Editar Detalhes</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/admin/school/courses/${c.id}/grades`)} className="rounded-lg text-xs cursor-pointer">Ver Notas/Alunos</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/50 rounded-lg text-xs cursor-pointer" onClick={() => deleteMutation.mutate(c.id)}>Remover Curso</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}