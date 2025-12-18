/**
 * loadRecaptchaScript
 * pt-BR: Carrega o script do reCAPTCHA v3 dinamicamente se ainda não estiver presente.
 * en-US: Dynamically loads the reCAPTCHA v3 script if not already present.
 */
export function loadRecaptchaScript(siteKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.grecaptcha && typeof w.grecaptcha.execute === 'function') {
      return resolve();
    }
    const existing = document.querySelector<HTMLScriptElement>('script[src*="recaptcha/api.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load reCAPTCHA script')));
      return;
    }
    const s = document.createElement('script');
    s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load reCAPTCHA script'));
    document.head.appendChild(s);
  });
}

/**
 * getRecaptchaToken
 * pt-BR: Obtém um token do reCAPTCHA v3 para a ação informada.
 * en-US: Retrieves a reCAPTCHA v3 token for the given action.
 */
export async function getRecaptchaToken(siteKey: string, action: string): Promise<string> {
  try {
    await loadRecaptchaScript(siteKey);
    const grecaptcha = (window as any).grecaptcha;
    if (!grecaptcha || !grecaptcha.execute) return '';
    await new Promise((r) => grecaptcha.ready(r));
    const token = await grecaptcha.execute(siteKey, { action });
    return token || '';
  } catch {
    return '';
  }
}

/**
 * getSiteKey
 * pt-BR: Obtém a site key das variáveis de ambiente do Vite.
 * en-US: Retrieves the site key from Vite environment variables.
 */
export function getSiteKey(): string {
  return (import.meta as any).env?.VITE_RECAPTCHA_SITE_KEY || '';
}