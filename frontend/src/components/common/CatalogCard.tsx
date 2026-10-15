import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, ShoppingBag, Clock, Users, ArrowRight } from 'lucide-react';
import { DynamicPrice } from './DynamicPrice';
import { getCardHideCategory, getCardHideDescription, getCardImageAspect } from '@/lib/branding';

export interface CatalogCardProps {
  type: 'course' | 'product';
  id: string | number;
  title: string;
  description?: string | null;
  image?: string | null;
  category?: string | null;
  metaDuration?: string | null;
  metaPopular?: boolean | string | null;
  isFeatured?: boolean;
  price?: string | number | null;
  installments?: string | number | null;
  installmentValue?: string | number | null;
  priceLabel?: string;
  buttonText?: string;
  linkUrl: string;
  hideCategory?: boolean;
  hideDescription?: boolean;
  imageAspect?: 'video' | '16/9' | '4/3' | 'square' | '1/1' | 'portrait' | '3/4' | 'tall' | '2/3' | string;
  variant?: 'grid' | 'horizontal';
  className?: string;
  onActionClick?: () => void;
}

/**
 * Utility to strip HTML tags safely
 */
const stripHtml = (html?: string | null): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').trim();
};

export function CatalogCard({
  type,
  id,
  title,
  description,
  image,
  category,
  metaDuration,
  metaPopular,
  isFeatured = false,
  price,
  installments,
  installmentValue,
  priceLabel,
  buttonText = 'Detalhes',
  linkUrl,
  hideCategory,
  hideDescription,
  imageAspect,
  variant = 'grid',
  className = '',
  onActionClick,
}: CatalogCardProps) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  // Evaluate aspect ratio with priority: prop -> global branding setting
  const effectiveAspect = imageAspect || getCardImageAspect(type);
  const aspectClass = (() => {
    switch (effectiveAspect) {
      case 'square':
      case '1/1':
        return 'aspect-square';
      case '4/3':
        return 'aspect-[4/3]';
      case 'portrait':
      case '3/4':
        return 'aspect-[3/4]';
      case 'tall':
      case '2/3':
        return 'aspect-[2/3]';
      case 'video':
      case '16/9':
      default:
        return 'aspect-video';
    }
  })();

  // Evaluate hide flags with priority: prop -> global branding setting
  const effectiveHideCategory = hideCategory !== undefined 
    ? hideCategory 
    : getCardHideCategory(type);

  const effectiveHideDescription = hideDescription !== undefined 
    ? hideDescription 
    : getCardHideDescription(type);

  const defaultPriceLabel = priceLabel || (type === 'course' ? 'Investimento' : 'Valor');
  const cleanDescription = stripHtml(description);
  const hasValidImage = !!image && !imgError && image.trim() !== '';

  const handleCardClick = (e: React.MouseEvent) => {
    // If clicked on an interactive child (a, button), let it handle its own navigation
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button')) {
      return;
    }
    if (onActionClick) {
      onActionClick();
    } else if (linkUrl) {
      navigate(linkUrl);
    }
  };

  // Horizontal variant (used in list mode on courses or catalogs)
  if (variant === 'horizontal') {
    return (
      <Card
        onClick={handleCardClick}
        className={`group relative overflow-hidden border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col md:flex-row product-card-themed ${className}`}
      >
        <div className={`relative w-full md:w-72 ${aspectClass} md:h-auto shrink-0 overflow-hidden bg-slate-50 dark:bg-slate-950 flex items-center justify-center`}>
          {hasValidImage ? (
            <img
              src={image!}
              alt={title}
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
              className={`w-full h-full ${type === 'product' ? 'object-contain p-3' : 'object-cover'} transition-transform duration-500 group-hover:scale-105`}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center min-h-[160px]">
              {type === 'course' ? (
                <GraduationCap className="w-14 h-14 text-primary/40 group-hover:scale-110 transition-transform duration-300" />
              ) : (
                <ShoppingBag className="w-14 h-14 text-primary/40 group-hover:scale-110 transition-transform duration-300" />
              )}
            </div>
          )}

          {isFeatured && (
            <div className="absolute top-3 right-3 z-10">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase shadow-md bg-primary text-primary-foreground backdrop-blur-md">
                Destaque
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-between p-6 md:p-8">
          <div className="space-y-3">
            {!effectiveHideCategory && (
              <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                {category && (
                  <span className="inline-flex items-center text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                    {category}
                  </span>
                )}
                {metaDuration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {metaDuration}
                  </span>
                )}
                {metaPopular && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {typeof metaPopular === 'string' ? metaPopular : 'Popular'}
                  </span>
                )}
              </div>
            )}

            <h3 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
              {title}
            </h3>

            {!effectiveHideDescription && cleanDescription && (
              <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 md:line-clamp-3">
                {cleanDescription}
              </p>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">
                {defaultPriceLabel}
              </span>
              <DynamicPrice price={price} installments={installments} installmentValue={installmentValue} size="md" />
            </div>

            <Button
              size="sm"
              className="rounded-lg font-bold px-6 shadow-sm h-10"
              asChild
            >
              <Link to={linkUrl}>
                {buttonText}
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Standard Grid Card Variant
  return (
    <Card
      onClick={handleCardClick}
      className={`group relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full cursor-pointer product-card-themed ${className}`}
    >
      {/* Top Image Container */}
      <div className={`relative ${aspectClass} w-full overflow-hidden bg-slate-50 dark:bg-slate-950 flex items-center justify-center shrink-0`}>
        {hasValidImage ? (
          <img
            src={image!}
            alt={title}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className={`w-full h-full ${type === 'product' ? 'object-contain p-3' : 'object-cover'} transition-transform duration-500 group-hover:scale-105`}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
            {type === 'course' ? (
              <GraduationCap className="h-14 w-14 text-primary/40 group-hover:scale-110 transition-transform duration-300" />
            ) : (
              <ShoppingBag className="h-14 w-14 text-primary/40 group-hover:scale-110 transition-transform duration-300" />
            )}
          </div>
        )}

        {/* Featured Badge */}
        {isFeatured && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase shadow-md bg-primary text-primary-foreground backdrop-blur-md">
              Destaque
            </span>
          </div>
        )}

        {/* Subtle hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>

      {/* Card Body */}
      <div className="px-3.5 pt-2 pb-1.5 flex flex-col justify-start">
        {/* Category & Meta */}
        {!effectiveHideCategory && (category || metaDuration || metaPopular) && (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
            {category && (
              <span className="inline-flex items-center text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                {category}
              </span>
            )}
            {metaDuration && (
              <span className="flex items-center gap-1 text-[11px]">
                <Clock className="h-3 w-3" />
                {metaDuration}
              </span>
            )}
            {metaPopular && (
              <span className="flex items-center gap-1 text-[11px]">
                <Users className="h-3 w-3" />
                {typeof metaPopular === 'string' ? metaPopular : 'Popular'}
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white line-clamp-2 leading-tight group-hover:text-primary transition-colors m-0">
          {title}
        </h3>

        {/* Description */}
        {!effectiveHideDescription && cleanDescription && (
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 font-medium leading-snug mt-1">
            {cleanDescription}
          </p>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-3.5 py-2 border-t border-slate-100 dark:border-slate-800/80 mt-auto flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">
            {defaultPriceLabel}
          </span>
          <DynamicPrice
            price={price}
            installments={installments}
            installmentValue={installmentValue}
            size="md"
          />
        </div>

        <Button
          size="sm"
          className="rounded-lg font-bold shadow-sm h-8 px-3.5 text-xs shrink-0 transition-transform active:scale-95"
          asChild
        >
          <Link to={linkUrl}>
            {buttonText}
          </Link>
        </Button>
      </div>
    </Card>
  );
}
