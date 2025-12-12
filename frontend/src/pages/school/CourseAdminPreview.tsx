import { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import StudentCourse from './StudentCourse';

/**
 * CourseAdminPreview
 * pt-BR: Página para o administrador pré-visualizar a experiência do aluno.
 *        Renderiza StudentCourse e adiciona um banner de contexto.
 * en-US: Admin page to preview the student experience.
 *        Renders StudentCourse and adds a context banner.
 */
export default function CourseAdminPreview() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  /**
   * forceReloadOnOpen
   * pt-BR: Recarrega a página uma única vez ao abrir o preview quando solicitado
   *        via estado de navegação ou parâmetro de query `reload=1`.
   * en-US: Reloads the page once on preview open when requested via navigation
   *        state or `reload=1` query param.
   */
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const byQuery = params.get('reload') === '1';
      const byState = Boolean((location.state as any)?.forceReload);
      const shouldReload = byQuery || byState;
      if (shouldReload) {
        // Remove `reload=1` from URL to evitar recarga infinita após o refresh.
        if (byQuery) {
          params.delete('reload');
          const qs = params.toString();
          const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash || ''}`;
          window.history.replaceState(null, document.title, newUrl);
        }
        // Estado de navegação é descartado ao recarregar, evitando loop.
        window.location.reload();
      }
    } catch {
      // noop
    }
  }, [location.state]);
  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="p-3 border border-yellow-400 bg-yellow-50 rounded-md text-sm flex items-center justify-between">
        <span>Pré-visualização da experiência do aluno para o curso {id} (endpoint privado).</span>
        <Button variant="outline" size="sm" onClick={() => navigate(`/admin/school/courses/${String(id)}/edit`)}>
          Voltar para edição
        </Button>
      </div>
      {/**
       * StudentCourse (private endpoint)
       * pt-BR: No preview de admin, usar endpoint privado `/cursos/{slug}` via `coursesService`.
       * en-US: In admin preview, use private endpoint `/cursos/{slug}` through `coursesService`.
       */}
      <StudentCourse fetchVariant="private" />
    </div>
  );
}