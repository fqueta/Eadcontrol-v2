import React from 'react';

/**
 * CoursesHero
 * pt-BR: Seção hero para cursos públicos, com título, subtítulo e CTA.
 * en-US: Public courses hero section with title, subtitle and CTA.
 */
export default function CoursesHero() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-900 via-violet-800 to-fuchsia-900 text-white shadow-lg">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
      <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl" />
      
      {/**
       * Inner container
       * pt-BR: Mantém o hero em largura total com conteúdo centralizado em container.
       * en-US: Keeps hero full width with content centered in an inner container.
       */}
      <div className="relative">
        <div className="container mx-auto px-6 py-16 md:py-24 flex flex-col items-center text-center md:items-start md:text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-sm">
            Cursos
          </h1>
          <p className="max-w-2xl text-lg md:text-xl text-violet-100/90 leading-relaxed mb-8">
            Aprenda com quem vive a prática. Conteúdos objetivos, módulos bem estruturados e suporte dedicado.
          </p>
          <div>
            <a 
              href="#courses" 
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-base font-semibold text-violet-900 shadow-md hover:bg-violet-50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
            >
              Explorar cursos
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}