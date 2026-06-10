import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ExternalLink } from "lucide-react";
import { getTenantApiUrl, getVersionApi } from "@/lib/qlib";
import { useAuth } from "@/contexts/AuthContext";
import { CtaConfig, CtaEditor, DEFAULT_CTA_CONFIG } from "./CtaEditor";

export function CtaSection() {
  const { user } = useAuth();
  const canEdit = !!user && Number(user?.permission_id ?? 9999) < 3;
  const [config, setConfig] = useState<CtaConfig>(DEFAULT_CTA_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const baseUrl = getTenantApiUrl() + getVersionApi();
        const response = await fetch(`${baseUrl}/public/options/branding`);
        if (response.ok) {
          const json = await response.json();
          const savedConfig = json.data?.cta_config;
          if (savedConfig) {
            const parsed = typeof savedConfig === 'string' ? JSON.parse(savedConfig) : savedConfig;
            setConfig({ ...DEFAULT_CTA_CONFIG, ...parsed });
          }
        }
      } catch (e) {
        console.error("Failed to fetch CTA config", e);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  if (loading) return null;

  // Se não estiver habilitado e não for admin, não renderiza nada
  if (!config.enabled && !canEdit) return null;

  const alignClasses = {
    left: 'text-left items-start justify-start',
    center: 'text-center items-center justify-center',
    right: 'text-right items-end justify-end'
  };

  const bgStyle = config.gradientColorTo 
    ? `linear-gradient(to right, ${config.backgroundColor}, ${config.gradientColorTo})`
    : config.backgroundColor;

  return (
    <section 
      className={`relative overflow-hidden transition-all duration-500 ${!config.enabled ? 'opacity-40 grayscale-[0.5]' : ''}`}
      style={{ 
        marginTop: config.marginTop,
        marginBottom: config.marginBottom,
        paddingTop: config.paddingTop,
        paddingBottom: config.paddingBottom,
        display: !config.enabled && canEdit ? 'block' : config.enabled ? 'block' : 'none'
      }}
    >
      <CtaEditor 
        currentConfig={config} 
        onConfigChange={(newConfig) => setConfig(newConfig)} 
      />

      {config.enabled ? (
        <>
          {/* Background color and/or gradient */}
          <div 
            className="absolute inset-0 z-0" 
            style={{ background: bgStyle }}
          >
            {config.showPattern && (
              <div 
                className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" 
              />
            )}
          </div>

          <div className="container mx-auto relative z-10 px-4">
            <div className={`flex flex-col ${alignClasses[config.textAlign]}`}>
              <h2 
                className="font-black mb-8 tracking-tight leading-tight"
                style={{ 
                  color: config.textColor, 
                  fontSize: config.titleSize,
                  textAlign: config.textAlign 
                }}
              >
                {config.title}
              </h2>
              <p 
                className="text-xl mb-12 max-w-2xl font-medium leading-relaxed"
                style={{ 
                  color: config.descriptionColor,
                  textAlign: config.textAlign 
                }}
              >
                {config.description}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                {config.buttonText && (
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto bg-white text-blue-900 hover:bg-blue-50 rounded-lg h-16 px-12 text-lg font-black shadow-2xl transition-all active:scale-95" 
                    asChild
                  >
                    {config.buttonLink.startsWith('http') ? (
                      <a href={config.buttonLink} target="_blank" rel="noreferrer">
                        {config.buttonText}
                        <ArrowRight className="ml-2 h-6 w-6" />
                      </a>
                    ) : (
                      <Link to={config.buttonLink}>
                        {config.buttonText}
                        <ArrowRight className="ml-2 h-6 w-6" />
                      </Link>
                    )}
                  </Button>
                )}

                {config.secondaryButtonText && (
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="w-full sm:w-auto bg-transparent border-white/30 text-white hover:bg-white/10 rounded-lg h-16 px-12 text-lg font-black backdrop-blur-md transition-all active:scale-95" 
                    asChild
                  >
                    {config.secondaryButtonLink.startsWith('http') ? (
                      <a href={config.secondaryButtonLink} target="_blank" rel="noreferrer">
                        {config.secondaryButtonText}
                        <ExternalLink className="ml-2 h-6 w-6" />
                      </a>
                    ) : (
                      <Link to={config.secondaryButtonLink}>
                        {config.secondaryButtonText}
                        <ExternalLink className="ml-2 h-6 w-6" />
                      </Link>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="container mx-auto px-4 py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
           <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest">Seção CTA Desativada</h3>
           <p className="text-slate-500 text-sm">Esta seção não será visível para os alunos/visitantes.</p>
        </div>
      )}
    </section>
  );
}
export default CtaSection;
