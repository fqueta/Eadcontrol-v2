import { ReactNode } from 'react';
import { BrandLogo } from '@/components/branding/BrandLogo';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

/**
 * AuthLayout
 * pt-BR: Layout de autenticação centrado com logo, título e subtítulo.
 * en-US: Centered authentication layout with logo, title, and subtitle.
 */
export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <BrandLogo alt="Logo" fallbackSrc="/aeroclube-logo.svg" className="h-10 w-auto" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        
        <div className="bg-card p-6 rounded-lg border shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}