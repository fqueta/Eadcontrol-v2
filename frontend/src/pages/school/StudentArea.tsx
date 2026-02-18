import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useEnrollmentsList } from '@/hooks/enrollments';
import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import { BookOpen, Receipt, ShoppingCart, GraduationCap, UserCircle } from 'lucide-react';
import { coursesService } from '@/services/coursesService';
import { publicCoursesService } from '@/services/publicCoursesService';
import { useToast } from '@/hooks/use-toast';
import { certificatesService } from '@/services/certificatesService';
import { getInstitutionWhatsApp } from '@/lib/branding';

/**
 * StudentArea
 * pt-BR: Área do aluno EAD com visão das matrículas, progresso e acesso rápido aos cursos.
 * en-US: EAD student area showing enrollments, progress and quick access to courses.
 */
export default function StudentArea() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  /**
   * Local state for quick filters
   * pt-BR: Estado de filtros rápidos: status e turma.
   * en-US: Quick filter state: status and class.
   */
  const [statusFilter, setStatusFilter] = useState<'todos' | 'em_andamento' | 'concluido'>('todos');
  const [turmaFilter, setTurmaFilter] = useState<string | 'todas'>('todas');
  /**
   * activeCategory
   * pt-BR: Categoria de visualização: matriculado (mat) ou interesse (int).
   * en-US: Viewing category: enrolled (mat) or interested (int).
   */
  const [activeCategory, setActiveCategory] = useState<'mat' | 'int'>('mat');
  /**
   * viewMode
   * pt-BR: Modo de exibição da lista de cursos: grade ou lista.
   * en-US: Courses list view mode: grid or list.
   */
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  /**
   * openCertificateInternal
   * pt-BR: Navega para a visualização interna do certificado por ID de matrícula.
   * en-US: Navigates to internal certificate view by enrollment ID.
   */
  function openCertificateInternal(enroll: any) {
    const id = String(enroll?.id || '').trim();
    if (!id) return;
    navigate(`/aluno/certificado/${encodeURIComponent(id)}`);
  }

  /**
   * openCertificateExternal
   * pt-BR: Abre a URL salva do certificado (se existir) em nova aba.
   * en-US: Opens the saved certificate URL (if exists) in a new tab.
   */
  function openCertificateExternal(enroll: any) {
    const url = (enroll?.preferencias || {})?.certificate_url;
    if (url) window.open(url, '_blank');
  }

  /**
   * getClientIdFromUser
   * pt-BR: Retorna o id do cliente a partir do usuário logado (aceita id_cliente, client_id, cliente_id).
   * en-US: Returns client id from logged user (accepts id_cliente, client_id, cliente_id).
   */
  const clientId = useMemo(() => {
    const candidates = [
      user?.id,
      (user as any)?.id_cliente,
      (user as any)?.client_id,
      (user as any)?.cliente_id,
    ];
    for (const v of candidates) {
      if (v === undefined || v === null) continue;
      const s = String(v).trim();
      if (s !== '' && s !== '0') return s;
    }
    return undefined;
  }, [user]);

  /**
   * useEnrollmentsList
   * pt-BR: Busca matrículas do aluno. O serviço inclui `situacao=mat` por padrão.
   * en-US: Fetches student enrollments. Service includes `situacao=mat` by default.
   */
  const { data: enrollmentsResp, isLoading, error } = useEnrollmentsList(
    { page: 1, per_page: 50, id_cliente: clientId, public: '1', situacao: activeCategory } as any,
    { enabled: !!clientId, staleTime: 5 * 60 * 1000 }
  );

  /**
   * normalizeEnrollments
   * pt-BR: Normaliza resposta paginada em um array simples.
   * en-US: Normalizes paginated response into a plain array.
   */
  const enrollments = useMemo(() => {
    // Cast to any to handle cases where items might be used in pagination instead of data
    const resp = enrollmentsResp as any;
    const arr = (resp?.data || resp?.items || []) as any[];
    return Array.isArray(arr) ? arr : [];
  }, [enrollmentsResp]);

  /**
   * resolveTurmaId
   * pt-BR: Resolve id de turma a partir de campos comuns.
   * en-US: Resolves class id from common fields.
   */
  function resolveTurmaId(enroll: any): string | number | undefined {
    const candidates = [enroll?.id_turma, enroll?.turma_id, enroll?.idTurma];
    for (const v of candidates) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return n;
      if (v && typeof v === 'string' && v.trim() !== '') return v;
    }
    return undefined;
  }

  /**
   * resolveTurmaName
   * pt-BR: Resolve nome da turma, se disponível.
   * en-US: Resolves class name, if available.
   */
  function resolveTurmaName(enroll: any): string | undefined {
    const candidates = [enroll?.turma_nome, enroll?.class_name, enroll?.nome_turma];
    for (const v of candidates) {
      if (typeof v === 'string' && v.trim() !== '') return v.trim();
    }
    return undefined;
  }

  /**
   * uniqueTurmas
   * pt-BR: Lista única de turmas presentes nas matrículas para filtro.
   * en-US: Unique list of classes present in enrollments for filtering.
   */
  const uniqueTurmas = useMemo(() => {
    const map = new Map<string, { id: string; name?: string }>();
    for (const e of enrollments) {
      const tid = resolveTurmaId(e);
      if (tid === undefined || tid === null) continue;
      const idStr = String(tid);
      if (!map.has(idStr)) {
        map.set(idStr, { id: idStr, name: resolveTurmaName(e) });
      }
    }
    return Array.from(map.values());
  }, [enrollments]);

  /**
   * filteredEnrollments
   * pt-BR: Aplica filtros de status e turma ao array de matrículas.
   * en-US: Applies status and class filters to the enrollments array.
   */
  const filteredEnrollments = useMemo(() => {
    const normalize = (s: any) => String(s || '').toLowerCase();
    return enrollments.filter((e) => {
      const statusRaw = normalize(e?.status || e?.situacao);
      const turmaId = resolveTurmaId(e);
      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'em_andamento' && (statusRaw.includes('andamento') || statusRaw.includes('in_progress')))
        || (statusFilter === 'concluido' && (statusRaw.includes('conclu') || statusRaw.includes('completed')));
      const matchesTurma = turmaFilter === 'todas' || String(turmaId) === String(turmaFilter);
      return matchesStatus && matchesTurma;
    });
  }, [enrollments, statusFilter, turmaFilter]);

  /**
   * resolveCourseId
   * pt-BR: Resolve o id numérico do curso associado a uma matrícula.
   * en-US: Resolves numeric course id associated to an enrollment.
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
   * resolveCourseTitle
   * pt-BR: Resolve o título do curso a partir de campos comuns na matrícula.
   * en-US: Resolves course title from common fields on enrollment.
   */
  function resolveCourseTitle(enroll: any): string {
    return (
      String(enroll?.course_name || enroll?.curso_nome || enroll?.name || '').trim() ||
      `Curso ${String(resolveCourseId(enroll) || enroll?.id || '')}`
    );
  }

  /**
   * resolveProgress
   * pt-BR: Resolve progresso (0–100) com base em campos opcionais.
   * en-US: Resolves progress (0–100) based on optional fields.
   */
  function resolveProgress(enroll: any): number {
    const candidates = [
      (enroll?.preferencias || {})?.progress,
      (enroll?.config || {})?.progress,
      enroll?.progress,
    ];
    for (const v of candidates) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
    }
    return 0;
  }

  /**
   * handleContinueCourse
   * pt-BR: Navega para a página de consumo do curso do aluno.
   * en-US: Navigates to the student course consumption page.
   */
  function handleContinueCourse(enroll: any) {
    ensureCourseSlug(enroll).then((slug) => {
      if (!slug) return;
      navigate(`/aluno/cursos/${String(slug)}`);
    });
  }

  /**
   * handleViewInterestedCourse
   * pt-BR: Visualiza curso de interesse (não matriculado).
   * en-US: View interested course (not enrolled).
   */
  function handleViewInterestedCourse(enroll: any) {
    ensureCourseSlug(enroll).then((slug) => {
      if (!slug) return;
      navigate(`/aluno/cursos/${String(slug)}`);
    });
  }

  /**
   * renderQuickCards
   * pt-BR: Renderiza cards de acesso rápido e resumo do painel do aluno.
   * en-US: Renders quick access and summary cards on the student dashboard.
   */
  function renderQuickCards() {
    const coursesCount = Array.isArray(enrollments) ? enrollments.length : 0;
    const userName = String(user?.name || 'Aluno');
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Meus cursos */}
        <Card className="hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition-all cursor-pointer" onClick={() => navigate('/aluno/cursos')}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <CardTitle className="text-base">Meus cursos</CardTitle>
            </div>
            <CardDescription>Cursos matriculados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold">{coursesCount}</div>
              <Button size="sm" variant="outline">Abrir</Button>
            </div>
          </CardContent>
        </Card>

        {/* Minhas faturas */}
        <Card className="hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition-all cursor-pointer" onClick={() => navigate('/aluno/faturas')}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <CardTitle className="text-base">Minhas faturas</CardTitle>
            </div>
            <CardDescription>Resumo financeiro</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold">—</div>
              <Button size="sm" variant="outline">Abrir</Button>
            </div>
          </CardContent>
        </Card>

        {/* Meus pedidos */}
        <Card className="hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition-all cursor-pointer" onClick={() => navigate('/aluno/pedidos')}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <CardTitle className="text-base">Meus pedidos</CardTitle>
            </div>
            <CardDescription>Vendas/OS vinculadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold">—</div>
              <Button size="sm" variant="outline">Abrir</Button>
            </div>
          </CardContent>
        </Card>

        {/* Minhas notas */}
        <Card className="hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition-all cursor-pointer" onClick={() => navigate('/aluno/notas')}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <CardTitle className="text-base">Minhas notas</CardTitle>
            </div>
            <CardDescription>Média e avaliações</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold">—</div>
              <Button size="sm" variant="outline">Abrir</Button>
            </div>
          </CardContent>
        </Card>

        {/* Perfil */}
        <Card className="hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition-all cursor-pointer" onClick={() => navigate('/aluno/perfil')}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <CardTitle className="text-base">Perfil</CardTitle>
            </div>
            <CardDescription>{userName}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold">—</div>
              <Button size="sm" variant="outline">Abrir</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /**
   * renderEnrollmentCard
   * pt-BR: Card de curso matriculado com progresso e ação continuar.
   * en-US: Enrolled course card with progress and continue action.
   */
  function renderEnrollmentCard(enroll: any) {
    const title = resolveCourseTitle(enroll);
    const progress = resolveProgress(enroll);
    const status = String(enroll?.status || enroll?.situacao || '').trim();
    const hasCertificate = Boolean((enroll?.preferencias || {})?.certificate_url);
    const coverUrl = resolveCoverUrl(enroll);

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
          <CardDescription>Matrícula • acesso ao conteúdo do curso</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeCategory === 'mat' ? (
              <>
                <div className="w-full bg-muted h-2 rounded">
                  <div className="bg-primary h-2 rounded" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-xs text-muted-foreground">Progresso: {progress}%</div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleContinueCourse(enroll)}>Continuar curso</Button>
                  {hasCertificate && (
                    <Button size="sm" variant="outline" onClick={() => window.open((enroll?.preferencias || {})?.certificate_url, '_blank')}>Certificado</Button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleViewInterestedCourse(enroll)}>Ver curso</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * resolveCoverUrl
   * pt-BR: URL da capa do curso, lendo exclusivamente `config.cover.url`.
   * en-US: Course cover URL, reading exclusively `config.cover.url`.
   */
  function resolveCoverUrl(enroll: any): string | null {
    const courseCover = String((enroll?.curso || enroll?.course)?.config?.cover?.url || '').trim();
    if (courseCover) return courseCover;
    const prefsCover = String((enroll?.preferencias || {})?.config?.cover?.url || '').trim();
    if (prefsCover) return prefsCover;
    return null;
  }

  /**
   * resolveCourseSlug
   * pt-BR: Resolve o slug/token do curso a partir da matrícula.
   * en-US: Resolves course slug/token from the enrollment record.
   */
  function resolveCourseSlug(enroll: any): string | undefined {
    const c = enroll?.curso || enroll?.course || {};
    const candidates = [c?.slug, c?.token, enroll?.slug, enroll?.token, enroll?.curso_slug, enroll?.course_slug];
    for (const v of candidates) {
      const s = String(v || '').trim();
      if (s) return s;
    }
    return undefined;
  }

  /**
   * ensureCourseSlug
   * pt-BR: Garante o slug do curso, buscando detalhes por ID quando necessário.
   * en-US: Ensures the course slug, fetching details by ID when needed.
   */
  async function ensureCourseSlug(enroll: any): Promise<string | undefined> {
    const direct = resolveCourseSlug(enroll);
    if (direct) return direct;
    const id = resolveCourseId(enroll);
    if (!id) return undefined;
    try {
      const course = await coursesService.getBySlug(String(id));
      const slug = String((course as any)?.slug || (course as any)?.token || '').trim();
      if (slug) return slug;
    } catch (err) {
      return undefined;
    }
    // Fallback público por ID
    try {
      const coursePublic = await publicCoursesService.getById(String(id));
      const slugPublic = String((coursePublic as any)?.slug || (coursePublic as any)?.token || '').trim();
      if (slugPublic) return slugPublic;
    } catch {}
    return undefined;
  }

  return (
    <InclusiveSiteLayout>
      <div className="container mx-auto p-6 space-y-8">
        {/* Header Personalizado (Banner) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 p-8 shadow-lg text-white">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Olá, {user?.name?.split(' ')[0]}! 👋</h1>
              <p className="text-blue-100 text-lg font-light">Bem-vindo de volta ao seu painel de estudos.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/aluno/cursos')} className="bg-white/20 hover:bg-white/30 text-white border border-white/20 backdrop-blur-sm transition-all shadow-sm">
                <BookOpen className="mr-2 h-4 w-4" /> 
                Meus Cursos
              </Button>
            </div>
          </div>
          {/* Background decoration */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-black/10 blur-2xl pointer-events-none"></div>
        </div>

        {/* Acesso rápido / Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Meus cursos */}
            <Card className="hover:shadow-lg hover:border-violet-300 dark:hover:border-violet-700 transition-all cursor-pointer group bg-white/95 backdrop-blur-sm border-white/20" onClick={() => navigate('/aluno/cursos')}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg group-hover:scale-110 transition-transform">
                    <BookOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <span className="text-2xl font-bold">{filteredEnrollments.length}</span>
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground mt-2">Cursos Matriculados</CardTitle>
              </CardHeader>
            </Card>

            {/* Minhas faturas */}
            <Card className="hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group bg-white/95 backdrop-blur-sm border-white/20" onClick={() => navigate('/aluno/faturas')}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:scale-110 transition-transform">
                    <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-2xl font-bold">—</span>
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground mt-2">Faturas em Aberto</CardTitle>
              </CardHeader>
            </Card>

            {/* Meus pedidos */}
            <Card className="hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer group bg-white/95 backdrop-blur-sm border-white/20" onClick={() => navigate('/aluno/pedidos')}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg group-hover:scale-110 transition-transform">
                    <ShoppingCart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-2xl font-bold">—</span>
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground mt-2">Meus Pedidos</CardTitle>
              </CardHeader>
            </Card>

            {/* Perfil */}
            <Card className="hover:shadow-lg hover:border-amber-300 dark:hover:border-amber-700 transition-all cursor-pointer group bg-white/95 backdrop-blur-sm border-white/20" onClick={() => navigate('/aluno/perfil')}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg group-hover:scale-110 transition-transform">
                    <UserCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground">
                       <span className="sr-only">Editar</span>
                       <span className="text-xs">Editar</span>
                  </Button>
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground mt-2">Meu Perfil</CardTitle>
              </CardHeader>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna Principal - Cursos */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                   <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Continuar Estudando</h2>
                   {/* Filtros poderiam vir aqui */}
                </div>
                
                {filteredEnrollments.length === 0 ? (
                    <Card className="bg-slate-50 border-dashed">
                       <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                          <BookOpen className="h-12 w-12 text-slate-300 mb-4" />
                          <h3 className="text-lg font-medium text-slate-900">Nenhum curso em andamento</h3>
                          <p className="text-slate-500 max-w-sm mt-2">Você ainda não iniciou nenhum curso ou não possui matrículas ativas.</p>
                          <Button className="mt-6" onClick={() => navigate('/cursos')}>Explorar Cursos</Button>
                       </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredEnrollments.map((enroll) => renderEnrollmentCard(enroll))}
                    </div>
                )}
                
                
                {/* Certificados */}
                 <div className="pt-8">
                   <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">Certificados Disponíveis</h2>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {enrollments
                        .filter((e) => {
                          const status = String(e?.status || e?.situacao || '').toLowerCase();
                          const hasUrl = Boolean((e?.preferencias || {})?.certificate_url);
                          return status.includes('conclu') || hasUrl; // status 20 usually
                        })
                        .map((e) => {
                           const title = resolveCourseTitle(e);
                           const url = (e?.preferencias || {})?.certificate_url;
                           const disabled = !url; 
                           
                           return (
                             <Card key={e.id} className="border-l-4 border-l-yellow-400">
                                <CardContent className="p-4 flex items-center justify-between">
                                   <div>
                                      <div className="font-medium line-clamp-1" title={title}>{title}</div>
                                      <div className="text-xs text-muted-foreground mt-1">Concluído em: {new Date().toLocaleDateString()}</div>
                                   </div>
                                    <Button size="icon" variant="ghost" onClick={() => openCertificateInternal(e)} title="Ver Certificado">
                                       <GraduationCap className="h-5 w-5 text-yellow-600" />
                                    </Button>
                                </CardContent>
                             </Card>
                           )
                        })}
                        
                        {enrollments.filter(e => {
                             const status = String(e?.status || e?.situacao || '').toLowerCase();
                             const hasUrl = Boolean((e?.preferencias || {})?.certificate_url);
                             return status.includes('conclu') || hasUrl;
                        }).length === 0 && (
                            <p className="text-sm text-muted-foreground col-span-full">Nenhum certificado disponível ainda.</p>
                        )}
                   </div>
                 </div>
            </div>

            {/* Sidebar - Suporte e Outros */}
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Precisa de Ajuda?</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <Button variant="outline" className="w-full justify-start" asChild>
                            <a href="mailto:suporte@eadcontrol.com">
                               <div className="bg-blue-100 p-1 rounded mr-3 text-blue-600"><UserCircle className="h-4 w-4"/></div>
                               Falar com Suporte
                            </a>
                         </Button>
                         <Button variant="outline" className="w-full justify-start" asChild>
                            <a target="_blank" href={`https://wa.me/${getInstitutionWhatsApp().replace(/\D/g, '') || '5500000000000'}`}>
                               <div className="bg-green-100 p-1 rounded mr-3 text-green-600"><div className="h-4 w-4 font-bold text-xs flex items-center justify-center">WA</div></div>
                               WhatsApp
                            </a>
                         </Button>
                         <Button variant="outline" className="w-full justify-start" asChild>
                            <a href="/docs/faq">
                               <div className="bg-slate-100 p-1 rounded mr-3 text-slate-600"><BookOpen className="h-4 w-4"/></div>
                               Perguntas Frequentes
                            </a>
                         </Button>
                    </CardContent>
                </Card>
                
                {/* Banner Promocional ou Aviso */}
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/10">
                    <h3 className="font-semibold text-primary mb-2">Mantenha seu perfil atualizado</h3>
                    <p className="text-sm text-muted-foreground mb-4">Garanta que seus dados estejam corretos para emissão de certificados.</p>
                    <Button size="sm" onClick={() => navigate('/aluno/perfil')}>Ver meu perfil</Button>
                </div>
            </div>
        </div>
      </div>
    </InclusiveSiteLayout>
  );
}
