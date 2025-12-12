import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRedirect } from '@/hooks/useRedirect';

interface AuthRedirectProps {
  children: React.ReactNode;
}

/**
 * Componente que redireciona usuários autenticados usando a lógica do useRedirect
 * Usado para proteger páginas de login/registro de usuários já logados
 */
export function AuthRedirect({ children }: AuthRedirectProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { redirectAfterAuth } = useRedirect();

  useEffect(() => {
    // Se o usuário está autenticado e não está carregando, redireciona usando a lógica do useRedirect
    if (isAuthenticated && !isLoading && user) {
      redirectAfterAuth(user);
    }
  }, [isAuthenticated, isLoading, user, redirectAfterAuth]);

  // Se está carregando, não renderiza nada (ou pode mostrar um loading)
  if (isLoading) {
    return null;
  }

  // Se está autenticado, não renderiza o conteúdo (será redirecionado)
  if (isAuthenticated) {
    return null;
  }

  // Se não está autenticado, renderiza o conteúdo normalmente
  return <>{children}</>;
}