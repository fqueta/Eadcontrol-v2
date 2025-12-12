import { Link, LinkProps } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRedirect } from '@/hooks/useRedirect';
import { ReactNode } from 'react';

interface LoginRedirectLinkProps extends Omit<LinkProps, 'to'> {
  to: string;
  children: ReactNode;
  requireAuth?: boolean;
}

/**
 * Componente Link que automaticamente redireciona para login se o usuário não estiver autenticado
 * Preserva a URL de destino para redirecionamento após o login
 */
export function LoginRedirectLink({ 
  to, 
  children, 
  requireAuth = true, 
  ...props 
}: LoginRedirectLinkProps) {
  const { isAuthenticated } = useAuth();
  const { createLoginUrl } = useRedirect();

  // Se não requer autenticação ou usuário está autenticado, usa o link normal
  if (!requireAuth || isAuthenticated) {
    return (
      <Link to={to} {...props}>
        {children}
      </Link>
    );
  }

  // Se requer autenticação e usuário não está autenticado, redireciona para login
  const loginUrl = createLoginUrl(to);
  
  return (
    <Link to={loginUrl} {...props}>
      {children}
    </Link>
  );
}