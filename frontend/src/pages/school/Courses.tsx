import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesService } from '@/services/coursesService';
import { CourseRecord } from '@/types/courses';
import { PaginatedResponse } from '@/types/index';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, ChevronLeft, ChevronRight, MoreHorizontal, Plus, BookOpen, Image as ImageIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

/**
 * Courses — CRUD de cursos com layout moderno
 * pt-BR: Lista, cria, edita e exclui cursos; persiste filtros na URL.
 * en-US: Lists, creates, edits and deletes courses; persists filters in URL.
 */
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

  // --- Listagem de cursos ---
  const listQuery = useQuery({
    queryKey: ['courses', 'list', perPage, debouncedSearch, page],
    queryFn: async (): Promise<PaginatedResponse<CourseRecord>> => {
      const params: any = { page, per_page: perPage };
      if (debouncedSearch?.trim()) params.search = debouncedSearch.trim();
      return coursesService.listCourses(params);
    },
  });

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

  const handleToggleField = (course: CourseRecord, field: 'ativo' | 'publicar') => {
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

  const resolveCoverTitle = (c: CourseRecord): string => {
    const t = String((c as any)?.config?.cover?.title || (c as any)?.titulo || (c as any)?.nome || '').trim();
    return t || `Curso ${c.id}`;
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'C';
  };

  return (
    <div className="space-y-6">
      {/* Header section with refined style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            Cursos
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Gerencie o catálogo de cursos e suas configurações de exibição.</p>
        </div>
        <Button onClick={goToCreate} size="lg" className="shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
          <Plus className="h-5 w-5 mr-2" /> Novo curso
        </Button>
      </div>

      <Card className="border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              Cursos cadastrados
              {listQuery.data?.total !== undefined && (
                <Badge variant="secondary" className="rounded-full px-2 font-mono text-[10px]">
                  {listQuery.data.total}
                </Badge>
              )}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative group">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input 
                  value={searchTerm} 
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} 
                  className="pl-9 w-full md:w-[240px] lg:w-[320px] bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 transition-all" 
                  placeholder="Pesquisar por nome ou título..." 
                />
              </div>
              <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[100px] h-10 bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 itens</SelectItem>
                  <SelectItem value="25">25 itens</SelectItem>
                  <SelectItem value="50">50 itens</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 bg-white/50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={(listQuery.data?.current_page ?? 1) <= 1 || listQuery.isFetching}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-2">
                  {listQuery.data?.current_page ?? page} / {listQuery.data?.last_page ?? 1}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { const last = listQuery.data?.last_page ?? page; setPage((p) => Math.min(last, p + 1)); }} disabled={(listQuery.data?.current_page ?? 1) >= (listQuery.data?.last_page ?? 1) || listQuery.isFetching}><ChevronRight className="h-4 w-4" /></Button>
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
                  <TableHead className="w-[80px] text-center font-bold text-xs uppercase tracking-wider text-slate-500">Imagem</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Título do Curso</TableHead>
                  <TableHead className="w-[100px] text-center font-bold text-xs uppercase tracking-wider text-slate-500">Ativo</TableHead>
                  <TableHead className="w-[100px] text-center font-bold text-xs uppercase tracking-wider text-slate-500">Publicar</TableHead>
                  <TableHead className="w-[140px] font-bold text-xs uppercase tracking-wider text-slate-500">Valor</TableHead>
                  <TableHead className="w-[80px] text-right pr-6 font-bold text-xs uppercase tracking-wider text-slate-500">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="h-16 text-center text-muted-foreground animate-pulse">Carregando...</TableCell>
                    </TableRow>
                  ))
                ) : listQuery.data?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Nenhum curso encontrado com os filtros atuais.</TableCell>
                  </TableRow>
                ) : (
                  listQuery.data?.data?.map((c) => (
                    <TableRow key={c.id} onDoubleClick={() => handleRowDoubleClick(c.id)} className="hover:bg-primary/[0.02] dark:hover:bg-primary/[0.05] transition-colors cursor-pointer group">
                      <TableCell className="pl-6 font-mono text-xs font-semibold text-slate-400 group-hover:text-primary transition-colors">{c.id}</TableCell>
                      <TableCell className="text-center">
                        <Avatar className="h-10 w-10 mx-auto rounded-lg ring-2 ring-slate-100 dark:ring-slate-800 transition-transform group-hover:scale-110 shadow-sm overflow-hidden">
                          <AvatarImage src={resolveCoverUrl(c)} className="object-cover" />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">{getInitials(c.nome || c.titulo || '')}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col max-w-[400px]">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 leading-tight block truncate">{c.titulo || c.nome || '-'}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-tight font-medium mt-0.5">{c.categoria?.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch 
                          checked={c.ativo === 's'} 
                          onCheckedChange={() => handleToggleField(c, 'ativo')} 
                          disabled={updateStatusMutation.isPending}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch 
                          checked={c.publicar === 's'} 
                          onCheckedChange={() => handleToggleField(c, 'publicar')} 
                          disabled={updateStatusMutation.isPending}
                          className="data-[state=checked]:bg-blue-500"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-700 dark:text-slate-300">
                          {c.valor ? (
                            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(c.valor.replace(',', '.')))
                          ) : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 p-1 rounded-xl shadow-xl border-slate-200 dark:border-slate-800">
                            <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground">Gerenciamento</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => goToEdit(c.id)} className="rounded-lg cursor-pointer">Editar Detalhes</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/admin/school/courses/${c.id}/grades`)} className="rounded-lg cursor-pointer">Ver Notas/Alunos</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-700 rounded-lg cursor-pointer" onClick={() => deleteMutation.mutate(c.id)}>Remover Curso</DropdownMenuItem>
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