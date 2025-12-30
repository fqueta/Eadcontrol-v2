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
      (user as any)?.id_cliente,
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
    const arr = (enrollmentsResp?.data || enrollmentsResp?.items || []) as any[];
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
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <CardTitle className="text-base">Meus cursos</CardTitle>
            </div>
            <CardDescription>Cursos matriculados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold">{coursesCount}</div>
              <Button size="sm" variant="outline" onClick={() => navigate('/aluno/cursos')}>Abrir</Button>
            </div>
          </CardContent>
        </Card>

        {/* Minhas faturas */}
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              <CardTitle className="text-base">Minhas faturas</CardTitle>
            </div>
            <CardDescription>Resumo financeiro</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold">—</div>
              <Button size="sm" variant="outline" onClick={() => navigate('/aluno/faturas')}>Abrir</Button>
            </div>
          </CardContent>
        </Card>

        {/* Meus pedidos */}
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <CardTitle className="text-base">Meus pedidos</CardTitle>
            </div>
            <CardDescription>Vendas/OS vinculadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold">—</div>
              <Button size="sm" variant="outline" onClick={() => navigate('/aluno/pedidos')}>Abrir</Button>
            </div>
          </CardContent>
        </Card>

        {/* Minhas notas */}
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              <CardTitle className="text-base">Minhas notas</CardTitle>
            </div>
            <CardDescription>Média e avaliações</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold">—</div>
              <Button size="sm" variant="outline" onClick={() => navigate('/aluno/notas')}>Abrir</Button>
            </div>
          </CardContent>
        </Card>

        {/* Perfil */}
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <UserCircle className="w-4 h-4" />
              <CardTitle className="text-base">Perfil</CardTitle>
            </div>
            <CardDescription>{userName}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold">—</div>
              <Button size="sm" variant="outline" onClick={() => navigate('/aluno/perfil')}>Abrir</Button>
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
      <div className="container mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minha área</h1>
          <p className="text-muted-foreground">Painel do aluno • cursos e progresso</p>
        </div>

        {/* Acesso rápido / Resumo */}
        <Card>
          <CardHeader>
            <CardTitle>Acesso rápido</CardTitle>
            <CardDescription>Atalhos e resumo das suas informações</CardDescription>
          </CardHeader>
          <CardContent>
            {renderQuickCards()}
          </CardContent>
        </Card>

        {/* Meus cursos foi movido para página dedicada /aluno/cursos */}

        {/* Próximas atividades */}
        <Card>
          <CardHeader>
            <CardTitle>Próximas atividades</CardTitle>
            <CardDescription>Continue de onde parou, por curso/turma</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredEnrollments.length === 0 && (
              <div className="text-muted-foreground">Nenhuma atividade pendente com os filtros atuais.</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEnrollments.map((enroll) => (
                <div key={String(enroll?.id || Math.random())} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex flex-col">
                    <span className="font-medium">{resolveCourseTitle(enroll)}</span>
                    {resolveTurmaName(enroll) && (
                      <span className="text-xs text-muted-foreground">{resolveTurmaName(enroll)}</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={async () => {
                      const slug = await ensureCourseSlug(enroll);
                      if (!slug) {
                        toast({
                          title: 'Não foi possível abrir o curso',
                          description: 'Este curso não possui um slug identificável no momento.',
                          variant: 'destructive',
                        });
                        return;
                      }
                      handleContinueCourse(enroll);
                    }}
                  >
                    Continuar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Meus certificados */}
        <Card>
          <CardHeader>
            <CardTitle>Meus certificados</CardTitle>
            <CardDescription>Visualize e faça download, quando disponíveis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {enrollments
                .filter((e) => {
                  const status = String(e?.status || e?.situacao || '').toLowerCase();
                  const hasUrl = Boolean((e?.preferencias || {})?.certificate_url);
                  return status.includes('conclu') || hasUrl;
                })
                .map((e) => {
                  const title = resolveCourseTitle(e);
                  const url = (e?.preferencias || {})?.certificate_url;
                  const disabled = !url;
                  return (
                    <div key={String(e?.id || Math.random())} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex flex-col">
                        <span className="font-medium">{title}</span>
                        <span className="text-xs text-muted-foreground">Certificado</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="default" onClick={() => openCertificateInternal(e)}>Ver certificado</Button>
                        <Button size="sm" variant={disabled ? 'outline' : 'secondary'} disabled={disabled} onClick={() => openCertificateExternal(e)}>
                          {disabled ? 'Indisponível' : 'Abrir URL' }
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const blob = await certificatesService.generatePdf(e.id);
                              const objectUrl = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = objectUrl;
                              a.download = `certificado_${String(e.id)}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(objectUrl);
                              toast({ title: 'Certificado gerado', description: 'Download iniciado com sucesso.' });
                            } catch (err: any) {
                              toast({
                                title: 'Falha ao gerar certificado',
                                description: String(err?.message || 'Tente novamente mais tarde.'),
                                variant: 'destructive',
                              });
                            }
                          }}
                        >
                          Solicitar PDF
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Suporte / FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Suporte e FAQ</CardTitle>
            <CardDescription>Encontre ajuda rápida e contato</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 border rounded">
                <div className="font-medium mb-1">Central de ajuda</div>
                <Button asChild variant="outline" size="sm"><a target="_blank" href="/docs/faq">Abrir FAQ</a></Button>
              </div>
              <div className="p-3 border rounded">
                <div className="font-medium mb-1">Contato</div>
                <Button asChild variant="outline" size="sm"><a href="mailto:suporte@eadcontrol.com">Enviar e-mail</a></Button>
              </div>
              <div className="p-3 border rounded">
                <div className="font-medium mb-1">WhatsApp</div>
                <Button asChild variant="outline" size="sm"><a target="_blank" href="https://wa.me/5500000000000">Abrir WhatsApp</a></Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Perfil do aluno */}
        <Card>
          <CardHeader>
            <CardTitle>Perfil do aluno</CardTitle>
            <CardDescription>Atualize seus dados e senha</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate('/loja/area-cliente?tab=settings')} variant="outline">Atualizar cadastro</Button>
              <Button onClick={() => navigate('/reset-password')} variant="outline">Alterar senha</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </InclusiveSiteLayout>
  );
}
