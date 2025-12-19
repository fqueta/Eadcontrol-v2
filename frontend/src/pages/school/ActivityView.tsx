import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';
import { activitiesService } from '@/services/activitiesService';
import commentsService from '@/services/commentsService';
import type { ActivityRecord } from '@/types/activities';

/**
 * ActivityView — Visualização de conteúdo da atividade (Admin)
 * pt-BR: Exibe detalhes e conteúdo da atividade para administradores, sem edição.
 * en-US: Shows activity details and content for administrators, read-only.
 */
const ActivityView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();

  /**
   * ui state
   * pt-BR: Estados locais para filtro/paginação e respostas inline.
   * en-US: Local states for filter/pagination and inline replies.
   */
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(5);
  const [replyVisible, setReplyVisible] = useState<Record<string, boolean>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const COMMENT_MIN = 3;
  const COMMENT_MAX = 500;
  /**
   * MAX_REPLY_DEPTH
   * pt-BR: Profundidade máxima de respostas. `Infinity` libera responder em qualquer nível.
   * en-US: Maximum replies depth. `Infinity` allows replying at any nesting level.
   */
  const MAX_REPLY_DEPTH = Number.POSITIVE_INFINITY;

  const detailsQuery = useQuery({
    queryKey: ['activities','getById', id],
    queryFn: async () => activitiesService.getById(String(id)),
    enabled: !!id,
  });

  const a = detailsQuery.data as ActivityRecord | undefined;
  const isActive = (a?.active === true || a?.active === 's' || a?.active === 1);

  /**
   * commentsQuery
   * pt-BR: Lista comentários aprovados para esta atividade.
   * en-US: Fetch approved comments for this activity.
   */
  const commentsQuery = useQuery({
    queryKey: ['activity-comments-approved', id],
    enabled: !!id,
    queryFn: async () => {
      const res: any = await commentsService.listForActivity(String(id));
      return Array.isArray(res) ? res : (res?.data ?? []);
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  /**
   * adminApprovedQuery
   * pt-BR: Fallback — Carrega comentários aprovados via endpoint administrativo,
   *        filtrando por atividade atual. Útil quando o endpoint público não traz
   *        `replies` aninhadas.
   * en-US: Fallback — Loads approved comments through the admin endpoint,
   *        filtering by the current activity. Useful when the public endpoint
   *        does not include nested `replies`.
   */
  const adminApprovedQuery = useQuery({
    queryKey: ['admin-comments-approved-activity', id],
    enabled: !!id,
    queryFn: async () => {
      const first: any = await commentsService.adminList('approved', 1, 50);
      const totalPages = Number(first?.last_page ?? first?.total_pages ?? 1);
      const items: any[] = Array.isArray(first?.data) ? first.data : (Array.isArray(first?.items) ? first.items : []);
      for (let p = 2; p <= totalPages; p++) {
        const resp: any = await commentsService.adminList('approved', p, 50);
        const pageItems = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp?.items) ? resp.items : []);
        items.push(...pageItems);
      }
      const aid = String(id ?? '');
      const filtered = items.filter((c) => String(c?.commentable_type || c?.target_type || '').toLowerCase() === 'activity' && String(c?.commentable_id || c?.target_id || '') === aid);
      return filtered;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  /**
   * adminReplyMutation
   * pt-BR: Envia resposta do moderador e atualiza listagem.
   * en-US: Sends moderator reply and refreshes listing.
   */
  const adminReplyMutation = useMutation({
    mutationFn: async (vars: { parentId: number | string; body: string }) => {
      return commentsService.adminReply(vars.parentId, vars.body);
    },
    onSuccess: (_data, vars) => {
      setReplyDrafts((prev) => ({ ...prev, [String(vars.parentId)]: '' }));
      setReplyVisible((prev) => ({ ...prev, [String(vars.parentId)]: false }));
      try { queryClient.invalidateQueries({ queryKey: ['activity-comments-approved', id] }); } catch {}
    },
  });

  /**
   * handleBack
   * pt-BR: Volta para a listagem de atividades.
   * en-US: Navigate back to activities listing.
   */
  function handleBack() {
    navigate('/admin/school/activities');
  }

  /**
   * renderContent
   * pt-BR: Renderiza o conteúdo conforme o tipo da atividade.
   * en-US: Render content depending on activity type.
   */
  function renderContent() {
    if (!a) return null;
    const type = a.type_activities || '';
    const content = a.content || '';
    // Vídeo: exibe iframe quando URL aparente; senão mostra texto
    if (type === 'video') {
      const isUrl = /^https?:\/\//i.test(content);
      if (isUrl) {
        return (
          <div className="aspect-video w-full">
            <iframe
              src={content}
              className="w-full h-full rounded-md border"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Conteúdo de vídeo"
            />
          </div>
        );
      }
      return <pre className="text-sm whitespace-pre-wrap p-3 bg-muted rounded-md">{content}</pre>;
    }
    // Apostila: mostra link quando URL; senão mostra texto
    if (type === 'apostila') {
      const isUrl = /^https?:\/\//i.test(content);
      if (isUrl) {
        return (
          <a href={content} target="_blank" rel="noreferrer" className="underline text-primary">
            Abrir apostila
          </a>
        );
      }
      return <pre className="text-sm whitespace-pre-wrap p-3 bg-muted rounded-md">{content}</pre>;
    }
    // Avaliação: exibe JSON ou texto
    if (type === 'avaliacao') {
      try {
        const obj = JSON.parse(content);
        return <pre className="text-xs p-3 bg-muted rounded-md overflow-auto">{JSON.stringify(obj, null, 2)}</pre>;
      } catch {
        return <pre className="text-sm whitespace-pre-wrap p-3 bg-muted rounded-md">{content}</pre>;
      }
    }
    return <pre className="text-sm whitespace-pre-wrap p-3 bg-muted rounded-md">{content || 'Sem conteúdo'}</pre>;
  }

  return (
    <>
    <Card className="p-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Visualizar atividade</CardTitle>
            <CardDescription>Conteúdo e detalhes da atividade</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBack}>Voltar</Button>
            {/**
             * Editar atividade
             * pt-BR: Abre a página de edição da atividade atual.
             * en-US: Opens the edit page for the current activity.
             */}
            <Button variant="outline" onClick={() => navigate(`/admin/school/activities/${id}/edit`)}>Editar</Button>
            <Button variant="secondary" onClick={() => navigate(`/admin/school/activities/${id}/comments`)}>Comentários</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!a ? (
          <div className="text-sm text-muted-foreground">Carregando atividade...</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-semibold">{a.title}</div>
                <div className="text-sm text-muted-foreground">Nome: {a.name}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Tipo: {a.type_activities || '-'}</Badge>
                <Badge variant="outline">Duração: {a.duration} {a.type_duration}</Badge>
                <Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Ativa' : 'Inativa'}</Badge>
              </div>
            </div>
            {a.description && (
              <div>
                <Separator className="my-3" />
                <div className="text-sm text-muted-foreground">Descrição</div>
                {/*
                 * description HTML render
                 * pt-BR: Renderiza o HTML do campo descrição.
                 * en-US: Renders the description field as HTML.
                 */}
                <div className="prose prose-sm max-w-none mt-1" dangerouslySetInnerHTML={{ __html: String(a.description) }} />
              </div>
            )}
            <div>
              <Separator className="my-3" />
              <div className="text-sm text-muted-foreground">Conteúdo</div>
              <div className="mt-2">{renderContent()}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Comentários da atividade */}
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Comentários da atividade</CardTitle>
        <CardDescription>Lista de comentários aprovados, filtro, paginação e respostas.</CardDescription>
      </CardHeader>
      <CardContent>
        {(() => {
          /**
           * stats
           * pt-BR: Cálculo de total e média de estrelas.
           * en-US: Calculate total and average stars.
           */
          const allItems: any[] = Array.isArray(commentsQuery.data) ? (commentsQuery.data as any[]) : [];
          const ratings = allItems.map((c) => Number(c?.rating ?? 0)).filter((v) => v > 0);
          const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0;
          const total = allItems.length;
          return (
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {total} comentário{total !== 1 ? 's' : ''} • média {avg.toFixed(1)}
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} className={(avg >= i + 1) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'} />
                ))}
                <span className="ml-1 text-[11px] text-muted-foreground">{avg.toFixed(1)} / 5</span>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-12 gap-3 mb-3">
          <div className="col-span-8">
            <Label className="text-xs">Filtrar</Label>
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por autor ou texto..." />
          </div>
          <div className="col-span-4 flex items-end justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setSearch(''); setPage(1); }}>Limpar filtro</Button>
          </div>
        </div>

        {commentsQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando comentários...</div>
        ) : (
          <div className="space-y-4">
            {(() => {
              /**
               * buildThreads
               * pt-BR: Constrói estrutura de tópicos agrupando respostas por parent_id.
               * en-US: Builds thread structure grouping replies by parent_id.
               */
              function buildThreads(items: any[]) {
                /**
                 * buildThreads
                 * pt-BR: Constrói estrutura de tópicos a partir de lista plana ou
                 *        comentários com `replies` aninhadas. Normaliza para
                 *        `{ roots, byParent }`, onde `roots` são comentários pai
                 *        e `byParent[pid]` são suas respostas diretas.
                 * en-US: Builds thread structure from either a flat list or
                 *        nested comments with `replies`. Normalizes into
                 *        `{ roots, byParent }`, where `roots` are root comments
                 *        and `byParent[pid]` holds their direct replies.
                 */
                const byParent: Record<string, any[]> = {};
                const roots: any[] = [];

                /**
                 * collect
                 * pt-BR: Coleta comentário atual e processa recursivamente suas
                 *        respostas, preenchendo `byParent`.
                 * en-US: Collects current comment and recursively processes its
                 *        replies, populating `byParent`.
                 */
                function collect(node: any, parentId?: string) {
                  const idStr = String(node?.id ?? '');
                  const pid = parentId ?? String(node?.parent_id ?? node?.parentId ?? '');

                  if (!pid) {
                    // Comentário raiz
                    roots.push(node);
                  } else {
                    // Resposta direta ao `pid`
                    if (!byParent[pid]) byParent[pid] = [];
                    byParent[pid].push(node);
                  }

                  // Processar filhos aninhados, se existirem (formato StudentCourse)
                  const children: any[] = Array.isArray(node?.replies) ? node.replies : [];
                  for (const child of children) {
                    // Alguns backends não preenchem `parent_id` nos filhos aninhados,
                    // por isso passamos explicitamente o `idStr` como pai.
                    collect(child, idStr || pid || undefined);
                  }
                }

                // Aceitar tanto uma lista plana como uma lista de roots com `replies`
                for (const item of items) {
                  collect(item);
                }

                return { roots, byParent };
              }

              /**
               * renderThread
               * pt-BR: Renderiza um comentário raiz e suas respostas recursivamente.
               * en-US: Renders a root comment and its replies recursively.
               */
              function renderThread(c: any, byParent: Record<string, any[]>, depth = 0) {
                const idStr = String(c?.id ?? '');
                const author = String(c?.user_name || 'Autor');
                const body = String(c?.body || '');
                const sentAt = c?.created_at ? new Date(String(c.created_at)).toLocaleString() : '';
                const rating = c?.rating ? Number(c.rating) : null;
                const canReplyHere = depth < MAX_REPLY_DEPTH;
                const replyText = (replyDrafts[idStr] ?? '').slice(0, COMMENT_MAX);
                return (
                  <div key={idStr} className="space-y-2">
                    <div className={`rounded-md border p-3 ${depth > 0 ? 'ml-6' : ''}`}>
                      <div className="text-xs text-muted-foreground">
                        {author}{sentAt ? ` • ${sentAt}` : ''}{rating ? ` • ⭐ ${rating}` : ''}
                      </div>
                      <div className="text-sm whitespace-pre-wrap break-words">{body}</div>
                      {canReplyHere && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Responder</Label>
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => setReplyVisible((prev) => ({ ...prev, [idStr]: !prev[idStr] }))}
                            >
                              {replyVisible[idStr] ? 'Ocultar' : 'Responder'}
                            </Button>
                          </div>
                          {replyVisible[idStr] && (
                            <div className="mt-2">
                              <Textarea
                                value={replyText}
                                onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [idStr]: e.target.value.slice(0, COMMENT_MAX) }))}
                                placeholder="Escreva sua resposta..."
                                rows={2}
                              />
                              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                                <span>{Math.max(0, replyText.trim().length)} / {COMMENT_MAX}</span>
                                <span>mín {COMMENT_MIN}</span>
                              </div>
                              <div className="mt-2 flex justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const text = replyText.trim();
                                    if (!text) return;
                                    if (text.length < COMMENT_MIN || text.length > COMMENT_MAX) return;
                                    adminReplyMutation.mutate({ parentId: idStr, body: text });
                                  }}
                                  disabled={adminReplyMutation.isPending || replyText.trim().length < COMMENT_MIN}
                                >
                                  {adminReplyMutation.isPending ? 'Respondendo...' : 'Enviar resposta'}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {(byParent[idStr] || []).map((r) => renderThread(r, byParent, depth + 1))}
                  </div>
                );
              }

              const rawItems = Array.isArray(commentsQuery.data) ? commentsQuery.data : [];
              // pt-BR: Filtro simples por autor/texto no comentário raiz.
              // en-US: Simple filter by author/text in root comments.
              const { roots: allRoots, byParent } = buildThreads(rawItems);

              // pt-BR: Fallback — quando `byParent` estiver vazio, tenta obter replies
              //        aprovadas via endpoint admin e mescla no mapa.
              // en-US: Fallback — when `byParent` is empty, pulls approved replies
              //        from the admin endpoint and merges into the map.
              const adminItems: any[] = Array.isArray(adminApprovedQuery.data) ? (adminApprovedQuery.data as any[]) : [];
              const adminByParent: Record<string, any[]> = {};
              for (const it of adminItems) {
                const pid = String(it?.parent_id ?? it?.parentId ?? '');
                if (!pid) continue;
                if (!adminByParent[pid]) adminByParent[pid] = [];
                adminByParent[pid].push(it);
              }
              const effectiveByParent: Record<string, any[]> = { ...adminByParent };
              for (const k of Object.keys(byParent)) {
                effectiveByParent[k] = [ ...(effectiveByParent[k] || []), ...byParent[k] ];
              }
              const filteredRoots = allRoots.filter((c) => {
                const author = String(c?.user_name || '').toLowerCase();
                const body = String(c?.body || '').toLowerCase();
                const q = search.trim().toLowerCase();
                if (!q) return true;
                return author.includes(q) || body.includes(q);
              });
              // pt-BR: Paginação simples em memória.
              // en-US: Simple in-memory pagination.
              const total = filteredRoots.length;
              const totalPages = Math.max(1, Math.ceil(total / perPage));
              const safePage = Math.min(Math.max(1, page), totalPages);
              const start = (safePage - 1) * perPage;
              const pageItems = filteredRoots.slice(start, start + perPage);

              if (!pageItems.length) return <div className="text-sm text-muted-foreground">Nenhum comentário aprovado para esta atividade.</div>;
              return (
                <div className="space-y-3">
                  {pageItems.map((c) => renderThread(c, effectiveByParent))}
                  <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Página {safePage} de {totalPages}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>Anterior</Button>
                      <Button variant="outline" size="xs" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>Próxima</Button>
                      <Button variant="ghost" size="xs" className="ml-2" onClick={() => setPerPage((n) => (n === 5 ? 10 : (n === 10 ? 20 : 5)))}>Itens: {perPage}</Button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
};

export default ActivityView;