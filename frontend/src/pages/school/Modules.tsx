import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { modulesService } from '@/services/modulesService';
import type { ModuleRecord } from '@/types/modules';
import type { PaginatedResponse } from '@/types/index';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Plus, 
  Trash2, 
  LayoutGrid, 
  Clock, 
  Settings2, 
  Search, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil
} from 'lucide-react';

/**
 * Modules — Listagem de módulos com layout padrão e alta densidade
 * pt-BR: Página de listagem e ações de módulos do EAD harmonizada com o design system.
 * en-US: Harmonized EAD modules listing and actions page.
 */
export default function Modules() {
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
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
    };
  };

  const init = getInitialParamsFromURL();
  const [perPage, setPerPage] = useState<number>(init.perPage);
  const [page, setPage] = useState<number>(init.page);
  const [searchTerm, setSearchTerm] = useState<string>(init.searchTerm);
  const debouncedSearch = useDebounce(searchTerm, 400);

  // --- URL persistence effect ---
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    params.set('per_page', String(perPage));
    params.set('page', String(page));
    params.set('search', String(searchTerm || ''));
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [perPage, page, searchTerm, location.pathname, navigate]);

  const listQuery = useQuery({
    queryKey: ['modules', 'list', perPage, debouncedSearch, page],
    queryFn: async (): Promise<PaginatedResponse<ModuleRecord>> => {
      const params: any = { page, per_page: perPage };
      if (debouncedSearch?.trim()) params.search = debouncedSearch.trim();
      return modulesService.list(params);
    },
  });

  // --- KPI Stats Calculation ---
  const stats = useMemo(() => {
    const list = listQuery.data?.data || [];
    const totalCount = listQuery.data?.total ?? list.length;
    const activeCount = list.filter((m) => m.active === true || m.active === 's' || m.active === 1).length;
    const inactiveCount = list.length - activeCount;
    const totalDuration = list.reduce((acc, m) => acc + (Number(m.duration) || 0), 0);
    return { totalCount, activeCount, inactiveCount, totalDuration };
  }, [listQuery.data]);

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string | number; active: string }) => {
      return modulesService.update(id, { active });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modules', 'list'] });
      toast({
        title: "Status atualizado",
        description: "O status do módulo foi alterado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível alterar o status do módulo.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      if (!window.confirm('Deseja realmente excluir este módulo?')) return;
      return modulesService.deleteById(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modules', 'list'] });
      toast({
        title: "Módulo excluído",
        description: "O módulo foi removido com sucesso.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erro ao excluir",
        description: String(err?.message ?? 'Falha ao excluir módulo.'),
        variant: "destructive",
      });
    },
  });

  const handleRowDoubleClick = (id: string | number) => {
    navigate(`/admin/school/modules/${id}/edit`);
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            Módulos
          </h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Gerencie e organize os módulos de conteúdos dos seus cursos.
          </p>
        </div>
        <Button 
          onClick={() => navigate('/admin/school/modules/create')}
          size="sm" 
          className="h-9 px-3 gap-1.5 font-semibold shadow-sm"
        >
          <Plus className="h-4 w-4" /> Novo módulo
        </Button>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 border shadow-sm rounded-xl bg-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total de Módulos</p>
            <p className="text-xl font-black tracking-tight text-foreground mt-0.5">{stats.totalCount}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <LayoutGrid className="h-4 w-4" />
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
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Inativos (Pág.)</p>
            <p className="text-xl font-black tracking-tight text-slate-500 dark:text-slate-400 mt-0.5">{stats.inactiveCount}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-slate-500/10 text-slate-600 flex items-center justify-center shrink-0">
            <XCircle className="h-4 w-4" />
          </div>
        </Card>

        <Card className="p-3 border shadow-sm rounded-xl bg-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Duração Total</p>
            <p className="text-xl font-black tracking-tight text-amber-600 dark:text-amber-400 mt-0.5">{stats.totalDuration} <span className="text-xs font-normal text-muted-foreground">min/seg</span></p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4" />
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
                placeholder="Pesquisar módulo por título ou identificador..."
              />
            </div>
            {listQuery.data?.total !== undefined && (
              <Badge variant="secondary" className="font-mono text-[11px] px-2 py-0.5 shrink-0">
                {listQuery.data.total} {listQuery.data.total === 1 ? 'módulo' : 'módulos'}
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
                  <TableHead className="px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Módulo / Título</TableHead>
                  <TableHead className="w-[160px] px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Identificador</TableHead>
                  <TableHead className="w-[120px] px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Duração
                    </div>
                  </TableHead>
                  <TableHead className="w-[85px] text-center px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="w-[70px] text-right px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="h-12 text-center text-xs text-muted-foreground animate-pulse">Carregando módulos...</TableCell>
                    </TableRow>
                  ))
                ) : (listQuery.data?.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">Nenhum módulo encontrado com os filtros atuais.</TableCell>
                  </TableRow>
                ) : (
                  (listQuery.data?.data ?? []).map((m: ModuleRecord) => {
                    const isActive = m.active === true || m.active === 's' || m.active === 1;
                    return (
                      <TableRow
                        key={String(m.id)}
                        onDoubleClick={() => handleRowDoubleClick(m.id)}
                        className="hover:bg-muted/50 transition-colors cursor-pointer group"
                      >
                        <TableCell className="px-3 py-2 font-mono text-xs text-muted-foreground">#{m.id}</TableCell>
                        <TableCell className="px-3 py-2">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7 rounded-md ring-1 ring-slate-200 dark:ring-slate-700 shadow-none">
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black uppercase">
                                {m.title?.substring(0, 2) || 'MO'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors leading-tight">
                              {m.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <code className="text-[10px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {m.name || 'n/a'}
                          </code>
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[9px] font-bold uppercase py-0 px-1 bg-background border-slate-200 dark:border-slate-700">
                              {m.tipo_duracao || 'seg'}
                            </Badge>
                            <span className="text-xs font-semibold text-foreground">{m.duration || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-center">
                          <Switch
                            checked={isActive}
                            onCheckedChange={(checked) => 
                              toggleStatusMutation.mutate({ id: m.id, active: checked ? 's' : 'n' })
                            }
                            className="scale-75 data-[state=checked]:bg-emerald-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 p-1 rounded-xl shadow-lg">
                              <DropdownMenuLabel className="px-2 py-1 text-[11px] text-muted-foreground">Ações do Módulo</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={() => navigate(`/admin/school/modules/${m.id}/edit`)}>
                                <Pencil className="h-3.5 w-3.5" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={() => navigate(`/admin/school/modules/${m.id}/edit`)}>
                                <Settings2 className="h-3.5 w-3.5" /> Configurações
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="gap-2 text-xs cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/50 rounded-lg" 
                                onClick={() => deleteMutation.mutate(m.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Excluir Módulo
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}