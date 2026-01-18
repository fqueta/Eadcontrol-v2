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
  return (
    <InclusiveSiteLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-black/50 py-8 transition-colors duration-500">
        <div className="container mx-auto px-4 space-y-8">
          
          {/* Premium Header */}
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary via-blue-600 to-indigo-700 text-white shadow-xl">
             <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
             <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />
             <div className="relative z-10 px-8 py-10 md:py-12">
                <div className="flex flex-col gap-2">
                   <div className="flex items-center gap-2 text-blue-100 text-sm font-medium uppercase tracking-wider">
                      <span className="bg-white/10 px-2 py-0.5 rounded text-xs">Progresso</span>
                      <span>•</span>
                      <span>Acompanhamento</span>
                   </div>
                   <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight drop-shadow-md">
                      {String((course as any)?.titulo || (course as any)?.nome || slug || '')}
                   </h1>
                   <div className="flex items-center gap-2 mt-2">
                      <Button 
                         onClick={goToCourse}
                         className="bg-white text-primary hover:bg-blue-50 font-semibold shadow-sm border-0 rounded-md"
                         size="sm"
                      >
                         <PlayCircle className="w-4 h-4 mr-2" /> Continuar cursando
                      </Button>
                   </div>
                </div>
             </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
             {/* Left Column: Summary & Stats */}
             <div className="md:col-span-1 space-y-6">
                <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden rounded-lg">
                   <CardHeader className="bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-800/50 pb-4">
                      <CardTitle className="text-primary dark:text-blue-300">Resumo Geral</CardTitle>
                      <CardDescription>Status atual do seu aprendizado</CardDescription>
                   </CardHeader>
                   <CardContent className="pt-6 space-y-6">
                      {isLoading && (
                         <div className="flex justify-center py-4">
                            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full"></div>
                         </div>
                      )}
                      {!isLoading && (
                         <>
                           <div className="flex flex-col items-center justify-center py-2">
                              <div className="relative w-32 h-32 flex items-center justify-center">
                                 <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                       className="text-slate-100 dark:text-slate-800"
                                       strokeWidth="10"
                                       stroke="currentColor"
                                       fill="transparent"
                                       r="58"
                                       cx="64"
                                       cy="64"
                                    />
                                    <circle
                                       className="text-primary dark:text-blue-500 transition-all duration-1000 ease-out"
                                       strokeWidth="10"
                                       strokeDasharray={365}
                                       strokeDashoffset={365 - (365 * percent) / 100}
                                       strokeLinecap="round"
                                       stroke="currentColor"
                                       fill="transparent"
                                       r="58"
                                       cx="64"
                                       cy="64"
                                    />
                                 </svg>
                                 <div className="absolute inset-0 flex flex-col items-center justify-center text-primary dark:text-white">
                                    <span className="text-3xl font-bold">{percent}%</span>
                                 </div>
                              </div>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-4">
                              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                                 <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{completed}</div>
                                 <div className="text-xs text-muted-foreground uppercase tracking-wide">Concluídas</div>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                                 <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{total}</div>
                                 <div className="text-xs text-muted-foreground uppercase tracking-wide">Total</div>
                              </div>
                           </div>

                           {nextActivityTitle && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                 <div className="text-xs font-semibold text-primary dark:text-blue-300 uppercase mb-1">Próxima Atividade</div>
                                 <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                                    {nextActivityTitle}
                                 </div>
                                 <Button 
                                    size="sm" 
                                    className="w-full mt-3 bg-primary hover:bg-blue-700 text-white shadow-sm rounded-md"
                                    onClick={goToCourse}
                                 >
                                    Ir para atividade
                                 </Button>
                              </div>
                           )}
                         </>
                      )}
                   </CardContent>
                </Card>
             </div>

             {/* Right Column: Detailed List */}
             <div className="md:col-span-2">
                <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 h-full rounded-lg">
                   <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                      <CardTitle>Histórico Detalhado</CardTitle>
                      <CardDescription>Acompanhe cada etapa da sua jornada</CardDescription>
                   </CardHeader>
                   <CardContent className="pt-6">
                      {Array.isArray((curriculum as any)?.curriculum) && (curriculum as any).curriculum.length > 0 ? (
                        <div className="space-y-8">
                           {(curriculum as any).curriculum.map((m: any, mi: number) => (
                              <div key={mi} className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 last:border-0 pb-2">
                                 <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900 border-2 border-primary" />
                                 <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 leading-none">
                                    {String(m?.titulo || m?.title || `Módulo ${mi + 1}`)}
                                 </h3>
                                 <div className="space-y-3">
                                    {Array.isArray(m?.atividades) && m.atividades.length > 0 ? (
                                       m.atividades.map((a: any, ai: number) => (
                                          <div key={`${mi}-${ai}`} className="group">
                                             {renderActivityItem(m, a, ai)}
                                          </div>
                                       ))
                                    ) : (
                                       <div className="text-sm text-muted-foreground italic pl-2">Sem atividades neste módulo</div>
                                    )}
                                 </div>
                              </div>
                           ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                           <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-2xl">📋</div>
                           <p className="text-muted-foreground">O currículo detalhado não está disponível para esta matrícula.</p>
                        </div>
                      )}
                   </CardContent>
                </Card>
             </div>
          </div>

        </div>
      </div>
    </InclusiveSiteLayout>
  );
}

function renderActivityItem(m: any, a: any, idx: number) {
    const title = String(a?.titulo || a?.title || `Atividade ${idx + 1}`);
    const status = a?.completed ? 'Concluída' : (a?.needs_resume ? 'Em andamento' : 'Pendente');
    const Icon = a?.completed ? CheckCircle2 : (a?.needs_resume ? PauseCircle : PlayCircle);
    
    // Premium row styling
    return (
       <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 hover:border-primary/30 dark:hover:border-blue-800 transition-colors">
          <div className="flex items-center gap-3">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${a?.completed ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : (a?.needs_resume ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-slate-200 text-slate-400 dark:bg-slate-800')}`}>
                <Icon className="w-4 h-4" />
             </div>
             <div>
                <div className={`font-medium text-sm ${a?.completed ? 'text-slate-600 dark:text-slate-400 line-through decoration-slate-400/50' : 'text-slate-900 dark:text-slate-200'}`}>
                   {title}
                </div>
             </div>
          </div>
          <div>
             <Badge 
                variant={a?.completed ? 'default' : (a?.needs_resume ? 'secondary' : 'outline')} 
                className={`${a?.completed ? 'bg-emerald-600 hover:bg-emerald-700' : (a?.needs_resume ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700')}`}
             >
                {status}
             </Badge>
          </div>
       </div>
    );
}