import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface SaasPermissionGuardProps {
  children: React.ReactNode;
}

export function SaasPermissionGuard({ children }: SaasPermissionGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user || parseInt(String(user.permission_id)) !== 1) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
