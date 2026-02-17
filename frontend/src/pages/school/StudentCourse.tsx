import { useMemo, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { coursesService } from '@/services/coursesService';
import { publicCoursesService } from '@/services/publicCoursesService';
import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useEnrollmentsList } from '@/hooks/enrollments';
import { Button } from '@/components/ui/button';
import CourseContentViewer from '@/components/school/CourseContentViewer';
import { progressService } from '@/services/progressService';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import commentsService from '@/services/commentsService';
import { Star } from 'lucide-react';

/**
 * StudentCourse
 * pt-BR: Página do aluno para consumo de conteúdo do curso. Lista módulos e atividades
 *        com suporte a vídeo/link/documento. Consome GET `/courses/:id`.
 * en-US: Student page to consume course content. Lists modules and activities
 *        supporting video/link/document types. Consumes GET `/courses/:id`.
 */
/**
 * StudentCourse
 * pt-BR: Página do aluno para consumo do conteúdo. Restringe acesso:
 *        - Admin (permission_id < 7): acesso sem matrícula
 *        - Aluno (permission_id = 7): exige matrícula válida
 * en-US: Student content page. Access rules:
 *        - Admin (permission_id < 7): access without enrollment
 *        - Student (permission_id = 7): requires valid enrollment
 */
/**
 * StudentCourse
 * pt-BR: Prop `fetchVariant` seleciona o endpoint: 'public' (default) ou 'private'.
 * en-US: Prop `fetchVariant` selects endpoint: 'public' (default) or 'private'.
 */
