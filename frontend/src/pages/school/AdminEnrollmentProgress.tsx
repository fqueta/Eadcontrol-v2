import { useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, PauseCircle, PlayCircle, Printer, ArrowLeft, BookOpen, Clock, TrendingUp, Award, Calendar, ArrowRight } from 'lucide-react';
import { progressService } from '@/services/progressService';
// Breadcrumbs UI
// pt-BR: Importa componentes de trilha de navegação para exibir breadcrumbs no topo da página.
// en-US: Imports breadcrumb UI components to render navigation trail at the top of the page.
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';

/**
 * AdminEnrollmentProgress
 * pt-BR: Página de detalhamento de progresso por matrícula (admin), baseada
 *        na página do aluno, porém usando o layout de admin (via AppLayout na rota).
 * en-US: Admin enrollment progress detail page, mirroring student page but
 *        rendered within admin layout (route wraps with AppLayout).
 */
export default function AdminEnrollmentProgress() {
  /**
   * Route params and navigation
   * pt-BR: Captura o `id` da matrícula via parâmetro de rota.
   * en-US: Captures enrollment `id` from route params.
   */
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const enrollmentId = id ? Number(id) : undefined;

  /**
   * curriculumQuery
   * pt-BR: Carrega currículo consolidado por matrícula para calcular progresso.
   * en-US: Loads consolidated curriculum by enrollment to compute progress.
   */
  const { data: curriculum, isLoading } = useQuery({
    queryKey: ['admin-enrollment-curriculum', enrollmentId],
    enabled: Boolean(enrollmentId),
    queryFn: async () => {
      if (!enrollmentId) return null;
      return progressService.getEnrollmentCurriculum(enrollmentId);
    },
    staleTime: 2 * 60 * 1000,
  });

  /**
   * progress helpers
   * pt-BR: Calcula totais e porcentagens de progresso.
   * en-US: Computes totals and progress percentages.
   */
  const { total, completed, percent } = useMemo(() => {
    const mods: any[] = Array.isArray((curriculum as any)?.curriculum) ? (curriculum as any).curriculum : [];
    let t = 0; let c = 0;
    mods.forEach((m: any) => {
      const acts: any[] = Array.isArray(m?.atividades) ? m.atividades : [];
      acts.forEach((a: any) => { t += 1; if (a?.completed) c += 1; });
    });
    const pct = t > 0 ? Math.round((c / t) * 100) : 0;
    return { total: t, completed: c, percent: pct };
  }, [curriculum]);

  /**
   * nextActivityTitle
   * pt-BR: Determina próxima atividade sugerida com base em `needs_resume` ou primeira não concluída.
   * en-US: Determines next activity based on `needs_resume` or first not completed.
   */
  const nextActivityTitle = useMemo(() => {
    const mods: any[] = Array.isArray((curriculum as any)?.curriculum) ? (curriculum as any).curriculum : [];
    const acts: any[] = [];
    mods.forEach((m: any) => {
      const arr = Array.isArray(m?.atividades) ? m.atividades : [];
      arr.forEach((a: any) => acts.push({ m, a }));
    });
    const resume = acts.find((it) => Boolean(it.a?.needs_resume) && !Boolean(it.a?.completed));
    const firstPending = acts.find((it) => !Boolean(it.a?.completed));
    const chosen = resume || firstPending;
    return chosen ? String(chosen.a?.titulo || chosen.a?.title || '') : '';
  }, [curriculum]);

  /**
   * renderActivityItem
   * pt-BR: Renderiza item de atividade com status e segundos (quando disponível).
   * en-US: Renders activity item with status and seconds (when available).
   */
  function renderActivityItem(m: any, a: any, idx: number) {
    const title = String(a?.titulo || a?.title || `Atividade ${idx + 1}`);
    const status = a?.completed ? 'Concluída' : (a?.needs_resume ? 'Retomar' : 'Pendente');
    const Icon = a?.completed ? CheckCircle2 : (a?.needs_resume ? PlayCircle : PauseCircle);
    const badgeVariant = a?.completed ? 'default' : (a?.needs_resume ? 'secondary' : 'outline');
    const opacityClass = a?.completed ? 'opacity-60' : '';
    
    return (
      <div className={`flex items-center justify-between p-4 ${opacityClass}`}>
        <div className="flex items-center gap-4">
           <div className={`p-2 rounded-full ${a?.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
              <Icon className="h-5 w-5" />
           </div>
           <div>
              <div className="font-bold text-sm text-foreground">{title}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                 {Number(a?.seconds || 0) > 0 && (
                    <span className="flex items-center gap-1 bg-muted/40 px-1.5 py-0.5 rounded text-[10px]">
                       <Clock className="h-3 w-3" /> {Math.round(Number(a.seconds))}s
                    </span>
                 )}
                 {a?.tipo && <span className="uppercase text-[10px] tracking-wider font-bold">{a.tipo}</span>}
              </div>
           </div>
        </div>
        <div className="flex items-center gap-2">
          {a?.completed ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 px-3 py-1">
                 <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Concluída
              </Badge>
          ) : a?.needs_resume ? (
              <Badge variant="secondary" className="px-3 py-1 bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200">
                 <PlayCircle className="h-3.5 w-3.5 mr-1.5" /> Retomar
              </Badge>
          ) : (
              <Badge variant="outline" className="text-muted-foreground border-dashed">
                 Pendente
              </Badge>
          )}
        </div>
      </div>
    );
  }

  /**
   * handlePrint
   * pt-BR: Dispara impressão da página.
   * en-US: Triggers printing of the page.
   */
  const handlePrint = () => {
    try { window.print(); } catch {}
  };

  /**
   * handleBack
   * pt-BR: Volta para a lista de progresso do curso, preservando filtros quando disponíveis.
   *        Usa estado de navegação (returnTo) ou deriva do currículo (course_id).
   * en-US: Goes back to the course progress list, preserving filters when available.
   *        Uses navigation state (returnTo) or derives from curriculum (course_id).
   */
  const handleBack = () => {
    // Prefer query params if present (shared link preserves filters)
    const cidQ = searchParams.get('id_curso');
    const tidQ = searchParams.get('id_turma');
    const searchQ = searchParams.get('search');
    if (cidQ || tidQ || searchQ) {
      const params = new URLSearchParams();
      if (cidQ) params.set('id_curso', cidQ);
      if (tidQ) params.set('id_turma', tidQ);
      if (searchQ && searchQ.trim()) params.set('search', searchQ.trim());
      navigate(`/admin/school/courses/${cidQ || 'curso'}/progress?${params.toString()}`);
      return;
    }
    const state = (location.state || {}) as any;
    const returnTo: string | undefined = state?.returnTo;
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    const courseId = String((curriculum as any)?.course_id || '');
    if (courseId) {
      const params = new URLSearchParams({ id_curso: courseId });
      navigate(`/admin/school/courses/${courseId}/progress?${params.toString()}`);
      return;
    }
    navigate(-1);
  };

  const courseTitle = String((curriculum as any)?.course_title || '');
  const studentName = String((curriculum as any)?.student_name || '');

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-8 animate-in fade-in duration-500">
      {/*
       * Breadcrumbs
       * pt-BR: Trilhas de navegação para clareza, preservando filtros via URL.
       * en-US: Navigation breadcrumbs for clarity, preserving filters via URL.
       */}
      <Breadcrumb className="bg-muted/30 px-4 py-2 rounded-lg border w-fit">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/school/courses" className="hover:text-primary transition-colors font-medium">Escola</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            {(() => {
              const cidQ = searchParams.get('id_curso');
              const tidQ = searchParams.get('id_turma');
              const searchQ = searchParams.get('search');
              const params = new URLSearchParams();
              if (cidQ) params.set('id_curso', cidQ);
              if (tidQ) params.set('id_turma', tidQ);
              if (searchQ && searchQ.trim()) params.set('search', searchQ.trim());
              const href = `/admin/school/courses/${cidQ || 'curso'}/progress?${params.toString()}`;
              return <BreadcrumbLink href={href} className="hover:text-primary transition-colors font-medium">Progresso</BreadcrumbLink>;
            })()}
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-bold text-primary">Matrícula {String(enrollmentId ?? '')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-foreground">Progresso da Matrícula #{String(enrollmentId ?? '')}</h1>
          <div className="flex flex-wrap items-center gap-3 text-muted-foreground pt-1">
             {studentName && (
               <Badge variant="outline" className="text-sm font-medium px-3 py-1 bg-background">
                  Aluno: <span className="font-bold text-foreground ml-1">{studentName}</span>
               </Badge>
             )}
             {courseTitle && (
                <Badge variant="outline" className="text-sm font-medium px-3 py-1 bg-background">
                   Curso: <span className="font-bold text-foreground ml-1">{courseTitle}</span>
                </Badge>
             )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleBack} title="Voltar" className="border-muted-foreground/20 hover:bg-muted font-semibold shadow-sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <Button size="sm" onClick={handlePrint} title="Imprimir" className="font-bold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90">
             <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-muted/60 bg-muted/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Atividades</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">Conteúdos no currículo</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted/60 bg-muted/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{completed}</div>
            <p className="text-xs text-muted-foreground">Atividades finalizadas</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted/60 bg-muted/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progresso Geral</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{percent}%</div>
            <div className="h-2 w-full bg-muted rounded-full mt-2 overflow-hidden">
               <div className="h-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-emerald-500/20 bg-emerald-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">Próximo Passo</CardTitle>
            <PlayCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
             {nextActivityTitle ? (
               <>
                 <div className="text-sm font-bold text-emerald-900 line-clamp-2 min-h-[2.5rem] leading-tight flex items-center">
                    {nextActivityTitle}
                 </div>
                 <p className="text-xs text-emerald-600/80 mt-1 flex items-center gap-1 font-medium">
                    Continuar agora <ArrowRight className="h-3 w-3" />
                 </p>
               </>
             ) : (
                <>
                 <div className="text-sm font-bold text-muted-foreground">Concluído!</div>
                 <p className="text-xs text-muted-foreground mt-1">Todas as atividades finalizadas</p>
                </>
             )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold tracking-tight px-1">Curriculum Detalhado</h2>
        
        {Array.isArray((curriculum as any)?.curriculum) && (curriculum as any).curriculum.length > 0 ? (
          <div className="space-y-6">
            {(curriculum as any).curriculum.map((m: any, mi: number) => {
               const activities = Array.isArray(m?.atividades) ? m.atividades : [];
               const completedCount = activities.filter((a: any) => a?.completed).length;
               const totalCount = activities.length;
               const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
               
               return (
                <div key={mi} className="border rounded-xl overflow-hidden bg-card shadow-sm transition-all hover:shadow-md">
                  <div className="bg-muted/30 px-6 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                           <span className="bg-primary/10 text-primary text-xs font-black px-2 py-0.5 rounded uppercase tracking-wider">Módulo {mi + 1}</span>
                           {String(m?.titulo || m?.title || '')}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 ml-1 pl-0.5">
                           {completedCount} de {totalCount} atividades concluídas
                        </p>
                    </div>
                    <div className="flex items-center gap-4 min-w-[200px]">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                           <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-sm font-bold text-muted-foreground w-12 text-right">{progress}%</span>
                    </div>
                  </div>
                  
                  <div className="divide-y">
                    {activities.length > 0 ? (
                      activities.map((a: any, ai: number) => (
                        <div key={`${mi}-${ai}`} className="group hover:bg-muted/20 transition-colors">
                           {renderActivityItem(m, a, ai)}
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-muted-foreground/50 text-sm italic">
                        Nenhuma atividade neste módulo.
                      </div>
                    )}
                  </div>
                </div>
               );
            })}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/5">
            <BookOpen className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-lg font-medium text-muted-foreground">Currículo não disponível</p>
            <p className="text-sm text-muted-foreground/60">Não foi possível carregar os detalhes desta matrícula.</p>
          </div>
        )}
      </div>
    </div>
  );
}