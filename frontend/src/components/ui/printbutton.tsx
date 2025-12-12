import React from 'react';
import { Button } from '@/components/ui/button';

type PrintButtonProps = {
  label?: string;
  className?: string;
  disabled?: boolean;
  onBeforePrint?: () => void | Promise<void>;
  onAfterPrint?: () => void;
};

/**
 * PrintButton — Botão de impressão
 * pt-BR: Componente de botão que dispara `window.print()` para imprimir o conteúdo da página.
 *        Permite hooks opcionais antes e depois da impressão para ajustes de layout/estado.
 * en-US: Button component that triggers `window.print()` to print the page content.
 *        Supports optional hooks before and after printing for layout/state tweaks.
 */
export function PrintButton({
  label = 'Imprimir',
  className,
  disabled,
  onBeforePrint,
  onAfterPrint,
}: PrintButtonProps) {
  const handleClick = async () => {
    try {
      if (onBeforePrint) await onBeforePrint();
      window.print();
      if (onAfterPrint) onAfterPrint();
    } catch (e) {
      // Silently ignore print errors
      // You can wire a toast here if desired
      console.error('Print error:', e);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      className={className}
      disabled={disabled}
    >
      {label}
    </Button>
  );
}

export default PrintButton;