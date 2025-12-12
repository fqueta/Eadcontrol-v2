import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
// Admin pages are wrapped by AppLayout via routing; avoid site layout.
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useEnrollmentsList } from '@/hooks/enrollments';
import { progressService } from '@/services/progressService';
import { Input } from '@/components/ui/input';
import { coursesService } from '@/services/coursesService';
import { useTurmasList } from '@/hooks/turmas';
import { Combobox, useComboboxOptions } from '@/components/ui/combobox';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';

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
  const { data: enrollmentsResp, isLoading, isFetching } = useEnrollmentsList(
    { page: 1, per_page: 100, id_curso: idCurso ? Number(idCurso) : undefined, id_turma: idTurma ? Number(idTurma) : undefined, search, situacao: 'mat' } as any,
    { enabled: !!idCurso }
  );

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
  const courseItems = (coursesQuery.data?.data || coursesQuery.data?.items || []) as any[];
  const courseOptions = useComboboxOptions(courseItems, 'id', 'nome', undefined, (c: any) => String(c?.titulo || ''));

  const classesQuery = useTurmasList({ page: 1, per_page: 200, id_curso: selectedCourseId ? Number(selectedCourseId) : undefined } as any, {
    staleTime: 5 * 60 * 1000,
  });
  const classItems = (classesQuery.data?.data || classesQuery.data?.items || []) as any[];
  const classOptions = useComboboxOptions(classItems, 'id', 'nome', undefined, (t: any) => String(t?.token || ''));

  /**
   * enrollments
   * pt-BR: Normaliza resposta paginada (data/items) para um array simples.
   * en-US: Normalizes paginated response (data/items) into a simple array.
   */
  const enrollments = useMemo(() => {
    const arr = (enrollmentsResp as any)?.data || (enrollmentsResp as any)?.items || [];
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
      <div className="grid grid-cols-12 gap-3 py-2 border-b">
        <div className="col-span-4">
          <div className="font-medium truncate">{studentName}</div>
          <div className="text-xs text-muted-foreground truncate">{courseName}{className ? ` • ${className}` : ''}</div>
        </div>
        <div className="col-span-3 flex items-center gap-2">
          {loadingCurr ? (
            <span className="text-muted-foreground flex items-center gap-1"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</span>
          ) : (
            <>
              <Badge variant="outline">Atividades: {totals.total}</Badge>
              <Badge variant="default">Concluídas: {totals.completed}</Badge>
              <Badge variant="secondary">{totals.percent}%</Badge>
            </>
          )}
        </div>
        <div className="col-span-4 text-sm text-muted-foreground truncate">
          {nextActivityTitle || ''}
        </div>
        <div className="col-span-1 text-right">
          {/*
           * handleOpenEnrollment
           * pt-BR: Abre a nova página de detalhamento de progresso da matrícula.
           * en-US: Opens the new enrollment progress detail page in admin.
           */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              /**
               * navigate with state
               * pt-BR: Passa estado com rota de retorno preservando curso/turma/busca.
               * en-US: Passes state with a return route preserving course/class/search.
               */
              const cid = String(selectedCourseId || '');
              const tid = String(selectedClassId || '');
              const q = String(searchTerm || '');
              const params = new URLSearchParams();
              if (cid) params.set('id_curso', cid);
              if (tid) params.set('id_turma', tid);
              if (q.trim()) params.set('search', q.trim());
              const returnTo = `/admin/school/courses/${cid || 'curso'}/progress?${params.toString()}`;
              // Include filters in detail page URL for shareability
              const detailUrl = `/admin/school/enrollments/${String(enrollmentId)}/progress?${params.toString()}`;
              navigate(detailUrl, { state: { returnTo } });
            }}
          >
            Abrir matrícula
          </Button>
        </div>
      </div>
    );
  }

  return (
      <div className="container mx-auto p-4 space-y-6">
        {/*
         * Breadcrumbs
         * pt-BR: Trilhas de navegação para clareza, com curso atual.
         * en-US: Breadcrumbs for clarity, with current course.
         */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/school/courses">Escola</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Progresso do curso</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Acompanhamento de Progresso (Admin)</h1>
          <p className="text-muted-foreground">Curso: {idCurso || '-'} {idTurma ? `• Turma: ${idTurma}` : ''}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
            <CardDescription>Lista de matrículas com seus percentuais de conclusão</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filtros visuais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
              <Combobox
                options={courseOptions}
                value={selectedCourseId}
                onValueChange={(val) => { setSelectedCourseId(val); setSelectedClassId(''); syncToUrl(val, '', searchTerm); }}
                placeholder="Curso"
                emptyText={courseItems.length === 0 ? 'Nenhum curso encontrado' : 'Selecione um curso'}
                loading={coursesQuery.isLoading || coursesQuery.isFetching}
              />
              <Combobox
                options={classOptions}
                value={selectedClassId}
                onValueChange={(val) => { setSelectedClassId(val); syncToUrl(selectedCourseId, val, searchTerm); }}
                placeholder={selectedCourseId ? 'Turma (do curso selecionado)' : 'Turma'}
                emptyText={classItems.length === 0 ? 'Nenhuma turma encontrada' : 'Selecione uma turma'}
                loading={classesQuery.isLoading || classesQuery.isFetching}
              />
              <div className="relative">
                <Input placeholder="Buscar aluno" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onBlur={() => syncToUrl(selectedCourseId, selectedClassId, searchTerm)} />
              </div>
            </div>
            {(isLoading || isFetching) && (
              <div className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando matrículas…</div>
            )}
            {!isLoading && !isFetching && enrollments.length === 0 && (
              <div className="text-muted-foreground">Nenhuma matrícula encontrada para os filtros informados.</div>
            )}
            {!isLoading && !isFetching && enrollments.length > 0 && (
              <div className="border rounded-md">
                <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-muted/50 text-xs font-semibold">
                  <div className="col-span-4">Aluno</div>
                  <div className="col-span-3">Progresso</div>
                  <div className="col-span-4">Próxima atividade</div>
                  <div className="col-span-1 text-right">Ações</div>
                </div>
                {enrollments.map((enroll: any) => (
                  <div key={String(enroll?.id)} className="px-3">
                    <EnrollmentRow enroll={enroll} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Filtros ativos via URL • id_curso={idCurso || '-'} {idTurma ? `• id_turma=${idTurma}` : ''} {search ? `• search=${search}` : ''}</div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>Voltar</Button>
          </div>
        </div>
      </div>
  );
}