/**
 * normalizeMediaUrl
 * pt-BR: Normaliza URLs de mídia/vídeo para evitar bloqueio de mixed content.
 *        Se a página está em https e a URL é http (fora de localhost), faz
 *        upgrade para https. Retorna a URL original quando não for aplicável.
 * en-US: Normalizes media/video URLs to avoid mixed content blocking.
 *        Upgrades http to https when the page is https (except localhost).
 */
export function normalizeMediaUrl(rawUrl: string): string {
  const url = (rawUrl || '').trim();
  if (!url) return url;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (!url.startsWith('http://')) return url;

  try {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      const parsed = new URL(url);
      const host = (parsed.hostname || '').toLowerCase();
      if (host !== '' && host !== 'localhost' && host !== '127.0.0.1') {
        return `https://${url.slice('http://'.length)}`;
      }
    }
  } catch {
    // URL inválida: mantém original
  }
  return url;
}
