import React from 'react';

/**
 * CoursesHero
 * pt-BR: Seção hero para cursos públicos, com título, subtítulo e CTA.
 * en-US: Public courses hero section with title, subtitle and CTA.
 */
export default function CoursesHero() {
  return (
    <section className="relative overflow-hidden rounded-lg bg-gradient-to-r from-violet-700 via-violet-600 to-fuchsia-600 text-white">
      <div className="absolute inset-0 opacity-20 bg-[url('/placeholder.svg')] bg-cover bg-center" />
      {/**
       * Inner container
       * pt-BR: Mantém o hero em largura total com conteúdo centralizado em container.
       * en-US: Keeps hero full width with content centered in an inner container.
       */}
      <div className="relative">
        <div className="container mx-auto px-4 py-14 md:py-20">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Cursos</h1>
          <p className="mt-3 max-w-3xl text-sm md:text-base text-violet-100">
            Aprenda com quem vive a prática. Conteúdos objetivos, módulos bem estruturados e suporte dedicado.
          </p>
          <div className="mt-6">
            <a href="#courses" className="inline-flex items-center rounded-md bg-white/90 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-white">
              Explorar cursos
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}