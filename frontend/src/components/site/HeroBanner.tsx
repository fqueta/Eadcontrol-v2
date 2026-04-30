import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/branding/BrandLogo';
import { bannerService, BannerSlide } from '@/services/bannerService';
import { getInstitutionName, getInstitutionSlogan, getInstitutionDescription } from '@/lib/branding';
import HeroImageEditor from './HeroImageEditor';
import { EditableOptionText } from '@/components/common/EditableOptionText';

function useHeroSettings() {
  const [showOverlay, setShowOverlay] = useState(() => localStorage.getItem('home_hero_show_overlay') !== 'false');
  const [showTexts, setShowTexts] = useState(() => localStorage.getItem('home_hero_show_texts') !== 'false');
  const [showButton, setShowButton] = useState(() => localStorage.getItem('home_hero_show_button') !== 'false');
  const [autoplayInterval, setAutoplayInterval] = useState(() => Number(localStorage.getItem('home_hero_autoplay_interval') || 6) * 1000);

  const updateSettings = useCallback(() => {
    setShowOverlay(localStorage.getItem('home_hero_show_overlay') !== 'false');
    setShowTexts(localStorage.getItem('home_hero_show_texts') !== 'false');
    setShowButton(localStorage.getItem('home_hero_show_button') !== 'false');
    setAutoplayInterval(Number(localStorage.getItem('home_hero_autoplay_interval') || 6) * 1000);
  }, []);

  useEffect(() => {
    window.addEventListener('hero_settings_updated', updateSettings);
    return () => {
      window.removeEventListener('hero_settings_updated', updateSettings);
    };
  }, [updateSettings]);

  return { showOverlay, showTexts, showButton, autoplayInterval };
}

/**
 * HeroBannerProps
 */
interface HeroBannerProps {
  institutionName?: string;
  institutionSlogan?: string;
  institutionDescription?: string;
}

/**
 * HeroBanner
 * pt-BR: Componente de banner rotativo premium para a landing page.
 *        Refatorado para não usar bibliotecas de terceiros complexas,
 *        evitando erros de cache/hooks do React.
 */
export function HeroBanner({ institutionName, institutionSlogan, institutionDescription }: HeroBannerProps) {
  const [slides, setSlides] = useState<BannerSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { showOverlay, showTexts, showButton, autoplayInterval } = useHeroSettings();

  // Resolve fallbacks from branding
  const name = institutionName || getInstitutionName() || '';
  const slogan = institutionSlogan || getInstitutionSlogan() || '';
  const description = institutionDescription || getInstitutionDescription() || '';

  useEffect(() => {
    bannerService.getPublicBanners().then((data) => {
      setSlides(data);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
  }, []);

  const scrollPrev = useCallback(() => {
    setSelectedIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  }, [slides.length]);

  const scrollNext = useCallback(() => {
    setSelectedIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  }, [slides.length]);

  const scrollTo = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  // Auto-play logic
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setSelectedIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, autoplayInterval);
    return () => clearInterval(interval);
  }, [slides.length, autoplayInterval]);

  // No slides registered from API → render the static fallback carousel
  if (!isLoading && slides.length === 0) {
    return <StaticCarousel name={name} slogan={slogan} description={description} />;
  }

  return (
    <section className="relative h-[45vh] sm:h-[60vh] md:h-[85vh] min-h-[320px] sm:min-h-[400px] md:min-h-[600px] w-full overflow-hidden bg-slate-900">
      <div className="h-full w-full relative">
        {slides.map((slide, index) => (
          <div 
            key={slide.id} 
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === selectedIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {/* Background */}
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image_url})` }}
            />
            {/* Modern Overlay Gradient */}
            {showOverlay && (
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/50 to-transparent z-10" />
            )}
            
            <div className="container mx-auto h-full relative z-20 flex items-center px-6 md:px-12 pointer-events-none">
              <div className={`max-w-3xl transition-all duration-1000 transform pointer-events-auto ${index === selectedIndex ? 'translate-x-0 opacity-100' : '-translate-x-12 opacity-0'}`}>
                {showTexts && (
                  <>
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-sm mb-8 backdrop-blur-md">
                      <Play className="h-4 w-4 fill-current" />
                      <span className="uppercase tracking-widest">{name}</span>
                    </div>
                    
                    <h2 
                      className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 md:mb-6 leading-[1.1] tracking-tighter drop-shadow-lg"
                      style={slide.config?.titleSize ? { fontSize: `${slide.config.titleSize}px`, lineHeight: '1.2' } : {}}
                    >
                      {slide.title || slogan}
                    </h2>
                    
                    <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-8 md:mb-10 max-w-xl leading-relaxed font-medium drop-shadow">
                      {slide.subtitle || description}
                    </p>
                  </>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {showButton && (
                    <Button size="lg" className="w-full sm:w-auto h-16 px-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95" asChild>
                      <Link to="/cursos">
                        Explorar Cursos
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Controls */}
      {slides.length > 1 && (
        <>
          <button 
            onClick={scrollPrev}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-30 p-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md transition-all active:scale-90"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button 
            onClick={scrollNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-30 p-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md transition-all active:scale-90"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Pagination Indicators */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-3 z-30">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => scrollTo(idx)}
                className={`h-2 rounded-full transition-all duration-500 ${
                  idx === selectedIndex ? 'w-12 bg-primary shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'w-2 bg-white/30'
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Editor do Banner fora do loop para não quebrar layout */}
      <HeroImageEditor 
        className="absolute top-8 right-8 z-50 pointer-events-auto"
      />
    </section>
  );
}

