import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Clock, Star, Users } from "lucide-react";
import { getTenantApiUrl, getVersionApi } from "@/lib/qlib";
import { FeaturedCoursesConfig, FeaturedCoursesEditor } from "./FeaturedCoursesEditor";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { DynamicPrice } from "../common/DynamicPrice";
import { CatalogCard } from "../common/CatalogCard";

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
  parcelas?: string | number;
  valor_parcela?: string | number;
}

const DEFAULT_CONFIG: FeaturedCoursesConfig = {
  title: "Cursos em Destaque",
  subtitle: "Explore nossos treinamentos mais procurados e comece sua jornada de aprendizado hoje mesmo.",
  backgroundColor: "#f8fafc",
  gradientColorTo: "",
  accentColor: "",
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
  const { darkMode } = useTheme();
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

  const finalBgColor = darkMode 
    ? (config.backgroundColor === "#f8fafc" || config.backgroundColor === "#ffffff" ? "transparent" : config.backgroundColor)
    : config.backgroundColor;

  const finalGradientTo = darkMode
    ? (config.gradientColorTo === "#f8fafc" || config.gradientColorTo === "#ffffff" ? "" : config.gradientColorTo)
    : config.gradientColorTo;

  const bgStyle = finalGradientTo 
    ? `linear-gradient(to right, ${finalBgColor}, ${finalGradientTo})`
    : finalBgColor;

  const finalTitleColor = darkMode
    ? (config.titleColor === "#0f172a" || config.titleColor === "#000000" ? "#f8fafc" : config.titleColor)
    : config.titleColor;

  const finalSubtitleColor = darkMode
    ? (config.subtitleColor === "#475569" || config.subtitleColor === "#1e293b" ? "#94a3b8" : config.subtitleColor)
    : config.subtitleColor;

  return (
    <section 
      className="transition-colors duration-500 relative min-h-[400px] flex flex-col justify-center" 
      style={{ 
        background: bgStyle,
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
                  style={{ color: finalTitleColor, fontSize: config.titleSize }}
                >
                  {config.title}
                </h2>
                <div 
                  className={`w-20 h-1.5 rounded-full mb-6 ${config.accentColor ? '' : 'bg-primary'} ${config.textAlign === 'center' ? 'mx-auto' : config.textAlign === 'right' ? 'ml-auto' : ''}`}
                  style={config.accentColor ? { backgroundColor: config.accentColor } : {}}
                />
                <p className="text-lg font-medium opacity-90" style={{ color: finalSubtitleColor }}>
                  {config.subtitle}
                </p>
              </div>
              {config.showViewAll && (
                <Button 
                  variant="ghost" 
                  className={`font-bold gap-2 group ${config.accentColor ? '' : 'text-primary hover:text-primary/80'}`} 
                  style={config.accentColor ? { color: config.accentColor } : {}}
                  asChild
                >
                  <Link to="/cursos">
                    {config.viewAllText}
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map((course) => (
                <CatalogCard
                  key={course.id}
                  type="course"
                  id={course.id}
                  title={course.titulo || course.nome || "Curso sem título"}
                  description={course.descricao}
                  image={course.config?.cover?.url}
                  metaDuration={course.duracao ? `${course.duracao}${course.unidade_duracao || 'h'}` : "40h"}
                  metaPopular={true}
                  isFeatured={course.destaque === 's'}
                  price={course.valor}
                  installments={course.parcelas}
                  installmentValue={course.valor_parcela}
                  priceLabel="Investimento"
                  buttonText="Detalhes"
                  linkUrl={`/cursos/${course.slug}/detalhes`}
                  hideCategory={config.hideCategory}
                  hideDescription={config.hideDescription}
                  imageAspect={config.imageAspect}
                  imageFit={config.imageFit}
                />
              ))}
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
