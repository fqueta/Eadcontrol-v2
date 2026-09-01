import { useEffect } from "react";
import { syncBrandingToMetaTags, getInstitutionName, getInstitutionSlogan, getInstitutionDescription, getBrandSocialUrl } from "@/lib/branding";

export type SeoData = {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  keywords?: string;
};

/**
 * useSeo
 * pt-BR: Hook centralizado para SEO por rota. Sincroniza document.title,
 *        meta description/og e canonical tanto via DOM direto (fallback)
 *        quanto delegando para syncBrandingToMetaTags.
 */
export function useSeo(data: SeoData) {
  useEffect(() => {
    const canonicalUrl = data.canonical || (typeof window !== "undefined" ? window.location.href.split("?")[0].split("#")[0] : "");

    // Resolve title/desc from branding if not provided
    let title = data.title;
    let description = data.description;
    let image = data.ogImage;

    if (!title) {
      const name = getInstitutionName();
      const slogan = getInstitutionSlogan();
      title = name ? (slogan ? `${name} — ${slogan}` : name) : document.title;
    }
    if (!description) {
      const d = getInstitutionDescription();
      if (d) description = d;
    }
    if (!image) {
      const s = getBrandSocialUrl();
      if (s) image = s;
    }

    // Apply via centralized branding helper (keeps og:title/desc/image)
    const nameForHelper = title || undefined;
    syncBrandingToMetaTags({
      name: nameForHelper,
      slogan: "",
      description: description || undefined,
      social: image || undefined,
      canonical: canonicalUrl || undefined,
    } as any);

    // keywords
    if (data.keywords) {
      let kw = document.querySelector('meta[name="keywords"]') as HTMLMetaElement | null;
      if (!kw) {
        kw = document.createElement("meta");
        kw.setAttribute("name", "keywords");
        document.head.appendChild(kw);
      }
      kw.setAttribute("content", data.keywords);
    }

    // robots
    let robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    if (data.noindex) {
      robots.setAttribute("content", "noindex, nofollow");
    } else {
      // For public pages we want index,follow — but respect existing seo_robots if present
      const seoRobots = (() => {
        try { return localStorage.getItem("seo_robots") || ""; } catch { return ""; }
      })();
      robots.setAttribute("content", seoRobots || "index, follow");
    }

    // og:type
    if (data.ogType) {
      let ogType = document.querySelector('meta[property="og:type"]') as HTMLMetaElement | null;
      if (!ogType) {
        ogType = document.createElement("meta");
        ogType.setAttribute("property", "og:type");
        document.head.appendChild(ogType);
      }
      ogType.setAttribute("content", data.ogType);
    }

    // Ensure og:url exists
    if (canonicalUrl) {
      let ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
      if (!ogUrl) {
        ogUrl = document.createElement("meta");
        ogUrl.setAttribute("property", "og:url");
        document.head.appendChild(ogUrl);
      }
      ogUrl.setAttribute("content", canonicalUrl);
    }
  }, [data.title, data.description, data.canonical, data.ogImage, data.ogType, data.noindex, data.keywords]);
}
