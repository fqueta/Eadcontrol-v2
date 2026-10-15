import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface UseInfiniteScrollOptions {
  hasMore?: boolean;
  isLoading?: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
  threshold?: number;
  disabled?: boolean;
}

/**
 * Hook para implementar scroll infinito com IntersectionObserver.
 * Retorna uma ref para ser acoplada ao elemento sentinela (div, tr, li, etc.).
 */
export function useInfiniteScroll({
  hasMore = true,
  isLoading = false,
  onLoadMore,
  rootMargin = '200px',
  threshold = 0.1,
  disabled = false,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<any>(null);

  useEffect(() => {
    if (disabled || !sentinelRef.current || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting && hasMore && !isLoading && !disabled) {
          onLoadMore();
        }
      },
      { rootMargin, threshold }
    );

    const currentEl = sentinelRef.current;
    observer.observe(currentEl);

    return () => {
      if (currentEl) observer.unobserve(currentEl);
      observer.disconnect();
    };
  }, [hasMore, isLoading, onLoadMore, rootMargin, threshold, disabled]);

  return { sentinelRef };
}

export interface InfiniteScrollProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
  threshold?: number;
  disabled?: boolean;
  loadingMessage?: string;
  endMessage?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Componente contêiner de Scroll Infinito.
 * Renderiza os filhos e um sentinela no final que dispara `onLoadMore` automaticamente ao se aproximar da visualização.
 */
export function InfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  rootMargin = '200px',
  threshold = 0.1,
  disabled = false,
  loadingMessage = 'Carregando mais itens...',
  endMessage,
  children,
  className = '',
}: InfiniteScrollProps) {
  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    isLoading,
    onLoadMore,
    rootMargin,
    threshold,
    disabled,
  });

  return (
    <div className={className}>
      {children}
      <div ref={sentinelRef} className="w-full py-2 flex items-center justify-center min-h-[32px]">
        {isLoading && (
          <div className="flex items-center gap-2 py-3 text-xs font-medium text-muted-foreground animate-in fade-in duration-300">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>{loadingMessage}</span>
          </div>
        )}
        {!hasMore && !isLoading && endMessage && (
          <div className="py-3 text-center text-xs text-muted-foreground">
            {endMessage}
          </div>
        )}
      </div>
    </div>
  );
}
