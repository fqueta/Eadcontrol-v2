import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Star } from 'lucide-react';
import commentsService, { CommentStatus } from '@/services/commentsService';

/**
 * CommentsModeration
 * pt-BR: Página de moderação de comentários para administradores. Permite listar, filtrar por status
 *        (pending/approved/rejected), aprovar, rejeitar e excluir comentários.
 * en-US: Admin comments moderation page. Allows listing, filtering by status
 *        (pending/approved/rejected), approving, rejecting, and deleting comments.
 */
export default function CommentsModeration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // pt-BR: Estado do modal: índice do comentário atual e registro atual.
  // en-US: Modal state: current comment index and record.
  const [detailComment, setDetailComment] = useState<any | null>(null);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);

  /**
   * formatTarget
   * pt-BR: Converte o tipo do alvo (commentable_type) em um rótulo amigável e
   *        concatena o ID do alvo. Ex.: "App\\Models\\Activity" + 34 -> "Atividade #34".
   * en-US: Converts the target type (commentable_type) into a friendly label and
   *        appends the target ID. E.g., "App\\Models\\Activity" + 34 -> "Activity #34".
   */
  function formatTarget(c: any): string {
    const typeRaw = String(c?.commentable_type ?? c?.target_type ?? '').trim();
    const id = String(c?.commentable_id ?? c?.target_id ?? '').trim();

    if (!typeRaw && !id) return '-';

    // Extrai o último segmento do FQN (ex.: "Activity" de "App\\Models\\Activity").
    const typeShort = (typeRaw.split('\\').pop() || typeRaw).trim();

    // Mapeamento para rótulos mais amigáveis em pt-BR.
    const typeLabelMap: Record<string, string> = {
      Activity: 'Atividade',
      Course: 'Curso',
      Module: 'Módulo',
      Lesson: 'Aula',
      Post: 'Post',
      Service: 'Serviço',
      Product: 'Produto',
      Enrollment: 'Matrícula',
    };

    const label = typeLabelMap[typeShort] ?? typeShort;
    return id ? `${label} #${id}` : label;
  }

  /**
   * formatAuthor
   * pt-BR: Extrai o nome do autor a partir de diferentes campos possíveis
   *        retornados pela API, com fallback amigável.
   * en-US: Extracts the author name from multiple possible fields
   *        returned by the API, with a friendly fallback.
   */
  function formatAuthor(c: any): string {
    const name = String(
      c?.author_name ??
      c?.authorName ??
      c?.user_name ??
      c?.user_full_name ??
      c?.user?.full_name ??
      c?.user?.name ??
      c?.user?.nome ??
      ''
    ).trim();

    // Preferimos não exibir user_id; se não houver nome, mostra "-".
    // We prefer not to show user_id; if no name, show "-".
    return name || '-';
  }

  /**
   * status
   * pt-BR: Filtro de status para listagem.
   * en-US: Status filter for listing.
   */
  const [status, setStatus] = useState<CommentStatus | 'all'>('pending');
  /**
   * pagination
   * pt-BR: Estado de paginação (página atual e itens por página).
   * en-US: Pagination state (current page and items per page).
   */
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  /**
   * search
   * pt-BR: Filtro de busca por texto simples (client-side).
   * en-US: Simple text search filter (client-side).
   */
  const [search, setSearch] = useState('');

  /**
   * commentsQuery
   * pt-BR: Busca comentários do backend com filtro de status.
   * en-US: Fetch comments from backend with status filter.
   */
  const commentsQuery = useQuery({
    queryKey: ['admin-comments', status, page, perPage],
    queryFn: async () => {
      const s = status === 'all' ? undefined : status;
      const res = await commentsService.adminList(s, page, perPage);
      // Normaliza saída para { items, page, lastPage, total }
      if (Array.isArray(res)) {
        return { items: res, page: 1, lastPage: 1, total: res.length };
      }
      const items = Array.isArray(res?.data) ? res.data : [];
      const current = Number(res?.current_page ?? res?.page ?? 1);
      const last = Number(res?.last_page ?? res?.total_pages ?? 1);
      const total = Number(res?.total ?? items.length);
      return { items, page: current, lastPage: last, total };
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  /**
   * filtered
   * pt-BR: Aplica filtro de busca local sobre os comentários carregados.
   * en-US: Applies local search filter over loaded comments.
   */
  const filtered = useMemo(() => {
    const items = Array.isArray(commentsQuery.data?.items) ? commentsQuery.data.items : [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c: any) => {
      const body = String(c?.body ?? '').toLowerCase();
      const author = formatAuthor(c).toLowerCase();
      return body.includes(q) || author.includes(q);
    });
  }, [commentsQuery.data?.items, search]);

  /**
   * approveMutation
   * pt-BR: Aprova comentário e atualiza a listagem.
   * en-US: Approves comment and updates listing.
   */
  const approveMutation = useMutation({
    mutationFn: async (id: number | string) => commentsService.adminApprove(id),
    onSuccess: () => {
      toast({ title: 'Comentário aprovado', description: 'O comentário foi aprovado com sucesso.' });
      queryClient.invalidateQueries({ queryKey: ['admin-comments', status, page, perPage] });
    },
    onError: () => {
      toast({ title: 'Falha ao aprovar', description: 'Não foi possível aprovar.', variant: 'destructive' } as any);
    }
  });

  /**
   * rejectMutation
   * pt-BR: Rejeita comentário e atualiza a listagem.
   * en-US: Rejects comment and updates listing.
   */
  const rejectMutation = useMutation({
    mutationFn: async (id: number | string) => commentsService.adminReject(id),
    onSuccess: () => {
      toast({ title: 'Comentário rejeitado', description: 'O comentário foi rejeitado.' });
      queryClient.invalidateQueries({ queryKey: ['admin-comments', status, page, perPage] });
    },
    onError: () => {
      toast({ title: 'Falha ao rejeitar', description: 'Não foi possível rejeitar.', variant: 'destructive' } as any);
    }
  });

  /**
   * deleteMutation
   * pt-BR: Exclui comentário e atualiza a listagem.
   * en-US: Deletes comment and updates listing.
   */
  const deleteMutation = useMutation({
    mutationFn: async (id: number | string) => commentsService.adminDelete(id),
    onSuccess: () => {
      toast({ title: 'Comentário excluído', description: 'O comentário foi removido.' });
      queryClient.invalidateQueries({ queryKey: ['admin-comments', status, page, perPage] });
    },
    onError: () => {
      toast({ title: 'Falha ao excluir', description: 'Não foi possível excluir.', variant: 'destructive' } as any);
    }
  });

  /**
   * renderActionButtons
   * pt-BR: Renderiza botões de ação para um comentário.
   * en-US: Renders action buttons for a comment.
   */
  function renderActionButtons(c: any) {
    const id = c?.id ?? c?.comment_id;
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            // pt-BR: Abrir o modal e fixar o índice do item clicado.
            // en-US: Open modal and capture clicked item's index.
            const list = Array.isArray(filtered) ? (filtered as any[]) : [];
            const idx = list.findIndex((it) => String(it?.id) === String(id));
            setDetailIndex(idx >= 0 ? idx : null);
            setDetailComment(c);
          }}
        >Ver</Button>
        <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(id)} disabled={approveMutation.isLoading}>Aprovar</Button>
        <Button size="sm" variant="outline" onClick={() => rejectMutation.mutate(id)} disabled={rejectMutation.isLoading}>Rejeitar</Button>
        <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(id)} disabled={deleteMutation.isLoading}>Excluir</Button>
      </div>
    );
  }

  /**
   * renderRating
   * pt-BR: Renderiza a avaliação em estrelas e o valor numérico (se existir).
   * en-US: Renders star rating and numeric value (if present).
   */
  /**
   * renderRating
   * pt-BR: Renderiza as estrelas da avaliação ou 'Sem avaliação' quando ausente.
   * en-US: Renders rating stars or 'Sem avaliação' when rating is missing.
   */
  function renderRating(c: any) {
    const ratingVal = Number(c?.rating ?? 0);
    if (!ratingVal || ratingVal < 1) return <span className="text-xs text-muted-foreground">Sem avaliação</span>;
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={14} className={(ratingVal >= i + 1) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'} />
        ))}
        <span className="ml-1 text-[10px] text-muted-foreground">{ratingVal} / 5</span>
      </div>
    );
  }

  /**
   * renderCommentDetails
   * pt-BR: Renderiza conteúdo do modal com detalhes do comentário.
   * en-US: Renders modal content with comment details.
   */
  /**
   * renderCommentDetails
   * pt-BR: Renderiza o modal de detalhes com navegação Próximo/Anterior.
   * en-US: Renders the details modal with Next/Previous navigation.
   */
  function renderCommentDetails(c: any) {
    const list = Array.isArray(filtered) ? (filtered as any[]) : [];
    const current = (detailIndex !== null && list[detailIndex]) ? list[detailIndex] : c;
    if (!current) return null;
    const author = formatAuthor(current);
    const target = formatTarget(current);
    const created = current?.created_at ? new Date(String(current.created_at)).toLocaleString() : '';

    // pt-BR: Handlers para navegação dentro do modal.
    // en-US: Handlers for in-modal navigation.
    const canPrev = (detailIndex ?? 0) > 0;
    const canNext = detailIndex !== null && detailIndex < list.length - 1;
    const goPrev = () => {
      if (!canPrev || detailIndex === null) return;
      const nextIdx = detailIndex - 1;
      setDetailIndex(nextIdx);
      setDetailComment(list[nextIdx] ?? null);
    };
    const goNext = () => {
      if (!canNext || detailIndex === null) return;
      const nextIdx = detailIndex + 1;
      setDetailIndex(nextIdx);
      setDetailComment(list[nextIdx] ?? null);
    };
    return (
      <Dialog open={detailIndex !== null} onOpenChange={(open) => { if (!open) { setDetailComment(null); setDetailIndex(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do comentário</DialogTitle>
            <DialogDescription>
              {author ? `Autor: ${author}` : ''}{created ? ` • ${created}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Alvo: {target}</div>
            <div className="text-sm">Avaliação: {renderRating(current)}</div>
            <div className="text-sm whitespace-pre-wrap break-words border rounded-md p-2">{String(current?.body ?? '')}</div>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={goPrev} disabled={!canPrev}>Anterior</Button>
                <Button variant="outline" size="sm" onClick={goNext} disabled={!canNext}>Próximo</Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setDetailComment(null); setDetailIndex(null); }}>Fechar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Moderação de Comentários</CardTitle>
          <CardDescription>Filtre, aprove, rejeite ou exclua comentários enviados pelos alunos.</CardDescription>
        </CardHeader>
        <CardContent>
          {renderCommentDetails(detailComment)}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as CommentStatus | 'all')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Itens por página</label>
              <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Busca</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por texto ou autor..." />
            </div>
          </div>

          {commentsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando comentários...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Alvo</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Comentário</TableHead>
                  <TableHead>Avaliação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(filtered as any[]).map((c) => {
                  const target = formatTarget(c);
                  const author = formatAuthor(c);
                  const body = String(c?.body ?? '').slice(0, 160);
                  const st = String(c?.status ?? '').toLowerCase();
                  return (
                    <TableRow key={String(c?.id ?? Math.random())}>
                      <TableCell className="text-xs">{String(c?.id ?? '')}</TableCell>
                      <TableCell className="text-xs">{target}</TableCell>
                      <TableCell className="text-xs">{author}</TableCell>
                      <TableCell className="text-xs">{body}</TableCell>
                      <TableCell className="text-xs">{renderRating(c)}</TableCell>
                      <TableCell className="text-xs capitalize">{st}</TableCell>
                      <TableCell>{renderActionButtons(c)}</TableCell>
                    </TableRow>
                  );
                })}
                {Array.isArray(filtered) && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="text-sm text-muted-foreground">Nenhum comentário encontrado para o filtro atual.</div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {/* Pagination Controls */}
          {!commentsQuery.isLoading && commentsQuery.data && commentsQuery.data.lastPage > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Página {page} de {commentsQuery.data.lastPage}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(commentsQuery.data.lastPage, page + 1))}
                  disabled={page >= commentsQuery.data.lastPage}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}