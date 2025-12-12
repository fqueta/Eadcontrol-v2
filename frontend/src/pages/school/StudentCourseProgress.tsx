import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEnrollmentsList } from '@/hooks/enrollments';
import { progressService } from '@/services/progressService';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, PauseCircle, PlayCircle } from 'lucide-react';

/**
 * StudentCourseProgress
 * pt-BR: Página de acompanhamento de progresso do curso para o aluno.
 *        Consome o endpoint de currículo por matrícula para calcular progresso.
 * en-US: Course progress tracking page for the student.
 *        Consumes enrollment curriculum endpoint to compute progress.
 */
export default function StudentCourseProgress() {
  /**
   * Route params and navigation
   * pt-BR: Captura o `slug` do curso e id de matrícula via query param `enr`.
   * en-US: Captures course `slug` and enrollment id via `enr` query param.
   */
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const enrParam = searchParams.get('enr');
  const { user } = useAuth();

  /**
   * permission helpers
   * pt-BR: Determina perfil do usuário (admin/aluno) para lógica de acesso.
   * en-US: Determines user profile (admin/student) for access logic.
   */
  const permissionId = Number((user as any)?.permission_id ?? 999);
  const isAdmin = !!user && permissionId < 7;
  const isStudent = !!user && permissionId === 7;

  /**
   * courseQuery
   * pt-BR: Busca curso público por slug para exibir título e validar id.
   * en-US: Fetch public course by slug to show title and validate id.
   */
  const { data: course } = useQuery({
    queryKey: ['courses', 'progress', 'public-by-slug', slug],
    queryFn: async () => {
      if (!slug) return null;
      // Nota: usar serviço público é suficiente para título e id
      const { publicCoursesService } = await import('@/services/publicCoursesService');
      return publicCoursesService.getBySlug(String(slug));
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  /**
   * courseNumericId
   * pt-BR: Id numérico do curso usado para resolver matrícula quando `enr` não for fornecido.
   * en-US: Numeric course id to resolve enrollment when `enr` is not provided.
   */
  const courseNumericId = useMemo(() => {
    const cid = (course as any)?.id;
    const num = Number(cid);
    return Number.isFinite(num) ? num : undefined;
  }, [course]);

  /**
   * clientNumericId
   * pt-BR: Extrai id do cliente do usuário (id_cliente/client_id/cliente_id).
   * en-US: Extracts client id from user (id_cliente/client_id/cliente_id).
   */
  const clientNumericId = useMemo(() => {
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
   * enrollmentsQuery
   * pt-BR: Quando `enr` não for informado, tenta resolver matrícula do usuário para o curso.
   * en-US: When `enr` is not provided, tries to resolve user's enrollment for the course.
   */
  const { data: enrollmentsResp } = useEnrollmentsList(
    { page: 1, per_page: 1, id_curso: courseNumericId, id_cliente: clientNumericId, public: '1', situacao: 'mat' } as any,
    { enabled: isStudent && !!courseNumericId && !enrParam }
  );

  /**
   * enrollmentId
   * pt-BR: Id da matrícula obtido da query ou da API.
   * en-US: Enrollment id from query or API.
   */
  const enrollmentId = useMemo(() => {
    if (enrParam) {
      const n = Number(enrParam);
      return Number.isFinite(n) ? n : enrParam;
    }
    const arr = (enrollmentsResp as any)?.data || (enrollmentsResp as any)?.items || [];
    const first = Array.isArray(arr) ? arr[0] : undefined;
    const candidate = first?.id || first?.id_matricula || first?.matricula_id;
    const asNum = Number(candidate);
    return Number.isFinite(asNum) ? asNum : candidate;
  }, [enrParam, enrollmentsResp]);

  /**
   * curriculumQuery
   * pt-BR: Carrega o currículo por matrícula para calcular o progresso.
   * en-US: Loads enrollment curriculum to compute progress.
   */
  const { data: curriculum, isLoading } = useQuery({
    queryKey: ['enrollment-curriculum', enrollmentId],
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
   * nextActivity
   * pt-BR: Determina próxima atividade com base em `needs_resume` ou primeira não concluída.
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
   * goToCourse
   * pt-BR: Navega para consumo do curso.
   * en-US: Navigates to course consumption.
   */
  const goToCourse = () => {
    if (!slug) return;
    navigate(`/aluno/cursos/${String(slug)}`);
  };

  /**
   * renderActivityItem
   * pt-BR: Renderiza linha de atividade com status.
   * en-US: Renders activity row with status.
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
      </div>
    );
  }

  return (
    <InclusiveSiteLayout>
      <div className="container mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Acompanhamento de Progresso</h1>
          <p className="text-muted-foreground">{String((course as any)?.titulo || (course as any)?.nome || slug || '')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
            <CardDescription>Progresso baseado no currículo da matrícula</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="text-muted-foreground">Carregando progresso...</div>
            )}
            {!isLoading && (
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
                <div className="flex gap-2">
                  <Button size="sm" onClick={goToCourse}>Continuar curso</Button>
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
    </InclusiveSiteLayout>
  );
}