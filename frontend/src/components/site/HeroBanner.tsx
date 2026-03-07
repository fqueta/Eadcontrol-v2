import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/branding/BrandLogo';
import { bannerService, BannerSlide } from '@/services/bannerService';
import { getInstitutionName, getInstitutionSlogan, getInstitutionDescription } from '@/lib/branding';
import HeroImageEditor from './HeroImageEditor';
import { EditableOptionText } from '@/components/common/EditableOptionText';

/**
 * HeroBannerProps
 */
interface HeroBannerProps {
  /** Fallback: nome da instituição para exibir quando não há banners */
  institutionName?: string;
  /** Fallback: slogan para exibir quando não há banners */
  institutionSlogan?: string;
  /** Fallback: descrição para exibir quando não há banners */
  institutionDescription?: string;
}

/**
 * HeroBanner
 * pt-BR: Componente de banner rotativo para a landing page.
 *        Busca slides do tipo 'banner_slide' via API pública.
 *        Exibe fallback estático caso não haja slides cadastrados.
 * en-US: Rotating banner component for the landing page.
 *        Fetches slides of type 'banner_slide' via public API.
 *        Shows a static fallback if no slides are registered.
 */
export function HeroBanner({ institutionName, institutionSlogan, institutionDescription }: HeroBannerProps) {
  const [slides, setSlides] = useState<BannerSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Resolve fallbacks from branding
  const name = institutionName || getInstitutionName() || '';
  const slogan = institutionSlogan || getInstitutionSlogan() || '';
  const description = institutionDescription || getInstitutionDescription() || '';

  useEffect(() => {
    bannerService.getPublicBanners().then((data) => {
      setSlides(data);
      setIsLoading(false);
    });
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Auto-advance timer
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const timer = setInterval(goToNext, 5000);
    return () => clearInterval(timer);
  }, [slides.length, isPaused, goToNext]);

  // No slides registered → render the static fallback hero
  if (!isLoading && slides.length === 0) {
    return <StaticHero name={name} slogan={slogan} description={description} />;
  }

  const current = slides[currentIndex];

  return (
    <section
      className="relative md:h-[85vh] min-h-[600px] flex items-center px-4 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background image with enhanced overlay */}
      {current?.image_url && (
        <div className="absolute inset-0 z-0">
          <img
            src={current.image_url}
            alt={current.title}
            className="w-full h-full object-cover transition-transform duration-1000 transform scale-105"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60"
            style={{ opacity: current.config?.overlay_opacity ?? 0.6 }}
          />
        </div>
      )}

      {/* Modernized Content Container (Glassmorphism) */}
      <div className="container mx-auto relative z-10">
        <div className="max-w-5xl mx-auto p-8 md:p-12 rounded-[2.5rem] bg-black/20 backdrop-blur-xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-1000 text-center">
          <div className="inline-block p-1 rounded-full bg-white/5 border border-white/10 mb-6 group transition-transform hover:scale-110">
            <BrandLogo alt="Logo" className="h-12 w-auto drop-shadow-2xl animate-pulse" />
          </div>
          
          <p className="text-sm md:text-base text-blue-300 font-bold uppercase tracking-[0.3em] mb-4 drop-shadow-sm">{name}</p>

          <h1
            className="text-5xl md:text-8xl font-black mb-8 leading-[1.1] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70"
            style={{ color: current?.config?.text_color ?? undefined }}
          >
            {current?.title}
          </h1>

          {current?.subtitle && (
            <p
              className="text-xl md:text-2xl mb-8 font-medium text-slate-200/90 leading-relaxed max-w-2xl mx-auto"
            >
              {current.subtitle}
            </p>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            {current?.config?.cta_url ? (
              <Button size="lg" asChild className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white rounded-xl h-14 px-10 text-lg font-bold transition-all shadow-xl hover:shadow-blue-500/20 active:scale-95">
                <Link to={current.config.cta_url}>
                  {current.config.cta_label || 'Saiba mais'}
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Link>
              </Button>
            ) : (
              <Button size="lg" asChild className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white rounded-xl h-14 px-10 text-lg font-bold transition-all shadow-xl hover:shadow-blue-500/20 active:scale-95">
                <Link to="/cursos">Ver Cursos <ArrowRight className="ml-2 h-6 w-6" /></Link>
              </Button>
            )}
            
            <a href="https://incluireeducar.com.br/" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl h-14 px-10 text-lg font-bold transition-all backdrop-blur-sm">
                Conhecer o site
                <ExternalLink className="ml-2 h-5 w-5" />
              </Button>
            </a>

            <div className="w-full sm:w-auto">
              <HeroImageEditor 
                size="lg" 
                className="w-full sm:w-auto bg-fuchsia-600 hover:bg-fuchsia-500 text-white border-transparent h-14 px-10 rounded-xl font-bold transition-all shadow-xl hover:shadow-fuchsia-500/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pagination & Arrows - Minimalist */}
      {slides.length > 1 && (
        <>
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3 z-30">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-12 h-1 rounded-full transition-all duration-500 ${
                  idx === currentIndex ? 'bg-blue-500' : 'bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>

          <button
            onClick={goToPrev}
            className="absolute left-8 top-1/2 -translate-y-1/2 z-20 p-4 rounded-3xl bg-white/5 hover:bg-white/10 text-white transition-all backdrop-blur-md border border-white/10 group active:scale-90"
          >
            <ChevronLeft className="h-8 w-8 transition-transform group-hover:-translate-x-1" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-8 top-1/2 -translate-y-1/2 z-20 p-4 rounded-3xl bg-white/5 hover:bg-white/10 text-white transition-all backdrop-blur-md border border-white/10 group active:scale-90"
          >
            <ChevronRight className="h-8 w-8 transition-transform group-hover:translate-x-1" />
          </button>
        </>
      )}
    </section>
  );
}

/**
 * StaticHero
 * pt-BR: Fallback estático para quando não há banners cadastrados.
 * en-US: Static fallback when no banners are registered.
 */
function StaticHero({ name, slogan, description }: { name: string; slogan: string; description: string }) {
  const [heroImage, setHeroImage] = useState(() => localStorage.getItem('home_hero_image_url') || '');

  // Listen for image updates from HeroImageEditor
  useEffect(() => {
    const handleStorage = () => {
      const updatedImage = localStorage.getItem('home_hero_image_url');
      if (updatedImage !== heroImage) {
        setHeroImage(updatedImage || '');
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('branding:updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('branding:updated', handleStorage);
    };
  }, [heroImage]);

  return (
    <section className="relative md:h-[85vh] min-h-[600px] flex items-center px-4 overflow-hidden group">
      {/* Background image with high quality restoration */}
      <div className="absolute inset-0 z-0">
        {heroImage ? (
          <img
            src={heroImage}
            alt="Hero Background"
            className="w-full h-full object-cover transition-transform duration-[10s] transform group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-slate-200" />
        )}
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] transition-all duration-700" />
      </div>

      <div className="container mx-auto relative z-10">
        <div className="max-w-5xl mx-auto p-8 md:p-12 rounded-[2.5rem] bg-white/30 backdrop-blur-md border border-white/40 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 text-center">
          <div className="inline-block p-1 rounded-3xl bg-white/40 border border-white/60 mb-8 shadow-sm animate-bounce-slow">
            <BrandLogo alt="Logo" className="h-16 w-auto drop-shadow-sm" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black mb-10 tracking-tight leading-[1] bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
            <EditableOptionText
              optionKey="home_banner_title"
              defaultValue={name === 'Eadcontrol' ? (slogan || 'Tecnologia que inclui. Educação que transforma!') : (slogan || name)}
              as="span"
            />
          </h1>
          
          <div className="text-lg md:text-xl text-slate-800/80 mb-12 max-w-3xl mx-auto font-medium leading-relaxed">
            <EditableOptionText
              optionKey="home_banner_desc"
              defaultValue={description || 'Soluções educacionais inclusivas: plataformas pedagógicas, comunicação alternativa e mais.'}
              as="span"
              multiline
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <Button size="lg" asChild className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-14 px-10 text-lg font-extrabold transition-all shadow-xl hover:shadow-primary/30 active:scale-95 border-none">
              <Link to="/cursos">
                Ver Cursos <ArrowRight className="ml-2 h-6 w-6" />
              </Link>
            </Button>

            <a href="https://incluireeducar.com.br/" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full bg-secondary hover:bg-secondary/90 border-transparent text-secondary-foreground rounded-xl h-14 px-10 text-lg font-extrabold transition-all shadow-xl hover:shadow-secondary/30 active:scale-95">
                Conhecer o site <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </a>

            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto bg-white/80 hover:bg-white border-slate-200 text-primary rounded-xl h-14 px-10 text-lg font-extrabold transition-all shadow-sm backdrop-blur-sm">
              <Link to="/register">Cadastrar</Link>
            </Button>

            <div className="w-full sm:w-auto">
              <HeroImageEditor 
                size="lg" 
                onChanged={(url) => setHeroImage(url)} 
                className="w-full sm:w-auto bg-primary/20 hover:bg-primary/30 text-primary border-primary/20 h-14 px-10 rounded-xl font-extrabold transition-all shadow-sm active:scale-95 backdrop-blur-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroBanner;
