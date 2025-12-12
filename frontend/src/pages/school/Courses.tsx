import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesService } from '@/services/coursesService';
import { CourseRecord } from '@/types/courses';
import { PaginatedResponse } from '@/types/index';
import { useDebounce } from '@/hooks/useDebounce';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, ChevronLeft, ChevronRight, MoreHorizontal, Plus } from 'lucide-react';

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
  /**
   * getInitialParamsFromURL
   * pt-BR: Lê search params para iniciar busca, página e per_page.
   * en-US: Reads search params to initialize search, page and per_page.
   */
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
  }, [perPage, page, searchTerm]);

  // --- Listagem de cursos ---
  /**
   * listQuery
   * pt-BR: Busca cursos com paginação, busca e integração com serviço.
   * en-US: Fetches courses with pagination, search via service.
   */
  const listQuery = useQuery({
    queryKey: ['cursos', 'list', perPage, debouncedSearch, page],
    queryFn: async (): Promise<PaginatedResponse<CourseRecord>> => {
      const params: any = { page, per_page: perPage };
      if (debouncedSearch?.trim()) params.search = debouncedSearch.trim();
      return coursesService.listCourses(params);
    },
  });

  // --- Mutation de exclusão ---

  /**
   * deleteMutation
   * pt-BR: Exclui curso.
   * en-US: Deletes course.
   */
  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => coursesService.deleteCourse(id),
    onSuccess: () => {
      toast({ title: 'Curso excluído', description: 'Registro removido.' });
      queryClient.invalidateQueries({ queryKey: ['cursos', 'list'] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao excluir', description: String(err?.message ?? 'Falha ao excluir curso'), variant: 'destructive' });
    },
  });

  // --- Handlers ---
  // --- Navegação para edição/criação ---
  /**
   * goToCreate
   * pt-BR: Navega para página de criação de curso.
   * en-US: Navigates to the course creation page.
   */
  const goToCreate = () => navigate('/admin/school/courses/create');

  /**
   * goToEdit
   * pt-BR: Navega para página de edição do curso.
   * en-US: Navigates to the course edit page.
   */
  const goToEdit = (id: string | number) => navigate(`/admin/school/courses/${id}/edit`);

  /**
   * handleRowDoubleClick
   * pt-BR: Abre a página de edição ao dar duplo clique na linha.
   * en-US: Opens the edit page when the row is double-clicked.
   */
  const handleRowDoubleClick = (id: string | number) => {
    goToEdit(id);
  };

  /**
   * resolveSimNao
   * pt-BR: Converte 's'/'n' para rótulo amigável.
   * en-US: Converts 's'/'n' to human readable label.
   */
  const resolveSimNao = (v?: string) => (v === 's' ? 'Sim' : 'Não');

  // --- UI helpers para módulos ---
  const addModule = () => {
    const current = form.getValues('modulos') ?? [];
    const next: CourseModule = { etapa: 'etapa1', titulo: '', limite: '1', valor: '' };
    form.setValue('modulos', [...current, next]);
  };
  const resolveCoverUrl = (c: CourseRecord) => {
    const cover = String((c?.config?.cover?.url || '').trim());
    if (cover) return cover;
    return '/placeholder.svg';
  };
  /**
   * resolveCoverTitle
   * pt-BR: Título/alt da imagem da capa do curso com leitura segura.
   *        Prioriza `config.cover.title`, depois `titulo`/`nome` e por fim
   *        um placeholder. Evita erro quando `config` ou `cover` não existem.
   * en-US: Safe cover image alt/title for the course. Prioritizes
   *        `config.cover.title`, then `titulo`/`nome`, finally a placeholder.
   *        Prevents errors when `config` or `cover` are missing.
   */
  const resolveCoverTitle = (c: CourseRecord): string => {
    const t1 = String((c as any)?.config?.cover?.title || '').trim();
    if (t1) return t1;
    const t2 = String((c as any)?.titulo || (c as any)?.nome || '').trim();
    if (t2) return t2;
    return `Curso ${String((c as any)?.id ?? '').trim() || '-'}`;
  };
  const removeModule = (index: number) => {
    const current = [...(form.getValues('modulos') ?? [])];
    current.splice(index, 1);
    form.setValue('modulos', current);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cursos</h1>
          <p className="text-muted-foreground">Gerencie cursos da escola (criar, editar, excluir)</p>
        </div>
        <Button onClick={goToCreate}>
          <Plus className="h-4 w-4 mr-2" /> Novo cadastro
        </Button>
      </div>

      {/* Toolbar de listagem */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium">Cursos cadastrados</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} className="pl-8 w-[280px]" placeholder="Buscar por nome..." />
            </div>
            <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="Linhas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" title="Página anterior" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={(listQuery.data?.current_page ?? 1) <= 1 || listQuery.isFetching}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-xs text-muted-foreground">Página {listQuery.data?.current_page ?? page} de {listQuery.data?.last_page ?? 1}</span>
              <Button variant="outline" size="icon" title="Próxima página" onClick={() => { const last = listQuery.data?.last_page ?? page; setPage((p) => Math.min(last, p + 1)); }} disabled={(listQuery.data?.current_page ?? 1) >= (listQuery.data?.last_page ?? 1) || listQuery.isFetching}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead className="w-[50px] max-w-[50px] p-0 text-center">Imagem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Publicar</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQuery.data?.data?.map((c) => (
              <TableRow key={c.id} onDoubleClick={() => handleRowDoubleClick(c.id)} className="hover:bg-muted/50 cursor-pointer">
                <TableCell className="font-mono">{c.id}</TableCell>
                <TableCell className="w-[50px] max-w-[50px] p-0 text-center">
                  <img src={resolveCoverUrl(c)} alt={resolveCoverTitle(c)} className="w-[50px] h-[50px] object-cover rounded-md" />
                </TableCell>
                <TableCell className="max-w-[320px] line-clamp-1 break-words">{c.nome ?? '-'}</TableCell>
                <TableCell>{resolveSimNao(c.ativo)}</TableCell>
                <TableCell>{resolveSimNao(c.publicar)}</TableCell>
                <TableCell>{c.valor ?? '-'}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => goToEdit(c.id)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(c.id)}>Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}