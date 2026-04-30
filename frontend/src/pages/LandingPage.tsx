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
import { FeaturedCoursesSection } from "@/components/site/FeaturedCoursesSection";
import { PillarsSection } from "@/components/site/PillarsSection";

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

      <FeaturedCoursesSection />

      <PillarsSection />

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
            <Button size="lg" className="w-full sm:w-auto bg-white text-blue-900 hover:bg-blue-50 rounded-lg h-16 px-12 text-lg font-black shadow-2xl transition-all active:scale-95" asChild>
              <Link to="/register">
                Começar Agora
                <ArrowRight className="ml-2 h-6 w-6" />
              </Link>
            </Button>
            <a href="https://incluireeducar.com.br/" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full bg-transparent border-white/30 text-white hover:bg-white/10 rounded-lg h-16 px-12 text-lg font-black backdrop-blur-md transition-all active:scale-95">
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
