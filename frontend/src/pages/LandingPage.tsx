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
import { CtaSection } from "@/components/site/CtaSection";

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

      <CtaSection />
    </InclusiveSiteLayout>
  );
};

export default LandingPage;
