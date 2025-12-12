import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { progressService } from '@/services/progressService';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { coursesService } from '@/services/coursesService';
import { publicCoursesService } from '@/services/publicCoursesService';

export interface EnrollmentProgressModalProps {
  /** pt-BR: Matrícula selecionada; precisa ao menos do `id`. en-US: Selected enrollment; must include `id`. */
  enrollment: any | null;
  /** pt-BR: Controle de abertura. en-US: Open control. */
  open: boolean;
  /** pt-BR: Mudança de abertura. en-US: Open change handler. */
  onOpenChange: (open: boolean) => void;
}

/**
 * EnrollmentProgressModal
 * pt-BR: Modal que exibe o progresso do aluno na matrícula, consultando `/curriculum?id_matricula={id}`.
 * en-US: Modal that shows student progress for an enrollment, calling `/curriculum?id_matricula={id}`.
 */
export default function EnrollmentProgressModal({ enrollment, open, onOpenChange }: EnrollmentProgressModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<any | null>(null);
  const navigate = useNavigate();

  /**
   * fetchCurriculum
   * pt-BR: Busca o currículo consolidado por matrícula e atualiza estado local.
   * en-US: Fetch consolidated curriculum by enrollment and update local state.
   */
  const fetchCurriculum = React.useCallback(async () => {
    if (!enrollment?.id) return;
    setLoading(true);
    try {
      const resp = await progressService.getEnrollmentCurriculum(enrollment.id);
      setData(resp);
    } catch (err) {
      // Mantém simples: falha silenciosa. Pode-se integrar toast se necessário.
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [enrollment?.id]);

  /**
   * useEffect open
   * pt-BR: Ao abrir o modal, dispara a busca de dados.
   * en-US: When modal opens, triggers data fetch.
   */
  React.useEffect(() => {
    if (open) fetchCurriculum();
  }, [open, fetchCurriculum]);

  const courseTitle = data?.course_title || enrollment?.curso_nome || enrollment?.course_name || '-';
  const studentName = data?.student_name || enrollment?.cliente_nome || enrollment?.student_name || '-';
  const situacaoCode = String(enrollment?.situacao || enrollment?.status || '').toLowerCase();
  const isMatriculated = situacaoCode.includes('mat');

  /**
   * resolveCourseTitle
   * pt-BR: Resolve título do curso a partir da matrícula/dados do currículo.
   * en-US: Resolve course title from enrollment/curriculum data.
   */
  const resolveCourseTitle = () => {
    const c = enrollment?.curso || enrollment?.course || {};
    return String((data?.course_title || c?.nome || c?.titulo || enrollment?.course_name || '-') || '-');
  };

  /**
   * resolveCourseId
   * pt-BR: Extrai ID do curso da matrícula, aceitando chaves comuns.
   * en-US: Extracts course ID from enrollment, accepting common keys.
   */
  const resolveCourseId = (enroll: any): string | undefined => {
    const c = enroll?.curso || enroll?.course || {};
    const candidates = [c?.id, enroll?.id_curso, enroll?.course_id];
    for (const v of candidates) {
      const s = String(v ?? '').trim();
      if (s) return s;
    }
    return undefined;
  };

  /**
   * resolveCourseSlug
   * pt-BR: Resolve slug/token do curso a partir da matrícula.
   * en-US: Resolves course slug/token from enrollment record.
   */
  const resolveCourseSlug = (enroll: any): string | undefined => {
    const c = enroll?.curso || enroll?.course || {};
    const candidates = [c?.slug, c?.token, enroll?.slug, enroll?.token, enroll?.curso_slug, enroll?.course_slug];
    for (const v of candidates) {
      const s = String(v ?? '').trim();
      if (s) return s;
    }
    return undefined;
  };

  /**
   * ensureCourseSlug
   * pt-BR: Garante o slug do curso, buscando detalhes via serviço se necessário.
   * en-US: Ensures course slug, fetching details via service if needed.
   */
  const ensureCourseSlug = async (enroll: any): Promise<string | undefined> => {
    const direct = resolveCourseSlug(enroll);
    if (direct) return direct;
    const id = resolveCourseId(enroll);
    if (!id) return undefined;
    try {
      const course = await coursesService.getBySlug(String(id));
      const slug = String((course as any)?.slug || (course as any)?.token || '').trim();
      if (slug) return slug;
    } catch {}
    try {
      const coursePublic = await publicCoursesService.getById(String(id));
      const slugPublic = String((coursePublic as any)?.slug || (coursePublic as any)?.token || '').trim();
      if (slugPublic) return slugPublic;
    } catch {}
    return undefined;
  };

  /**
   * handleContinueCourse
   * pt-BR: Abre a página de consumo do curso do aluno para a matrícula atual.
   * en-US: Opens student course consumption page for the current enrollment.
   */
  const handleContinueCourse = async () => {
    if (!enrollment) return;
    const slug = await ensureCourseSlug(enrollment);
    if (!slug) return;
    navigate(`/aluno/cursos/${String(slug)}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Progresso da matrícula #{String(enrollment?.id ?? '')}</DialogTitle>
          <DialogDescription>
            {studentName ? `Aluno: ${studentName}` : ''}{courseTitle ? ` • Curso: ${courseTitle}` : ''}
          </DialogDescription>
        </DialogHeader>

        {/* Actions */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-muted-foreground">{resolveCourseTitle()}</div>
          {isMatriculated && (
            <Button size="sm" onClick={handleContinueCourse} title="Abrir consumo do curso">Continuar curso</Button>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando progresso…
          </div>
        )}

        {!loading && data && (
          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="space-y-4">
              {(data.curriculum || []).map((mod: any, idx: number) => (
                <div key={`${mod?.module_id ?? idx}`} className="border rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold">{String(mod?.title || mod?.name || `Módulo ${idx + 1}`)}</div>
                      {mod?.duration ? (
                        <div className="text-xs text-muted-foreground">Duração: {String(mod.duration)} {String(mod.tipo_duracao || mod.type_duration || '')}</div>
                      ) : null}
                    </div>
                    <Badge variant="outline">Atividades: {Array.isArray(mod?.atividades) ? mod.atividades.length : 0}</Badge>
                  </div>

                  <div className="space-y-2">
                    {Array.isArray(mod?.atividades) && mod.atividades.length > 0 ? (
                      mod.atividades.map((a: any) => (
                        <div key={String(a?.activity_id ?? a?.id)} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-6">
                            <div className="text-sm font-medium">{String(a?.title || a?.name || 'Atividade')}</div>
                            {a?.description ? (
                              <div className="text-xs text-muted-foreground truncate">{String(a.description)}</div>
                            ) : null}
                          </div>
                          <div className="col-span-2">
                            <Badge variant={a?.completed ? 'default' : 'outline'}>{a?.completed ? 'Concluída' : 'Pendente'}</Badge>
                          </div>
                          <div className="col-span-2">
                            {a?.needs_resume ? <Badge variant="secondary">Retomar</Badge> : <span className="text-xs text-muted-foreground"> </span>}
                          </div>
                          <div className="col-span-2 text-right text-xs text-muted-foreground">
                            {Number(a?.seconds || 0) > 0 ? `${Math.round(Number(a.seconds))}s` : ''}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">Nenhuma atividade encontrada para este módulo.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}