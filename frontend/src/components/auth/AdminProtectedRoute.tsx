import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { useEffect, useState } from 'react';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  linkLoja?: string;
}

/**
 * Componente que protege rotas administrativas
 * Verifica se o usuário tem permissão adequada (permission_id < 5)
 * Redireciona usuários com permissão >= 5 para a área do cliente
 * Mostra tela de carregamento durante a verificação para evitar flash de conteúdo
 */
export function AdminProtectedRoute({ children, linkLoja = '' }: AdminProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);

  useEffect(() => {
    // Aguarda um momento para verificar as permissões e evitar flash de conteúdo
    if (isAuthenticated && !isLoading && user) {
      const timer = setTimeout(() => {
        setIsCheckingPermissions(false);
      }, 100); // Pequeno delay para evitar flash
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading, user]);

  // Primeiro verifica se está autenticado
  if (!isAuthenticated || isLoading) {
    return (
      <ProtectedRoute>
        {children}
      </ProtectedRoute>
    );
  }

  // Mostra tela de carregamento enquanto verifica permissões
  if (isCheckingPermissions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Verifica se o usuário tem permissão para acessar o admin
  // Usuários com permission_id >= 5 são redirecionados para a área do cliente
  if (user?.permission_id && parseInt(user.permission_id) > 5) {
    const clientAreaUrl = linkLoja ? `${linkLoja}/area-cliente` : '/lojaderesgatesantenamais/area-cliente';
    return <Navigate to={clientAreaUrl} replace />;
  }

  // Se chegou até aqui, o usuário tem permissão para acessar o admin
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
}