import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Star, MoreHorizontal, Eye, Trash2, CheckCircle2, XCircle, Reply } from 'lucide-react';
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
  // pt-BR: Estado para o modal de resposta do moderador.
  // en-US: State for the moderator reply modal.
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyTargetId, setReplyTargetId] = useState<number | string | null>(null);

  /**
   * inlineReplyVisible / inlineReplyValue
   * pt-BR: Controle de visibilidade e texto do formulário de resposta inline por comentário.
   * en-US: Visibility and text control for per-comment inline reply form.
   */
  const [inlineReplyVisible, setInlineReplyVisible] = useState<Record<string, boolean>>({});
  const [inlineReplyValue, setInlineReplyValue] = useState<Record<string, string>>({});

  /**
   * expandedRows
   * pt-BR: Controle de expansão por linha na tabela para exibir respostas.
   * en-US: Per-row expansion control in table to show replies.
   */
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  /**
   * fullThread
   * pt-BR: Armazena thread completa de respostas carregada a partir de todas as páginas.
   * en-US: Stores complete replies thread loaded from all pages.
   */
  const [fullThread, setFullThread] = useState<Record<string, any[]>>({});
  const [loadingFullThread, setLoadingFullThread] = useState<boolean>(false);

  /**
   * noteDraft
   * pt-BR: Rascunho de observação interna do administrador para o comentário atual (armazenado localmente).
   * en-US: Admin internal note draft for the current comment (stored locally).
   */
  const [noteDraft, setNoteDraft] = useState<string>('');

  /**
   * translateStatus
   * pt-BR: Converte valores de status técnicos (pending/approved/rejected) para rótulos em português.
   * en-US: Converts technical status values (pending/approved/rejected) to Portuguese labels.
   */
  function translateStatus(s: string): string {
    const key = String(s || '').toLowerCase();
    switch (key) {
      case 'pending': return 'Pendente';
      case 'approved': return 'Aprovado';
      case 'rejected': return 'Rejeitado';
      default: return key || 'Pendente';
    }
  }

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
  // Default para "pending": ao abrir a página, listar pendentes primeiro
  // Default to "pending": show pending items first when opening the page
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
   * selectedRows / bulkAction
   * pt-BR: Seleção em massa de linhas para aplicar ações (aprovar/rejeitar/excluir).
   * en-US: Row selection for bulk actions (approve/reject/delete).
   */
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | 'delete' | ''>('');

  /**
   * toggleSelectAll
   * pt-BR: Seleciona ou desmarca todas as linhas visíveis.
   * en-US: Selects or unchecks all visible rows.
   */
  function toggleSelectAll(checked: boolean) {
    const next: Record<string, boolean> = {};
    const items = Array.isArray(filtered) ? (filtered as any[]) : [];
    items.forEach((c) => {
      const idStr = String(c?.id ?? '');
      if (idStr) next[idStr] = checked;
    });
    setSelectedRows(next);
  }

  /**
   * toggleSelectOne
   * pt-BR: Alterna seleção de uma única linha.
   * en-US: Toggles selection for a single row.
   */
  function toggleSelectOne(id: number | string, checked: boolean) {
    const key = String(id);
    setSelectedRows((prev) => ({ ...prev, [key]: checked }));
  }

  /**
   * applyBulkAction
   * pt-BR: Aplica ação em massa às linhas selecionadas e atualiza a listagem.
   * en-US: Applies bulk action to selected rows and refreshes listing.
   */
  async function applyBulkAction() {
    const ids = Object.keys(selectedRows).filter((k) => selectedRows[k]);
    if (!bulkAction || ids.length === 0) {
      toast({ title: 'Seleção vazia', description: 'Escolha uma ação e selecione itens.', variant: 'destructive' } as any);
      return;
    }
    try {
      for (const id of ids) {
        if (bulkAction === 'approve') await commentsService.adminApprove(id);
        else if (bulkAction === 'reject') await commentsService.adminReject(id);
        else if (bulkAction === 'delete') await commentsService.adminDelete(id);
      }
      toast({ title: 'Ação aplicada', description: `Ação '${bulkAction}' executada em ${ids.length} item(s).` });
      setSelectedRows({});
      // Recarregar listagem
      queryClient.invalidateQueries({ queryKey: ['admin-comments', status, page, perPage] });
    } catch (err) {
      toast({ title: 'Falha na ação em massa', description: 'Verifique e tente novamente.', variant: 'destructive' } as any);
    }
  }

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
   * getRepliesCount
   * pt-BR: Obtém o contador de replies do comentário pai a partir de campos retornados pelo backend.
   *        Verifica `total_replies` e `replies_count` quando disponíveis.
   * en-US: Gets the replies count for the parent comment from backend-provided fields.
   *        Checks `total_replies` and `replies_count` when available.
   */
  function getRepliesCount(comment: any): number {
    const total = Number(comment?.total_replies ?? comment?.replies_count ?? 0);
    return Number.isFinite(total) ? total : 0;
  }

  /**
   * getNoteForId / setNoteForId
   * pt-BR: Lê/escreve observação interna no localStorage, por ID de comentário.
   * en-US: Read/write internal note from localStorage, by comment ID.
   */
  function getNoteForId(id: number | string) {
    try {
      const raw = localStorage.getItem(`admin_comment_note_${String(id)}`);
      return raw ? String(raw) : '';
    } catch {
      return '';
    }
  }
  function setNoteForId(id: number | string, text: string) {
    try {
      if (!text) {
        localStorage.removeItem(`admin_comment_note_${String(id)}`);
      } else {
        localStorage.setItem(`admin_comment_note_${String(id)}`, text);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * getRepliesInCurrentPage
   * pt-BR: Filtra respostas presentes apenas na página atual pela referência ao parent_id.
   * en-US: Filters replies present only in current page by parent_id reference.
   */
  function getRepliesInCurrentPage(parentId: number | string) {
    const list = Array.isArray(filtered) ? (filtered as any[]) : [];
    const pid = String(parentId);
    return list.filter((it) => String(it?.parent_id ?? it?.parentId ?? '') === pid);
  }

  /**
   * buildThreadFromItems
   * pt-BR: Constrói uma árvore de respostas a partir de uma lista completa de comentários.
   * en-US: Builds a replies tree from a complete list of comments.
   */
  function buildThreadFromItems(items: any[], rootId: number | string) {
    const byParent: Record<string, any[]> = {};
    items.forEach((it) => {
      const pid = String(it?.parent_id ?? it?.parentId ?? '');
      if (!pid) return;
      if (!byParent[pid]) byParent[pid] = [];
      byParent[pid].push(it);
    });
    const walk = (pid: string, depth = 0): any[] => {
      const children = byParent[pid] || [];
      return children.map((c) => ({
        ...c,
        _depth: depth,
        _children: walk(String(c?.id ?? ''), depth + 1),
      }));
    };
    return walk(String(rootId));
  }

  /**
   * loadFullThreadFor
   * pt-BR: Usa o endpoint `GET /comments/{id}/replies` para carregar todas as respostas
   *        do comentário pai, paginando até obter a lista completa.
   * en-US: Uses `GET /comments/{id}/replies` to load all replies for the
   *        parent comment, paginating until the full list is loaded.
   */
  async function loadFullThreadFor(parentId: number | string) {
    try {
      setLoadingFullThread(true);
      // pt-BR: Carrega a primeira página de replies (sem filtrar status para trazer todos)
      // en-US: Load first page of replies (no status filter to fetch all)
      const first: any = await commentsService.replies(parentId, undefined, 1, 50);
      const totalPages = Number(first?.last_page ?? first?.total_pages ?? 1);
      const items: any[] = Array.isArray(first?.data)
        ? first.data
        : (Array.isArray(first?.items) ? first.items : []);
      // pt-BR: Se houver mais páginas, continuar até completar
      // en-US: If there are more pages, continue until complete
      for (let p = 2; p <= totalPages; p++) {
        const resp: any = await commentsService.replies(parentId, undefined, p, 50);
        const pageItems = Array.isArray(resp?.data)
          ? resp.data
          : (Array.isArray(resp?.items) ? resp.items : []);
        items.push(...pageItems);
      }
      // pt-BR: Respostas já vêm do backend normalizadas e com `_depth` para identação
      // en-US: Replies come normalized from backend and include `_depth` for indentation
      setFullThread((prev) => ({ ...prev, [String(parentId)]: items }));
    } catch (err) {
      toast({ title: 'Falha ao carregar respostas', description: 'Não foi possível carregar todas as respostas.', variant: 'destructive' } as any);
    } finally {
      setLoadingFullThread(false);
    }
  }

  /**
   * filtered
   * pt-BR: Aplica filtro de busca local sobre os comentários carregados.
   * en-US: Applies local search filter over loaded comments.
   */
  const filtered = useMemo(() => {
    const allItems = Array.isArray(commentsQuery.data?.items) ? commentsQuery.data.items : [];
    // pt-BR: Limita a tabela aos comentários raiz (parent_id nulo) para exibir respostas indentadas abaixo.
    // en-US: Restrict table to root comments (null parent_id) to show nested replies below.
    const rootItems = allItems.filter((c: any) => !c?.parent_id && !c?.parentId);
    const q = search.trim().toLowerCase();
    if (!q) return rootItems;
    return rootItems.filter((c: any) => {
      const body = String(c?.body ?? '').toLowerCase();
      const author = formatAuthor(c).toLowerCase();
      return body.includes(q) || author.includes(q);
    });
  }, [commentsQuery.data?.items, search]);

  /**
   * autoExpandRows
   * pt-BR: Expande automaticamente as linhas para exibir respostas indentadas por padrão.
   * en-US: Automatically expands rows to show nested replies by default.
   */
  useEffect(() => {
    try {
      const ids = (Array.isArray(filtered) ? filtered : []).map((c: any) => String(c?.id ?? ''));
      if (ids.length === 0) return;
      setExpandedRows((prev) => {
        const next = { ...prev };
        ids.forEach((id) => { next[id] = true; });
        return next;
      });
    } catch {}
  }, [filtered]);

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
   * replyMutation
   * pt-BR: Publica resposta do moderador e atualiza a listagem.
   * en-US: Publishes moderator reply and updates the listing.
   */
  const replyMutation = useMutation({
    mutationFn: async ({ id, body }: { id: number | string; body: string }) => commentsService.adminReply(id, body),
    onSuccess: () => {
      toast({ title: 'Resposta publicada', description: 'Sua resposta foi enviada com sucesso.' });
      setReplyOpen(false);
      setReplyText('');
      // pt-BR: Captura o alvo antes de limpar para recarregar a thread correta.
      // en-US: Capture target before clearing to reload the correct thread.
      const prevTarget = replyTargetId;
      setReplyTargetId(null);
      // pt-BR: Fechar formulário inline quando aplicável e limpar o texto.
      // en-US: Close inline form when applicable and clear its text.
      if (prevTarget !== null) {
        const k = String(prevTarget);
        setInlineReplyVisible((prev) => ({ ...prev, [k]: false }));
        setInlineReplyValue((prev) => ({ ...prev, [k]: '' }));
      }
      queryClient.invalidateQueries({ queryKey: ['admin-comments', status, page, perPage] });
      // pt-BR: Recarrega a thread completa para garantir que a nova resposta apareça.
      // en-US: Reload full thread to ensure the new reply appears.
      try {
        if (prevTarget) loadFullThreadFor(prevTarget);
      } catch {}
    },
    onError: () => {
      toast({ title: 'Falha ao responder', description: 'Não foi possível enviar a resposta.', variant: 'destructive' } as any);
    }
  });

  /**
   * toggleInlineReply
   * pt-BR: Alterna a visibilidade do formulário de resposta inline para um comentário.
   * en-US: Toggles inline reply form visibility for a given comment.
   */
  function toggleInlineReply(id: number | string) {
    const key = String(id);
    setInlineReplyVisible((prev) => ({ ...prev, [key]: !prev[key] }));
    // pt-BR: Ao abrir, inicializa o alvo de resposta para reaproveitar handlers.
    // en-US: When opening, initialize reply target to reuse handlers.
    if (!inlineReplyVisible[key]) {
      setReplyTargetId(id);
    }
  }

  /**
   * publishInlineReply
   * pt-BR: Publica resposta inline do moderador para um comentário específico.
   * en-US: Publishes an inline moderator reply for a specific comment.
   */
  function publishInlineReply(id: number | string) {
    const key = String(id);
    const body = (inlineReplyValue[key] ?? '').trim();
    if (body.length < 2) {
      toast({ title: 'Texto muito curto', description: 'Use pelo menos 2 caracteres.', variant: 'destructive' } as any);
      return;
    }
    setReplyTargetId(id);
    replyMutation.mutate({ id, body });
  }

  /**
   * renderActionButtons
   * pt-BR: Renderiza botões de ação para um comentário.
   * en-US: Renders action buttons for a comment.
   */
  /**
   * renderActionDropdown
   * pt-BR: Renderiza um dropdown de ações para um comentário (ver, aprovar, rejeitar, excluir, responder).
   * en-US: Renders an actions dropdown for a comment (view, approve, reject, delete, reply).
   */
  function renderActionDropdown(c: any) {
    const id = c?.id ?? c?.comment_id;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="h-8 px-2">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => {
              const list = Array.isArray(filtered) ? (filtered as any[]) : [];
              const idx = list.findIndex((it) => String(it?.id) === String(id));
              setDetailIndex(idx >= 0 ? idx : null);
              setDetailComment(c);
              setNoteDraft(getNoteForId(id));
            }}
          >
            <Eye className="mr-2 h-4 w-4" /> Ver
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => approveMutation.mutate(id)} disabled={approveMutation.isLoading}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => rejectMutation.mutate(id)} disabled={rejectMutation.isLoading}>
            <XCircle className="mr-2 h-4 w-4" /> Rejeitar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => deleteMutation.mutate(id)} className="text-destructive focus:text-destructive" disabled={deleteMutation.isLoading}>
            <Trash2 className="mr-2 h-4 w-4" /> Excluir
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const idStr = String(id ?? '');
              setExpandedRows((prev) => ({ ...prev, [idStr]: true }));
              toggleInlineReply(id);
            }}
          >
            <Reply className="mr-2 h-4 w-4" /> Responder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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

    /**
     * repliesByParent
     * pt-BR: Retorna respostas cujo `parent_id` coincide com o comentário pai.
     * en-US: Returns replies whose `parent_id` matches the parent comment.
     */
    const repliesByParent = (parentId: number | string) => getRepliesInCurrentPage(parentId);

    /**
     * renderReplyItem
     * pt-BR: Renderiza uma resposta (com autor, status e texto) com indentação.
     * en-US: Renders a reply (author, status and text) with indentation.
     */
    const renderReplyItem = (reply: any, depth: number = 0) => {
      const rAuthor = formatAuthor(reply);
      const rCreated = reply?.created_at ? new Date(String(reply.created_at)).toLocaleString() : '';
      const rStatusLabel = translateStatus(String(reply?.status ?? 'pending'));
      return (
        <div className={`mt-2 ${depth > 0 ? 'ml-4 pl-3 border-l' : ''}`}>
          <div className="text-[12px] text-muted-foreground flex items-center justify-between">
            <span>{rAuthor}{rCreated ? ` • ${rCreated}` : ''}</span>
            <span className="capitalize">{rStatusLabel}</span>
          </div>
          {/* pt-BR: Observações internas (armazenadas localmente) */}
          {/* en-US: Internal notes (stored locally) */}
          <div className="mt-4">
            <div className="text-sm font-medium">Observações (interno)</div>
            <div className="text-xs text-muted-foreground">Somente visível no painel do administrador. Armazenado localmente.</div>
            <div className="mt-2 space-y-2">
              <Textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Digite uma observação interna..."
                maxLength={800}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const id = current?.id ?? '';
                    const ok = setNoteForId(id, noteDraft.trim());
                    if (ok) {
                      toast({ title: 'Observação salva', description: 'Observação interna salva localmente.' });
                    } else {
                      toast({ title: 'Falha ao salvar observação', description: 'Houve um erro ao salvar localmente.', variant: 'destructive' } as any);
                    }
                  }}
                >Salvar observação</Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const id = current?.id ?? '';
                    setNoteDraft('');
                    setNoteForId(id, '');
                  }}
                >Limpar</Button>
              </div>
            </div>
          </div>
          <div className="text-sm whitespace-pre-wrap break-words">{String(reply?.body ?? '')}</div>
        </div>
      );
    };

    /**
     * renderRepliesTree
     * pt-BR: Renderiza recursivamente as respostas encontradas na página atual.
     *        Nota: limita-se aos itens carregados na página corrente.
     * en-US: Recursively renders replies found in the current page.
     *        Note: limited to items loaded on the current page.
     */
    const renderRepliesTree = (parentId: number | string, depth: number = 0) => {
      const children = repliesByParent(parentId);
      if (!children || children.length === 0) return null;
      return (
        <div className="mt-2">
          {children.map((r) => (
            <div key={String(r?.id ?? Math.random())}>
              {renderReplyItem(r, depth)}
              {renderRepliesTree(r?.id ?? '', depth + 1)}
            </div>
          ))}
        </div>
      );
    };

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
            {/* pt-BR: Thread de respostas (apenas itens existentes na página atual) */}
            {/* en-US: Replies thread (only items existing in the current page) */}
          <div className="mt-3">
            <div className="text-sm font-medium">Respostas</div>
            <div className="text-xs text-muted-foreground">Mostrando respostas presentes na página atual.</div>
            {renderRepliesTree(current?.id ?? '') || (
              <div className="text-sm text-muted-foreground mt-1">Nenhuma resposta encontrada.</div>
            )}
          </div>
          {/* pt-BR: Carregamento completo da thread (todas as páginas) */}
          {/* en-US: Full thread loading (all pages) */}
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Respostas (completas)</div>
              <div>
                <Button size="sm" variant="outline" onClick={() => loadFullThreadFor(current?.id ?? '')} disabled={loadingFullThread}>
                  {loadingFullThread ? 'Carregando...' : 'Carregar todas'}
                </Button>
              </div>
            </div>
            {Array.isArray(fullThread[String(current?.id ?? '')]) && fullThread[String(current?.id ?? '')].length > 0 ? (
              <div className="mt-2">
                {fullThread[String(current?.id ?? '')].map((r: any) => (
                  <div key={String(r?.id ?? Math.random())} className={`mt-2 ${r?._depth > 0 ? 'ml-4 pl-3 border-l' : ''}`}>
                    <div className="text-[12px] text-muted-foreground flex items-center justify-between">
                      <span>{formatAuthor(r)}{r?.created_at ? ` • ${new Date(String(r.created_at)).toLocaleString()}` : ''}</span>
                      <span className="capitalize">{String(r?.status ?? '').toLowerCase() || 'pending'}</span>
                    </div>
                    <div className="text-sm whitespace-pre-wrap break-words">{String(r?.body ?? '')}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mt-1">Nenhuma resposta carregada. Clique em "Carregar todas".</div>
            )}
          </div>
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
          {/* pt-BR: Modal para resposta do moderador */}
          {/* en-US: Modal for moderator reply */}
          <Dialog open={replyOpen} onOpenChange={(v) => setReplyOpen(v)}>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Responder comentário</DialogTitle>
                <DialogDescription>
                  Escreva sua resposta. Ela será publicada imediatamente como moderador.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <label className="text-sm font-medium">Resposta</label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Digite sua resposta..."
                  maxLength={500}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setReplyOpen(false); setReplyText(''); setReplyTargetId(null); }}>Cancelar</Button>
                  <Button
                    onClick={() => {
                      if (!replyTargetId) return;
                      const body = replyText.trim();
                      if (body.length < 2) {
                        toast({ title: 'Texto muito curto', description: 'Use pelo menos 2 caracteres.', variant: 'destructive' } as any);
                        return;
                      }
                      replyMutation.mutate({ id: replyTargetId, body });
                    }}
                    disabled={replyMutation.isLoading}
                  >Publicar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {/* pt-BR: Barra de ações e filtros (estilo semelhante ao WordPress) */}
          {/* en-US: Actions and filters bar (WordPress-like style) */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-4 items-end">
            <div className="lg:col-span-2 flex gap-2 items-end">
              <div className="w-48">
                <label className="text-sm font-medium">Ações em massa</label>
                <Select value={bulkAction || ''} onValueChange={(v) => setBulkAction((v as any) || '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecionar ação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approve">Aprovar</SelectItem>
                    <SelectItem value="reject">Rejeitar</SelectItem>
                    <SelectItem value="delete">Excluir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={applyBulkAction}>Aplicar</Button>
            </div>
            <div>
              <label className="text-sm font-medium">Todos os tipos de comentário</label>
              <Select value={status} onValueChange={(v) => setStatus(v as CommentStatus | 'all')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
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
            <div className="lg:col-span-1">
              <label className="text-sm font-medium">Pesquisar comentários</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Digite para buscar..." />
            </div>
          </div>

          {commentsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando comentários...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={Array.isArray(filtered) && (filtered as any[]).length > 0 && (filtered as any[]).every((c) => selectedRows[String(c?.id ?? '')])}
                      onCheckedChange={(v) => toggleSelectAll(Boolean(v))}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Comentário</TableHead>
                  <TableHead>Enviado em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(filtered as any[]).map((c) => {
                  const author = formatAuthor(c);
                  const body = String(c?.body ?? '').slice(0, 160);
                  const st = String(c?.status ?? '').toLowerCase();
                  const sentAt = c?.created_at ? new Date(String(c.created_at)).toLocaleString() : '';
                  const replyCount = (Array.isArray(filtered) ? (filtered as any[]) : []).filter(
                    (it) => String(it?.parent_id ?? it?.parentId ?? '') === String(c?.id ?? '')
                  ).length;
                  const hasLocalNote = Boolean(getNoteForId(c?.id ?? ''));
                  const idStr = String(c?.id ?? '');
                  return (
                    <>
                      <TableRow key={String(c?.id ?? Math.random())}>
                        <TableCell>
                          <Checkbox
                            checked={Boolean(selectedRows[idStr])}
                            onCheckedChange={(v) => toggleSelectOne(idStr, Boolean(v))}
                            aria-label={`Selecionar comentário ${idStr}`}
                          />
                        </TableCell>
                        <TableCell className="text-xs">{author}</TableCell>
                        <TableCell className="text-xs">{body}</TableCell>
                        <TableCell className="text-xs">{sentAt}</TableCell>
                        <TableCell className="text-xs capitalize">{translateStatus(st)}{(() => { const backendCount = getRepliesCount(c); return backendCount ? ` • ${backendCount} resposta${backendCount>1?'s':''}` : (replyCount ? ` • ${replyCount} resposta${replyCount>1?'s':''}` : ''); })()}{hasLocalNote ? ' • observação' : ''}</TableCell>
                        <TableCell>
                          {renderActionDropdown(c)}
                        </TableCell>
                    </TableRow>
                    {expandedRows[idStr] && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <div className="text-sm font-medium mb-1">Respostas (página atual)</div>
                            {getRepliesInCurrentPage(c?.id ?? '').length > 0 ? (
                              <div>
                                {getRepliesInCurrentPage(c?.id ?? '').map((r) => (
                                  <div key={String(r?.id ?? Math.random())} className="mt-2 ml-4 pl-3 border-l">
                                    <div className="text-[12px] text-muted-foreground flex items-center justify-between">
                                      <span>{formatAuthor(r)}{r?.created_at ? ` • ${new Date(String(r.created_at)).toLocaleString()}` : ''}</span>
                                      <span className="capitalize">{translateStatus(String(r?.status ?? 'pending'))}</span>
                                    </div>
                                    <div className="text-sm whitespace-pre-wrap break-words">{String(r?.body ?? '')}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">Nenhuma resposta nesta página.</div>
                            )}
                            <div className="mt-2">
                              <Button size="sm" variant="outline" onClick={() => loadFullThreadFor(c?.id ?? '')} disabled={loadingFullThread}>
                                {loadingFullThread ? 'Carregando...' : 'Carregar todas as respostas'}
                              </Button>
                              {Array.isArray(fullThread[idStr]) && fullThread[idStr].length > 0 && (
                                <div className="mt-2">
                                  <div className="text-sm font-medium mb-1">Respostas (completas)</div>
                                  {fullThread[idStr].map((r: any) => (
                                    <div key={String(r?.id ?? Math.random())} className={`mt-2 ${r?._depth > 0 ? 'ml-4 pl-3 border-l' : ''}`}>
                                      <div className="text-[12px] text-muted-foreground flex items-center justify-between">
                                        <span>{formatAuthor(r)}{r?.created_at ? ` • ${new Date(String(r.created_at)).toLocaleString()}` : ''}</span>
                                        <span className="capitalize">{translateStatus(String(r?.status ?? 'pending'))}</span>
                                      </div>
                                      <div className="text-sm whitespace-pre-wrap break-words">{String(r?.body ?? '')}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* pt-BR: Formulário de resposta inline do moderador */}
                              {/* en-US: Inline moderator reply form */}
                              <div className="mt-4">
                                <Button size="sm" variant="outline" onClick={() => toggleInlineReply(c?.id ?? '')}>
                                  {inlineReplyVisible[idStr] ? 'Cancelar resposta' : 'Responder aqui'}
                                </Button>
                                {inlineReplyVisible[idStr] && (
                                  <div className="mt-2 space-y-2">
                                    <label className="text-sm font-medium">Resposta</label>
                                    <Textarea
                                      value={inlineReplyValue[idStr] ?? ''}
                                      onChange={(e) => setInlineReplyValue((prev) => ({ ...prev, [idStr]: e.target.value }))}
                                      placeholder="Digite sua resposta..."
                                      maxLength={500}
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" onClick={() => setInlineReplyVisible((prev) => ({ ...prev, [idStr]: false }))}>Cancelar</Button>
                                      <Button onClick={() => publishInlineReply(c?.id ?? '')} disabled={replyMutation.isLoading}>Publicar</Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
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