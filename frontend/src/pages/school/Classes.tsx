import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, ChevronLeft, ChevronRight, MoreHorizontal, Plus, Loader2, BookOpen, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { turmasService } from '@/services/turmasService';
import type { TurmaRecord } from '@/types/turmas';
import type { PaginatedResponse } from '@/types/index';
import { currencyApplyMask } from '@/lib/masks/currency';

/**
 * Classes — CRUD de turmas com layout moderno
 * pt-BR: Lista, cria, edita e exclui turmas; persiste filtros na URL.
 * en-US: Lists, creates, edits and deletes classes; persists filters in URL.
 */
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
    };
  };

  const init = getInitialParamsFromURL();
  const [perPage, setPerPage] = useState<number>(init.perPage);
  const [page, setPage] = useState<number>(init.page);
  const [searchTerm, setSearchTerm] = useState<string>(init.searchTerm);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    params.set('per_page', String(perPage));
    params.set('page', String(page));
    params.set('search', String(searchTerm || ''));
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [perPage, page, searchTerm]);

  const listQuery = useQuery({
    queryKey: ['turmas', 'list', perPage, searchTerm, page],
    queryFn: async (): Promise<PaginatedResponse<TurmaRecord>> => {
      const params: any = { page, per_page: perPage };
      if (searchTerm?.trim()) params.search = searchTerm.trim();
      return turmasService.listTurmas(params);
    },
  });

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
  const handleRowDoubleClick = (id: string | number) => goToEdit(id);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
    return dateStr;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground/90">Turmas</h1>
          <p className="text-sm font-medium text-muted-foreground">Gerencie turmas da escola (criar, editar, excluir)</p>
        </div>
        <Button onClick={goToCreate} className="shadow-lg shadow-primary/20 font-bold h-11 px-6 rounded-xl">
          <Plus className="h-4 w-4 mr-2" /> Novo Cadastro
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                <Input 
                  value={searchTerm} 
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} 
                  className="pl-9 h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm w-full transition-all focus:ring-primary/20" 
                  placeholder="Buscar turmas por nome..." 
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3 justify-between md:justify-end">
              <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[120px] h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium">
                  <SelectValue placeholder="Linhas" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="10">10 / pág</SelectItem>
                  <SelectItem value="25">25 / pág</SelectItem>
                  <SelectItem value="50">50 / pág</SelectItem>
                  <SelectItem value="100">100 / pág</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" title="Página anterior" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={(listQuery.data?.current_page ?? 1) <= 1 || listQuery.isFetching}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-semibold text-muted-foreground px-2 min-w-[4rem] text-center">
                  {listQuery.isFetching ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : `${listQuery.data?.current_page ?? page} / ${listQuery.data?.last_page ?? 1}`}
                </span>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" title="Próxima página" onClick={() => { const last = listQuery.data?.last_page ?? page; setPage((p) => Math.min(last, p + 1)); }} disabled={(listQuery.data?.current_page ?? 1) >= (listQuery.data?.last_page ?? 1) || listQuery.isFetching}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80">
              <TableRow className="border-slate-100 dark:border-slate-800/60">
                <TableHead className="font-bold text-slate-500 w-[80px]">ID</TableHead>
                <TableHead className="font-bold text-slate-500">Turma</TableHead>
                <TableHead className="font-bold text-slate-500">Status</TableHead>
                <TableHead className="font-bold text-slate-500">Período</TableHead>
                <TableHead className="font-bold text-slate-500">Valor</TableHead>
                <TableHead className="text-right font-bold text-slate-500 w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-medium animate-pulse">Carregando turmas...</p>
                  </TableCell>
                </TableRow>
              ) : listQuery.data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <BookOpen className="h-10 w-10 mb-3 opacity-20" />
                      <p className="font-medium text-base text-foreground/70">Nenhuma turma encontrada</p>
                      <p className="text-sm opacity-70">Tente buscar por outro termo ou cadastre uma nova turma.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                listQuery.data?.data?.map((t) => (
                  <TableRow 
                    key={t.id} 
                    onDoubleClick={() => handleRowDoubleClick(t.id)} 
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer border-slate-100 dark:border-slate-800/60 transition-colors group"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{t.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground/90">{t.nome ?? 'Sem nome'}</span>
                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                          Prof: {t.professor || 'Não definido'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.ativo === 's' ? 'default' : 'secondary'} className={t.ativo === 's' ? 'bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20 shadow-none' : 'bg-slate-100 text-slate-500 shadow-none'}>
                        {t.ativo === 's' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                        <Clock className="h-3.5 w-3.5 opacity-70" />
                        {formatDate(t.inicio)} {t.fim ? `até ${formatDate(t.fim)}` : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-foreground/80">
                        {t.Valor ? `R$ ${currencyApplyMask(String(t.Valor), 'pt-BR', 'BRL')}` : 'Grátis'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-xl border-slate-100 dark:border-slate-800">
                          <DropdownMenuLabel className="text-xs font-black uppercase text-muted-foreground tracking-wider">Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
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
      </Card>
    </div>
  );
}