export default function StudentCourse({ fetchVariant = 'public' }: { fetchVariant?: 'public' | 'private' }) {
  /**
   * Route params
   * pt-BR: Slug do curso obtido da URL.
   * en-US: Course slug obtained from URL.
   */
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  /**
   * Course by slug (public endpoint)
   * pt-BR: Busca curso via endpoint público por slug: GET `/cursos/public/by-slug/{slug}`.
   *        Suporta rotas que usam `:id` ou `:slug`, tratando `id` como slug quando presente.
   * en-US: Fetches course through public endpoint by slug: GET `/cursos/public/by-slug/{slug}`.
   *        Supports routes using `:id` or `:slug`, treating `id` as slug when present.
   */
  const params = useParams();
  const effectiveSlug = String(params.slug ?? params.id ?? slug ?? '');
  const { data: course, isLoading, error } = useQuery({
    queryKey: ['courses', 'student', fetchVariant, effectiveSlug],
    queryFn: async () => {
      if (!effectiveSlug) return null;
      return fetchVariant === 'private'
        ? coursesService.getBySlug(effectiveSlug)
        : publicCoursesService.getBySlug(effectiveSlug);
    },
    enabled: !!effectiveSlug,
  });

  // Access rules (admin vs student)
  const permissionId = Number(user?.permission_id ?? 999);
  const isAdmin = !!user && permissionId < 7;
  const isStudent = !!user && permissionId === 7;

  /**
   * enrollmentsResp
   * pt-BR: Consulta matrículas do curso atual. Por padrão o serviço usa `situacao=mat`.
   *        Filtra por `id_curso` para verificar matrícula válida do usuário logado.
   * en-US: Fetch enrollments for the current course. Service defaults to `situacao=mat`.
   *        Filters by `id_curso` to check valid enrollment for current user.
   */
  const courseNumericId = useMemo(() => {
    const cid = (course as any)?.id;
    const num = Number(cid);
    return Number.isFinite(num) ? num : undefined;
  }, [course]);

  /**
   * clientNumericId
   * pt-BR: Extrai o `id_cliente` do usuário logado a partir de chaves comuns
   *        (id_cliente, client_id, cliente_id) e normaliza para número.
   * en-US: Extracts logged user's `id_cliente` from common keys
   *        (id_cliente, client_id, cliente_id) and normalizes to number.
   */
  const clientNumericId = useMemo(() => {
    const candidates = [
      (user as any)?.id,
      (user as any)?.client_id,
      (user as any)?.cliente_id,
    ];
    for (const v of candidates) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return undefined;
  }, [user]);

  /**
   * useEnrollmentsList
   * pt-BR: Consulta matrículas para validar acesso do aluno, enviando também
   *        `id_cliente` (quando disponível) e o flag `public`.
   * en-US: Queries enrollments to validate student access, also sending
   *        `id_cliente` (when available) and the `public` flag.
   */
  const { data: enrollmentsResp, isLoading: isEnrollmentsLoading } = useEnrollmentsList(
    { page: 1, per_page: 1, id_curso: courseNumericId, id_cliente: clientNumericId, public: '1' } as any,
    { enabled: isStudent && !!courseNumericId }
  );

  /**
   * enrollmentId
   * pt-BR: Extrai o id da matrícula válida (primeiro item da lista).
   * en-US: Extracts the valid enrollment id (first item in the list).
   */
  const enrollmentId = useMemo(() => {
    const arr = (enrollmentsResp as any)?.data || (enrollmentsResp as any)?.items || [];
    const first = Array.isArray(arr) ? arr[0] : undefined;
    const candidate = first?.id || first?.id_matricula || first?.matricula_id;
    const asNum = Number(candidate);
    return Number.isFinite(asNum) ? asNum : candidate;
  }, [enrollmentsResp]);

  const hasValidEnrollment = useMemo(() => {
    const arr = enrollmentsResp?.data || [];
    return Array.isArray(arr) && arr.length > 0;
  }, [enrollmentsResp]);

  const canAccessContent = isAdmin || hasValidEnrollment;

  const title = useMemo(() => {
    const c: any = course || {};
    return c?.titulo || c?.nome || c?.title || (slug ? `Curso ${slug}` : 'Curso');
  }, [course, effectiveSlug]);

  const modules: any[] = useMemo(() => {
    const c: any = course || {};
    const arr = c?.modulos || c?.modules || [];
    return Array.isArray(arr) ? arr : [];
  }, [course]);
  const toSeconds = (val: any, unit: string) => {
    const v = Number(val || 0);
    const u = String(unit || '').toLowerCase();
    if (!v) return 0;
    if (u.includes('seg')) return v;
    if (u.includes('min')) return v * 60;
    if (u.includes('h')) return v * 3600;
    return v;
  };
  const formatDuration = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(ss)}`;
  };
  const courseTotalLabel = useMemo(() => {
    const total = modules.reduce((acc, m) => {
      const acts: any[] = Array.isArray(m?.atividades || m?.activities) ? (m?.atividades || m?.activities) : [];
      const sumActs = acts.reduce((a, b) => a + toSeconds(b?.duracao ?? b?.duration, String(b?.unidade_duracao ?? b?.type_duration)), 0);
      if (sumActs > 0) return acc + sumActs;
      return acc + toSeconds(m?.duration ?? 0, String(m?.tipo_duracao ?? '').toLowerCase());
    }, 0);
    return total ? `Total ${formatDuration(total)}` : '';
  }, [modules]);

  /**
   * ActivityComments
   * pt-BR: Painel de comentários por atividade integrado ao backend (listagem aprovada e envio pendente).
   * en-US: Per-activity comments panel integrated with backend (approved listing and pending submission).
   */
  /**
   * ActivityComments
   * pt-BR: Exibe e publica comentários da atividade atual. Se `currentActivityKey` for fornecida,
   *         usa-a automaticamente e oculta o seletor.
   * en-US: Shows and posts comments for the current activity. If `currentActivityKey` is provided,
   *         it is used automatically and the selector is hidden.
   */
  function ActivityComments({ course, modules, user, currentActivityKey }: { course: any; modules: any[]; user: any; currentActivityKey?: string }) {
    /**
     * uiRules
     * pt-BR: Regras de UI/validação para o campo de comentário (mín/máx).
     * en-US: UI/validation rules for the comment field (min/max).
     */
    const COMMENT_MIN = 3;
    const COMMENT_MAX = 500;

    /**
     * rating
     * pt-BR: Valor de avaliação (1 a 5) selecionado pelo usuário para a atividade.
     * en-US: User-selected rating value (1 to 5) for the activity.
     */
    const [rating, setRating] = useState<number>(0);

    /**
     * StarRating
     * pt-BR: Componente simples de estrelas clicáveis para escolher a avaliação.
     * en-US: Simple clickable star component to choose rating.
     */
    function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
      const stars = [1, 2, 3, 4, 5];
      return (
        <div className="flex items-center gap-1" aria-label="Avaliação por estrelas">
          {stars.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className="p-0.5"
              title={`${s} estrela${s > 1 ? 's' : ''}`}
            >
              <Star size={18} className={s <= value ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'} />
            </button>
          ))}
          {value > 0 && (
            <button
              type="button"
              onClick={() => onChange(0)}
              className="ml-2 text-xs text-muted-foreground underline"
              title="Limpar avaliação"
            >
              Limpar
            </button>
          )}
        </div>
      );
    }

    /**
     * containsProfanity
     * pt-BR: Verifica se o texto contém palavrões (lista bilíngue simples),
     *        usando correspondência por palavra completa e variações comuns.
     * en-US: Checks whether text contains profanity (simple bilingual list),
     *        using whole-word matching and common variations.
     */
    const containsProfanity = (text: string) => {
      const badWords = [
        // Lista reduzida PT/EN; pode ser expandida conforme necessidade.
        'porra','merda','caralho','fdp','desgraçado','bosta','idiota','burro',
        'shit','fuck','fucking','bitch','bastard','asshole','dumb','stupid'
      ];
      const normalized = text.toLowerCase();
      return badWords.some((w) => {
        const pattern = new RegExp(`(?<![\w])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\w])`, 'i');
        return pattern.test(normalized);
      });
    };
    /**
     * getCourseId
     * pt-BR: Deriva um identificador estável do curso para chaves de armazenamento.
     * en-US: Derives a stable course identifier for storage keys.
     */
    const courseId = useMemo(() => String(course?.id ?? course?.course_id ?? course?.token ?? slug ?? 'course'), [course, slug]);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    /**
     * activitiesOptions
     * pt-BR: Lista achatada de atividades com rótulo para seleção.
     * en-US: Flattened activities list with label for selection.
     */
    const activitiesOptions = useMemo(() => {
      const out: { key: string; label: string }[] = [];
      (modules || []).forEach((m: any, mi: number) => {
        const mtitle = String(m?.titulo || m?.title || m?.name || `Módulo ${mi + 1}`);
        const acts: any[] = Array.isArray(m?.atividades || m?.activities) ? (m?.atividades || m?.activities) : [];
        acts.forEach((a: any, ai: number) => {
          const id = String(a?.id ?? a?.activity_id ?? `${mi}-${ai}`);
          const atitle = String(a?.titulo || a?.title || a?.name || `Atividade ${ai + 1}`);
          out.push({ key: id, label: `${mtitle} • ${atitle}` });
        });
      });
      return out;
    }, [modules]);

    /**
     * selectedActivityKey
     * pt-BR: Atividade selecionada para exibir e publicar comentários.
     * en-US: Selected activity to show and post comments.
     */
    const [selectedActivityKey, setSelectedActivityKey] = useState<string>(() => currentActivityKey || activitiesOptions[0]?.key || '');
    useEffect(() => {
      if (currentActivityKey) {
        setSelectedActivityKey(currentActivityKey);
        return;
      }
      if (!selectedActivityKey && activitiesOptions.length > 0) setSelectedActivityKey(activitiesOptions[0].key);
    }, [activitiesOptions, selectedActivityKey, currentActivityKey]);

    /**
     * commentsQuery
     * pt-BR: Busca comentários aprovados no backend para a atividade selecionada.
     * en-US: Fetch approved comments from backend for selected activity.
     */
    const commentsQuery = useQuery({
      queryKey: ['activity-comments', selectedActivityKey],
      enabled: Boolean(selectedActivityKey),
      queryFn: async () => {
        if (!selectedActivityKey) return [];
        const res = await commentsService.listForActivity(selectedActivityKey);
        const rawItems = Array.isArray(res) ? res : (res?.data ?? []);
        return rawItems;
      },
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });

    /**
     * addComment
     * pt-BR: Adiciona um novo comentário do usuário atual e persiste.
     * en-US: Adds a new comment from the current user and persists.
     */
    const [draft, setDraft] = useState('');
    const createMutation = useMutation({
      mutationFn: async (text: string) => {
        /**
         * createComment payload
         * PT: rating passa a ser obrigatório (1 a 5). Não enviar undefined.
         * EN: rating is now required (1 to 5). Do not send undefined.
         */
        return commentsService.createComment({
          target_type: 'activity',
          target_id: selectedActivityKey!,
          body: text,
          // pt-BR: rating obrigatório (1 a 5).
          // en-US: required rating (1 to 5).
          rating: rating,
        });
      },
      onSuccess: () => {
        toast({
          title: 'Comentário enviado',
          description: 'Seu comentário foi enviado para moderação.',
        });
        setDraft('');
        setRating(0);
        // Nota: comentários aprovados podem não aparecer imediatamente.
        queryClient.invalidateQueries({ queryKey: ['activity-comments', selectedActivityKey] });
      },
      onError: () => {
        toast({
          title: 'Falha ao enviar',
          description: 'Não foi possível enviar seu comentário.',
          variant: 'destructive',
        } as any);
      },
    });

    /**
     * addComment
     * pt-BR: Valida e envia o comentário do usuário.
     * en-US: Validates and submits the user's comment.
     */
    const addComment = () => {
      const text = draft.trim();
      if (!text || !selectedActivityKey) return;
      if (containsProfanity(text)) {
        toast({
          title: 'Conteúdo inadequado',
          description: 'Por favor, remova palavrões antes de publicar.',
          variant: 'destructive',
        } as any);
        return;
      }
      if (text.length < COMMENT_MIN || text.length > COMMENT_MAX) {
        toast({
          title: 'Comentário inválido',
          description: `O comentário deve ter entre ${COMMENT_MIN} e ${COMMENT_MAX} caracteres.`,
          variant: 'destructive',
        } as any);
        return;
      }
      // PT: Exige seleção de estrelas (1 a 5) para publicar comentário.
      // EN: Require star selection (1 to 5) to publish comment.
      if (!rating || rating < 1 || rating > 5) {
        toast({ title: 'Selecione a avaliação', description: 'Escolha de 1 a 5 estrelas para avaliar.', variant: 'destructive' } as any);
        return;
      }
      createMutation.mutate(text);
    };

    /**
     * copyPageLink
     * pt-BR: Copia para a área de transferência o link atual da página.
     * en-US: Copies the current page link to the clipboard.
     */
    const copyPageLink = async () => {
      try {
        const url = window.location.href;
        await navigator.clipboard.writeText(url);
        toast({ title: 'Link copiado', description: 'URL da página copiada para a área de transferência.' });
      } catch (err) {
        toast({ title: 'Falha ao copiar link', description: 'Não foi possível copiar o link.', variant: 'destructive' } as any);
      }
    };

    /**
     * replyDrafts
     * pt-BR: Estado local dos rascunhos de resposta por comentário (id -> texto).
     * en-US: Local state for per-comment reply drafts (id -> text).
     */
    const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
    /**
     * replyVisible
     * pt-BR: Controle de visibilidade do formulário de resposta por comentário.
     * en-US: Visibility control for per-comment reply form.
     */
    const [replyVisible, setReplyVisible] = useState<Record<string, boolean>>({});
    /**
     * MAX_REPLY_DEPTH
     * pt-BR: Profundidade máxima de encadeamento de respostas (estilo WordPress).
     * en-US: Maximum nested reply depth (WordPress-like).
     */
    const MAX_REPLY_DEPTH = 4;

    /**
     * submitReply
     * pt-BR: Valida e envia uma resposta do aluno para um comentário raiz.
     * en-US: Validates and submits a student reply to a root comment.
     */
    const replyMutation = useMutation({
      mutationFn: async (vars: { parentId: number | string; body: string }) => {
        return commentsService.createComment({
          target_type: 'activity',
          target_id: selectedActivityKey!,
          body: vars.body,
          parent_id: Number(vars.parentId),
          rating: null,
        });
      },
      onSuccess: (_data, vars) => {
        toast({ title: 'Resposta enviada', description: 'Sua resposta foi enviada para moderação.' });
        setReplyDrafts((prev) => ({ ...prev, [String(vars.parentId)]: '' }));
        queryClient.invalidateQueries({ queryKey: ['activity-comments', selectedActivityKey] });
      },
      onError: () => {
        toast({ title: 'Falha ao responder', description: 'Não foi possível enviar sua resposta.', variant: 'destructive' } as any);
      },
    });

    /**
     * renderCommentItem
     * pt-BR: Renderiza um card de comentário com autor, data e estrelas e, abaixo,
     *        exibe respostas aprovadas em forma de thread. Para comentários raiz,
     *        disponibiliza um formulário de resposta.
     * en-US: Renders a comment card with author, date and stars and, below,
     *        shows approved replies in a threaded view. For root comments,
     *        provides a reply form.
     */
    const renderCommentItem = (c: any, depth: number = 0) => {
      /**
       * author
       * pt-BR: Aceita diferentes formatos retornados pelo backend: `user_name`,
       *        objeto `user.name`, ou `author_name`.
       * en-US: Accepts different backend formats: `user_name`, `user.name`,
       *        or `author_name`.
       */
      const author = String(
        c?.author_name ??
        c?.authorName ??
        c?.user_name ??
        c?.user_full_name ??
        c?.user?.full_name ??
        c?.user?.name ??
        c?.user?.nome ??
        ''
      ).trim() || 'Usuário';
      const created = c?.created_at ? new Date(String(c.created_at)).toLocaleString() : '';
      const ratingVal = Number(c?.rating ?? 0);
      const idStr = String(c?.id ?? '');
      const replies: any[] = Array.isArray(c?.replies) ? c.replies : [];
      const isRoot = depth === 0;
      const canReplyHere = depth < MAX_REPLY_DEPTH;
      const replyText = (replyDrafts[idStr] ?? '').slice(0, COMMENT_MAX);

      return (
        <div>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>{author}{created ? ` • ${created}` : ''}</span>
                <div className="flex items-center gap-1">
                  {ratingVal > 0 ? (
                    <>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={14} className={(ratingVal >= i + 1) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'} />
                      ))}
                      <span className="ml-1 text-[10px] text-muted-foreground">{ratingVal} / 5</span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem avaliação</span>
                  )}
                </div>
              </div>
              <div className="mt-1 whitespace-pre-wrap break-words">{String(c?.body ?? c?.text ?? '')}</div>

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
                        placeholder="Escreva sua resposta... / Write your reply..."
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
                            if (containsProfanity(text)) {
                              toast({ title: 'Conteúdo inadequado', description: 'Por favor, remova palavrões antes de publicar.', variant: 'destructive' } as any);
                              return;
                            }
                            if (text.length < COMMENT_MIN || text.length > COMMENT_MAX) {
                              toast({ title: 'Resposta inválida', description: `A resposta deve ter entre ${COMMENT_MIN} e ${COMMENT_MAX} caracteres.`, variant: 'destructive' } as any);
                              return;
                            }
                            replyMutation.mutate({ parentId: idStr, body: text });
                          }}
                          disabled={replyMutation.isPending || replyText.trim().length < COMMENT_MIN}
                        >
                          {replyMutation.isPending ? 'Respondendo...' : 'Enviar resposta'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {Array.isArray(replies) && replies.length > 0 && (
            <div className="mt-3 ml-4 md:ml-8 pl-3 border-l-2 border-primary/10 space-y-3">
              {replies.map((r, idx) => (
                <div key={`reply-${r?.id || idx}`}>
                  {renderCommentItem(r, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="mt-8">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Comentários da atividade</h3>
            <p className="text-sm text-muted-foreground">Somente comentários aprovados são exibidos. Comentários publicados entram em moderação.</p>
          </div>
          <div>
            <Button variant="outline" size="sm" onClick={copyPageLink}>Copiar link</Button>
          </div>
        </div>
        <div className={currentActivityKey ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
          {!currentActivityKey && (
            <div>
              <Label>Atividade</Label>
              <Select value={selectedActivityKey} onValueChange={setSelectedActivityKey}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a atividade" />
                </SelectTrigger>
                <SelectContent>
                  {activitiesOptions.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Novo comentário</Label>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, COMMENT_MAX))}
              placeholder="Escreva seu comentário... / Write your comment..."
              rows={3}
            />
            <div className="mt-2">
              <Label className="text-xs">Avaliação (obrigatória)</Label>
              <div className="mt-1">
                <StarRating value={rating} onChange={setRating} />
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{Math.max(0, draft.trim().length)} / {COMMENT_MAX}</span>
              <span>mín {COMMENT_MIN}</span>
            </div>
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                onClick={addComment}
                disabled={createMutation.isPending || !draft.trim() || !selectedActivityKey || draft.trim().length < COMMENT_MIN || rating < 1}
              >
                {createMutation.isPending ? 'Publicando...' : 'Publicar'}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {commentsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground animate-pulse">Carregando comentários...</div>
          ) : (Array.isArray(commentsQuery.data) && commentsQuery.data.length > 0 ? (
            commentsQuery.data.map((c: any, idx: number) => (
              <div key={`root-comment-${c?.id || idx}`}>{renderCommentItem(c)}</div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground italic bg-muted/20 p-4 rounded-lg border border-dashed text-center">Nenhum comentário para esta atividade.</div>
          ))}
        </div>
      </div>
    );
  }

  // Estado para acompanhar a atividade atual do viewer
  const [currentActivityKey, setCurrentActivityKey] = useState<string>('');

  /**
   * preselectLastActivityForComments
   * pt-BR: Após carregar curso e matrícula, busca na API a última atividade
   *        interrompida e ajusta a seleção inicial do painel de comentários.
   * en-US: After loading course and enrollment, fetch last interrupted activity
   *        from the API and set initial selection for the comments panel.
   */
  useEffect(() => {
    const cid = (course as any)?.id ?? (course as any)?.course_id ?? (course as any)?.token;
    if (!cid || !enrollmentId) return;
    if (currentActivityKey) return; // não sobrescreve se já houver atividade atual
    (async () => {
      try {
        /**
         * pt-BR: Usa o currículo por matrícula para determinar a próxima atividade.
         *        Prioriza atividade com `needs_resume`, senão primeira não concluída.
         * en-US: Use enrollment curriculum to determine next activity.
         *        Prioritizes activity with `needs_resume`, else first not completed.
         */
        const cur = await progressService.getEnrollmentCurriculum(enrollmentId);
        const modules = Array.isArray((cur as any)?.curriculum) ? (cur as any).curriculum : [];
        const activities: any[] = [];
        modules.forEach((m: any) => {
          const arr = Array.isArray(m?.atividades) ? m.atividades : [];
          arr.forEach((a: any) => activities.push(a));
        });
        let nextId: string | number | undefined = undefined;
        // 1) atividade marcada para retomar
        const resume = activities.find((a) => Boolean(a?.needs_resume) && !Boolean(a?.completed));
        if (resume && (resume?.id !== undefined || resume?.activity_id !== undefined)) {
          nextId = (resume?.id ?? resume?.activity_id) as any;
        }
        // 2) primeira não concluída
        if (nextId === undefined) {
          const firstNotDone = activities.find((a) => !Boolean(a?.completed));
          if (firstNotDone && (firstNotDone?.id !== undefined || firstNotDone?.activity_id !== undefined)) {
            nextId = (firstNotDone?.id ?? firstNotDone?.activity_id) as any;
          }
        }
        if (nextId !== undefined && nextId !== null) {
          setCurrentActivityKey(String(nextId));
        }
      } catch {
        // noop
      }
    })();
  }, [course, enrollmentId, currentActivityKey]);

  /**
   * handleActivityChange
   * pt-BR: Atualiza a chave da atividade corrente para os comentários.
   * en-US: Updates current activity key for comments.
   */
  const handleActivityChange = (a: any) => {
    const key = String(a?.id ?? a?.activity_id ?? `${a?._moduleIndex ?? 0}-${a?._activityIndex ?? 0}`);
    setCurrentActivityKey(key);
  };

  return (
    <InclusiveSiteLayout>
      {/**
       * compactPagePadding
       * pt-BR: Reduz paddings e espaçamentos em mobile para abrir mais área
       *        visível ao viewer de atividades.
       * en-US: Reduce paddings and spacing on mobile to open up more visible
       *        area for the activity viewer.
       */}
      <div className="container mx-auto p-0 md:p-4 space-y-0 md:space-y-6">
        <Card className="border-0 shadow-none md:border md:shadow-lg md:rounded-xl dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="py-2 md:py-4 bg-violet-50/50 dark:bg-violet-950/20 border-b border-violet-100 dark:border-violet-800/50">
            <div className="flex items-start justify-between gap-2 md:gap-3">
              <div className="min-w-0">
                <CardTitle className="text-lg md:text-2xl leading-tight break-words line-clamp-2">{isLoading ? 'Carregando...' : title}</CardTitle>
                <CardDescription className="hidden md:block">Área do aluno • Conteúdos do curso</CardDescription>
              </div>
              <div className="hidden md:flex items-center gap-2">
                {courseTotalLabel && (
                  <Badge variant="outline" className="shrink-0">{courseTotalLabel}</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && <div className="text-red-600">Falha ao carregar o curso.</div>}
            {!isLoading && modules.length === 0 && (
              <div className="text-muted-foreground">Nenhum módulo disponível.</div>
            )}
            {!canAccessContent ? (
              <div className="space-y-4">
                <div className="p-3 border rounded-md bg-yellow-50 text-yellow-800">
                  Você precisa estar matriculado para acessar este curso.
                </div>
                {isStudent && (
                  <Button
                    onClick={() => {
                      const q = new URLSearchParams({ courseId: String(courseNumericId || '') }).toString();
                      navigate(`/admin/sales/proposals/create?${q}`);
                    }}
                    disabled={isLoading || isEnrollmentsLoading}
                  >
                    Fazer matrícula
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/**
                 * CourseContentViewer
                 * pt-BR: Passa `enrollmentId` para que o salvamento de progresso envie `id_matricula`.
                 * en-US: Passes `enrollmentId` so progress saving sends `id_matricula`.
                 */}
                {/**
                 * viewerContainer
                 * pt-BR: Contêiner de altura fixa para permitir rolagem independente
                 *        da barra lateral e da área principal do viewer.
                 * en-US: Fixed-height container to enable independent scrolling for
                 *        the sidebar and the main viewer area.
                 */}
                <div className="h-[82vh] min-h-[60vh] overflow-hidden">
                  <CourseContentViewer course={course} onActivityChange={handleActivityChange} enrollmentId={enrollmentId} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </InclusiveSiteLayout>
  );
}
