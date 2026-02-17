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
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

    return name || 'Usuário';
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
      
      let rawItems: any[] = [];
      let current = 1;
      let last = 1;
      let total = 0;

      if (Array.isArray(res)) {
        rawItems = res;
        total = res.length;
      } else {
        rawItems = Array.isArray(res?.data) ? res.data : [];
        current = Number(res?.current_page ?? res?.page ?? 1);
        last = Number(res?.last_page ?? res?.total_pages ?? 1);
        total = Number(res?.total ?? rawItems.length);
      }

      const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      // pt-BR: O backend agora envia a estrutura aninhada no campo 'replies'.
      // en-US: Backend now sends the nested structure in the 'replies' field.
      return { items, page: current, lastPage: last, total, rawItems };
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
    const rootItems = Array.isArray(commentsQuery.data?.items) ? commentsQuery.data.items : [];
    const q = search.trim().toLowerCase();
    if (!q) return rootItems;
    return rootItems.filter((c: any) => {
      const body = String(c?.body ?? '').toLowerCase();
      const author = formatAuthor(c).toLowerCase();
      return body.includes(q) || author.includes(q);
    });
  }, [commentsQuery.data?.items, search]);

  /**
   * getRepliesCount
   * pt-BR: Obtém o contador de replies do comentário pai a partir de campos retornados pelo backend.
   *        Verifica `total_replies` e `replies_count` quando disponíveis.
   * en-US: Gets the replies count for the parent comment from backend-provided fields.
   *        Checks `total_replies` and `replies_count` when available.
   */
  function getRepliesCount(comment: any): number {
    const total = Number(comment?.total_replies ?? comment?.replies_count ?? 0);
    const nestedCount = Array.isArray(comment?.replies) ? comment.replies.length : 0;
    return Math.max(total, nestedCount);
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
    const rawList = Array.isArray((commentsQuery.data as any)?.rawItems) ? (commentsQuery.data as any).rawItems : [];
    const pid = String(parentId);
    return rawList.filter((it: any) => String(it?.parent_id ?? it?.parentId ?? '') === pid);
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
          <DropdownMenuItem onClick={() => approveMutation.mutate(id)} disabled={approveMutation.isPending}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => rejectMutation.mutate(id)} disabled={rejectMutation.isPending}>
            <XCircle className="mr-2 h-4 w-4" /> Rejeitar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => deleteMutation.mutate(id)} className="text-destructive focus:text-destructive" disabled={deleteMutation.isPending}>
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
    if (!ratingVal || ratingVal < 1) return null;
    return (
      <div className="flex items-center gap-0.5" title={`${ratingVal} / 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={`star-${i}`} size={12} className={(ratingVal >= i + 1) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'} />
        ))}
      </div>
    );
  }

  function renderStatusBadge(status: string) {
    const key = String(status || '').toLowerCase();
    switch (key) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50">Pendente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{key || 'Pendente'}</Badge>;
    }
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
        <div className="mt-2 space-y-3">
          {children.map((r, idx) => (
            <div key={`reply-tree-${r?.id || idx}`}>
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
              <div className="mt-2 space-y-3">
                {fullThread[String(current?.id ?? '')].map((r: any, idx: number) => (
                  <div key={`full-thread-${r?.id || idx}`} className={`mt-2 ${r?._depth > 0 ? 'ml-4 pl-3 border-l-2 border-muted/50' : 'bg-muted/30 p-2 rounded-md'}`}>
                    <div className="text-[12px] text-muted-foreground flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground">{formatAuthor(r)} <span className="font-normal text-muted-foreground">{r?.created_at ? ` • ${new Date(String(r.created_at)).toLocaleString()}` : ''}</span></span>
                      {renderStatusBadge(r?.status)}
                    </div>
                    <div className="text-sm whitespace-pre-wrap break-words">{String(r?.body ?? '')}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mt-2 italic bg-muted/20 p-3 rounded-md border border-dashed text-center">Nenhuma resposta carregada. Clique em "Carregar todas".</div>
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
                    disabled={replyMutation.isPending}
                  >Publicar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {/* pt-BR: Barra de ações e filtros (estilo semelhante ao WordPress) */}
          {/* en-US: Actions and filters bar (WordPress-like style) */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-end bg-muted/30 p-4 rounded-lg border">
            <div className="flex-1 w-full space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações em massa</label>
              <div className="flex gap-2">
                <Select value={bulkAction || ''} onValueChange={(v) => setBulkAction((v as any) || '')}>
                  <SelectTrigger className="w-full md:w-[200px] h-10 bg-background">
                    <SelectValue placeholder="Selecionar ação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approve">Aprovar selecionados</SelectItem>
                    <SelectItem value="reject">Rejeitar selecionados</SelectItem>
                    <SelectItem value="delete">Excluir selecionados</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="secondary" onClick={applyBulkAction} className="h-10">Aplicar</Button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 w-full md:w-auto items-end">
              <div className="space-y-1.5 min-w-[140px]">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filtrar Status</label>
                <Select value={status} onValueChange={(v) => setStatus(v as CommentStatus | 'all')}>
                  <SelectTrigger className="w-full h-10 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="approved">Aprovados</SelectItem>
                    <SelectItem value="rejected">Rejeitados</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 min-w-[100px]">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exibir</label>
                <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                  <SelectTrigger className="w-full h-10 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50].map((n) => (
                      <SelectItem key={`per-page-${n}`} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 md:w-[250px] space-y-1.5 min-w-[200px]">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pesquisar</label>
                <div className="relative">
                  <Input 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    placeholder="Nome ou conteúdo..." 
                    className="h-10 pl-3 bg-background"
                  />
                </div>
              </div>
            </div>
          </div>

          {commentsQuery.isPending ? (
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
                  const rawList = Array.isArray(commentsQuery.data?.items) ? (commentsQuery.data.items as any[]) : [];
                  const replyCount = rawList.filter(
                    (it) => String(it?.parent_id ?? it?.parentId ?? '') === String(c?.id ?? '')
                  ).length;
                  const hasLocalNote = Boolean(getNoteForId(c?.id ?? ''));
                  const idStr = String(c?.id ?? '');
                  return (
                    <>
                      <TableRow key={`comment-row-${idStr}`} className={selectedRows[idStr] ? 'bg-primary/5 hover:bg-primary/10 transition-colors' : 'hover:bg-muted/50 transition-colors'}>
                        <TableCell>
                          <Checkbox
                            checked={Boolean(selectedRows[idStr])}
                            onCheckedChange={(v) => toggleSelectOne(idStr, Boolean(v))}
                            aria-label={`Selecionar comentário ${idStr}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {author.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm line-clamp-1">{author}</span>
                              <span className="text-[10px] text-muted-foreground">{formatTarget(c)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">
                              {body}{String(c?.body ?? '').length > 160 ? '...' : ''}
                            </p>
                            {renderRating(c)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-[11px] text-muted-foreground">
                            <span className="whitespace-nowrap">{sentAt.split(',')[0]}</span>
                            <span className="opacity-70">{sentAt.split(',')[1]}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5 items-start">
                            {renderStatusBadge(st)}
                            {(getRepliesCount(c) > 0 || replyCount > 0) && (
                              <span className="text-[10px] text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Reply size={10} /> {(getRepliesCount(c) || replyCount)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {renderActionDropdown(c)}
                        </TableCell>
                    </TableRow>
                    {expandedRows[idStr] && (
                      <TableRow className="bg-muted/20 border-t-0 shadow-inner">
                        <TableCell colSpan={6} className="py-4">
                          <div className="max-w-4xl mx-auto space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                              <h4 className="text-sm font-semibold flex items-center gap-2">
                                <Reply size={14} className="text-primary" />
                                Respostas Interativas
                              </h4>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                {getRepliesInCurrentPage(c?.id ?? '').length} na página
                              </span>
                            </div>

                            {getRepliesInCurrentPage(c?.id ?? '').length > 0 ? (
                              <div className="space-y-4">
                                {getRepliesInCurrentPage(idStr).map((r, rIdx) => (
                                  <div key={`expanded-reply-${r?.id || rIdx}`} className="bg-background rounded-lg border p-3 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                          {(formatAuthor(r) || 'U').slice(0,1).toUpperCase()}
                                        </div>
                                        <span className="text-xs font-bold">{formatAuthor(r)}</span>
                                        <span className="text-[10px] text-muted-foreground">{r?.created_at ? new Date(String(r.created_at)).toLocaleString() : ''}</span>
                                      </div>
                                      {renderStatusBadge(String(r?.status ?? 'pending'))}
                                    </div>
                                    <div className="text-sm text-foreground/90 pl-8 border-l-2 border-primary/20">{String(r?.body ?? '')}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground italic text-center py-4 bg-background/50 rounded-lg border border-dashed">
                                Nenhuma resposta carregada nesta página.
                              </div>
                            )}

                            <div className="flex flex-col gap-4">
                              <div className="flex items-center gap-3 flex-wrap">
                                <Button size="sm" variant="default" onClick={() => loadFullThreadFor(c?.id ?? '')} disabled={loadingFullThread} className="shadow-sm">
                                  {loadingFullThread ? (
                                    <span className="flex items-center gap-2"><span className="h-3 w-3 animate-spin border-2 border-white border-t-transparent rounded-full" /> Carregando...</span>
                                  ) : 'Carregar todas as respostas'}
                                </Button>
                                
                                <Button size="sm" variant="outline" onClick={() => toggleInlineReply(c?.id ?? '')} className={`shadow-sm ${inlineReplyVisible[idStr] ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20' : ''}`}>
                                  {inlineReplyVisible[idStr] ? 'Cancelar' : 'Escrever Resposta'}
                                </Button>
                              </div>

                              {Array.isArray(fullThread[idStr]) && fullThread[idStr].length > 0 && (
                                <div className="mt-2 space-y-3 pt-4 border-t border-dashed">
                                  <h5 className="text-xs font-bold uppercase text-muted-foreground tracking-tighter">Histórico Completo</h5>
                                  {fullThread[idStr].map((r: any, rIdx: number) => (
                                    <div key={`full-thread-expanded-${r?.id || rIdx}`} className={`group relative ${r?._depth > 0 ? 'ml-6 pl-4' : 'bg-background/50 p-3 rounded-md border shadow-sm'}`}>
                                      {r?._depth > 0 && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/20 group-hover:bg-primary transition-colors" />}
                                      <div className="text-[11px] flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold">{formatAuthor(r)}</span>
                                          <span className="text-muted-foreground opacity-60">{r?.created_at ? new Date(String(r.created_at)).toLocaleString() : ''}</span>
                                        </div>
                                        {renderStatusBadge(String(r?.status ?? 'pending'))}
                                      </div>
                                      <div className="text-sm opacity-90">{String(r?.body ?? '')}</div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {inlineReplyVisible[idStr] && (
                                <div className="bg-background rounded-xl border-2 border-primary/20 p-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Reply size={16} className="text-primary" />
                                    <span className="text-sm font-bold">Sua resposta como Moderador</span>
                                  </div>
                                  <Textarea
                                    value={inlineReplyValue[idStr] ?? ''}
                                    onChange={(e) => setInlineReplyValue((prev) => ({ ...prev, [idStr]: e.target.value }))}
                                    placeholder="Escreva algo gentil e útil..."
                                    className="min-h-[100px] bg-muted/10 border-none focus-visible:ring-1 focus-visible:ring-primary mb-4"
                                    maxLength={500}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setInlineReplyVisible((prev) => ({ ...prev, [idStr]: false }))}>Descartar</Button>
                                    <Button size="sm" onClick={() => publishInlineReply(c?.id ?? '')} disabled={replyMutation.isPending} className="px-6">
                                      {replyMutation.isPending ? 'Enviando...' : 'Publicar'}
                                    </Button>
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
          {!commentsQuery.isPending && commentsQuery.data && commentsQuery.data.lastPage > 1 && (
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