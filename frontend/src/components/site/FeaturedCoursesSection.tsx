import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Clock, Star, Users } from "lucide-react";
import { getTenantApiUrl, getVersionApi } from "@/lib/qlib";
import { FeaturedCoursesConfig, FeaturedCoursesEditor } from "./FeaturedCoursesEditor";
import { useAuth } from "@/contexts/AuthContext";

interface Course {
  id: number;
  nome?: string;
  titulo?: string;
  descricao?: string | null;
  slug: string;
  valor?: string | number;
  duracao?: number;
  unidade_duracao?: string;
  destaque?: 's' | 'n';
  config?: {
    cover?: {
      url: string;
    };
  };
}

const DEFAULT_CONFIG: FeaturedCoursesConfig = {
  title: "Cursos em Destaque",
  subtitle: "Explore nossos treinamentos mais procurados e comece sua jornada de aprendizado hoje mesmo.",
  backgroundColor: "#f8fafc",
  titleColor: "#0f172a",
  subtitleColor: "#475569",
  titleSize: "3rem",
  textAlign: "center",
  marginTop: "4rem",
  marginBottom: "4rem",
  paddingTop: "0rem",
  paddingBottom: "0rem",
  showViewAll: true,
  viewAllText: "Ver todos os cursos"
};

/**
 * Utility to strip HTML tags from a string
 */
const stripHtml = (html: string) => {
  if (!html) return "";
  // Basic regex to strip tags, then decode basic entities if needed
  return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"');
};

export function FeaturedCoursesSection() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<FeaturedCoursesConfig>(DEFAULT_CONFIG);

  const canEdit = !!user && Number(user?.permission_id ?? 9999) < 3;

  useEffect(() => {
    async function fetchData() {
      try {
        const baseUrl = getTenantApiUrl() + getVersionApi();
        
        // 1. Fetch config from options/branding
        const optResponse = await fetch(`${baseUrl}/public/options/branding`);
        if (optResponse.ok) {
          const optJson = await optResponse.json();
          const savedConfig = optJson.data?.featured_courses_config;
          if (savedConfig) {
            try {
              const parsed = typeof savedConfig === 'string' ? JSON.parse(savedConfig) : savedConfig;
              setConfig({ ...DEFAULT_CONFIG, ...parsed });
            } catch (e) {
              console.error("Failed to parse featured_courses_config", e);
            }
          }
        }

        // 2. Fetch courses
        const response = await fetch(`${baseUrl}/public/courses?destaque=s&per_page=6`);
        if (response.ok) {
          const json = await response.json();
          setCourses(Array.isArray(json.data) ? json.data : []);
        }
      } catch (error) {
        console.error("Failed to fetch featured courses:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <section className="py-24" style={{ backgroundColor: config.backgroundColor }}>
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </section>
    );
  }

  // If no courses and not an admin, hide the whole section
  if (courses.length === 0 && !canEdit) return null;

  return (
    <section 
      className="transition-colors duration-500 relative min-h-[400px] flex flex-col justify-center" 
      style={{ 
        backgroundColor: config.backgroundColor,
        marginTop: config.marginTop,
        marginBottom: config.marginBottom,
        paddingTop: config.paddingTop,
        paddingBottom: config.paddingBottom
      }}
    >
      {/* Editor component rendered here for admins */}
      <FeaturedCoursesEditor 
        currentConfig={config} 
        onConfigChange={(newConfig) => setConfig(newConfig)} 
      />

      <div className="container mx-auto px-4">
        {courses.length > 0 ? (
          <>
            <div 
              className={`flex flex-col gap-6 mb-12 ${
                config.textAlign === 'center' 
                  ? 'text-center items-center' 
                  : config.textAlign === 'right' 
                    ? 'text-right items-end md:flex-row md:justify-between' 
                    : 'text-left items-start md:flex-row md:justify-between'
              }`}
            >
              <div className={`max-w-2xl ${config.textAlign === 'center' ? 'mx-auto' : config.textAlign === 'right' ? 'ml-auto' : ''}`}>
                <h2 
                  className="font-black mb-4 tracking-tight leading-tight" 
                  style={{ color: config.titleColor, fontSize: config.titleSize }}
                >
                  {config.title}
                </h2>
                <div className={`w-20 h-1.5 bg-primary rounded-full mb-6 ${config.textAlign === 'center' ? 'mx-auto' : config.textAlign === 'right' ? 'ml-auto' : ''}`} />
                <p className="text-lg font-medium opacity-90" style={{ color: config.subtitleColor }}>
                  {config.subtitle}
                </p>
              </div>
              {config.showViewAll && (
                <Button variant="ghost" className="font-bold text-primary hover:text-primary/80 gap-2 group" asChild>
                  <Link to="/cursos">
                    {config.viewAllText}
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map((course) => {
                const courseTitle = course.titulo || course.nome || "Curso sem título";
                const courseDesc = stripHtml(course.descricao || "Transforme sua carreira com este treinamento especializado de alto impacto.");
                const coverUrl = course.config?.cover?.url || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60";
                const duration = course.duracao ? `${course.duracao}${course.unidade_duracao || 'h'}` : "40h";
                const formattedPrice = course.valor ? (
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(String(course.valor).replace(',', '.')))
                ) : "Sob Consulta";

                return (
                  <Card key={course.id} className="group overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-500 bg-white dark:bg-slate-900 flex flex-col h-full hover:-translate-y-2">
                    <div className="relative aspect-video overflow-hidden">
                      <img 
                        src={coverUrl} 
                        alt={courseTitle}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      {course.destaque === 's' && (
                        <Badge className="absolute top-4 right-4 bg-primary/90 backdrop-blur-md border-none font-bold">
                          Destaque
                        </Badge>
                      )}
                    </div>
                    
                    <CardHeader className="flex-grow">
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-widest">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          Popular
                        </span>
                      </div>
                      <CardTitle className="text-xl font-black text-slate-900 dark:text-white line-clamp-2 group-hover:text-primary transition-colors">
                        {courseTitle}
                      </CardTitle>
                      <CardDescription className="line-clamp-3 text-slate-600 dark:text-slate-400 mt-2 font-medium">
                        {courseDesc}
                      </CardDescription>
                    </CardHeader>

                    <CardFooter className="pt-0 border-t border-slate-100 dark:border-slate-800 mt-auto p-6">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Investimento</span>
                          <span className="text-2xl font-black text-primary">
                            {formattedPrice}
                          </span>
                        </div>
                        <Button size="sm" className="rounded-lg font-bold" asChild>
                          <Link to={`/cursos/${course.slug}/detalhes`}>
                            Detalhes
                          </Link>
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl animate-in fade-in zoom-in duration-700">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Star className="h-10 w-10 text-slate-300 animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tighter mb-2">Vitrine Vazia</h3>
            <p className="text-slate-500 font-medium max-w-md mx-auto">
              Nenhum curso marcado como <strong className="text-primary">destaque</strong> foi encontrado. 
              Vá ao painel e ative o botão de destaque em seus melhores cursos!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