type StaticSlide = {
  url: string;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  titleSize?: number;
};

/**
 * StaticCarousel
 * pt-BR: Fallback que suporta múltiplas imagens locais ou configurações de branding.
 */
function StaticCarousel({ name, slogan, description }: { name: string; slogan: string; description: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [displayImages, setDisplayImages] = useState<StaticSlide[]>([]);
  const { showOverlay, showTexts, showButton, autoplayInterval } = useHeroSettings();

  const updateImages = useCallback(() => {
    try {
      const stored = localStorage.getItem('home_hero_images');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDisplayImages(parsed.map((item: any) => 
            typeof item === 'string' ? { url: item } : item
          ));
          return;
        }
      }
      // Fallback para imagem única ou default
      const single = localStorage.getItem('home_hero_image_url') || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop';
      setDisplayImages([{ url: single }]);
    } catch {
      setDisplayImages([{ url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop' }]);
    }
  }, []);

  useEffect(() => {
    updateImages();
    window.addEventListener('storage', updateImages);
    window.addEventListener('hero_images_updated', updateImages);
    return () => {
      window.removeEventListener('storage', updateImages);
      window.removeEventListener('hero_images_updated', updateImages);
    };
  }, [updateImages]);

  useEffect(() => {
    if (displayImages.length <= 1) return;
    const interval = setInterval(() => {
      setSelectedIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
    }, autoplayInterval);
    return () => clearInterval(interval);
  }, [displayImages.length, autoplayInterval]);

  return (
    <section className="relative h-[45vh] sm:h-[60vh] md:h-[85vh] min-h-[320px] sm:min-h-[400px] md:min-h-[600px] w-full overflow-hidden bg-slate-900">
      <div className="h-full w-full relative">
        {displayImages.map((img, index) => (
          <div 
            key={index} 
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === selectedIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${img.url})` }}
            />
            {showOverlay && (
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/50 to-transparent z-10" />
            )}
            
            <div className="container mx-auto h-full relative z-20 flex items-center px-6 md:px-12 pointer-events-none">
              <div className={`max-w-3xl transition-all duration-1000 transform pointer-events-auto ${index === selectedIndex ? 'translate-x-0 opacity-100' : '-translate-x-12 opacity-0'}`}>
                {showTexts && (
                  <>
                    <div className="mb-8">
                      <BrandLogo className="h-16 w-auto brightness-0 invert opacity-90 drop-shadow-lg" />
                    </div>
                    
                    <h2 
                      className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 md:mb-6 leading-[1.1] tracking-tighter drop-shadow-lg"
                      style={img.titleSize ? { fontSize: `${img.titleSize}px`, lineHeight: '1.2' } : {}}
                    >
                      {img.title ? img.title : (
                        <EditableOptionText 
                          optionKey="home_hero_title" 
                          defaultValue={slogan || 'Sua plataforma de ensino inclusiva.'} 
                          multiline={false}
                        />
                      )}
                    </h2>
                    
                    <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-8 md:mb-10 max-w-xl leading-relaxed font-medium drop-shadow">
                      {img.subtitle ? img.subtitle : (
                        <EditableOptionText 
                          optionKey="home_hero_description" 
                          defaultValue={description || 'Soluções educacionais inclusivas: plataformas pedagógicas e mais.'} 
                        />
                      )}
                    </p>
                  </>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {showButton && (
                    <Button size="lg" className="w-full sm:w-auto h-16 px-10 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95" asChild>
                      <Link to={img.buttonUrl || "/cursos"}>
                        {img.buttonLabel || "Conhecer Cursos"}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {displayImages.length > 1 && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-3 z-30">
          {displayImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={`h-2 rounded-full transition-all duration-500 ${
                idx === selectedIndex ? 'w-12 bg-primary shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'w-2 bg-slate-400/50 hover:bg-slate-300'
              }`}
            />
          ))}
        </div>
      )}

      {/* Editor do Banner fora do loop para não quebrar layout */}
      <HeroImageEditor 
        className="absolute top-8 right-8 z-50 pointer-events-auto"
      />
    </section>
  );
}

export default HeroBanner;
