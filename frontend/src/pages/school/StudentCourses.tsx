import { useMemo, useState } from 'react';
import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useEnrollmentsList } from '@/hooks/enrollments';
import { useNavigate } from 'react-router-dom';
import { coursesService } from '@/services/coursesService';
import { publicCoursesService } from '@/services/publicCoursesService';
import { useToast } from '@/hooks/use-toast';

/**
 * StudentCourses
 * pt-BR: Página dedicada "Meus cursos" com categorias Matriculado e Interesse,
 *        exibindo lista/grade com capas. Consulta `/matriculas` filtrando por
 *        `situacao` (mat/int) e `id_cliente` do usuário logado.
 * en-US: Dedicated "My Courses" page with Enrolled and Interest categories,
 *        showing grid/list with covers. Queries `/matriculas` filtering by
 *        `situacao` (mat/int) and logged user's `id_cliente`.
 */
export default function StudentCourses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  /**
   * clientId
   * pt-BR: Extrai id do cliente a partir de chaves comuns do usuário (id, id_cliente,
   *        client_id, cliente_id) e normaliza para número.
   * en-US: Extract client id from common user keys (id, id_cliente, client_id,
   *        cliente_id) and normalize to number.
   */
  const clientId = useMemo(() => {
    // Prefer explicit client fields; do not coerce generic `user.id` which can be UUID
    const candidates = [
      (user as any)?.id_cliente,
      (user as any)?.client_id,
      (user as any)?.cliente_id,
    ];
    for (const v of candidates) {
      if (v === null || v === undefined) continue;
      const s = String(v).trim();
      if (s) return s; // keep as string to accommodate numeric or UUID-like ids
    }
    return undefined;
  }, [user]);

  /**
   * Page state
   * pt-BR: Categoria ativa e modo de exibição.
   * en-US: Active category and view mode.
   */
  const [activeCategory, setActiveCategory] = useState<'mat' | 'int'>('mat');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [slugCache, setSlugCache] = useState<Record<string, string>>({});

  /**
   * useEnrollmentsList
   * pt-BR: Busca matrículas do aluno com filtros. `situacao` alterna entre
   *        matriculado (mat) e interesse (int). `public: '1'` para contexto público.
   * en-US: Fetch student enrollments with filters. `situacao` toggles between
   *        enrolled (mat) and interest (int). `public: '1'` for public context.
   */
  const listParams = useMemo(() => {
    const base: any = { page: 1, per_page: 50, public: '1', situacao: activeCategory };
    if (clientId) base.id_cliente = clientId;
    return base;
  }, [activeCategory, clientId]);

  const { data: enrollmentsResp, isLoading, error } = useEnrollmentsList(
    listParams as any,
    { enabled: true, staleTime: 5 * 60 * 1000 }
  );

  /**
   * normalizeEnrollments
   * pt-BR: Normaliza resposta paginada em array simples.
   * en-US: Normalize paginated response into array.
   */
  const enrollments = useMemo(() => {
    const arr = (enrollmentsResp?.data || enrollmentsResp?.items || []) as any[];
    return Array.isArray(arr) ? arr : [];
  }, [enrollmentsResp]);

  /**
   * resolveCourseId
   * pt-BR: Resolve ID numérico do curso a partir da matrícula.
   * en-US: Resolve numeric course ID from enrollment.
   */
  function resolveCourseId(enroll: any): number | undefined {
    const candidates = [enroll?.id_curso, enroll?.course_id, enroll?.curso_id];
    for (const v of candidates) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return undefined;
  }

  /**
   * resolveCourseSlug
   * pt-BR: Resolve o slug (ou token) do curso a partir da matrícula.
   * en-US: Resolve course slug (or token) from the enrollment record.
   */
  function resolveCourseSlug(enroll: any): string | undefined {
    const c = enroll?.curso || enroll?.course || {};
    const candidates = [
      // Prefer explicit slug/token from nested course object
      c?.slug,
      c?.token,
      // Some backends may place slug directly on the enrollment
      enroll?.slug,
      enroll?.token,
      // Fallbacks occasionally used
      enroll?.curso_slug,
      enroll?.course_slug,
    ];
    for (const v of candidates) {
      const s = String(v || '').trim();
      if (s) return s;
    }
    return undefined;
  }

  /**
   * ensureCourseSlug
   * pt-BR: Garante o slug do curso. Se não houver no registro de matrícula,
   *        busca detalhes do curso usando ID e extrai `slug`/`token`. Primeiro
   *        tenta o endpoint privado por ID/slug; se não resolver, faz fallback
   *        ao endpoint público `/cursos/public/by-id/{id}`.
   * en-US: Ensures the course slug. If not present on the enrollment,
   *        fetches course details by ID and extracts `slug`/`token`. Tries the
   *        private endpoint by ID/slug; if unresolved, falls back to the public
   *        endpoint `/cursos/public/by-id/{id}`.
   */
  async function ensureCourseSlug(enroll: any): Promise<string | undefined> {
    const direct = resolveCourseSlug(enroll);
    if (direct) return direct;
    const id = resolveCourseId(enroll);
    if (!id) return undefined;
    const cached = slugCache[String(id)];
    if (cached) return cached;
    try {
      const course = await coursesService.getBySlug(String(id));
      const slug = String((course as any)?.slug || (course as any)?.token || '').trim();
      if (slug) {
        setSlugCache((prev) => ({ ...prev, [String(id)]: slug }));
        return slug;
      }
    } catch (err) {
      // Ignora erro e tenta fallback público abaixo.
    }
    // Fallback público por ID
    try {
      const coursePublic = await publicCoursesService.getById(String(id));
      const slugPublic = String((coursePublic as any)?.slug || (coursePublic as any)?.token || '').trim();
      if (slugPublic) {
        setSlugCache((prev) => ({ ...prev, [String(id)]: slugPublic }));
        return slugPublic;
      }
    } catch {}
    // Sem slug disponível; respeitar requisito de navegação por slug.
    return undefined;
  }

  /**
   * resolveCourseTitle
   * pt-BR: Obtém título do curso com fallback.
   * en-US: Get course title with fallback.
   */
  function resolveCourseTitle(enroll: any): string {
    return (
      String(enroll?.course_name || enroll?.curso_nome || enroll?.name || '').trim() ||
      `Curso ${String(resolveCourseId(enroll) || enroll?.id || '')}`
    );
  }

  /**
   * resolveTurmaName
   * pt-BR: Obtém nome da turma, quando existir.
   * en-US: Get class name, when present.
   */
  function resolveTurmaName(enroll: any): string | undefined {
    const candidates = [enroll?.turma_nome, enroll?.class_name, enroll?.nome_turma];
    for (const v of candidates) {
      if (typeof v === 'string' && v.trim() !== '') return v.trim();
    }
    return undefined;
  }

  /**
   * resolveCoverUrl
   * pt-BR: URL da capa do curso, lendo exclusivamente `config.cover.url`.
   * en-US: Course cover URL, reading exclusively `config.cover.url`.
   */
  function resolveCoverUrl(enroll: any): string | null {
    console.log('enroll', enroll);
    const courseCover = String(enroll?.curso_config?.cover?.url || '').trim();
    if (courseCover) return courseCover;
    const prefsCover = String((enroll?.preferencias || {})?.config?.cover?.url || '').trim();
    if (prefsCover) return prefsCover;
    return null;
  }

  /**
   * handleContinueCourse
   * pt-BR: Abre consumo do curso para matrícula.
   * en-US: Open course consumption for enrollment.
   */
  async function handleContinueCourse(enroll: any) {
    console.log('enroll', enroll);
    const slug = enroll?.curso_slug || enroll?.course_slug || await ensureCourseSlug(enroll);
    if (!slug) {
      // Feedback quando não é possível resolver o slug
      toast({
        title: 'Não foi possível abrir o curso',
        description: 'Este curso não possui um slug identificável no momento.',
        variant: 'destructive',
      });
      return;
    }
    navigate(`/aluno/cursos/${String(slug)}?activity=`);
  }

  /**
   * handleViewProgress
   * pt-BR: Abre a página de acompanhamento de progresso do curso (matriculado).
   * en-US: Opens the course progress tracking page (enrolled).
   */
  async function handleViewProgress(enroll: any) {
    const slug = enroll?.curso_slug || enroll?.course_slug || await ensureCourseSlug(enroll);
    const enrId = String(enroll?.id || enroll?.id_matricula || enroll?.matricula_id || '');
    if (!slug) {
      toast({
        title: 'Não foi possível abrir o progresso',
        description: 'Este curso não possui um slug identificável no momento.',
        variant: 'destructive',
      });
      return;
    }
    const q = enrId ? `?enr=${encodeURIComponent(enrId)}` : '';
    navigate(`/aluno/cursos/${String(slug)}/progresso${q}`);
  }

  /**
   * handleViewInterestedCourse
   * pt-BR: Abre página pública do curso para interesse.
   * en-US: Open public course page for interest.
   */
  async function handleViewInterestedCourse(enroll: any) {
    const slug = await ensureCourseSlug(enroll);
    if (!slug) {
      toast({
        title: 'Não foi possível abrir o curso',
        description: 'Este curso não possui um slug identificável no momento.',
        variant: 'destructive',
      });
      return;
    }
    navigate(`/aluno/cursos/${String(slug)}`);
  }

  /**
   * renderEnrollmentCard
   * pt-BR: Card de curso com capa, status e ação.
   * en-US: Course card with cover, status and action.
   */
  function renderEnrollmentCard(enroll: any) {
    const title = resolveCourseTitle(enroll);
    const status = String(enroll?.situacao || '').trim();
    const hasCertificate = Boolean((enroll?.preferencias || {})?.certificate_url);
    const coverUrl = resolveCoverUrl(enroll);
    const statusLower = status.toLowerCase();
    const isConcluded = statusLower.includes('conclu') || statusLower.includes('finaliz') || statusLower.includes('complet') || hasCertificate;
    const actionLabel = isConcluded ? 'Revisar curso' : 'Continuar curso';
    const disabledNav = !resolveCourseSlug(enroll) && !resolveCourseId(enroll);

    return (
      <Card key={String(enroll?.id || Math.random())} className="hover:shadow-sm transition-shadow">
        {viewMode === 'grid' && (
          <div className="w-full h-36 bg-muted overflow-hidden">
            {coverUrl ? (
              <img src={coverUrl} alt={title} className="w-full h-36 object-cover" />
            ) : (
              <div className="w-full h-36 flex items-center justify-center text-muted-foreground">Sem capa</div>
            )}
          </div>
        )}
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{title}</CardTitle>
            {status && <Badge variant="outline">{status}</Badge>}
          </div>
          <CardDescription>Curso • acesso e detalhes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {activeCategory === 'mat' ? (
              <>
                <Button size="sm" disabled={disabledNav} onClick={() => handleContinueCourse(enroll)}>{actionLabel}</Button>
                <Button size="sm" variant="outline" disabled={disabledNav} onClick={() => handleViewProgress(enroll)}>Progresso</Button>
              </>
            ) : (
              <Button size="sm" disabled={disabledNav} onClick={() => handleViewInterestedCourse(enroll)}>Ver curso</Button>
            )}
            {activeCategory === 'mat' && hasCertificate && (
              <Button size="sm" variant="outline" onClick={() => window.open((enroll?.preferencias || {})?.certificate_url, '_blank')}>Certificado</Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <InclusiveSiteLayout>
      <div className="container mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meus cursos</h1>
          <p className="text-muted-foreground">Lista de cursos matriculados e de interesse</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cursos</CardTitle>
            <CardDescription>Filtre por categoria e escolha o modo de exibição</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 items-center mb-4">
              <span className="text-sm text-muted-foreground">Categoria:</span>
              <Button size="sm" variant={activeCategory === 'mat' ? 'default' : 'outline'} onClick={() => setActiveCategory('mat')}>Matriculado</Button>
              <Button size="sm" variant={activeCategory === 'int' ? 'default' : 'outline'} onClick={() => setActiveCategory('int')}>Interesse</Button>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant={viewMode === 'grid' ? 'default' : 'outline'} onClick={() => setViewMode('grid')}>Grade</Button>
                <Button size="sm" variant={viewMode === 'list' ? 'default' : 'outline'} onClick={() => setViewMode('list')}>Lista</Button>
              </div>
            </div>
            {error && (<div className="text-red-600">Falha ao carregar matrículas.</div>)}
            {isLoading && (<div className="text-muted-foreground">Carregando suas matrículas...</div>)}
            {!isLoading && enrollments.length === 0 && (
              <div className="text-muted-foreground">Você ainda não possui matrículas ativas.</div>
            )}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrollments.map(renderEnrollmentCard)}
              </div>
            ) : (
              <div className="space-y-2">
                {enrollments.map((enroll) => {
                  // Calcula conclusão e disponibilidade local para a lista
                  const status = String(enroll?.situacao || '').trim();
                  const hasCertificate = Boolean((enroll?.preferencias || {})?.certificate_url);
                  const statusLower = status.toLowerCase();
                  const isConcludedLocal = statusLower.includes('conclu') || statusLower.includes('finaliz') || statusLower.includes('complet') || hasCertificate;
                  const disabledNav = !resolveCourseSlug(enroll) && !resolveCourseId(enroll);
                  return (
                    <div key={String(enroll?.id || Math.random())} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex flex-col">
                        <span className="font-medium">{resolveCourseTitle(enroll)}</span>
                        {resolveTurmaName(enroll) && (
                          <span className="text-xs text-muted-foreground">{resolveTurmaName(enroll)}</span>
                        )}
                      </div>
                      {activeCategory === 'mat' ? (
                        <div className="flex gap-2">
                          <Button size="sm" disabled={disabledNav} onClick={() => handleContinueCourse(enroll)}>{isConcludedLocal ? 'Revisar' : 'Continuar'}</Button>
                          <Button size="sm" variant="outline" disabled={disabledNav} onClick={() => handleViewProgress(enroll)}>Progresso</Button>
                        </div>
                      ) : (
                        <Button size="sm" disabled={disabledNav} onClick={() => handleViewInterestedCourse(enroll)}>Ver curso</Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </InclusiveSiteLayout>
  );
}