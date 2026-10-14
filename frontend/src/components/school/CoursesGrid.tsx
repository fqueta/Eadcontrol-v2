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
import { DynamicPrice } from '@/components/common/DynamicPrice';
import { CatalogCard } from '@/components/common/CatalogCard';

/**
 * CoursesGrid
 * pt-BR: Grid público de cursos com busca, cards e ação para detalhes.
 * en-US: Public courses grid with search, cards and action to details.
 */
const badgePositionClasses: Record<string, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

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

  const { data: configData } = useQuery({
    queryKey: ['course-display-config'],
    queryFn: () => publicCoursesService.getDisplayConfig(),
    staleTime: 10 * 60 * 1000,
  });

  const badgePosition = configData?.badge_position || 'top-right';

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
              "animate-pulse bg-slate-100 dark:bg-slate-800/50 rounded-xl overflow-hidden",
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
        <div className="p-20 text-center bg-white/50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-white/5">
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
        {items.map((c) => {
          const title = c.titulo || c.nome || `Curso ${c.id}`;
          const desc = c.descricao_curso || '';
          const cover = String((c as any)?.config?.cover?.url || '').trim();
          const price = c.valor || '';
          const slug = (c as any).slug || (c as any).token || c.id;
          const linkUrl = `/cursos/${slug}/detalhes`;

          return (
            <CatalogCard
              key={c.id}
              type="course"
              id={c.id}
              title={title}
              description={desc}
              image={cover}
              metaDuration={c.duracao ? `${c.duracao}${c.unidade_duracao || 'h'}` : undefined}
              metaPopular={c.destaque === 's' ? 'Popular' : 'Certificado Incluso'}
              isFeatured={c.destaque === 's'}
              price={price}
              installments={c.parcelas}
              installmentValue={c.valor_parcela}
              priceLabel="Investimento"
              buttonText={viewMode === 'list' ? 'Detalhes do Curso' : 'Detalhes'}
              linkUrl={linkUrl}
              variant={viewMode === 'list' ? 'horizontal' : 'grid'}
            />
          );
        })}
      </div>
    </section>
  );
}