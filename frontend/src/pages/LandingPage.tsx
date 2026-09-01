import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, BookOpen, Wrench, Compass, ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import InclusiveSiteLayout from "@/components/layout/InclusiveSiteLayout";
import BrandLogo from "@/components/branding/BrandLogo";
import { getInstitutionName, getInstitutionSlogan, getInstitutionDescription, getBrandSocialUrl, getSeoHomeTitle, getSeoHomeDescription, getSeoHomeKeywords, getSeoRobots, getSeoCanonicalDomain, resolveCanonicalUrl } from "@/lib/branding";
import { EditableOptionText } from "@/components/common/EditableOptionText";
import HeroBanner from "@/components/site/HeroBanner";
import { FeaturedCoursesSection } from "@/components/site/FeaturedCoursesSection";
import { FeaturedProductsSection } from "@/components/site/FeaturedProductsSection";
import { PillarsSection } from "@/components/site/PillarsSection";
import { CtaSection } from "@/components/site/CtaSection";
import { JsonLd, buildHomeJsonLd } from "@/components/seo/JsonLd";
import { useSeo } from "@/hooks/useSeo";

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
    window.addEventListener('branding:updated', handleStorage);
    // Aguarda a hidratação que ocorre no InclusiveSiteLayout
    const timer = setTimeout(handleStorage, 500);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('branding:updated', handleStorage);
      clearTimeout(timer);
    };
  }, []);

  const seoTitle = getSeoHomeTitle() || (institutionName ? (institutionSlogan ? `${institutionName} — ${institutionSlogan}` : institutionName) : "Ead Control");
  const seoDescription = getSeoHomeDescription() || institutionDescription || "Plataforma de ensino a distância — cursos, produtos e conteúdos exclusivos.";
  const seoKeywords = getSeoHomeKeywords();
  const seoRobots = getSeoRobots() || "index, follow";
  const canonical = resolveCanonicalUrl("/");
  const ogImage = getBrandSocialUrl() || (() => { try { return localStorage.getItem('seo_og_image_url') || ""; } catch { return ""; } })();

  useSeo({
    title: seoTitle,
    description: seoDescription,
    canonical,
    ogImage: ogImage || undefined,
    keywords: seoKeywords || undefined,
    ogType: "website",
  });

  const jsonLdData = buildHomeJsonLd({
    name: institutionName || "Ead Control",
    description: seoDescription,
    url: canonical,
    logoUrl: (() => { try { return localStorage.getItem('app_logo_url') || undefined; } catch { return undefined; } })(),
    socialImage: ogImage || undefined,
  });

  return (
    <InclusiveSiteLayout>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        {seoKeywords && <meta name="keywords" content={seoKeywords} />}
        <meta name="robots" content={seoRobots} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:site_name" content={institutionName || "Ead Control"} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
      </Helmet>
      <JsonLd id="ld-home" data={jsonLdData} />
      {/* H1 único para SEO — visível apenas para leitores de tela e crawlers */}
      <h1 className="sr-only">{seoTitle}</h1>
      {/* Hero Section / Banner Rotativo */}
      <HeroBanner
        institutionName={institutionName}
        institutionSlogan={institutionSlogan}
        institutionDescription={institutionDescription}
      />

      <FeaturedCoursesSection />

      <FeaturedProductsSection />

      <PillarsSection />

      <CtaSection />
    </InclusiveSiteLayout>
  );
};

export default LandingPage;
