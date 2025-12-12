import { useAuth } from '@/contexts/AuthContext';
import { useAccessCheck } from '@/hooks/use-access-check';
import { findMenuItemByUrl, isCanViewTruthy } from '@/lib/menu';

interface PermissionGuardProps {
  required?: string;
  menuPath?: string;
  requireRemote?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ 
  required, 
  menuPath, 
  requireRemote = false, 
  children, 
  fallback 
}: PermissionGuardProps) {
  const { permissions, menu } = useAuth();

  // Check local permissions
  const hasRequiredPermission = required ? (permissions?.includes(required) ?? false) : true;
  
  // Check menu can_view if menuPath is provided
  const menuItem = menuPath && menu ? findMenuItemByUrl(menu, menuPath) : undefined;
  const hasMenuAccess = menuItem ? isCanViewTruthy(menuItem.can_view) : true;
  
  const localAllow = hasRequiredPermission || hasMenuAccess;

  // Remote access check - only when explicitly required
  const { data: remoteAccess, isLoading, isError } = useAccessCheck({
    permission: required,
    path: menuPath,
    enabled: Boolean(requireRemote && localAllow && (required || menuPath))
  });

  // Loading state when requireRemote is true
  if (requireRemote && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Determine final access
  let hasAccess = localAllow;
  
  if (requireRemote) {
    // For requireRemote=true, need both local and remote approval
    hasAccess = localAllow && (remoteAccess?.allowed === true);
  }
  // For requireRemote=false (default), use only local checks

  if (!hasAccess) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <h2 className="text-2xl font-semibold text-destructive mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Você não possui permissão para acessar esta funcionalidade.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}