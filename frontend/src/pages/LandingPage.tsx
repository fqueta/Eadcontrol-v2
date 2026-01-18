import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, BookOpen, Wrench, Compass, ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import InclusiveSiteLayout from "@/components/layout/InclusiveSiteLayout";
import BrandLogo from "@/components/branding/BrandLogo";
import { getInstitutionName, getInstitutionSlogan } from "@/lib/branding";

/**
 * LandingPage
 * pt-BR: Página inicial pública usando `InclusiveSiteLayout` e `BrandLogo`.
 *        `BrandLogo` resolve a logo com fallback (localStorage → window → env → padrão).
 * en-US: Public home page using `InclusiveSiteLayout` and `BrandLogo`.
 *        `BrandLogo` resolves logo with fallback (localStorage → window → env → default).
 */
/**
 * LandingPage
 * pt-BR: Página inicial pública. Lê dinamicamente o nome da instituição das opções
 *        (via util `getInstitutionName`) e o usa nos textos do hero.
 * en-US: Public home page. Dynamically reads institution name from options
 *        (via `getInstitutionName` util) and uses it in hero texts.
 */
const LandingPage = () => {
  // Institution display name and slogan (from saved branding)
  const institutionName = getInstitutionName();
  const institutionSlogan = getInstitutionSlogan();
  return (
    <InclusiveSiteLayout>
      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <div className="mb-8">
            {/* Brand logo — shown atop hero */}
            <BrandLogo alt="Brand Logo" className="h-10 mx-auto mb-4" />
            {/* Institution name and slogan from API/options */}
            <p className="text-base text-primary font-semibold mb-0">{institutionName}</p>
            <p className="text-sm text-muted-foreground mb-2">{institutionSlogan}</p>
            <h1 className="text-5xl md:text-5xl font-bold text-primary mb-6">
              Tecnologia que Inclui
              <span className="text-blue-600 block">Educação que Transforma</span>
            </h1>
            <p className="text-lg text-slate-600 mb-6 max-w-3xl mx-auto">
              Soluções educacionais inclusivas com propósito: plataformas pedagógicas, comunicação alternativa e mais.
            </p>
            <div className="flex gap-3 justify-center">
              <Button size="lg" asChild className="bg-primary hover:bg-blue-700 text-white rounded-md">
                <Link to="/cursos">
                  Cursos
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <a href="https://incluireeducar.com.br/" target="_blank" rel="noreferrer">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-md">
                  Conhecer o site
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
              <Button size="lg" variant="outline" asChild className="border-primary/20 text-primary hover:bg-blue-50 rounded-md">
                <Link to="/public-client-form">Fazer cadastro</Link>
              </Button>
              
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white/60">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-blue-100 dark:border-blue-900/50 hover:shadow-lg transition-shadow rounded-lg">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-primary dark:text-blue-300">Plataforma Pedagógica</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-muted-foreground">
                  Planos de aula e avaliações alinhados à BNCC.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-blue-100 dark:border-blue-900/50 hover:shadow-lg transition-shadow rounded-lg">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Plane className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-primary dark:text-blue-300">Comunicação Alternativa</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-muted-foreground">
                  Autonomia e autoestima através de linguagem acessível.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-blue-100 dark:border-blue-900/50 hover:shadow-lg transition-shadow rounded-lg">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Wrench className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-primary dark:text-blue-300">Suporte de Ponta a Ponta</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-muted-foreground">
                  Acompanhamento completo de implantação à operação.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-blue-100 dark:border-blue-900/50 hover:shadow-lg transition-shadow rounded-lg">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Compass className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-primary dark:text-blue-300">Soluções Personalizadas</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-muted-foreground">
                  Respeito à individualidade de cada aluno.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary to-blue-800">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Pronto para avançar?</h2>
          <p className="text-lg text-blue-50 mb-8 max-w-2xl mx-auto">
            Cadastre-se e conheça nossas soluções inclusivas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-primary hover:bg-blue-50 rounded-md" asChild>
              <Link to="/public-client-form">
                Cadastrar-se
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <a href="https://incluireeducar.com.br/" target="_blank" rel="noreferrer">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary rounded-md">
                Conhecer o site
                <ExternalLink className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </div>
        </div>
      </section>
    </InclusiveSiteLayout>
  );
};

export default LandingPage;