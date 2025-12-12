import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { publicCoursesService } from '@/services/publicCoursesService';
import { CourseRecord } from '@/types/courses';
import { useNavigate } from 'react-router-dom';

/**
 * CoursesGrid
 * pt-BR: Grid público de cursos com busca, cards e ação para detalhes.
 * en-US: Public courses grid with search, cards and action to details.
 */
/**
 * CoursesGrid
 * pt-BR: Grid público de cursos com estilo próximo ao Aeroclube (sombras, borda, tipografia).
 * en-US: Public courses grid styled closer to Aeroclube (shadows, border, typography).
 */
export default function CoursesGrid() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  /**
   * Public list query
   * pt-BR: Consulta cursos públicos via `/cursos/public` com busca.
   * en-US: Queries public courses through `/cursos/public` with search.
   */
  const { data, isLoading, error } = useQuery({
    queryKey: ['cursos', 'public-list', search],
    queryFn: async () => publicCoursesService.listPublicCourses({ page: 1, per_page: 50, search: search || undefined }),
    staleTime: 5 * 60 * 1000,
  });

  /**
   * Filtered items
   * pt-BR: Aplica filtros para exibir somente cursos com ativo='s', publicar='s' e excluido='n'.
   * en-US: Applies filters to show only courses with ativo='s', publicar='s' and excluido='n'.
   */
  const items = useMemo(() => {
    const list = (data?.data || data?.items || []) as CourseRecord[];
    return list.filter((c) => {
      const excluido = (c as any).excluido;
      return c.ativo === 's' && c.publicar === 's' && excluido === 'n';
    });
  }, [data]);

  /**
   * onOpenCourse
   * pt-BR: Navega para a página de detalhes do curso priorizando `curso_slug`.
   *        Fallback: `course_slug` | `token` | `slug` | `id`.
   * en-US: Navigates to course details page prioritizing `curso_slug`.
   *        Fallback: `course_slug` | `token` | `slug` | `id`.
   */
  const onOpenCourse = (c: CourseRecord) => {
    console.log('onOpenCourse', c);
    const slug = (c as any).slug || (c as any).token || (c as any).slug || c.id;
    navigate(`/cursos/${slug}/detalhes`);
  };

  return (
    <section id="courses" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Cursos disponíveis</h2>
        <div className="w-[280px]">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou título..." />
        </div>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground">Carregando cursos...</div>
      )}
      {error && (
        <div className="text-sm text-destructive">Não foi possível carregar os cursos.</div>
      )}
      {/* adicionar margin-bottom nos cards com grid-cols-3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-2">
        {items.map((c) => {
          const title = c.titulo || c.nome || `Curso ${c.id}`;
          const desc = c.descricao_curso || '';
          // cover
          // pt-BR: Usa somente `config.cover.url` para a capa do curso.
          // en-US: Use only `config.cover.url` for the course cover.
          const cover = String((c as any)?.config?.cover?.url || '').trim();
          const price = c.valor || '';
          return (
            <Card
              key={c.id}
              className="group mb-4 overflow-hidden border border-violet-200/60 rounded-lg bg-white shadow-sm hover:shadow-lg hover:border-violet-300 transition-all"
            >
              {cover ? (
                <img
                  src={cover}
                  alt={title}
                  className="w-full h-48 object-cover transition-transform group-hover:scale-[1.02]"
                />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-violet-50 to-emerald-50" />
              )}
              <CardHeader className="pt-4">
                <CardTitle className="text-violet-800 text-lg font-semibold tracking-tight line-clamp-1 break-words">
                  {title}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground line-clamp-2 break-words">
                  {desc}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="text-base font-bold text-violet-700">
                    {price ? `R$ ${price}` : 'Consultar'}
                  </div>
                  <Button onClick={() => onOpenCourse(c)} className="bg-violet-700 hover:bg-violet-800">
                    Detalhes
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}