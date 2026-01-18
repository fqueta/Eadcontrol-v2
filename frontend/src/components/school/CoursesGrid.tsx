import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { publicCoursesService } from '@/services/publicCoursesService';
import { CourseRecord } from '@/types/courses';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils'; // Make sure utils is imported for cn

/**
 * CoursesGrid
 * pt-BR: Grid público de cursos com busca, cards e ação para detalhes.
 * en-US: Public courses grid with search, cards and action to details.
 */
export default function CoursesGrid() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  
  // Persist view mode logic
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('publicCoursesViewMode') as 'grid' | 'list') || 'grid';
  });

  const changeViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('publicCoursesViewMode', mode);
  };

  /**
   * Public list query
   */
  const { data, isLoading, error } = useQuery({
    queryKey: ['cursos', 'public-list', search],
    queryFn: async () => publicCoursesService.listPublicCourses({ page: 1, per_page: 50, search: search || undefined }),
    staleTime: 5 * 60 * 1000,
  });

  /**
   * Filtered items
   */
  const items = useMemo(() => {
    // Cast data to any to handle potential structural differences in response
    const dataAny = data as any;
    const list = (dataAny?.data || dataAny?.items || []) as CourseRecord[];
    return list.filter((c) => {
      const excluido = (c as any).excluido;
      return c.ativo === 's' && c.publicar === 's' && excluido === 'n';
    });
  }, [data]);

  const onOpenCourse = (c: CourseRecord) => {
    const slug = (c as any).slug || (c as any).token || (c as any).slug || c.id;
    navigate(`/cursos/${slug}/detalhes`);
  };

  return (
    <section id="courses" className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-primary dark:text-blue-100">
           Cursos disponíveis
        </h2>
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-md flex gap-1">
                <Button 
                   size="icon" 
                   variant="ghost" 
                   className={cn("h-8 w-8 rounded-sm", viewMode === 'grid' ? "bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-blue-400" : "text-muted-foreground")}
                   onClick={() => changeViewMode('grid')}
                >
                    <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button 
                   size="icon" 
                   variant="ghost" 
                   className={cn("h-8 w-8 rounded-sm", viewMode === 'list' ? "bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-blue-400" : "text-muted-foreground")}
                   onClick={() => changeViewMode('list')}
                >
                    <List className="w-4 h-4" />
                </Button>
            </div>
            
            <div className="w-full md:w-[320px] relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
              <Input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Buscar por nome ou título..." 
                className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-primary transition-all rounded-md"
              />
            </div>
        </div>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground text-center py-10">
          <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-primary rounded-full" role="status" aria-label="loading"></div>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-center">
          Não foi possível carregar os cursos.
        </div>
      )}
      
      <div className={cn(
          "gap-6 pb-8",
          viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col"
      )}>
        {items.map((c) => {
          const title = c.titulo || c.nome || `Curso ${c.id}`;
          const desc = c.descricao_curso || '';
          const cover = String((c as any)?.config?.cover?.url || '').trim();
          const price = c.valor || '';
          
          if (viewMode === 'list') {
              return (
                <Card 
                  key={c.id}
                  className="group overflow-hidden border border-border/50 rounded-lg bg-card hover:bg-card/80 shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer flex flex-col md:flex-row"
                  onClick={() => onOpenCourse(c)}
                >
                    <div className="relative w-full md:w-64 h-48 md:h-auto shrink-0 overflow-hidden">
                        {cover ? (
                          <img
                            src={cover}
                            alt={title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center text-primary/50 dark:text-primary">
                            <span className="text-4xl opacity-20">📚</span>
                          </div>
                        )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between p-6">
                        <div className="space-y-2">
                             <div className="flex justify-between items-start">
                                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">
                                   {title}
                                </h3>
                                {(price) && <span className="font-bold text-lg text-primary dark:text-blue-400 ml-4 whitespace-nowrap">R$ {price}</span>}
                             </div>
                             <p className="text-muted-foreground line-clamp-2 md:line-clamp-3">
                                {desc}
                             </p>
                        </div>
                        <div className="mt-4 md:mt-2 flex justify-end">
                             <Button 
                                onClick={(e) => { e.stopPropagation(); onOpenCourse(c); }} 
                                className="rounded-md bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px]"
                             >
                                Detalhes
                             </Button>
                        </div>
                    </div>
                </Card>
              );
          }

          return (
            <Card
              key={c.id}
              className="group overflow-hidden border border-border/50 rounded-lg bg-card hover:bg-card/80 shadow-sm hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
              onClick={() => onOpenCourse(c)}
            >
              <div className="relative w-full h-48 overflow-hidden shrink-0">
                {cover ? (
                  <img
                    src={cover}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center text-primary/50 dark:text-primary">
                    <span className="text-4xl opacity-20">📚</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              <CardHeader className="pt-5 pb-2 flex-grow">
                <CardTitle className="text-xl font-bold tracking-tight line-clamp-1 break-words group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">
                  {title}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground line-clamp-2 break-words h-10">
                  {desc}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-5 pt-2 mt-auto">
                <div className="flex items-center justify-between mt-2">
                  <div className="text-lg font-bold text-primary dark:text-blue-400">
                    {price ? `R$ ${price}` : 'Consultar'}
                  </div>
                  <Button 
                    onClick={(e) => { e.stopPropagation(); onOpenCourse(c); }} 
                    className="rounded-md bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all"
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