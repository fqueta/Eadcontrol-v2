import React from 'react';
import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import CoursesHero from '@/components/school/CoursesHero';
import CoursesGrid from '@/components/school/CoursesGrid';

/**
 * CoursesPublicList
 * pt-BR: Página pública de listagem de cursos com hero e grid.
 * en-US: Public courses listing page with hero and grid.
 */
export default function CoursesPublicList() {
  return (
    <InclusiveSiteLayout>
      {/**
       * Container
       * pt-BR: Aplica container com margens laterais para conteúdo da página.
       * en-US: Applies container with lateral margins for page content.
       */}
      <div className="space-y-0">
        <CoursesHero />
        <div className="container mx-auto px-4 -mt-4">
          <CoursesGrid />
        </div>
      </div>
    </InclusiveSiteLayout>
  );
}