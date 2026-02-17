import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import commentsService from '@/services/commentsService';
import { Link } from 'react-router-dom';

/**
 * PublicCourseComments
 * pt-BR: Componente para exibir e permitir postar comentários em páginas públicas de curso.
 * en-US: Component to display and allow posting comments on public course pages.
 */
export function PublicCourseComments({ courseId }: { courseId: string | number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<number>(0);
  const [draft, setDraft] = useState('');

  const COMMENT_MIN = 3;
  const COMMENT_MAX = 500;

  /**
   * commentsQuery
   * pt-BR: Busca comentários aprovados para o curso.
   * en-US: Fetches approved comments for the course.
   */
  const commentsQuery = useQuery({
    queryKey: ['course-comments', courseId],
    queryFn: async () => {
      const res = await commentsService.listForCourse(courseId);
      return Array.isArray(res) ? res : (res?.data ?? []);
    },
    enabled: !!courseId,
  });

  /**
   * createMutation
   * pt-BR: Envia novo comentário para moderação.
   * en-US: Submits a new comment for moderation.
   */
  const createMutation = useMutation({
    mutationFn: async ({ text, rating }: { text: string; rating: number }) => {
      return commentsService.createComment({
        target_type: 'course',
        target_id: String(courseId),
        body: text,
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
      queryClient.invalidateQueries({ queryKey: ['course-comments', courseId] });
    },
    onError: () => {
      toast({
        title: 'Falha ao enviar',
        description: 'Não foi possível enviar seu comentário.',
        variant: 'destructive',
      });
    },
  });

  const handlePost = () => {
    const text = draft.trim();
    if (!text || rating < 1) return;
    if (text.length < COMMENT_MIN || text.length > COMMENT_MAX) {
      toast({
        title: 'Comentário inválido',
        description: `O comentário deve ter entre ${COMMENT_MIN} e ${COMMENT_MAX} caracteres.`,
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate({ text, rating });
  };

  /**
   * renderCommentItem
   * pt-BR: Renderiza um item de comentário com suporte recursivo a respostas.
   * en-US: Renders a comment item with recursive support for replies.
   */
  const renderCommentItem = (c: any, depth: number = 0) => {
    const authorRaw = c.user_name || 'Usuário';
    
    /**
     * pt-BR: Anonimiza o nome exibindo apenas o primeiro nome e a inicial do sobrenome.
     * en-US: Anonymizes name showing only the first name and the surname's initial.
     */
    const anonymizeName = (fullName: string) => {
      const parts = fullName.split(' ').filter(Boolean);
      if (parts.length <= 1) return fullName;
      const firstName = parts[0];
      const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
      return `${firstName} ${lastInitial}.`;
    };

    const author = anonymizeName(authorRaw);
    
    const date = c.created_at 
      ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR }) 
      : '';
    const ratingVal = Number(c.rating || 0);

    return (
      <div key={c.id} className={`space-y-2 ${depth > 0 ? 'ml-6 border-l pl-4' : ''}`}>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-sm font-semibold">{author}</span>
            <span className="text-xs text-muted-foreground ml-2">{date}</span>
          </div>
          {ratingVal > 0 && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < ratingVal ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}
                />
              ))}
            </div>
          )}
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap">{c.body}</p>
        {c.replies?.map((reply: any) => renderCommentItem(reply, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Comentários e Avaliações</CardTitle>
          <CardDescription>Veja o que outros alunos estão dizendo sobre este curso.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Form para novo comentário */}
          <div className="space-y-4 border-b pb-6">
            <h4 className="text-sm font-medium">Deixe sua avaliação</h4>
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Sua nota:</Label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          size={20}
                          className={n <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comment-body" className="text-sm">Seu comentário:</Label>
                  <Textarea
                    id="comment-body"
                    placeholder="Conte-nos o que achou do curso..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{draft.length}/{COMMENT_MAX} caracteres</span>
                    <span>mínimo {COMMENT_MIN}</span>
                  </div>
                </div>
                <Button 
                  onClick={handlePost} 
                  disabled={createMutation.isPending || !draft.trim() || rating === 0}
                  className="w-full sm:w-auto"
                >
                  {createMutation.isPending ? 'Enviando...' : 'Publicar Comentário'}
                </Button>
              </div>
            ) : (
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-3">Você precisa estar logado para avaliar este curso.</p>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/login">Entrar</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link to="/register">Criar Conta</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Listagem de comentários */}
          <div className="space-y-6">
            {commentsQuery.isLoading ? (
              <div className="text-sm text-muted-foreground animate-pulse">Carregando comentários...</div>
            ) : (() => {
              const items = Array.isArray(commentsQuery.data) ? [...commentsQuery.data] : [];
              items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              
              if (items.length > 0) {
                return items.map((c: any) => renderCommentItem(c));
              }
              return (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground italic">Nenhum comentário ainda. Seja o primeiro a avaliar!</p>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
