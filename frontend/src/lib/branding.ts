/**
 * getBrandLogoUrl
 * pt-BR: Obtém a URL da logo personalizada a partir de localStorage, window e env.
 *        Ordem de prioridade: localStorage -> window.__APP_LOGO_URL__ -> VITE_SITE_LOGO_URL -> default.
 * en-US: Gets the custom brand logo URL from localStorage, window and env.
 *        Priority order: localStorage -> window.__APP_LOGO_URL__ -> VITE_SITE_LOGO_URL -> default.
 */
export function getBrandLogoUrl(defaultUrl: string = '/logo.png'): string {
  try {
    const ls = localStorage.getItem('app_logo_url');
    if (ls && ls.trim() !== '') return ls.trim();
  } catch {}

  const anyWin = window as any;
  const winLogo = anyWin?.__APP_LOGO_URL__;
  if (typeof winLogo === 'string' && winLogo.trim() !== '') return winLogo.trim();

  const envLogo = (import.meta as any)?.env?.VITE_SITE_LOGO_URL;
  if (typeof envLogo === 'string' && envLogo.trim() !== '') return envLogo.trim();

  return defaultUrl;
}

/**
 * getBrandFaviconUrl
 * pt-BR: Obtém a URL do favicon personalizada do localStorage; caso não exista, retorna vazio.
 * en-US: Gets the custom favicon URL from localStorage; returns empty string if not present.
 */
export function getBrandFaviconUrl(): string {
  try {
    const fav = localStorage.getItem('app_favicon_url');
    return (fav || '').trim();
  } catch {
    return '';
  }
}

/**
 * getInstitutionName
 * pt-BR: Obtém o nome da instituição a partir de múltiplas fontes com fallback.
 *        Prioridade: localStorage ('app_institution_name' | 'site_name' | 'app_name')
 *        → window ('__APP_INSTITUTION_NAME__' | '__APP_SITE_NAME__' | '__APP_APP_NAME__')
 *        → env ('VITE_APP_NAME') → padrão.
 * en-US: Gets the institution name from multiple sources with fallback.
 *        Priority: localStorage ('app_institution_name' | 'site_name' | 'app_name')
 *        → window ('__APP_INSTITUTION_NAME__' | '__APP_SITE_NAME__' | '__APP_APP_NAME__')
 *        → env ('VITE_APP_NAME') → default.
 */
export function getInstitutionName(defaultName: string = 'Ead Control'): string {
  // Try localStorage keys
  try {
    const lsKeys = ['app_institution_name', 'site_name', 'app_name'];
    for (const k of lsKeys) {
      const v = localStorage.getItem(k);
      if (v && v.trim() !== '') return v.trim();
    }
  } catch {}

  // Try window globals
  const anyWin = window as any;
  const winKeys = ['__APP_INSTITUTION_NAME__', '__APP_SITE_NAME__', '__APP_APP_NAME__'];
  for (const wk of winKeys) {
    const v = anyWin?.[wk];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }

  // Try env var
  const envName = (import.meta as any)?.env?.VITE_APP_NAME;
  if (typeof envName === 'string' && envName.trim() !== '') return envName.trim();

  // Se não houve valor, tenta hidratar de forma assíncrona via API sem bloquear retorno.
  // If no value found, try to hydrate asynchronously from API without blocking return.
  try {
    // Dispara em background apenas uma vez; resultado será persistido para próximas chamadas.
    const anyWin = window as any;
    if (!anyWin.__APP_BRANDING_HYDRATED__) {
      anyWin.__APP_BRANDING_HYDRATED__ = true;
      hydrateBrandingFromPublicApi({ persist: true })
        .catch(() => {
          // Permite nova tentativa futura caso falhe
          anyWin.__APP_BRANDING_HYDRATED__ = false;
        });
    }
  } catch {}

  // Fallback
  return defaultName;
}

