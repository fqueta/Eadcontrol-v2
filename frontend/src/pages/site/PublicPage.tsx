import { useEffect } from "react";
import InclusiveSiteLayout from "@/components/layout/InclusiveSiteLayout";
import { useParams } from "react-router-dom";
import { pagesService } from "@/services/pagesService";
import { useQuery } from "@tanstack/react-query";
import { syncBrandingToMetaTags } from "@/lib/branding";

export default function PublicPage() {
  const { slug = "" } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["pages", "public", slug],
    queryFn: async () => {
      const res = await pagesService.getPublicBySlug(slug);
      return res?.data;
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (data?.metaTitle || data?.metaDescription) {
      syncBrandingToMetaTags({
        name: data?.metaTitle || data?.title || "",
        slogan: "",
        description: data?.metaDescription || "",
      });
      if (data?.metaTitle) {
        document.title = data.metaTitle;
      }
    }
  }, [data?.metaTitle]);

  return (
    <InclusiveSiteLayout>
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : error ? (
          <div className="text-sm text-red-600">Erro ao carregar página.</div>
        ) : !data ? (
          <div className="text-sm text-muted-foreground">Página não encontrada.</div>
        ) : (
          <article className="prose max-w-none">
            <h1 className="mb-4">{data.title}</h1>
            {data.metaDescription && (
              <p className="text-muted-foreground">{data.metaDescription}</p>
            )}
            <div className="mt-6" dangerouslySetInnerHTML={{ __html: data.content || "" }} />
          </article>
        )}
      </div>
    </InclusiveSiteLayout>
  );
}
