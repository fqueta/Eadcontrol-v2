import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/branding/BrandLogo';
import { bannerService, BannerSlide } from '@/services/bannerService';
import { getInstitutionName, getInstitutionSlogan, getInstitutionDescription } from '@/lib/branding';
import HeroImageEditor from './HeroImageEditor';
import { EditableOptionText } from '@/components/common/EditableOptionText';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);
  return isMobile;
}

function useHeroSettings() {
  const [showOverlay, setShowOverlay] = useState(() => localStorage.getItem('home_hero_show_overlay') !== 'false');
  const [showTexts, setShowTexts] = useState(() => localStorage.getItem('home_hero_show_texts') !== 'false');
  const [showButton, setShowButton] = useState(() => localStorage.getItem('home_hero_show_button') !== 'false');
  const [autoplayInterval, setAutoplayInterval] = useState(() => Number(localStorage.getItem('home_hero_autoplay_interval') || 6) * 1000);
  const [headerTransparent, setHeaderTransparent] = useState(() => {
    try {
      const saved = localStorage.getItem('appearanceSettings');
      return saved ? !!JSON.parse(saved).headerTransparent : false;
    } catch {
      return false;
    }
  });

  const updateSettings = useCallback(() => {
    setShowOverlay(localStorage.getItem('home_hero_show_overlay') !== 'false');
    setShowTexts(localStorage.getItem('home_hero_show_texts') !== 'false');
    setShowButton(localStorage.getItem('home_hero_show_button') !== 'false');
    setAutoplayInterval(Number(localStorage.getItem('home_hero_autoplay_interval') || 6) * 1000);
    try {
      const saved = localStorage.getItem('appearanceSettings');
      setHeaderTransparent(saved ? !!JSON.parse(saved).headerTransparent : false);
    } catch {}
  }, []);

  useEffect(() => {
    window.addEventListener('hero_settings_updated', updateSettings);
    window.addEventListener('storage', updateSettings);
    window.addEventListener('branding:updated', updateSettings);
    return () => {
      window.removeEventListener('hero_settings_updated', updateSettings);
      window.removeEventListener('storage', updateSettings);
      window.removeEventListener('branding:updated', updateSettings);
    };
  }, [updateSettings]);

  return { showOverlay, showTexts, showButton, autoplayInterval, headerTransparent };
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
  const { showOverlay, showTexts, showButton, autoplayInterval, headerTransparent } = useHeroSettings();
  const isMobile = useIsMobile();

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
    <section className={`relative ${
      headerTransparent 
        ? 'h-[75vh] sm:h-[85vh] md:h-screen min-h-[500px] sm:min-h-[600px] md:min-h-[800px]' 
        : 'h-[60vh] sm:h-[70vh] md:h-[calc(100vh-64px)] min-h-[420px] sm:min-h-[500px] md:min-h-[700px]'
    } w-full overflow-hidden bg-slate-900`}>
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
              style={{ 
                backgroundImage: `url(${
                  isMobile && (slide.config?.mobile_image_url || (slide as any).image_mobile_url)
                    ? (slide.config.mobile_image_url || (slide as any).image_mobile_url)
                    : slide.image_url
                })` 
              }}
            />
            {/* Modern Overlay Gradient */}
            {(slide.config?.showOverlay !== false && (slide.config?.showOverlay !== undefined ? slide.config.showOverlay : showOverlay)) && (
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/50 to-transparent z-10" />
            )}
            
            <div className={`container mx-auto h-full relative z-20 flex px-6 md:px-12 pointer-events-none ${
              slide.config?.buttonPosY === 'top' ? 'items-start pt-20 sm:pt-32' :
              slide.config?.buttonPosY === 'bottom' ? 'items-end pb-24 sm:pb-36' :
              'items-center'
            }`}>
              <div className={`max-w-3xl transition-all duration-1000 transform pointer-events-auto ${index === selectedIndex ? 'translate-x-0 opacity-100' : '-translate-x-12 opacity-0'}`}>
                {(slide.config?.showTexts !== false && (slide.config?.showTexts !== undefined ? slide.config.showTexts : showTexts)) && (
                  <>
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs sm:text-sm mb-4 md:mb-8 backdrop-blur-md">
                      <Play className="h-4 w-4 fill-current" />
                      <span className="uppercase tracking-widest">{name}</span>
                    </div>
                    
                    <h2 
                      className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-3 md:mb-6 leading-[1.1] tracking-tighter drop-shadow-lg"
                      style={slide.config?.titleSize ? { fontSize: isMobile ? `${Math.min(slide.config.titleSize, 32)}px` : `${slide.config.titleSize}px`, lineHeight: '1.2' } : {}}
                    >
                      {slide.title || slogan}
                    </h2>
                    
                    <p className="text-sm sm:text-lg md:text-xl text-slate-300 mb-5 md:mb-10 max-w-xl leading-relaxed font-medium drop-shadow">
                      {slide.subtitle || description}
                    </p>
                  </>
                )}

                <div className={`flex flex-col sm:flex-row items-center gap-5 w-full ${
                  slide.config?.buttonAlign === 'center' ? 'justify-center' :
                  slide.config?.buttonAlign === 'right' ? 'justify-end' : 'justify-start'
                }`}>
                  {(slide.config?.showButton !== false && (slide.config?.showButton !== undefined ? slide.config.showButton : showButton)) && (
                    <Button size="lg" className="w-full sm:w-auto h-12 md:h-16 px-6 md:px-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm md:text-lg shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95" asChild>
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
  mobileUrl?: string;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  titleSize?: number;
  buttonAlign?: 'left' | 'center' | 'right';
  buttonPosY?: 'top' | 'center' | 'bottom';
  showTexts?: boolean;
  showButton?: boolean;
  showOverlay?: boolean;
};

/**
 * StaticCarousel
 * pt-BR: Fallback que suporta múltiplas imagens locais ou configurações de branding.
 */
function StaticCarousel({ name, slogan, description }: { name: string; slogan: string; description: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [displayImages, setDisplayImages] = useState<StaticSlide[]>([]);
  const { showOverlay, showTexts, showButton, autoplayInterval, headerTransparent } = useHeroSettings();
  const isMobile = useIsMobile();

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
    <section className={`relative ${
      headerTransparent 
        ? 'h-[75vh] sm:h-[85vh] md:h-screen min-h-[500px] sm:min-h-[600px] md:min-h-[800px]' 
        : 'h-[60vh] sm:h-[70vh] md:h-[calc(100vh-64px)] min-h-[420px] sm:min-h-[500px] md:min-h-[700px]'
    } w-full overflow-hidden bg-slate-900`}>
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
              style={{ 
                backgroundImage: `url(${isMobile && img.mobileUrl ? img.mobileUrl : img.url})` 
              }}
            />
            {(img.showOverlay !== false && (img.showOverlay !== undefined ? img.showOverlay : showOverlay)) && (
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/50 to-transparent z-10" />
            )}
            
            <div className={`container mx-auto h-full relative z-20 flex px-6 md:px-12 pointer-events-none ${
              img.buttonPosY === 'top' ? 'items-start pt-20 sm:pt-32' :
              img.buttonPosY === 'bottom' ? 'items-end pb-24 sm:pb-36' :
              'items-center'
            }`}>
              <div className={`max-w-3xl transition-all duration-1000 transform pointer-events-auto ${index === selectedIndex ? 'translate-x-0 opacity-100' : '-translate-x-12 opacity-0'}`}>
                {(img.showTexts !== false && (img.showTexts !== undefined ? img.showTexts : showTexts)) && (
                  <>
                    <div className="mb-4 md:mb-8">
                      <BrandLogo className="h-10 md:h-16 w-auto drop-shadow-lg" />
                    </div>
                    
                    <h2 
                      className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-3 md:mb-6 leading-[1.1] tracking-tighter drop-shadow-lg"
                      style={img.titleSize ? { fontSize: isMobile ? `${Math.min(img.titleSize, 32)}px` : `${img.titleSize}px`, lineHeight: '1.2' } : {}}
                    >
                      {img.title ? img.title : (
                        <EditableOptionText 
                          optionKey="home_hero_title" 
                          defaultValue={slogan || 'Sua plataforma de ensino inclusiva.'} 
                          multiline={false}
                        />
                      )}
                    </h2>
                    
                    <p className="text-sm sm:text-lg md:text-xl text-slate-300 mb-5 md:mb-10 max-w-xl leading-relaxed font-medium drop-shadow">
                      {img.subtitle ? img.subtitle : (
                        <EditableOptionText 
                          optionKey="home_hero_description" 
                          defaultValue={description || 'Soluções educacionais inclusivas: plataformas pedagógicas e mais.'} 
                        />
                      )}
                    </p>
                  </>
                )}

                <div className={`flex flex-col sm:flex-row items-center gap-5 w-full ${
                  img.buttonAlign === 'center' ? 'justify-center' :
                  img.buttonAlign === 'right' ? 'justify-end' : 'justify-start'
                }`}>
                  {(img.showButton !== false && (img.showButton !== undefined ? img.showButton : showButton)) && (
                    <Button size="lg" className="w-full sm:w-auto h-12 md:h-16 px-6 md:px-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm md:text-lg shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95" asChild>
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
