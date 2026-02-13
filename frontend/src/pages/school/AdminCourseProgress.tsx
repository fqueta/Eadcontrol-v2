import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
// Admin pages are wrapped by AppLayout via routing; avoid site layout.
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Users, GraduationCap, ChevronRight, BookOpen, CheckCircle2, Clock } from 'lucide-react';
import { useEnrollmentsList } from '@/hooks/enrollments';
import { progressService } from '@/services/progressService';
import { Input } from '@/components/ui/input';
import { coursesService } from '@/services/coursesService';
import { useTurmasList } from '@/hooks/turmas';
import { Combobox, useComboboxOptions } from '@/components/ui/combobox';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

/**
 * AdminCourseProgress
 * pt-BR: Página para administradores acompanharem o progresso de todos os alunos
 *         de um curso (e opcionalmente de uma turma), substituindo o modal atual.
 * en-US: Admin page to track progress for all students of a course
 *         (optionally filtered by a class), replacing the current modal.
 */
export default function AdminCourseProgress() {
  /**
   * search params
   * pt-BR: Lê filtros de `id_curso`, `id_turma` e `search` via query string.
   * en-US: Reads `id_curso`, `id_turma`, and `search` filters from query string.
   */
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const idCurso = searchParams.get('id_curso');
  const idTurma = searchParams.get('id_turma');
  const search = searchParams.get('search') || undefined;

  /**
   * local filters state
   * pt-BR: Mantém estado local para curso, turma e busca, inicializando pela URL.
   * en-US: Keeps local state for course, class and search, initialized from URL.
   */
  const [selectedCourseId, setSelectedCourseId] = useState<string>(String(idCurso || ''));
  const [selectedClassId, setSelectedClassId] = useState<string>(String(idTurma || ''));
  const [searchTerm, setSearchTerm] = useState<string>(String(search || ''));

  /**
   * syncToUrl
   * pt-BR: Sincroniza filtros locais com a URL e, por consequência, com a listagem.
   * en-US: Synchronizes local filters to the URL and thus the listing.
   */
  const syncToUrl = (courseId?: string, classId?: string, s?: string) => {
    const params = new URLSearchParams();
    const cid = String(courseId ?? selectedCourseId ?? '');
    const tid = String(classId ?? selectedClassId ?? '');
    const q = String(s ?? searchTerm ?? '');
    if (cid) params.set('id_curso', cid);
    if (tid) params.set('id_turma', tid);
    if (q.trim()) params.set('search', q.trim());
    navigate(`/admin/school/courses/${cid || 'curso'}/progress?${params.toString()}`);
  };

  /**
   * listQuery
   * pt-BR: Busca matrículas do curso/turma selecionados. Limita por página para
   *         evitar excesso de chamadas (ajuste conforme necessidade).
   * en-US: Lists enrollments for the selected course/class. Limits per-page to
   *         avoid request overload (adjust as needed).
   */
  const enrollmentsQuery = useEnrollmentsList(
    { page: 1, per_page: 100, id_curso: idCurso ? Number(idCurso) : undefined, id_turma: idTurma ? Number(idTurma) : undefined, search, situacao: 'mat' } as any,
    { enabled: !!idCurso }
  );
  const enrollmentsResp = enrollmentsQuery.data;
  const isLoading = enrollmentsQuery.isPending;
  const isFetching = enrollmentsQuery.isFetching;

  /**
   * coursesQuery/classesQuery
   * pt-BR: Alimenta os filtros visuais de curso e turma.
   * en-US: Provides data for course and class visual filters.
   */
  const coursesQuery = useQuery({
    queryKey: ['cursos', 'list', 200, ''],
    queryFn: async () => coursesService.listCourses({ page: 1, per_page: 200 }),
    staleTime: 5 * 60 * 1000,
  });
  const courseItems = (coursesQuery.data?.data || []) as any[];
  const courseOptions = useComboboxOptions(courseItems, 'id', 'nome', undefined, (c: any) => String(c?.titulo || ''));

  const classesQuery = useTurmasList({ page: 1, per_page: 200, id_curso: selectedCourseId ? Number(selectedCourseId) : undefined } as any, {
    staleTime: 5 * 60 * 1000,
  });
  const classItems = (classesQuery.data?.data || []) as any[];
  const classOptions = useComboboxOptions(classItems, 'id', 'nome', undefined, (t: any) => String(t?.token || ''));

  /**
   * enrollments
   * pt-BR: Normaliza resposta paginada (data/items) para um array simples.
   * en-US: Normalizes paginated response (data/items) into a simple array.
   */
  const enrollments = useMemo(() => {
    const arr = (enrollmentsResp as any)?.data || [];
    return Array.isArray(arr) ? arr : [];
  }, [enrollmentsResp]);

  /**
   * EnrollmentRow
   * pt-BR: Componente de linha que consulta o currículo por matrícula e exibe
   *         totais e porcentagem. Mantém chamadas isoladas por matrícula.
   * en-US: Row component that fetches curriculum by enrollment and displays
   *         totals and percentage. Keeps per-enrollment isolated calls.
   */
  function EnrollmentRow({ enroll }: { enroll: any }) {
    const enrollmentId = String(enroll?.id ?? '');

    // Resolve basic display fields
    const studentName = String(
      enroll?.cliente_nome || enroll?.student_name || enroll?.aluno_nome || enroll?.cliente || enroll?.aluno || '-'
    );
    const courseName = String(
      enroll?.curso_nome || enroll?.course_name || (enroll?.curso ? (enroll?.curso?.nome || enroll?.curso?.titulo) : '') || '-'
    );
    const className = String(
      enroll?.turma_nome || (enroll?.turma ? (enroll?.turma?.nome || enroll?.turma?.titulo) : '') || ''
    );

    /**
     * curriculumQuery
     * pt-BR: Busca o currículo consolidado por matrícula para calcular progresso.
     * en-US: Fetches consolidated curriculum by enrollment to compute progress.
     */
    const { data: curriculum, isLoading: loadingCurr } = useQuery({
      queryKey: ['admin', 'enrollment-curriculum', enrollmentId],
      enabled: Boolean(enrollmentId),
      queryFn: async () => progressService.getEnrollmentCurriculum(enrollmentId),
      staleTime: 2 * 60 * 1000,
    });

    /**
     * progress helpers
     * pt-BR: Calcula número de atividades, concluídas e porcentagem.
     * en-US: Computes activities count, completed count, and percentage.
     */
    const totals = useMemo(() => {
      const mods: any[] = Array.isArray((curriculum as any)?.curriculum) ? (curriculum as any).curriculum : [];
      let total = 0; let completed = 0;
      mods.forEach((m: any) => {
        const acts: any[] = Array.isArray(m?.atividades) ? m.atividades : [];
        acts.forEach((a: any) => { total += 1; if (a?.completed) completed += 1; });
      });
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { total, completed, percent };
    }, [curriculum]);

    /**
     * nextActivityTitle
     * pt-BR: Próxima atividade sugerida com base em `needs_resume` ou primeira pendente.
     * en-US: Next suggested activity based on `needs_resume` or first pending.
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

    return (
      <div className="group flex flex-col md:flex-row md:items-center gap-4 py-4 px-4 hover:bg-muted/30 transition-all border-b last:border-0">
        <div className="flex-1 flex items-center gap-4 min-w-0">
          <Avatar className="h-10 w-10 border shadow-sm shrink-0">
            <AvatarFallback className="bg-primary/5 text-primary font-bold">
              {studentName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-bold text-foreground/90 truncate flex items-center gap-2">
              {studentName}
              {enroll?.id && (
                <span className="text-[10px] bg-muted/50 px-1.5 py-0.5 rounded font-mono text-muted-foreground">ID: {enroll.id}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
              <GraduationCap className="h-3 w-3" />
              {courseName}{className ? ` • ${className}` : ''}
            </div>
          </div>
        </div>

        <div className="w-full md:w-64 space-y-2">
          {loadingCurr ? (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-medium text-muted-foreground animate-pulse">
                <span>Calculando progresso...</span>
              </div>
              <Progress value={0} className="h-2" />
            </div>
          ) : (
            <>
              <div className="flex justify-between items-end text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {totals.completed}/{totals.total} atividades</span>
                <span className={totals.percent === 100 ? "text-emerald-600" : "text-primary"}>{totals.percent}%</span>
              </div>
              <Progress 
                value={totals.percent} 
                className="h-2 shadow-sm"
                indicatorClassName={totals.percent === 100 ? "bg-emerald-500" : "bg-primary"}
              />
            </>
          )}
        </div>

        <div className="flex-1 hidden lg:block min-w-0">
          {nextActivityTitle && (
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 font-black" /> Próxima
              </div>
              <div className="text-xs text-muted-foreground truncate font-medium max-w-[200px]" title={nextActivityTitle}>
                {nextActivityTitle}
              </div>
            </div>
          )}
        </div>
        
        <div className="shrink-0 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary hover:bg-primary/5 font-bold group"
            onClick={() => {
              const cid = String(selectedCourseId || '');
              const tid = String(selectedClassId || '');
              const q = String(searchTerm || '');
              const params = new URLSearchParams();
              if (cid) params.set('id_curso', cid);
              if (tid) params.set('id_turma', tid);
              if (q.trim()) params.set('search', q.trim());
              const detailUrl = `/admin/school/enrollments/${String(enrollmentId)}/progress?${params.toString()}`;
              const returnTo = `/admin/school/courses/${cid || 'curso'}/progress?${params.toString()}`;
              navigate(detailUrl, { state: { returnTo } });
            }}
          >
            Detalhes <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/school/courses" className="text-muted-foreground hover:text-foreground transition-colors">Escola</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium">Progresso do Curso</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-2">
          {isFetching && (
            <Badge variant="outline" className="animate-pulse bg-primary/5 border-primary/20 text-primary px-3 py-1">
              <Loader2 className="h-3 w-3 mr-2 animate-spin" /> Sincronizando...
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground/90 flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-primary/70" />
          Acompanhamento de Progresso
        </h1>
        <p className="text-muted-foreground text-sm font-medium">Visualize e monitore o desempenho acadêmico de todos os alunos matriculados.</p>
      </div>

      <Card className="border shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
        <CardHeader className="bg-muted/30 border-b py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary/70" />
                Listagem de Alunos
              </CardTitle>
              <CardDescription>Gerencie o engajamento através dos percentuais de conclusão.</CardDescription>
            </div>
            {/* Filtros visuais integrados no header do card */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-full md:w-[240px]">
                <Combobox
                  options={courseOptions}
                  value={selectedCourseId}
                  onValueChange={(val) => { setSelectedCourseId(val); setSelectedClassId(''); syncToUrl(val, '', searchTerm); }}
                  placeholder="Selecionar Curso"
                  emptyText={courseItems.length === 0 ? 'Nenhum curso encontrado' : 'Digite para buscar'}
                  loading={coursesQuery.isLoading || coursesQuery.isFetching}
                />
              </div>
              <div className="w-full md:w-[240px]">
                <Combobox
                  options={classOptions}
                  value={selectedClassId}
                  onValueChange={(val) => { setSelectedClassId(val); syncToUrl(selectedCourseId, val, searchTerm); }}
                  placeholder={selectedCourseId ? 'Filtrar por Turma' : 'Selecione um curso'}
                  emptyText={classItems.length === 0 ? 'Nenhuma turma encontrada' : 'Digite para buscar'}
                  loading={classesQuery.isLoading || classesQuery.isFetching}
                  disabled={!selectedCourseId}
                />
              </div>
              <div className="relative w-full md:w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por aluno..." 
                  className="pl-9 h-10 shadow-sm"
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  onBlur={() => syncToUrl(selectedCourseId, selectedClassId, searchTerm)} 
                  onKeyDown={(e) => e.key === 'Enter' && syncToUrl(selectedCourseId, selectedClassId, searchTerm)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {(isLoading) ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-muted-foreground italic">
              <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
              Obtendo dados das matrículas...
            </div>
          ) : enrollments.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Users className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="font-medium text-lg italic">Nenhuma matrícula encontrada</p>
              <p className="text-sm">Tente ajustar seus filtros ou pesquisar por outro termo.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Table Header for Desktop */}
              <div className="hidden md:flex items-center gap-4 px-4 py-3 bg-muted/20 text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b shadow-sm">
                <div className="flex-1">Informações do Aluno</div>
                <div className="w-64">Progresso Acadêmico</div>
                <div className="flex-1 hidden lg:block">Atividade Atual / Próxima</div>
                <div className="shrink-0 w-[100px] text-right">Opções</div>
              </div>
              {enrollments.map((enroll: any) => (
                <EnrollmentRow key={String(enroll?.id)} enroll={enroll} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Fixo (Estilo SaaS Premium) */}
      <div className="fixed bottom-0 left-0 right-0 py-4 px-6 bg-white/80 backdrop-blur-md border-t border-muted/50 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="container mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><Badge variant="outline" className="h-5 min-w-[20px] justify-center p-0 rounded-full">{enrollments.length}</Badge> Resultados</span>
            {selectedCourseId && <span className="hidden sm:inline border-l pl-4 truncate max-w-[200px]">Curso selecionado: {selectedCourseId}</span>}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="border-muted-foreground/20 hover:bg-muted font-bold px-6 shadow-sm transition-all"
          >
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}