/**
 * getInstitutionSlogan
 * pt-BR: Obtém o slogan da instituição com fallback (localStorage → window → env → vazio).
 * en-US: Gets institution slogan with fallback (localStorage → window → env → empty).
 */
export function getInstitutionSlogan(defaultSlogan: string = ''): string {
  try {
    const v = localStorage.getItem('app_institution_slogan');
    if (v && v.trim() !== '') return v.trim();
  } catch {}
  const anyWin = window as any;
  const w = anyWin?.__APP_INSTITUTION_SLOGAN__;
  if (typeof w === 'string' && w.trim() !== '') return w.trim();
  const envVal = (import.meta as any)?.env?.VITE_APP_SLOGAN;
  if (typeof envVal === 'string' && envVal.trim() !== '') return envVal.trim();
  return defaultSlogan;
}

/**
 * getInstitutionDescription
 * pt-BR: Obtém a descrição curta da instituição com fallback.
 * en-US: Gets institution short description with fallback.
 */
export function getInstitutionDescription(defaultDescription: string = ''): string {
  try {
    const v = localStorage.getItem('app_institution_description');
    if (v && v.trim() !== '') return v.trim();
  } catch {}
  const anyWin = window as any;
  const w = anyWin?.__APP_INSTITUTION_DESCRIPTION__;
  if (typeof w === 'string' && w.trim() !== '') return w.trim();
  const envVal = (import.meta as any)?.env?.VITE_APP_DESCRIPTION;
  if (typeof envVal === 'string' && envVal.trim() !== '') return envVal.trim();
  return defaultDescription;
}

/**
 * getInstitutionUrl
 * pt-BR: Obtém a URL institucional (site oficial) com fallback.
 * en-US: Gets the institutional URL (official site) with fallback.
 */
export function getInstitutionUrl(defaultUrl: string = ''): string {
  try {
    const v = localStorage.getItem('app_institution_url');
    if (v && v.trim() !== '') return v.trim();
  } catch {}
  const anyWin = window as any;
  const w = anyWin?.__APP_INSTITUTION_URL__;
  if (typeof w === 'string' && w.trim() !== '') return w.trim();
  const envVal = (import.meta as any)?.env?.VITE_APP_URL;
  if (typeof envVal === 'string' && envVal.trim() !== '') return envVal.trim();
  return defaultUrl;
}

/**
 * hydrateBrandingFromApi
 * pt-BR: Busca opções em `/options/all` e persiste branding (logo, nome) em
 *        localStorage e `window.__APP_*__`. Retorna os valores encontrados.
 * en-US: Fetches options from `/options/all` and persists branding (logo, name)
 *        into localStorage and `window.__APP_*__`. Returns found values.
 */
/**
 * hydrateBrandingFromPublicApi
 * pt-BR: Busca branding apenas do endpoint público `/public/options/branding` e persiste.
 * en-US: Fetches branding only from the public endpoint `/public/options/branding` and persists.
 */
