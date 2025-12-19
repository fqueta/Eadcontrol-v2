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