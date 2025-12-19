import React from 'react';
import { getBrandLogoUrl } from '@/lib/branding';

export type BrandLogoProps = {
  /**
   * alt
   * pt-BR: Texto alternativo da imagem da logo.
   * en-US: Alternative text for the logo image.
   */
  alt?: string;
  /**
   * fallbackSrc
   * pt-BR: URL de fallback caso não exista logo configurada.
   * en-US: Fallback URL if no configured logo is found.
   */
  fallbackSrc?: string;
  /**
   * className
   * pt-BR: Classes adicionais para estilização do elemento <img />.
   * en-US: Additional classes to style the <img /> element.
   */
  className?: string;
  /**
   * width
   * pt-BR: Largura opcional (aplicada no estilo inline).
   * en-US: Optional width (applied via inline style).
   */
  width?: number | string;
  /**
   * height
   * pt-BR: Altura opcional (aplicada no estilo inline).
   * en-US: Optional height (applied via inline style).
   */
  height?: number | string;
};

/**
 * BrandLogo
 * pt-BR: Componente de logo que resolve a URL a partir de localStorage/window/env
 *        usando `getBrandLogoUrl`, com suporte a fallback.
 * en-US: Logo component that resolves URL from localStorage/window/env
 *        via `getBrandLogoUrl`, supporting a fallback.
 */
export function BrandLogo({ alt = 'Logo', fallbackSrc = '/logo.png', className, width, height }: BrandLogoProps) {
  const src = getBrandLogoUrl(fallbackSrc);
  const style: React.CSSProperties = {
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  };
  return <img src={src} alt={alt} className={className} style={style} />;
}

export default BrandLogo;