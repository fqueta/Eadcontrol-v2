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
    <section id="courses" className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400">
          Cursos disponíveis
        </h2>
        <div className="w-full md:w-[320px] relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <Input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Buscar por nome ou título..." 
            className="pl-9 bg-white dark:bg-slate-900 border-violet-100 dark:border-violet-800 focus:border-violet-400 transition-all rounded-full"
          />
        </div>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground text-center py-10">
          <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-violet-600 rounded-full" role="status" aria-label="loading"></div>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-center">
          Não foi possível carregar os cursos.
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
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
              className="group overflow-hidden border border-border/50 rounded-xl bg-card hover:bg-card/80 shadow-sm hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              onClick={() => onOpenCourse(c)}
            >
              <div className="relative w-full h-48 overflow-hidden">
                {cover ? (
                  <img
                    src={cover}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-100 to-emerald-100 dark:from-violet-900/20 dark:to-emerald-900/20 flex items-center justify-center text-violet-300 dark:text-violet-800">
                    <span className="text-4xl opacity-20">📚</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              <CardHeader className="pt-5 pb-2">
                <CardTitle className="text-xl font-bold tracking-tight line-clamp-1 break-words group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  {title}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground line-clamp-2 break-words h-10">
                  {desc}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-5 pt-2">
                <div className="flex items-center justify-between mt-2">
                  <div className="text-lg font-bold text-violet-700 dark:text-violet-400">
                    {price ? `R$ ${price}` : 'Consultar'}
                  </div>
                  <Button 
                    onClick={(e) => { e.stopPropagation(); onOpenCourse(c); }} 
                    className="rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-md hover:shadow-lg transition-all"
                    size="sm"
                  >
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