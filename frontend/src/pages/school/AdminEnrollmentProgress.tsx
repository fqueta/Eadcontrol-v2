import { useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, PauseCircle, PlayCircle, Printer, ArrowLeft } from 'lucide-react';
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
    const Icon = a?.completed ? CheckCircle2 : (a?.needs_resume ? PauseCircle : PlayCircle);
    const badgeVariant = a?.completed ? 'default' : (a?.needs_resume ? 'secondary' : 'outline');
    return (
      <div className="flex items-center justify-between p-2 border rounded-md">
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{String(m?.titulo || m?.title || '')}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={badgeVariant as any} className={a?.completed ? 'bg-emerald-600' : ''}>
            <Icon className="h-4 w-4 mr-1" /> {status}
          </Badge>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          {Number(a?.seconds || 0) > 0 ? `${Math.round(Number(a.seconds))}s` : ''}
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
    <div className="container mx-auto p-4 space-y-6">
      {/*
       * Breadcrumbs
       * pt-BR: Trilhas de navegação para clareza, preservando filtros via URL.
       * en-US: Navigation breadcrumbs for clarity, preserving filters via URL.
       */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/school/courses">Escola</BreadcrumbLink>
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
              return <BreadcrumbLink href={href}>Progresso</BreadcrumbLink>;
            })()}
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Matrícula {String(enrollmentId ?? '')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Progresso da matrícula #{String(enrollmentId ?? '')}</h1>
          <p className="text-muted-foreground">{studentName ? `Aluno: ${studentName}` : ''}{courseTitle ? ` • Curso: ${courseTitle}` : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleBack} title="Voltar"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
          <Button size="sm" onClick={handlePrint} title="Imprimir"><Printer className="h-4 w-4 mr-1" /> Imprimir</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
          <CardDescription>Progresso baseado no currículo da matrícula</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground">Carregando progresso...</div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant="outline">Atividades: {total}</Badge>
                <Badge variant="default">Concluídas: {completed}</Badge>
                <Badge variant="secondary">Progresso: {percent}%</Badge>
              </div>
              {nextActivityTitle && (
                <div className="text-sm text-muted-foreground">Próxima atividade: {nextActivityTitle}</div>
              )}
              <div className="w-full bg-muted h-2 rounded">
                <div className="bg-primary h-2 rounded" style={{ width: `${percent}%` }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Módulos e atividades</CardTitle>
          <CardDescription>Lista detalhada por módulo</CardDescription>
        </CardHeader>
        <CardContent>
          {Array.isArray((curriculum as any)?.curriculum) && (curriculum as any).curriculum.length > 0 ? (
            <div className="space-y-3">
              {(curriculum as any).curriculum.map((m: any, mi: number) => (
                <div key={mi} className="space-y-2">
                  <div className="font-semibold">{String(m?.titulo || m?.title || `Módulo ${mi + 1}`)}</div>
                  <div className="space-y-2">
                    {Array.isArray(m?.atividades) && m.atividades.length > 0 ? (
                      m.atividades.map((a: any, ai: number) => (
                        <div key={`${mi}-${ai}`}>{renderActivityItem(m, a, ai)}</div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">Sem atividades</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">Currículo não disponível para a matrícula.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}