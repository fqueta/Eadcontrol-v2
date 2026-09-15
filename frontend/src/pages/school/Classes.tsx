import { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal, 
  Plus, 
  Loader2, 
  GraduationCap, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  CheckCircle2,
  Users,
  Target,
  UserCheck
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { turmasService } from '@/services/turmasService';
import type { TurmaRecord } from '@/types/turmas';
import type { PaginatedResponse } from '@/types/index';

type SortDir = 'asc' | 'desc';
type SortableColumn = 'nome' | 'inicio' | 'ativo' | 'min_alunos' | 'max_alunos' | 'Valor';

interface SortState {
  column: SortableColumn;
  dir: SortDir;
}

export default function Classes() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const getInitialParamsFromURL = () => {
    const qs = new URLSearchParams(location.search);
    const per = Number(qs.get('per_page') || 10);
    const p = Number(qs.get('page') || 1);
    return {
      perPage: Number.isNaN(per) ? 10 : per,
      page: Number.isNaN(p) ? 1 : p,
      searchTerm: qs.get('search') || '',
      sortColumn: (qs.get('order_by') || 'id') as SortableColumn,
      sortDir: (qs.get('sort_order') || 'desc') as SortDir,
    };
  };

  const init = getInitialParamsFromURL();
  const [perPage, setPerPage] = useState<number>(init.perPage);
  const [page, setPage] = useState<number>(init.page);
  const [searchTerm, setSearchTerm] = useState<string>(init.searchTerm);
  const [sort, setSort] = useState<SortState>({ column: init.sortColumn, dir: init.sortDir });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    params.set('per_page', String(perPage));
    params.set('page', String(page));
    params.set('search', String(searchTerm || ''));
    params.set('order_by', sort.column);
    params.set('sort_order', sort.dir);
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [perPage, page, searchTerm, sort, location.pathname, navigate]);

  const listQuery = useQuery({
    queryKey: ['turmas', 'list', perPage, page, searchTerm, sort.column, sort.dir],
    queryFn: async (): Promise<PaginatedResponse<TurmaRecord>> => {
      const params: any = { page, per_page: perPage, order_by: sort.column, sort_order: sort.dir };
      if (searchTerm?.trim()) params.search = searchTerm.trim();
      return turmasService.listTurmas(params);
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
    const activeCount = list.filter((t) => t.ativo === 's').length;
    const interestedCount = list.reduce((acc, t) => acc + (Number(t.interessados) || 0), 0);
    const enrolledCount = list.reduce((acc, t) => acc + (Number(t.matriculados) || 0), 0);
    return { totalCount, activeCount, interestedCount, enrolledCount };
  }, [listQuery.data]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => turmasService.deleteTurma(id),
    onSuccess: () => {
      toast({ title: 'Turma excluída', description: 'Registro removido.' });
      queryClient.invalidateQueries({ queryKey: ['turmas', 'list'] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao excluir', description: String(err?.message ?? 'Falha ao excluir turma'), variant: 'destructive' });
    },
  });

  const goToCreate = () => navigate('/admin/school/classes/create');
  const goToEdit = (id: string | number) => navigate(`/admin/school/classes/${id}/edit`);
  const goToDetails = (id: string | number) => navigate(`/admin/school/classes/${id}`);
  const handleRowDoubleClick = (id: string | number) => goToDetails(id);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Turmas
          </h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Gerenciamento de turmas, períodos, vagas e alunos inscritos.
          </p>
        </div>
        <Button onClick={goToCreate} size="sm" className="h-9 px-3 gap-1.5 font-semibold shadow-sm">
          <Plus className="h-4 w-4" /> Nova turma
        </Button>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 border shadow-sm rounded-xl bg-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total de Turmas</p>
            <p className="text-xl font-black tracking-tight text-foreground mt-0.5">{stats.totalCount}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <GraduationCap className="h-4 w-4" />
          </div>
        </Card>

        <Card className="p-3 border shadow-sm rounded-xl bg-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Turmas Ativas (Pág.)</p>
            <p className="text-xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.activeCount}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </Card>

        <Card className="p-3 border shadow-sm rounded-xl bg-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Interessados (Pág.)</p>
            <p className="text-xl font-black tracking-tight text-amber-600 dark:text-amber-400 mt-0.5">{stats.interestedCount}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Target className="h-4 w-4" />
          </div>
        </Card>

        <Card className="p-3 border shadow-sm rounded-xl bg-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Matriculados (Pág.)</p>
            <p className="text-xl font-black tracking-tight text-violet-600 dark:text-violet-400 mt-0.5">{stats.enrolledCount}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4" />
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
                placeholder="Pesquisar turma por nome..."
              />
            </div>
            {listQuery.data?.total !== undefined && (
              <Badge variant="secondary" className="font-mono text-[11px] px-2 py-0.5 shrink-0">
                {listQuery.data.total} {listQuery.data.total === 1 ? 'turma' : 'turmas'}
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
                <SelectItem value="100">100 por pág.</SelectItem>
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
                  <TableHead className="w-[60px] px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">ID</TableHead>
                  <TableHead className="px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => handleSort('nome')}>
                    Nome / Período <SortIcon column="nome" />
                  </TableHead>
                  <TableHead className="w-[85px] text-center px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => handleSort('ativo')}>
                    Ativo <SortIcon column="ativo" />
                  </TableHead>
                  <TableHead className="w-[65px] text-center px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => handleSort('min_alunos')}>
                    Min <SortIcon column="min_alunos" />
                  </TableHead>
                  <TableHead className="w-[65px] text-center px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => handleSort('max_alunos')}>
                    Max <SortIcon column="max_alunos" />
                  </TableHead>
                  <TableHead className="w-[100px] text-center px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Interessados</TableHead>
                  <TableHead className="w-[100px] text-center px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Matriculados</TableHead>
                  <TableHead className="w-[110px] px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => handleSort('Valor')}>
                    Valor <SortIcon column="Valor" />
                  </TableHead>
                  <TableHead className="w-[70px] text-right px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9} className="h-12 text-center text-xs text-muted-foreground animate-pulse">
                        Carregando turmas...
                      </TableCell>
                    </TableRow>
                  ))
                ) : listQuery.data?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-xs text-muted-foreground">
                      Nenhuma turma encontrada com os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : (
                  listQuery.data?.data?.map((t) => (
                    <TableRow
                      key={t.id}
                      onDoubleClick={() => handleRowDoubleClick(t.id)}
                      className="hover:bg-muted/50 transition-colors cursor-pointer group"
                    >
                      <TableCell className="px-3 py-2 font-mono text-xs text-muted-foreground">#{String(t.id).padStart(4, '0')}</TableCell>
                      <TableCell className="px-3 py-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors leading-tight">{t.nome ?? 'Sem nome'}</span>
                          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                            {t.inicio || t.fim
                              ? `${formatDate(t.inicio) || '?'} — ${formatDate(t.fim) || '?'}`
                              : 'Sem período definido'}
                          </span>
                          {t.professor && (
                            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                              Prof: {t.professor}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-center">
                        <Badge variant={t.ativo === 's' ? 'default' : 'secondary'} className={t.ativo === 's' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 shadow-none text-[10px] py-0 px-2' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 shadow-none text-[10px] py-0 px-2'}>
                          {t.ativo === 's' ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-center font-medium text-xs">{t.min_alunos ?? 0}</TableCell>
                      <TableCell className="px-3 py-2 text-center font-medium text-xs">{t.max_alunos ?? 0}</TableCell>
                      <TableCell className="px-3 py-2 text-center font-bold text-xs text-amber-600 dark:text-amber-400">{t.interessados ?? 0}</TableCell>
                      <TableCell className="px-3 py-2 text-center font-bold text-xs text-emerald-600 dark:text-emerald-400">{t.matriculados ?? 0}</TableCell>
                      <TableCell className="px-3 py-2 font-bold text-xs">
                        {t.Valor ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(t.Valor)) : <span className="text-muted-foreground font-normal text-xs">Grátis</span>}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 p-1 rounded-xl shadow-lg">
                            <DropdownMenuLabel className="px-2 py-1 text-[11px] text-muted-foreground">Ações da Turma</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => goToDetails(t.id)} className="rounded-lg text-xs cursor-pointer">Detalhes da Turma</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => goToEdit(t.id)} className="rounded-lg text-xs cursor-pointer">Editar Turma</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/admin/school/enrollments/create?id_turma=${t.id}`)} className="rounded-lg text-xs cursor-pointer">Matricular Aluno</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/50 rounded-lg text-xs cursor-pointer" onClick={() => deleteMutation.mutate(t.id)}>Remover Turma</DropdownMenuItem>
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