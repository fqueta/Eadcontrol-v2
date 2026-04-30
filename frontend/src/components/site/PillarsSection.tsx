import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, BookOpen, Wrench, Compass } from "lucide-react";
import { EditableOptionText } from "@/components/common/EditableOptionText";
import { getTenantApiUrl, getVersionApi } from "@/lib/qlib";
import { useAuth } from "@/contexts/AuthContext";
import { PillarsConfig, PillarsEditor, DEFAULT_PILLARS_CONFIG } from "./PillarsEditor";

export function PillarsSection() {
  const { user } = useAuth();
  const canEdit = !!user && Number(user?.permission_id ?? 9999) < 3;
  const [config, setConfig] = useState<PillarsConfig>(DEFAULT_PILLARS_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const baseUrl = getTenantApiUrl() + getVersionApi();
        const response = await fetch(`${baseUrl}/public/options/branding`);
        if (response.ok) {
          const json = await response.json();
          const savedConfig = json.data?.pillars_config;
          if (savedConfig) {
            const parsed = typeof savedConfig === 'string' ? JSON.parse(savedConfig) : savedConfig;
            setConfig({ ...DEFAULT_PILLARS_CONFIG, ...parsed });
          }
        }
      } catch (e) {
        console.error("Failed to fetch pillars config", e);
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
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end'
  };

  return (
    <section 
      className={`relative overflow-hidden transition-all duration-500 ${!config.enabled ? 'opacity-40 grayscale-[0.5]' : ''}`}
      style={{ 
        backgroundColor: config.backgroundColor,
        marginTop: config.marginTop,
        marginBottom: config.marginBottom,
        paddingTop: config.paddingTop,
        paddingBottom: config.paddingBottom,
        display: !config.enabled && canEdit ? 'block' : config.enabled ? 'block' : 'none'
      }}
    >
      <PillarsEditor 
        currentConfig={config} 
        onConfigChange={(newConfig) => setConfig(newConfig)} 
      />

      {config.enabled ? (
        <>
          {/* Decorative Blobs */}
          <div className="absolute top-0 -left-20 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl" />
          
          <div className="container mx-auto relative z-10 px-4">
            <div className={`mb-16 animate-in fade-in slide-in-from-bottom-4 duration-1000 flex flex-col ${alignClasses[config.textAlign]}`}>
              <h2 
                className="font-black mb-4 tracking-tight leading-tight"
                style={{ color: config.titleColor, fontSize: config.titleSize }}
              >
                {config.title}
              </h2>
              <div className={`w-24 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full ${config.textAlign === 'center' ? 'mx-auto' : config.textAlign === 'right' ? 'ml-auto' : ''}`} />
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
              <PillarCard 
                icon={<BookOpen className="h-10 w-10 text-blue-600 dark:text-blue-400 relative z-10" />}
                titleKey="home_feature_1_title"
                defaultTitle="Plataforma Pedagógica"
                descKey="home_feature_1_desc"
                defaultDesc="Planos de aula e avaliações alinhados à BNCC."
              />

              <PillarCard 
                icon={<Plane className="h-10 w-10 text-blue-600 dark:text-blue-400 relative z-10" />}
                titleKey="home_feature_2_title"
                defaultTitle="Comunicação Alternativa"
                descKey="home_feature_2_desc"
                defaultDesc="Autonomia e autoestima através de linguagem acessível."
              />

              <PillarCard 
                icon={<Wrench className="h-10 w-10 text-blue-600 dark:text-blue-400 relative z-10" />}
                titleKey="home_feature_3_title"
                defaultTitle="Suporte de Ponta a Ponta"
                descKey="home_feature_3_desc"
                defaultDesc="Acompanhamento completo de implantação à operação."
              />

              <PillarCard 
                icon={<Compass className="h-10 w-10 text-blue-600 dark:text-blue-400 relative z-10" />}
                titleKey="home_feature_4_title"
                defaultTitle="Soluções Personalizadas"
                descKey="home_feature_4_desc"
                defaultDesc="Respeito à individualidade de cada aluno."
              />
            </div>
          </div>
        </>
      ) : (
        <div className="container mx-auto px-4 py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
           <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest">Seção de Pilares Desativada</h3>
           <p className="text-slate-500 text-sm">Esta seção não será visível para os alunos/visitantes.</p>
        </div>
      )}
    </section>
  );
}

function PillarCard({ icon, titleKey, defaultTitle, descKey, defaultDesc }: any) {
  return (
    <Card className="group border-slate-100 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.1)] transition-all duration-500 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:-translate-y-2 cursor-default overflow-hidden">
      <CardHeader className="text-center pb-2">
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110 group-hover:rotate-3 duration-500 overflow-hidden relative">
          <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          {icon}
        </div>
        <CardTitle className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          <EditableOptionText
            optionKey={titleKey}
            defaultValue={defaultTitle}
            as="span"
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-center text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
          <EditableOptionText
            optionKey={descKey}
            defaultValue={defaultDesc}
            as="span"
            multiline={false}
          />
        </CardDescription>
      </CardContent>
    </Card>
  );
}
