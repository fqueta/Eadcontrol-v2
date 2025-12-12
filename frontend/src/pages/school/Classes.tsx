import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, ChevronLeft, ChevronRight, MoreHorizontal, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { turmasService } from '@/services/turmasService';
import type { TurmaRecord } from '@/types/turmas';
import type { PaginatedResponse } from '@/types/index';

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

  /**
   * getInitialParamsFromURL
   * pt-BR: Lê parâmetros da URL para busca, página e per_page.
   * en-US: Reads URL params for search, page and per_page.
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

  // Persistência de params na URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    params.set('per_page', String(perPage));
    params.set('page', String(page));
    params.set('search', String(searchTerm || ''));
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [perPage, page, searchTerm]);

  /**
   * listQuery
   * pt-BR: Busca turmas com paginação e busca.
   * en-US: Fetches classes with pagination and search.
   */
  const listQuery = useQuery({
    queryKey: ['turmas', 'list', perPage, searchTerm, page],
    queryFn: async (): Promise<PaginatedResponse<TurmaRecord>> => {
      const params: any = { page, per_page: perPage };
      if (searchTerm?.trim()) params.search = searchTerm.trim();
      return turmasService.listTurmas(params);
    },
  });

  /**
   * deleteMutation
   * pt-BR: Exclui turma.
   * en-US: Deletes class.
   */
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

  /**
   * goToCreate
   * pt-BR: Navega para página de criação de turma.
   * en-US: Navigates to class creation page.
   */
  const goToCreate = () => navigate('/admin/school/classes/create');

  /**
   * goToEdit
   * pt-BR: Navega para página de edição da turma.
   * en-US: Navigates to class edit page.
   */
  const goToEdit = (id: string | number) => navigate(`/admin/school/classes/${id}/edit`);

  /**
   * handleRowDoubleClick
   * pt-BR: Abre a edição da turma ao dar duplo clique na linha.
   * en-US: Opens class edit page on row double-click.
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Turmas</h1>
          <p className="text-muted-foreground">Gerencie turmas da escola (criar, editar, excluir)</p>
        </div>
        <Button onClick={goToCreate}>
          <Plus className="h-4 w-4 mr-2" /> Novo cadastro
        </Button>
      </div>

      {/* Toolbar de listagem */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium">Turmas cadastradas</h2>
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
              <TableHead>Nome</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead>Professor</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQuery.data?.data?.map((t) => (
              <TableRow key={t.id} onDoubleClick={() => handleRowDoubleClick(t.id)} className="hover:bg-muted/50 cursor-pointer">
                <TableCell className="font-mono">{t.id}</TableCell>
                <TableCell>{t.nome ?? '-'}</TableCell>
                <TableCell>{resolveSimNao(t.ativo)}</TableCell>
                <TableCell>{t.inicio ?? '-'}</TableCell>
                <TableCell>{t.fim ?? '-'} </TableCell>
                <TableCell>{t.professor ?? '-'}</TableCell>
                <TableCell>{t.Valor ?? '-'}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => goToEdit(t.id)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(t.id)}>Excluir</DropdownMenuItem>
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