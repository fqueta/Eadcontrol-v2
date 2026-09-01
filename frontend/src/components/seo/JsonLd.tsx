import { useEffect } from "react";

/**
 * JsonLd
 * pt-BR: Injeta JSON-LD no <head> e remove ao desmontar.
 *        Usado para Organization, WebSite, ItemList, Course, etc.
 */
export function JsonLd({ data, id }: { data: Record<string, any> | Record<string, any>[]; id: string }) {
  useEffect(() => {
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    el.text = JSON.stringify(data);
    document.head.appendChild(el);
    return () => {
      const existing = document.getElementById(id);
      if (existing) existing.remove();
    };
  }, [id, JSON.stringify(data)]);

  return null;
}

/**
 * buildHomeJsonLd
 * pt-BR: Gera schemas para a home: Organization, WebSite, ItemList (cursos).
 */
export function buildHomeJsonLd(params: {
  name: string;
  description: string;
  url: string;
  logoUrl?: string;
  socialImage?: string;
  courses?: Array<{ name: string; url: string; image?: string; description?: string }>;
}) {
  const { name, description, url, logoUrl, socialImage, courses } = params;
  const origin = (() => { try { return new URL(url).origin; } catch { return url; } })();

  const organization: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: origin,
    description,
    ...(logoUrl ? { logo: logoUrl } : {}),
    ...(socialImage ? { image: socialImage } : {}),
  };

  const website: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url: origin,
    description,
    inLanguage: "pt-BR",
    ...(socialImage ? { image: socialImage } : {}),
    potentialAction: {
      "@type": "SearchAction",
      target: `${origin}/cursos?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const itemList = courses && courses.length
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `Cursos em destaque - ${name}`,
        numberOfItems: courses.length,
        itemListElement: courses.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: c.url,
          name: c.name,
          ...(c.image ? { image: c.image } : {}),
          ...(c.description ? { description: c.description } : {}),
        })),
      }
    : null;

  const breadcrumb: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: origin + "/" },
      { "@type": "ListItem", position: 2, name: "Cursos", item: origin + "/cursos" },
      { "@type": "ListItem", position: 3, name: "Produtos", item: origin + "/produtos" },
    ],
  };

  return itemList ? [organization, website, itemList, breadcrumb] : [organization, website, breadcrumb];
}
