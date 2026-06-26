import React from 'react';

interface DynamicPriceProps {
  price?: string | number | null;
  installments?: string | number | null;
  installmentValue?: string | number | null;
  className?: string;
  align?: 'left' | 'center' | 'right';
  badgeStyle?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function DynamicPrice({
  price,
  installments,
  installmentValue,
  className = '',
  align = 'left',
  badgeStyle = false,
  size = 'md',
}: DynamicPriceProps) {
  const formatPrice = (value: any) => {
    if (value === null || value === undefined || value === '') return '';
    const valStr = String(value).trim();
    if (valStr.includes('R$')) return valStr;
    const num = Number(valStr.replace(',', '.'));
    if (isNaN(num)) return valStr;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const parsedInstallments = installments ? parseInt(String(installments), 10) : 0;
  const hasInstallments = parsedInstallments > 1 && installmentValue && String(installmentValue).trim() !== '0' && String(installmentValue).trim() !== '0,00';

  const formattedFullPrice = formatPrice(price);
  const formattedInstallmentValue = formatPrice(installmentValue);

  if (!formattedFullPrice || formattedFullPrice === 'R$ 0,00' || formattedFullPrice === '0,00' || formattedFullPrice === '0') {
    return <span className="font-bold text-slate-400">Gratuito</span>;
  }

  const alignClass = align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left';

  // Size styles
  const sizeClasses = {
    sm: {
      full: 'text-[9px]',
      installment: 'text-sm font-black',
      mainOnly: 'text-sm font-black',
    },
    md: {
      full: 'text-xs',
      installment: 'text-lg font-black',
      mainOnly: 'text-lg font-black',
    },
    lg: {
      full: 'text-sm',
      installment: 'text-2xl font-black',
      mainOnly: 'text-2xl font-black',
    },
  };

  const currentSize = sizeClasses[size];

  if (hasInstallments) {
    if (badgeStyle) {
      return (
        <div className={`flex flex-col ${alignClass} ${className} text-slate-900 dark:text-slate-100`}>
          <span className="text-[10px] opacity-80 font-bold uppercase tracking-wider leading-none">
            {formattedFullPrice} à vista
          </span>
          <span className="text-sm font-black mt-1 whitespace-nowrap leading-none text-primary">
            {parsedInstallments}x de {formattedInstallmentValue}
          </span>
        </div>
      );
    }
    return (
      <div className={`flex flex-col ${alignClass} ${className}`}>
        <span className={`${currentSize.full} text-muted-foreground font-medium mb-0.5`}>
          {formattedFullPrice} à vista
        </span>
        <span className={`${currentSize.installment} text-primary leading-tight`}>
          <span className="text-muted-foreground text-[10px] font-bold mr-0.5">{parsedInstallments}x de</span> {formattedInstallmentValue}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${alignClass} ${className}`}>
      <span className={badgeStyle ? "text-sm font-black text-primary" : `${currentSize.mainOnly} text-primary`}>
        {formattedFullPrice}
      </span>
    </div>
  );
}
