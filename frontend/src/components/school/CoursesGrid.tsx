import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { publicCoursesService } from '@/services/publicCoursesService';
import { CourseRecord } from '@/types/courses';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, List, GraduationCap } from 'lucide-react';
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
    <section id="courses" className="space-y-10 py-10">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
             Cursos Disponíveis
          </h2>
          <p className="text-muted-foreground mt-1">Explore nossa seleção de conteúdos premium</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-xl flex gap-1 backdrop-blur-sm border border-slate-200/50 dark:border-white/5">
                <Button 
                   size="icon" 
                   variant="ghost" 
                   className={cn("h-9 w-9 rounded-lg transition-all duration-300", viewMode === 'grid' ? "bg-white dark:bg-slate-700 shadow-md text-primary" : "text-muted-foreground hover:bg-white/50 dark:hover:bg-slate-800")}
                   onClick={() => changeViewMode('grid')}
                >
                    <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button 
                   size="icon" 
                   variant="ghost" 
                   className={cn("h-9 w-9 rounded-lg transition-all duration-300", viewMode === 'list' ? "bg-white dark:bg-slate-700 shadow-md text-primary" : "text-muted-foreground hover:bg-white/50 dark:hover:bg-slate-800")}
                   onClick={() => changeViewMode('list')}
                >
                    <List className="w-4 h-4" />
                </Button>
            </div>
            
            <div className="w-full md:w-[350px] relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors duration-300">
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
              <Input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="O que você quer aprender hoje?" 
                className="h-12 pl-11 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/10 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all rounded-xl shadow-sm text-base"
              />
            </div>
        </div>
      </div>

      {isLoading && (
        <div className={cn(
          "gap-8",
          viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col"
        )}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={cn(
              "animate-pulse bg-slate-100 dark:bg-slate-800/50 rounded-2xl overflow-hidden",
              viewMode === 'grid' ? "h-[400px]" : "h-48"
            )}>
              <div className="h-48 bg-slate-200 dark:bg-slate-700" />
              <div className="p-6 space-y-4">
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                <div className="flex justify-between items-center pt-4">
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20" />
                  <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-28" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {error && (
        <div className="p-8 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-center backdrop-blur-sm">
          <p className="font-bold text-lg mb-2">Ops! Algo deu errado.</p>
          <p className="text-sm opacity-80">Não foi possível carregar os cursos. Por favor, tente novamente mais tarde.</p>
        </div>
      )}
      
      {!isLoading && items.length === 0 && (
        <div className="p-20 text-center bg-white/50 dark:bg-slate-900/20 rounded-[2rem] border border-dashed border-slate-200 dark:border-white/5">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <LayoutGrid className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Nenhum curso encontrado</h3>
          <p className="text-muted-foreground">Tente ajustar sua busca ou explore outras categorias.</p>
        </div>
      )}
      
      <div className={cn(
          "gap-8 pb-12",
          viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col"
      )}>
        {items.map((c, idx) => {
          const title = c.titulo || c.nome || `Curso ${c.id}`;
          const desc = c.descricao_curso || '';
          const cover = String((c as any)?.config?.cover?.url || '').trim();
          const price = c.valor || '';
          
          if (viewMode === 'list') {
              return (
                <Card 
                  key={c.id}
                  className="group relative overflow-hidden border border-slate-200/50 dark:border-white/5 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-500 cursor-pointer flex flex-col md:flex-row shadow-sm animate-in fade-in slide-in-from-bottom duration-700 fill-mode-both"
                  style={{ animationDelay: `${idx * 50}ms` }}
                  onClick={() => onOpenCourse(c)}
                >
                    <div className="relative w-full md:w-72 h-48 md:h-auto shrink-0 overflow-hidden">
                        {cover ? (
                          <img
                            src={cover}
                            alt={title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                            <GraduationCap className="w-12 h-12 text-primary/40" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between p-8">
                        <div className="space-y-4">
                             <div className="flex justify-between items-start gap-4">
                                <div>
                                  <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors duration-300">
                                     {title}
                                  </h3>
                                  <div className="flex items-center mt-2 text-xs font-semibold uppercase tracking-widest text-primary/80">
                                    <span className="w-8 h-px bg-current mr-2 opacity-30" />
                                    Certificado Incluso
                                  </div>
                                </div>
                                {(price) && <div className="text-2xl font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-white/5 px-4 py-1.5 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm">R$ {price}</div>}
                             </div>
                             <p className="text-muted-foreground leading-relaxed line-clamp-2 md:line-clamp-3 text-base">
                                {desc}
                             </p>
                        </div>
                        <div className="mt-8 flex justify-end">
                             <Button 
                                onClick={(e) => { e.stopPropagation(); onOpenCourse(c); }} 
                                className="h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.03] active:scale-[0.98] transition-all px-8 font-bold shadow-lg"
                             >
                                Detalhes do Curso
                             </Button>
                        </div>
                    </div>
                </Card>
              );
          }

          return (
            <Card
              key={c.id}
              className="group relative h-full flex flex-col overflow-hidden border border-slate-200/50 dark:border-white/5 rounded-[2rem] bg-white/50 dark:bg-slate-900/50 backdrop-blur-md hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-500 cursor-pointer shadow-sm animate-in fade-in zoom-in-95 duration-700 fill-mode-both"
              style={{ animationDelay: `${idx * 50}ms` }}
              onClick={() => onOpenCourse(c)}
            >
              <div className="relative w-full h-56 overflow-hidden shrink-0">
                {cover ? (
                  <img
                    src={cover}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                    <GraduationCap className="w-16 h-16 text-primary/40" />
                  </div>
                )}
                {/* Overlay labels */}
                {price && (
                   <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-1.5 rounded-full font-black text-primary shadow-lg border border-white/20">
                     R$ {price}
                   </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
              </div>

              <CardHeader className="p-8 pb-4 flex-grow space-y-3">
                <CardTitle className="text-2xl font-black tracking-tight leading-tight line-clamp-2 min-h-[4rem] text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors duration-300">
                  {title}
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground line-clamp-2 leading-relaxed h-12">
                  {desc}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-8 pt-2 mt-auto">
                <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                   <div className="flex -space-x-2">
                     {[1, 2, 3].map(i => (
                       <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 flex items-center justify-center overflow-hidden">
                         <img src={`https://i.pravatar.cc/100?u=${i + idx}`} className="w-full h-full object-cover grayscale opacity-50" alt="aluno" />
                       </div>
                     ))}
                     <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-muted-foreground mr-2">
                       +
                     </div>
                   </div>
                   <Button 
                    onClick={(e) => { e.stopPropagation(); onOpenCourse(c); }} 
                    className="h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all px-6 font-bold"
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