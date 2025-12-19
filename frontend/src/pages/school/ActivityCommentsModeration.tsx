import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import commentsService from '@/services/commentsService';
import { MoreHorizontal, Trash2, CheckCircle2, XCircle, Reply } from 'lucide-react';
import activitiesService from '@/services/activitiesService';

/**
 * ActivityCommentsModeration
 * pt-BR: Página Admin para visualizar o conteúdo de uma atividade e moderar comentários
 *        relacionados com respostas inline e exibição indentada.
 * en-US: Admin page to view an activity's content and moderate related comments
 *        with inline replies and indented display.
 */
export default function ActivityCommentsModeration() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  /**
   * translateStatus
   * pt-BR: Converte valores técnicos de status para rótulos em português.
   * en-US: Converts technical status values to Portuguese labels.
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
   * activityQuery
   * pt-BR: Busca detalhes da atividade para renderizar conteúdo básico.
   * en-US: Fetches activity details to render basic content.
   */
  const activityQuery = useQuery({
    queryKey: ['admin-activity', id],
    queryFn: async () => id ? activitiesService.getById(id as any) : null,
    enabled: Boolean(id),
  });

  /**
   * allCommentsQuery
   * pt-BR: Carrega todos os comentários (status=all, todas as páginas) e filtra por atividade.
   * en-US: Loads all comments (status=all, all pages) and filters by activity.
   */
  const allCommentsQuery = useQuery({
    queryKey: ['admin-comments-activity', id],
    queryFn: async () => {
      const first: any = await commentsService.adminList(undefined, 1, 50);
      const totalPages = Number(first?.last_page ?? first?.total_pages ?? 1);
      const items: any[] = Array.isArray(first?.data) ? first.data : (Array.isArray(first?.items) ? first.items : []);
      for (let p = 2; p <= totalPages; p++) {
        const resp: any = await commentsService.adminList(undefined, p, 50);
        const pageItems = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp?.items) ? resp.items : []);
        items.push(...pageItems);
      }
      const aid = String(id ?? '');
      const filtered = items.filter((c) => String(c?.commentable_type || c?.target_type || '').toLowerCase() === 'activity' && String(c?.commentable_id || c?.target_id || '') === aid);
      return filtered;
    },
    enabled: Boolean(id),
    staleTime: 15 * 1000,
    refetchOnWindowFocus: false,
  });

  /**
   * buildThreadFromItems
   * pt-BR: Constrói árvore de respostas a partir de uma lista de itens e um comentário raiz.
   * en-US: Builds replies tree from a flat items list and a root comment.
   */
  function buildThreadFromItems(items: any[], parentId: number | string) {
    const pid = String(parentId);
    const byParent: Record<string, any[]> = {};
    items.forEach((it) => {
      const key = String(it?.parent_id ?? it?.parentId ?? '');
      if (!key) return;
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(it);
    });
    const result: any[] = [];
    const stack: Array<{ id: string; depth: number }> = [{ id: pid, depth: 0 }];
    while (stack.length) {
      const cur = stack.pop()!;
      const children = byParent[cur.id] || [];
      children.forEach((child) => {
        result.push({ ...child, _depth: cur.depth + 1 });
        stack.push({ id: String(child?.id ?? ''), depth: cur.depth + 1 });
      });
    }
    return result;
  }

  /**
   * UI states
   */
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [inlineReplyVisible, setInlineReplyVisible] = useState<Record<string, boolean>>({});
  const [inlineReplyValue, setInlineReplyValue] = useState<Record<string, string>>({});
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
   * fullThread / loadingFullThread
   * pt-BR: Armazena thread completa de replies por comentário raiz e seu estado de carregamento.
   * en-US: Stores complete replies thread per root comment and its loading state.
   */
  const [fullThread, setFullThread] = useState<Record<string, any[]>>({});
  const [loadingFullThread, setLoadingFullThread] = useState<boolean>(false);

  /**
   * Mutations: approve/reject/delete/reply
   */
  const approveMutation = useMutation({
    mutationFn: async (id: number | string) => commentsService.adminApprove(id),
    onSuccess: () => { toast({ title: 'Comentário aprovado' }); allCommentsQuery.refetch(); },
    onError: () => { toast({ title: 'Falha ao aprovar', variant: 'destructive' } as any); }
  });
  const rejectMutation = useMutation({
    mutationFn: async (id: number | string) => commentsService.adminReject(id),
    onSuccess: () => { toast({ title: 'Comentário rejeitado' }); allCommentsQuery.refetch(); },
    onError: () => { toast({ title: 'Falha ao rejeitar', variant: 'destructive' } as any); }
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: number | string) => commentsService.adminDelete(id),
    onSuccess: () => { toast({ title: 'Comentário excluído' }); allCommentsQuery.refetch(); },
    onError: () => { toast({ title: 'Falha ao excluir', variant: 'destructive' } as any); }
  });
  const replyMutation = useMutation({
    mutationFn: async ({ id, body }: { id: number | string; body: string }) => commentsService.adminReply(id, body),
    onSuccess: () => { toast({ title: 'Resposta publicada' }); setInlineReplyVisible({}); setInlineReplyValue({}); allCommentsQuery.refetch(); },
    onError: () => { toast({ title: 'Falha ao responder', description: 'Não foi possível enviar a resposta.', variant: 'destructive' } as any); }
  });

  /**
   * filteredRoots
   * pt-BR: Aplica busca simples e limita aos comentários raiz desta atividade.
   * en-US: Applies simple search and limits to root comments for this activity.
   */
  const filteredRoots = useMemo(() => {
    const all = Array.isArray(allCommentsQuery.data) ? allCommentsQuery.data : [];
    const roots = all.filter((c: any) => !c?.parent_id && !c?.parentId);
    const q = search.trim().toLowerCase();
    if (!q) return roots;
    return roots.filter((c: any) => String(c?.body || '').toLowerCase().includes(q));
  }, [allCommentsQuery.data, search]);

  /**
   * autoExpand
   * pt-BR: Expande por padrão todas as linhas de comentários raiz.
   * en-US: Expands by default all root comments rows.
   */
  useEffect(() => {
    const ids = (Array.isArray(filteredRoots) ? filteredRoots : []).map((c: any) => String(c?.id ?? ''));
    if (ids.length === 0) return;
    setExpandedRows((prev) => {
      const next = { ...prev }; ids.forEach((id) => { next[id] = true; }); return next;
    });
  }, [filteredRoots]);

  /**
   * toggleInlineReply
   * pt-BR: Mostra/oculta formulário de resposta inline.
   * en-US: Shows/hides inline reply form.
   */
  function toggleInlineReply(cid: number | string) {
    const k = String(cid);
    setExpandedRows((prev) => ({ ...prev, [k]: true }));
    setInlineReplyVisible((prev) => ({ ...prev, [k]: !prev[k] }));
  }

  /**
   * publishInlineReply
   * pt-BR: Publica resposta do moderador para o comentário raiz.
   * en-US: Publishes moderator reply to the root comment.
   */
  function publishInlineReply(cid: number | string) {
    const k = String(cid);
    const body = (inlineReplyValue[k] ?? '').trim();
    if (!body) {
      toast({ title: 'Digite a resposta', variant: 'destructive' } as any);
      return;
    }
    replyMutation.mutate({ id: cid, body });
  }

  /**
   * loadFullThreadFor
   * pt-BR: Usa o endpoint `GET /comments/{id}/replies` para carregar todas as respostas
   *        do comentário raiz desta atividade, paginando até obter a lista completa.
   * en-US: Uses `GET /comments/{id}/replies` to load all replies for this activity's
   *        root comment, paginating until the full list is loaded.
   */
  async function loadFullThreadFor(parentId: number | string) {
    try {
      setLoadingFullThread(true);
      const first: any = await commentsService.replies(parentId, undefined, 1, 50);
      const totalPages = Number(first?.last_page ?? first?.total_pages ?? 1);
      const items: any[] = Array.isArray(first?.data)
        ? first.data
        : (Array.isArray(first?.items) ? first.items : []);
      for (let p = 2; p <= totalPages; p++) {
        const resp: any = await commentsService.replies(parentId, undefined, p, 50);
        const pageItems = Array.isArray(resp?.data)
          ? resp.data
          : (Array.isArray(resp?.items) ? resp.items : []);
        items.push(...pageItems);
      }
      setFullThread((prev) => ({ ...prev, [String(parentId)]: items }));
    } catch (err) {
      toast({ title: 'Falha ao carregar respostas', description: 'Não foi possível carregar todas as respostas.', variant: 'destructive' } as any);
    } finally {
      setLoadingFullThread(false);
    }
  }

  /**
   * renderThread
   * pt-BR: Renderiza lista indentada de respostas para um comentário raiz.
   * en-US: Renders indented replies list for a root comment.
   */
  function renderThread(root: any) {
    const all = Array.isArray(allCommentsQuery.data) ? allCommentsQuery.data : [];
    const thread = buildThreadFromItems(all, root?.id ?? '');
    if (!Array.isArray(thread) || thread.length === 0) return <div className="text-xs text-muted-foreground">Nenhuma resposta.</div>;
    return (
      <div>
        {thread.map((r: any) => (
          <div key={String(r?.id)} className={`mt-2 ${r?._depth > 0 ? 'ml-4 pl-3 border-l' : ''}`}>
            <div className="text-[12px] text-muted-foreground flex items-center justify-between">
              <span>{String(r?.user_name || 'Autor')}{r?.created_at ? ` • ${new Date(String(r.created_at)).toLocaleString()}` : ''}</span>
              <span className="capitalize">{String(r?.status ?? '').toLowerCase() || 'pending'}</span>
            </div>
            <div className="text-sm whitespace-pre-wrap break-words">{String(r?.body ?? '')}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Conteúdo da atividade</CardTitle>
          <CardDescription>Visualize o conteúdo e modere comentários desta atividade.</CardDescription>
        </CardHeader>
        <CardContent>
          {activityQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando atividade...</div>
          ) : activityQuery.data ? (
            <div className="space-y-3">
              <div className="text-lg font-semibold">{String((activityQuery.data as any)?.title || (activityQuery.data as any)?.name || 'Atividade')}</div>
              {(() => {
                const desc = String((activityQuery.data as any)?.description || '').trim();
                return desc ? <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: desc }} /> : null;
              })()}
              {(() => {
                const content = String((activityQuery.data as any)?.content || '').trim();
                if (!content) return null;
                const isYouTube = /youtube\.com|youtu\.be/.test(content);
                if (isYouTube) {
                  const src = content.includes('embed') ? content : content.replace('watch?v=', 'embed/');
                  return (
                    <div className="aspect-video bg-black rounded overflow-hidden">
                      <iframe src={src} className="w-full h-full" title="Vídeo da atividade" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                  );
                }
                if (/^https?:\/\//.test(content)) {
                  return <a href={content} target="_blank" rel="noreferrer" className="text-primary underline">Abrir conteúdo</a>;
                }
                return <div className="text-sm whitespace-pre-wrap break-words">{content}</div>;
              })()}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Atividade não encontrada.</div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Comentários da atividade</CardTitle>
          <CardDescription>Exibição indentada com ações de moderação e resposta inline.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-3 mb-3">
            <div className="col-span-6">
              <label className="text-sm font-medium">Pesquisar comentários</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Digite para buscar..." />
            </div>
            <div className="col-span-6 text-right">
              <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>Voltar</Button>
            </div>
          </div>

          {allCommentsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando comentários...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Autor</TableHead>
                  <TableHead>Comentário</TableHead>
                  <TableHead className="w-40">Enviado em</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-28">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(filteredRoots || []).map((c: any) => {
                  const idStr = String(c?.id ?? '');
                  const author = String(c?.user_name || 'Autor');
                  const body = String(c?.body || '');
                  const sentAt = c?.created_at ? new Date(String(c.created_at)).toLocaleString() : '';
                  const st = String(c?.status ?? 'pending').toLowerCase();
                  return (
                    <>
                      <TableRow key={idStr}>
                        <TableCell className="text-xs">{author}</TableCell>
                        <TableCell className="text-xs">{body}</TableCell>
                        <TableCell className="text-xs">{sentAt}</TableCell>
                        <TableCell className="text-xs capitalize">{translateStatus(st)}{(() => { const backendCount = getRepliesCount(c); return backendCount ? ` • ${backendCount} resposta${backendCount>1?'s':''}` : ''; })()}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 px-2">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Ações</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => approveMutation.mutate(c?.id ?? '')}>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => rejectMutation.mutate(c?.id ?? '')}>
                                <XCircle className="mr-2 h-4 w-4" /> Rejeitar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteMutation.mutate(c?.id ?? '')} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleInlineReply(c?.id ?? '')}>
                                <Reply className="mr-2 h-4 w-4" /> Responder
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      {expandedRows[idStr] && (
                        <TableRow>
                          <TableCell colSpan={5}>
                            {renderThread(c)}
                            <div className="mt-3">
                              {/* pt-BR: Carregamento completo da thread usando endpoint de replies */}
                              {/* en-US: Full thread loading using replies endpoint */}
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium">Respostas (completas)</div>
                                <div>
                                  <Button size="sm" variant="outline" onClick={() => loadFullThreadFor(c?.id ?? '')} disabled={loadingFullThread}>
                                    {loadingFullThread ? 'Carregando...' : 'Carregar todas as respostas'}
                                  </Button>
                                </div>
                              </div>
                              {Array.isArray(fullThread[idStr]) && fullThread[idStr].length > 0 ? (
                                <div className="mt-2">
                                  {fullThread[idStr].map((r: any) => (
                                    <div key={String(r?.id ?? Math.random())} className={`mt-2 ${r?._depth > 0 ? 'ml-4 pl-3 border-l' : ''}`}>
                                      <div className="text-[12px] text-muted-foreground flex items-center justify-between">
                                        <span>{String(r?.user_name || 'Autor')}{r?.created_at ? ` • ${new Date(String(r.created_at)).toLocaleString()}` : ''}</span>
                                        <span className="capitalize">{translateStatus(String(r?.status ?? 'pending'))}</span>
                                      </div>
                                      <div className="text-sm whitespace-pre-wrap break-words">{String(r?.body ?? '')}</div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground mt-1">Nenhuma resposta carregada. Clique em "Carregar todas as respostas".</div>
                              )}
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
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
                {Array.isArray(filteredRoots) && filteredRoots.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="text-sm text-muted-foreground">Nenhum comentário encontrado para esta atividade.</div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}