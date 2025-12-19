/**
 * getBrandLogoUrl
 * pt-BR: Obtém a URL da logo personalizada a partir de localStorage, window e env.
 *        Ordem de prioridade: localStorage -> window.__APP_LOGO_URL__ -> import.meta.env.VITE_SITE_LOGO_URL -> default.
 * en-US: Gets the custom brand logo URL from localStorage, window and env.
 *        Priority: localStorage -> window.__APP_LOGO_URL__ -> import.meta.env.VITE_SITE_LOGO_URL -> default.
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