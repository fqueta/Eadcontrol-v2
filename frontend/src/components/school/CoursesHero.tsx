import React from 'react';

/**
 * CoursesHero
 * pt-BR: Seção hero para cursos públicos, com título, subtítulo e CTA.
 * en-US: Public courses hero section with title, subtitle and CTA.
 */
export default function CoursesHero() {
  return (
    <section className="relative pt-16 pb-8 px-4 overflow-hidden">
      {/* Content */}
      <div className="relative z-10">
        <div className="container mx-auto flex flex-col items-center text-center">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md text-primary text-xs font-bold uppercase tracking-widest mb-6 animate-in fade-in slide-in-from-top duration-1000">
            Nossos Cursos
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white mb-6 animate-in fade-in slide-in-from-bottom duration-700 fill-mode-both">
            Aprenda, Evolua, <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">Transforme.</span>
          </h1>
          <p className="max-w-2xl text-lg md:text-xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-8 animate-in fade-in slide-in-from-bottom duration-1000 delay-200 fill-mode-both">
            Conteúdos objetivos desenvolvidos por especialistas para impulsionar sua carreira com suporte dedicado em cada etapa.
          </p>
        </div>
      </div>
    </section>
  );
}