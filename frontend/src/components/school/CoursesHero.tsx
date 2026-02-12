import React from 'react';

/**
 * CoursesHero
 * pt-BR: Seção hero para cursos públicos, com título, subtítulo e CTA.
 * en-US: Public courses hero section with title, subtitle and CTA.
 */
export default function CoursesHero() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-slate-900 border border-white/5 shadow-2xl">
      {/* Mesh Gradient Background Elements */}
      <div className="absolute inset-0 z-0 bg-primary/5">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-secondary/20 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-primary/10 blur-[100px] rounded-full" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        <div className="container mx-auto px-8 py-20 md:py-32 flex flex-col items-center text-center md:items-start md:text-left">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md text-primary-foreground/90 text-xs font-bold uppercase tracking-widest mb-6 animate-in fade-in slide-in-from-top duration-1000">
            Nossos Cursos
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-6 animate-in fade-in slide-in-from-bottom duration-700 fill-mode-both">
            Aprenda, Evolua, <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Transforme.</span>
          </h1>
          <p className="max-w-xl text-lg md:text-xl text-slate-300/90 font-medium leading-relaxed mb-10 animate-in fade-in slide-in-from-bottom duration-1000 delay-200 fill-mode-both">
            Conteúdos objetivos desenvolvidos por especialistas para impulsionar sua carreira com suporte dedicado em cada etapa.
          </p>
          <div className="animate-in fade-in slide-in-from-bottom duration-1000 delay-300 fill-mode-both">
            <a 
              href="#courses" 
              className="group relative inline-flex items-center justify-center h-14 px-10 rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] hover:shadow-primary/40 active:scale-95 transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10">Explorar cursos</span>
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}