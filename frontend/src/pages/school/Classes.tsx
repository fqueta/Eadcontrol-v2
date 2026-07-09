import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, ChevronLeft, ChevronRight, MoreHorizontal, Plus, Loader2, BookOpen, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
  }, [perPage, page, searchTerm, sort]);

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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground/90">Turmas</h1>
          <p className="text-sm font-medium text-muted-foreground">Gerencie turmas da escola (criar, editar, excluir)</p>
        </div>
        <Button onClick={goToCreate} size="lg" className="shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
          <Plus className="h-4 w-4 mr-2" /> Novo Cadastro
        </Button>
      </div>

      <Card className="border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                <Input
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  className="pl-9 h-10 rounded-xl bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 w-full"
                  placeholder="Buscar turmas por nome..."
                />
              </div>
            </div>

            <div className="flex items-center gap-3 justify-between md:justify-end">
              <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[100px] h-10 bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="10">10 itens</SelectItem>
                  <SelectItem value="25">25 itens</SelectItem>
                  <SelectItem value="50">50 itens</SelectItem>
                  <SelectItem value="100">100 itens</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1 bg-white/50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Página anterior" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={(listQuery.data?.current_page ?? 1) <= 1 || listQuery.isFetching}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-2">
                  {listQuery.isFetching ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : `${listQuery.data?.current_page ?? page} / ${listQuery.data?.last_page ?? 1}`}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Próxima página" onClick={() => { const last = listQuery.data?.last_page ?? page; setPage((p) => Math.min(last, p + 1)); }} disabled={(listQuery.data?.current_page ?? 1) >= (listQuery.data?.last_page ?? 1) || listQuery.isFetching}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                <TableRow>
                  <TableHead className="w-[60px] pl-6 font-bold text-xs uppercase tracking-wider text-slate-500">ID</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 cursor-pointer select-none" onClick={() => handleSort('nome')}>
                    Nome / Período <SortIcon column="nome" />
                  </TableHead>
                  <TableHead className="w-[100px] text-center font-bold text-xs uppercase tracking-wider text-slate-500 cursor-pointer select-none" onClick={() => handleSort('ativo')}>
                    Ativo <SortIcon column="ativo" />
                  </TableHead>
                  <TableHead className="w-[60px] text-center font-bold text-xs uppercase tracking-wider text-slate-500 cursor-pointer select-none" onClick={() => handleSort('min_alunos')}>
                    Min <SortIcon column="min_alunos" />
                  </TableHead>
                  <TableHead className="w-[60px] text-center font-bold text-xs uppercase tracking-wider text-slate-500 cursor-pointer select-none" onClick={() => handleSort('max_alunos')}>
                    Max <SortIcon column="max_alunos" />
                  </TableHead>
                  <TableHead className="w-[100px] text-center font-bold text-xs uppercase tracking-wider text-slate-500">Interessados</TableHead>
                  <TableHead className="w-[100px] text-center font-bold text-xs uppercase tracking-wider text-slate-500">Matriculados</TableHead>
                  <TableHead className="w-[120px] font-bold text-xs uppercase tracking-wider text-slate-500 cursor-pointer select-none" onClick={() => handleSort('Valor')}>
                    Valor <SortIcon column="Valor" />
                  </TableHead>
                  <TableHead className="w-[80px] text-right pr-6 font-bold text-xs uppercase tracking-wider text-slate-500">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-16 text-center text-muted-foreground animate-pulse">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : listQuery.data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    Nenhuma turma encontrada com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                listQuery.data?.data?.map((t) => (
                  <TableRow
                    key={t.id}
                    onDoubleClick={() => handleRowDoubleClick(t.id)}
                    className="hover:bg-primary/[0.02] dark:hover:bg-primary/[0.05] transition-colors cursor-pointer group"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground pl-6">{String(t.id).padStart(4, '0')}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground/90">{t.nome ?? 'Sem nome'}</span>
                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                          {t.inicio || t.fim
                            ? `${formatDate(t.inicio) || '?'} — ${formatDate(t.fim) || '?'}`
                            : 'Sem período'}
                        </span>
                        {t.professor && (
                          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                            Prof: {t.professor}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={t.ativo === 's' ? 'default' : 'secondary'} className={t.ativo === 's' ? 'bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20 shadow-none' : 'bg-slate-100 text-slate-500 shadow-none'}>
                        {t.ativo === 's' ? 'Sim' : 'Não'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium text-xs">{t.min_alunos ?? 0}</TableCell>
                    <TableCell className="text-center font-medium text-xs">{t.max_alunos ?? 0}</TableCell>
                    <TableCell className="text-center font-bold text-xs text-amber-600 dark:text-amber-400">{t.interessados ?? 0}</TableCell>
                    <TableCell className="text-center font-bold text-xs text-green-600 dark:text-green-400">{t.matriculados ?? 0}</TableCell>
                    <TableCell className="font-bold text-xs">
                      {t.Valor ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(t.Valor)) : 'Grátis'}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-xl border-slate-100 dark:border-slate-800">
                          <DropdownMenuLabel className="text-xs font-black uppercase text-muted-foreground tracking-wider">Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                          <DropdownMenuItem onClick={() => goToDetails(t.id)} className="font-medium cursor-pointer rounded-lg focus:bg-primary/10 focus:text-primary">
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => goToEdit(t.id)} className="font-medium cursor-pointer rounded-lg focus:bg-primary/10 focus:text-primary">
                            Editar Turma
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600 font-medium cursor-pointer rounded-lg focus:bg-red-50 focus:text-red-700" onClick={() => deleteMutation.mutate(t.id)}>
                            Excluir
                          </DropdownMenuItem>
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