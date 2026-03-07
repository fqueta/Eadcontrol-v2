import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, BookOpen, Wrench, Compass, ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import InclusiveSiteLayout from "@/components/layout/InclusiveSiteLayout";
import BrandLogo from "@/components/branding/BrandLogo";
import { getInstitutionName, getInstitutionSlogan, getInstitutionDescription } from "@/lib/branding";
import { EditableOptionText } from "@/components/common/EditableOptionText";
import HeroBanner from "@/components/site/HeroBanner";

/**
 * LandingPage
 * pt-BR: Página inicial pública usando `InclusiveSiteLayout` e `BrandLogo`.
 *        Os textos do hero são lidos dinamicamente das configurações de branding.
 *        Para editar: Painel Admin → Configurações → Sistema → Identidade Institucional.
 */
const LandingPage = ({ linkLoja }: { linkLoja?: string }) => {
  const [institutionName, setInstitutionName] = useState(getInstitutionName);
  const [institutionSlogan, setInstitutionSlogan] = useState(getInstitutionSlogan);
  const [institutionDescription, setInstitutionDescription] = useState(getInstitutionDescription);

  // Re-lê os valores após a hidratação da API (sincronizado com InclusiveSiteLayout)
  useEffect(() => {
    const handleStorage = () => {
      setInstitutionName(getInstitutionName());
      setInstitutionSlogan(getInstitutionSlogan());
      setInstitutionDescription(getInstitutionDescription());
    };
    window.addEventListener('storage', handleStorage);
    // Aguarda a hidratação que ocorre no InclusiveSiteLayout
    const timer = setTimeout(handleStorage, 500);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearTimeout(timer);
    };
  }, []);

  return (
    <InclusiveSiteLayout>
      {/* Hero Section / Banner Rotativo */}
      <HeroBanner
        institutionName={institutionName}
        institutionSlogan={institutionSlogan}
        institutionDescription={institutionDescription}
      />

      {/* Features Section with Modern Background Elements */}
      <section className="relative py-32 px-4 overflow-hidden bg-white/40 dark:bg-slate-950/40">
        {/* Decorative Blobs */}
        <div className="absolute top-0 -left-20 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Nossos Pilares</h2>
            <div className="w-24 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto rounded-full" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
            <Card className="group border-slate-100 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.1)] transition-all duration-500 rounded-[2rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:-translate-y-2 cursor-default overflow-hidden">
              <CardHeader className="text-center pb-2">
                <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110 group-hover:rotate-3 duration-500 overflow-hidden relative">
                  <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <BookOpen className="h-10 w-10 text-blue-600 dark:text-blue-400 relative z-10" />
                </div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  <EditableOptionText
                    optionKey="home_feature_1_title"
                    defaultValue="Plataforma Pedagógica"
                    as="span"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  <EditableOptionText
                    optionKey="home_feature_1_desc"
                    defaultValue="Planos de aula e avaliações alinhados à BNCC."
                    as="span"
                    multiline={false}
                  />
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group border-slate-100 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.1)] transition-all duration-500 rounded-[2rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:-translate-y-2 cursor-default overflow-hidden">
              <CardHeader className="text-center pb-2">
                <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110 group-hover:-rotate-3 duration-500 overflow-hidden relative">
                  <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Plane className="h-10 w-10 text-blue-600 dark:text-blue-400 relative z-10" />
                </div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  <EditableOptionText
                    optionKey="home_feature_2_title"
                    defaultValue="Comunicação Alternativa"
                    as="span"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  <EditableOptionText
                    optionKey="home_feature_2_desc"
                    defaultValue="Autonomia e autoestima através de linguagem acessível."
                    as="span"
                    multiline={false}
                  />
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group border-slate-100 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.1)] transition-all duration-500 rounded-[2rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:-translate-y-2 cursor-default overflow-hidden">
              <CardHeader className="text-center pb-2">
                <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110 group-hover:rotate-6 duration-500 overflow-hidden relative">
                  <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Wrench className="h-10 w-10 text-blue-600 dark:text-blue-400 relative z-10" />
                </div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  <EditableOptionText
                    optionKey="home_feature_3_title"
                    defaultValue="Suporte de Ponta a Ponta"
                    as="span"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  <EditableOptionText
                    optionKey="home_feature_3_desc"
                    defaultValue="Acompanhamento completo de implantação à operação."
                    as="span"
                    multiline={false}
                  />
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group border-slate-100 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.1)] transition-all duration-500 rounded-[2rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:-translate-y-2 cursor-default overflow-hidden">
              <CardHeader className="text-center pb-2">
                <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110 group-hover:-rotate-6 duration-500 overflow-hidden relative">
                  <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Compass className="h-10 w-10 text-blue-600 dark:text-blue-400 relative z-10" />
                </div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  <EditableOptionText
                    optionKey="home_feature_4_title"
                    defaultValue="Soluções Personalizadas"
                    as="span"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  <EditableOptionText
                    optionKey="home_feature_4_desc"
                    defaultValue="Respeito à individualidade de cada aluno."
                    as="span"
                    multiline={false}
                  />
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section - Modernized */}
      <section className="relative py-32 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-blue-900 z-0">
           <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 opacity-90" />
           <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        </div>

        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-8 tracking-tight">Pronto para o próximo nível?</h2>
          <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
            Junte-se a centenas de instituições que já transformaram seu processo pedagógico com inclusividade e tecnologia.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button size="lg" className="w-full sm:w-auto bg-white text-blue-900 hover:bg-blue-50 rounded-2xl h-16 px-12 text-lg font-black shadow-2xl transition-all active:scale-95" asChild>
              <Link to="/register">
                Começar Agora
                <ArrowRight className="ml-2 h-6 w-6" />
              </Link>
            </Button>
            <a href="https://incluireeducar.com.br/" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full bg-transparent border-white/30 text-white hover:bg-white/10 rounded-2xl h-16 px-12 text-lg font-black backdrop-blur-md transition-all active:scale-95">
                Ver Site Oficial
                <ExternalLink className="ml-2 h-6 w-6" />
              </Button>
            </a>
          </div>
        </div>
      </section>
    </InclusiveSiteLayout>
  );
};

export default LandingPage;
