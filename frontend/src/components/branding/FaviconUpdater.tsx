import React, { useEffect } from 'react';
import { getBrandFaviconUrl } from '@/lib/branding';

export type FaviconUpdaterProps = {
  /**
   * src
   * pt-BR: URL opcional do favicon a aplicar; se omitido, usa o valor do localStorage.
   * en-US: Optional favicon URL to apply; if omitted, uses localStorage value.
   */
  src?: string;
  /**
   * defaultSrc
   * pt-BR: URL padrão para usar quando não houver favicon personalizado.
   * en-US: Default URL to use when no custom favicon is available.
   */
  defaultSrc?: string;
};

/**
 * FaviconUpdater
 * pt-BR: Componente que sincroniza o favicon do documento com valores persistidos
 *        (localStorage) ou com a URL fornecida via props. Atualiza o elemento
 *        <link id="app-favicon" ...> se existir, e cria um novo caso não exista.
 * en-US: Component that syncs the document favicon with persisted values
 *        (localStorage) or the provided URL. Updates the <link id="app-favicon" ...>
 *        element if present, creating one if missing.
 */
export function FaviconUpdater({ src, defaultSrc = '/logo.png' }: FaviconUpdaterProps) {
  useEffect(() => {
    const chosen = (src && src.trim() !== '' ? src.trim() : getBrandFaviconUrl()) || defaultSrc;

    const resolveType = (url: string) => {
      if (/\.svg$/i.test(url)) return 'image/svg+xml';
      if (/\.ico$/i.test(url)) return 'image/x-icon';
      if (/\.jpe?g$/i.test(url)) return 'image/jpeg';
      if (/\.webp$/i.test(url)) return 'image/webp';
      return 'image/png';
    };

    const type = resolveType(chosen);
    let oldLink = document.getElementById('app-favicon');
    
    let newLink = document.createElement('link');
    newLink.id = 'app-favicon';
    newLink.rel = 'icon';
    newLink.setAttribute('type', type);
    newLink.setAttribute('href', chosen);

    if (oldLink) {
      oldLink.parentNode?.removeChild(oldLink);
    }
    document.head.appendChild(newLink);
  }, [src, defaultSrc]);

  return null;
}

export default FaviconUpdater;