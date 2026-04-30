import { getTenantApiUrl, getVersionApi } from '@/lib/qlib';

/**
 * BannerSlide
 * pt-BR: Representa um slide do banner rotativo da landing page.
 * en-US: Represents a single slide in the rotating landing page banner.
 */
export interface BannerSlide {
  id: number;
  title: string;
  subtitle: string | null;
  content: string | null;
  image_url: string | null;
  menu_order: number;
  config: {
    cta_label?: string;
    cta_url?: string;
    cta_label2?: string;
    cta_url2?: string;
    overlay_opacity?: number;
    text_color?: string;
    titleSize?: number;
  };
}

/**
 * bannerService
 * pt-BR: Serviço para buscar banners públicos sem necessidade de autenticação.
 *        Usa o endpoint público /public/posts/banners.
 * en-US: Service to fetch public banners without authentication.
 *        Uses the public endpoint /public/posts/banners.
 */
class BannerService {
  private getBaseUrl(): string {
    return getTenantApiUrl() + getVersionApi();
  }

  /**
   * Busca os banners ativos do tipo banner_slide (sem autenticação)
   */
  async getPublicBanners(): Promise<BannerSlide[]> {
    try {
      const url = `${this.getBaseUrl()}/public/posts/banners`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return [];
      const json = await response.json();
      return Array.isArray(json.data) ? json.data : [];
    } catch {
      return [];
    }
  }
}

export const bannerService = new BannerService();
