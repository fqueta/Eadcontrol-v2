import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, MoreHorizontal, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEnrollmentSituationsList, useCreateEnrollmentSituation, useUpdateEnrollmentSituation, useDeleteEnrollmentSituation } from '@/hooks/enrollmentSituations';
import { EnrollmentSituation, EnrollmentSituationCreatePayload, EnrollmentSituationUpdatePayload } from '@/types/enrollmentSituation';

/**
 * resolveSimNao
 * pt-BR: Converte 's'/'n' para etiqueta legível.
 * en-US: Converts 's'/'n' to a human readable label.
 */
function resolveSimNao(v?: 's' | 'n') {
  return v === 's' ? 'Sim' : v === 'n' ? 'Não' : '-';
}

/**
 * EnrollmentSituationPage
 * pt-BR: Listagem e operações CRUD de Situações de Matrícula.
 * en-US: Listing and CRUD operations for Enrollment Situations.
 */
export default function EnrollmentSituationPage() {
  // --- list state
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // --- dialogs state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<EnrollmentSituation | null>(null);
  // --- form state (create)
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createAtivo, setCreateAtivo] = useState<'s' | 'n'>('s');
  // --- form state (edit)
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAtivo, setEditAtivo] = useState<'s' | 'n'>('s');

  // --- list query
  const listQuery = useEnrollmentSituationsList({ page, per_page: perPage, search });

  // --- mutations
  const createMutation = useCreateEnrollmentSituation();
  const updateMutation = useUpdateEnrollmentSituation();
  const deleteMutation = useDeleteEnrollmentSituation();

  /**
   * currentPage
   * pt-BR: Página atual vinda do backend ou estado local.
   * en-US: Current page coming from backend or local state.
   */
  const currentPage = listQuery.data?.current_page ?? page;
  const lastPage = listQuery.data?.last_page ?? 1;
  const total = listQuery.data?.total ?? 0;

  /**
   * initialEdit
   * pt-BR: Estado inicial para o formulário de edição.
   * en-US: Initial state for edit form.
   */
  const initialEdit: EnrollmentSituationUpdatePayload = useMemo(() => ({
    name: selected?.name ?? '',
    description: selected?.description ?? '',
    ativo: selected?.ativo ?? 's',
  }), [selected]);

  // sync selected into edit form when dialog opens
  React.useEffect(() => {
    if (editOpen && selected) {
      setEditName(selected.name || '');
      setEditDesc(String(selected.description || ''));
      setEditAtivo((selected.ativo as 's' | 'n') || 's');
    }
  }, [editOpen, selected]);

  /**
   * handleCreate
   * pt-BR: Submete criação e fecha o diálogo.
   * en-US: Submits creation and closes dialog.
   */
  const handleCreate = async (data: EnrollmentSituationCreatePayload) => {
    await createMutation.mutateAsync(data);
    setCreateOpen(false);
    setPage(1);
    // reset form
    setCreateName('');
    setCreateDesc('');
    setCreateAtivo('s');
  };

  /**
   * handleUpdate
   * pt-BR: Submete atualização e fecha o diálogo.
   * en-US: Submits update and closes dialog.
   */
  const handleUpdate = async (data: EnrollmentSituationUpdatePayload) => {
    if (!selected?.id) return;
    await updateMutation.mutateAsync({ id: String(selected.id), data });
    setEditOpen(false);
  };

  /**
   * handleDelete
   * pt-BR: Executa exclusão e fecha confirmação.
   * en-US: Performs deletion and closes confirmation.
   */
  const handleDelete = async () => {
    if (!selected?.id) return;
    await deleteMutation.mutateAsync(String(selected.id));
    setDeleteOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Situações de Matrícula</h1>
        <div className="flex gap-2">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova Situação
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listagem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 pb-4">
            <div className="relative w-[280px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8"
                placeholder="Buscar por nome ou descrição..."
              />
            </div>
            <div className="flex items-center gap-2">
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
                <Button variant="outline" size="icon" title="Página anterior" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1 || listQuery.isFetching}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-xs text-muted-foreground">Página {currentPage} de {lastPage}</span>
                <Button variant="outline" size="icon" title="Próxima página" onClick={() => setPage((p) => Math.min(lastPage, p + 1))} disabled={currentPage >= lastPage || listQuery.isFetching}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <span className="text-xs text-muted-foreground">Total: {total}</span>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.data?.data?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono">{s.id}</TableCell>
                  <TableCell>{s.name ?? '-'}</TableCell>
                  <TableCell>{s.description ?? '-'}</TableCell>
                  <TableCell>{resolveSimNao(s.ativo)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { setSelected(s); setEditOpen(true); }}>Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => { setSelected(s); setDeleteOpen(true); }}>Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {listQuery.isLoading && (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Situação de Matrícula</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input placeholder="Ex.: Em andamento" value={createName} onChange={(e) => setCreateName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input placeholder="Descrição opcional" value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Ativo</label>
              <Select value={createAtivo} onValueChange={(v) => setCreateAtivo(v as 's' | 'n')}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="s">Sim</SelectItem>
                  <SelectItem value="n">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={() => {
                const payload: EnrollmentSituationCreatePayload = { name: createName, description: createDesc, ativo: createAtivo };
                handleCreate(payload);
              }} disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Situação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Ativo</label>
              <Select value={editAtivo} onValueChange={(v) => setEditAtivo(v as 's' | 'n')}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="s">Sim</SelectItem>
                  <SelectItem value="n">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={() => {
                const payload: EnrollmentSituationUpdatePayload = { name: editName, description: editDesc, ativo: editAtivo };
                handleUpdate(payload);
              }} disabled={updateMutation.isPending}>
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
            <AlertDialogTitle>Excluir Situação</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Confirme a exclusão da situação ID {selected?.id}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}