export async function hydrateBrandingFromPublicApi({ persist = true }: { persist?: boolean } = {}): Promise<{ name?: string; logoUrl?: string }> {
  const base = getTenantApiUrl() + getVersionApi();
  const publicUrl = `${base}/public/options/branding`;
  try {
    const res = await fetch(publicUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (!res.ok) {
      return {};
    }
    const json = await res.json();
    let logoUrl: string | undefined;
    let name: string | undefined;

    const dataObj = json?.data as Record<string, any> | undefined;
    if (dataObj && typeof dataObj === 'object') {
      logoUrl = String(dataObj['app_logo_url'] || '').trim() || undefined;
      name = String(dataObj['app_institution_name'] || dataObj['site_name'] || dataObj['app_name'] || '').trim() || undefined;

      // Optional fields
      const anyWin = window as any;
      const favicon = String(dataObj['app_favicon_url'] || '').trim();
      const social = String(dataObj['app_social_image_url'] || '').trim();
      const slogan = String(dataObj['app_institution_slogan'] || '').trim();
      const description = String(dataObj['app_institution_description'] || '').trim();
      const urlInst = String(dataObj['app_institution_url'] || '').trim();
      if (persist) {
        if (favicon) { try { localStorage.setItem('app_favicon_url', favicon); } catch {} anyWin.__APP_FAVICON_URL__ = favicon; }
        if (social) { try { localStorage.setItem('app_social_image_url', social); } catch {} anyWin.__APP_SOCIAL_IMAGE_URL__ = social; }
        if (slogan) { try { localStorage.setItem('app_institution_slogan', slogan); } catch {} anyWin.__APP_INSTITUTION_SLOGAN__ = slogan; }
        if (description) { try { localStorage.setItem('app_institution_description', description); } catch {} anyWin.__APP_INSTITUTION_DESCRIPTION__ = description; }
        if (urlInst) { try { localStorage.setItem('app_institution_url', urlInst); } catch {} anyWin.__APP_INSTITUTION_URL__ = urlInst; }
      }
    }

    if (persist) {
      const anyWin = window as any;
      if (logoUrl) { try { localStorage.setItem('app_logo_url', logoUrl); } catch {} anyWin.__APP_LOGO_URL__ = logoUrl; }
      if (name) {
        try { localStorage.setItem('app_institution_name', name); } catch {}
        anyWin.__APP_INSTITUTION_NAME__ = name;
        anyWin.__APP_SITE_NAME__ = anyWin.__APP_SITE_NAME__ || name;
        anyWin.__APP_APP_NAME__ = anyWin.__APP_APP_NAME__ || name;
      }
    }
    return { name, logoUrl };
  } catch {
    return {};
  }
}

/**
 * getInstitutionNameAsync
 * pt-BR: Versão assíncrona que consulta a API se o nome não estiver nas fontes
 *        locais; persiste e retorna o nome, com fallback para `defaultName`.
 * en-US: Async version that queries the API if the name is not in local sources;
 *        persists and returns the name, with fallback to `defaultName`.
 */
export async function getInstitutionNameAsync(defaultName: string = 'Ead Control'): Promise<string> {
  const existing = getInstitutionName(defaultName);
  if (existing && existing !== defaultName) return existing;
  const { name } = await hydrateBrandingFromPublicApi({ persist: true });
  return name || existing || defaultName;
}
import { getTenantApiUrl, getVersionApi } from '@/lib/qlib';

/**
 * applyBrandingFavicon
 * pt-BR: Aplica o favicon da marca resolvendo a URL de `app_favicon_url` e,
 *         se ausente, faz fallback para a logo/`/favicon.ico`. Atualiza os
 *         links `<link rel="icon">` e `<link rel="shortcut icon">` no `<head>`.
 * en-US: Applies brand favicon by resolving `app_favicon_url` and, if absent,
 *         falls back to logo/`/favicon.ico`. Updates `<link rel="icon">` and
 *         `<link rel="shortcut icon">` links in `<head>`.
 */
export function applyBrandingFavicon(defaultFavicon: string = '/favicon.ico'): void {
  try {
    const fav = getBrandFaviconUrl() || getBrandLogoUrl(defaultFavicon);
    if (!fav || typeof document === 'undefined') return;
    const head = document.head || document.getElementsByTagName('head')[0];
    // rel="icon"
    let iconLink = head.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!iconLink) {
      iconLink = document.createElement('link');
      iconLink.setAttribute('rel', 'icon');
      head.appendChild(iconLink);
    }
    iconLink.setAttribute('href', fav);

    // rel="shortcut icon" (compat)
    let shortcutLink = head.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement | null;
    if (!shortcutLink) {
      shortcutLink = document.createElement('link');
      shortcutLink.setAttribute('rel', 'shortcut icon');
      head.appendChild(shortcutLink);
    }
    shortcutLink.setAttribute('href', fav);
  } catch {
    // ignore
  }
}