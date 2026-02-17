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
   * pt-BR: ID do usuário logado para filtrar as matrículas.
   * en-US: Logged user ID to filter enrollments.
   */
  const clientId = user?.id;

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
    const arr = ((enrollmentsResp as any)?.data || (enrollmentsResp as any)?.items || []) as any[];
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
      <Card 
        key={String(enroll?.id || Math.random())} 
        className="group overflow-hidden border border-border/50 rounded-lg bg-card hover:bg-card/80 shadow-sm hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full"
        onClick={() => {
           if (!disabledNav) {
              if (activeCategory === 'mat') handleContinueCourse(enroll);
              else handleViewInterestedCourse(enroll);
           }
        }}
      >
        {viewMode === 'grid' && (
          <div className="relative w-full h-40 overflow-hidden">
             {coverUrl ? (
                <img 
                  src={coverUrl} 
                  alt={title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                />
             ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                   <span className="text-4xl opacity-30">🎓</span>
                </div>
             )}
             <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
             {status && (
               <Badge className="absolute top-2 right-2 shadow-sm bg-white/90 text-slate-800 backdrop-blur-sm dark:bg-slate-900/90 dark:text-slate-100 border-0">
                  {status}
               </Badge>
             )}
          </div>
        )}
        <CardHeader className="p-5 pb-2 flex-grow">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg font-bold line-clamp-2 leading-tight group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">
               {title}
            </CardTitle>
          </div>
          <CardDescription className="line-clamp-1 text-xs mt-1">
             {resolveTurmaName(enroll) || 'Curso online'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          <div className="flex flex-col gap-2 mt-auto">
            {activeCategory === 'mat' ? (
              <div className="grid grid-cols-2 gap-2">
                <Button 
                   size="sm" 
                   disabled={disabledNav} 
                   onClick={(e) => { e.stopPropagation(); handleContinueCourse(enroll); }}
                   className={isConcluded ? "bg-emerald-600 hover:bg-emerald-700 text-white rounded-md" : "bg-primary hover:bg-blue-700 text-white rounded-md"}
                >
                   {actionLabel}
                </Button>
                <Button 
                   size="sm" 
                   variant="outline" 
                   disabled={disabledNav} 
                   onClick={(e) => { e.stopPropagation(); handleViewProgress(enroll); }}
                   className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/20 rounded-md"
                >
                   Progresso
                </Button>
                 {hasCertificate && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="col-span-2 text-xs h-6 text-muted-foreground hover:text-primary"
                    onClick={(e) => { e.stopPropagation(); window.open((enroll?.preferencias || {})?.certificate_url, '_blank'); }}
                  >
                    🏆 Ver Certificado
                  </Button>
                )}
              </div>
            ) : (
              <Button 
                size="sm" 
                disabled={disabledNav} 
                onClick={(e) => { e.stopPropagation(); handleViewInterestedCourse(enroll); }}
                className="w-full bg-primary hover:bg-blue-700 text-white rounded-md"
              >
                Ver detalhes do curso
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <InclusiveSiteLayout>
       <div className="min-h-screen bg-slate-50 dark:bg-black/50 py-8 transition-colors duration-500">
        <div className="container mx-auto px-4 space-y-8">
        
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary via-blue-600 to-indigo-700 text-white shadow-xl">
           <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
           <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />
           <div className="relative z-10 px-8 py-10 md:py-12 flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2 drop-shadow-md">Meus Cursos</h1>
                <p className="text-blue-50 text-lg max-w-xl">
                  Gerencie sua jornada de aprendizado. Acesse seus cursos matriculados e confira novos interesses.
                </p>
              </div>
              
              {/* Controls inside Header for premium feel */}
               <div className="bg-white/10 backdrop-blur-md border border-white/20 p-1.5 rounded-md flex items-center gap-1">
                 <Button 
                    size="sm" 
                    variant="ghost" 
                    className={`text-white hover:bg-white/20 rounded-sm ${activeCategory === 'mat' ? 'bg-white/20 shadow-sm font-semibold' : 'opacity-80'}`}
                    onClick={() => setActiveCategory('mat')}
                 >
                    Matriculados
                 </Button>
                 <Button 
                    size="sm" 
                    variant="ghost" 
                    className={`text-white hover:bg-white/20 rounded-sm ${activeCategory === 'int' ? 'bg-white/20 shadow-sm font-semibold' : 'opacity-80'}`}
                    onClick={() => setActiveCategory('int')}
                 >
                    Interesse
                 </Button>
                 <div className="w-px h-6 bg-white/20 mx-1" />
                 <div className="flex bg-black/20 rounded-md p-0.5">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className={`h-8 w-8 text-white hover:bg-white/20 rounded-sm ${viewMode === 'grid' ? 'bg-white/20' : ''}`}
                      onClick={() => setViewMode('grid')}
                      title="Grade"
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className={`h-8 w-8 text-white hover:bg-white/20 rounded-sm ${viewMode === 'list' ? 'bg-white/20' : ''}`}
                      onClick={() => setViewMode('list')}
                      title="Lista"
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
                    </Button>
                 </div>
              </div>
           </div>
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
             {error && (
                <div className="p-4 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-center animate-in fade-in">
                   Falha ao carregar suas matrículas. Tente recarregar a página.
                </div>
             )}
            
             {isLoading && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-in fade-in">
                   <div className="animate-spin mb-4 w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                   <p>Carregando seus cursos...</p>
                </div>
             )}

             {!isLoading && enrollments.length === 0 && (
               <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in-95 duration-500">
                  <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                     <span className="text-4xl">🎓</span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                     {activeCategory === 'mat' ? 'Nenhuma matrícula encontrada' : 'Nenhum curso marcado como interesse'}
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-8">
                     {activeCategory === 'mat' 
                        ? 'Você ainda não está matriculado em nenhum curso. Explore nosso catálogo e comece a aprender hoje mesmo!' 
                        : 'Você ainda não demonstrou interesse em nenhum curso. Navegue pelos cursos disponíveis e marque os que gostar.'}
                  </p>
                  <Button 
                    onClick={() => navigate('/cursos')}
                    className="bg-primary hover:bg-blue-700 text-white rounded-full px-8 shadow-lg hover:shadow-xl transition-all"
                  >
                     Explorar Cursos
                  </Button>
               </div>
             )}

             {!isLoading && enrollments.length > 0 && (
                <>
                   {viewMode === 'grid' ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                       {enrollments.map(renderEnrollmentCard)}
                     </div>
                   ) : (
                     <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                       {enrollments.map((enroll) => {
                         const status = String(enroll?.situacao || '').trim();
                         const hasCertificate = Boolean((enroll?.preferencias || {})?.certificate_url);
                         const statusLower = status.toLowerCase();
                         const isConcludedLocal = statusLower.includes('conclu') || statusLower.includes('finaliz') || statusLower.includes('complet') || hasCertificate;
                         const disabledNav = !resolveCourseSlug(enroll) && !resolveCourseId(enroll);
                         const coverUrl = resolveCoverUrl(enroll);
                         
                         return (
                           <div 
                              key={String(enroll?.id || Math.random())} 
                              className="group flex flex-col md:flex-row md:items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:shadow-md hover:border-primary/20 dark:hover:border-blue-800 transition-all cursor-pointer"
                              onClick={() => {
                                 if (!disabledNav) {
                                    if (activeCategory === 'mat') handleContinueCourse(enroll);
                                    else handleViewInterestedCourse(enroll);
                                 }
                              }}
                           >
                             <div className="flex items-center gap-4">
                               <div className="hidden md:block w-16 h-16 rounded-md overflow-hidden bg-slate-100 flex-shrink-0">
                                  {coverUrl ? (
                                     <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                     <div className="w-full h-full flex items-center justify-center text-lg">🎓</div>
                                  )}
                               </div>
                               <div className="flex flex-col">
                                 <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">
                                    {resolveCourseTitle(enroll)}
                                 </h3>
                                 <div className="flex items-center gap-2 mt-1">
                                    {resolveTurmaName(enroll) && (
                                       <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                          {resolveTurmaName(enroll)}
                                       </span>
                                    )}
                                    {status && (
                                       <span className="text-xs text-muted-foreground">• {status}</span>
                                    )}
                                 </div>
                               </div>
                             </div>
                             
                             <div className="flex items-center gap-3 mt-4 md:mt-0 md:ml-auto">
                               {activeCategory === 'mat' ? (
                                 <>
                                   {hasCertificate && (
                                       <Button 
                                          size="sm" 
                                          variant="ghost" 
                                          title="Ver certificado"
                                          onClick={(e) => { e.stopPropagation(); window.open((enroll?.preferencias || {})?.certificate_url, '_blank'); }}
                                       >
                                          🏆
                                       </Button>
                                   )}
                                   <Button 
                                      size="sm" 
                                      variant="outline" 
                                      disabled={disabledNav} 
                                      onClick={(e) => { e.stopPropagation(); handleViewProgress(enroll); }}
                                      className="hidden sm:flex rounded-md"
                                   >
                                      Progresso
                                   </Button>
                                   <Button 
                                      size="sm" 
                                      disabled={disabledNav} 
                                      onClick={(e) => { e.stopPropagation(); handleContinueCourse(enroll); }}
                                      className={isConcludedLocal ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-md" : "bg-primary hover:bg-blue-700 text-white shadow-sm rounded-md"}
                                   >
                                      {isConcludedLocal ? 'Revisar' : 'Continuar'}
                                   </Button>
                                 </>
                               ) : (
                                 <Button 
                                    size="sm" 
                                    disabled={disabledNav} 
                                    onClick={(e) => { e.stopPropagation(); handleViewInterestedCourse(enroll); }}
                                    className="bg-primary hover:bg-blue-700 text-white shadow-sm rounded-md"
                                 >
                                    Ver detalhes
                                 </Button>
                               )}
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   )}
                </>
             )}
        </div>
        </div>
      </div>
    </InclusiveSiteLayout>
  );
}