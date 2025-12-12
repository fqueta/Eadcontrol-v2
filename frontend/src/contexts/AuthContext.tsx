import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState, LoginCredentials, RegisterData } from '@/types/auth';
import { MenuItemDTO } from '@/types/menu';
import { authService } from '@/services/authService';
import type { UserPointsBalance } from '@/services/userPointsService';
import { toast } from '@/hooks/use-toast';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  syncUserData: () => Promise<void>;
  updateProfile: (data: Partial<User> | FormData) => Promise<boolean>;
  changePassword: (passwordData: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }) => Promise<boolean>;
  userPointsBalance: UserPointsBalance | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    permissions: [],
    menu: [],
    isLoading: true,
    isAuthenticated: false,
  });

  const [userPointsBalance, setUserPointsBalance] = useState<UserPointsBalance | null>(null);

  const updateAuthState = (
    user: User | null, 
    token: string | null, 
    permissions: string[] = [], 
    menu: MenuItemDTO[] = []
  ) => {
    setState({
      user,
      token,
      permissions,
      menu,
      isLoading: false,
      isAuthenticated: !!user && !!token,
    });
  };

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await authService.login(credentials);
      updateAuthState(
        response.user, 
        response.token, 
        response.permissions || [], 
        response.menu || []
      );
      
      // Sincronizar dados após login bem-sucedido
      await syncUserData();
      
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo, ${response.user.name}!`,
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Erro no login",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      
      updateAuthState(null, null, [], []);
      setUserPointsBalance(null);
      return false;
    }
  };

  const register = async (data: RegisterData): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await authService.register(data);
      updateAuthState(
        response.user, 
        response.token, 
        response.permissions || [], 
        response.menu || []
      );
      
      // Sincronizar dados após registro bem-sucedido
      await syncUserData();
      
      toast({
        title: "Conta criada com sucesso!",
        description: `Bem-vindo, ${response.user.name}!`,
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Erro no cadastro",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      
      updateAuthState(null, null, [], []);
      setUserPointsBalance(null);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      updateAuthState(null, null, [], []);
      setUserPointsBalance(null);
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const user = await authService.getCurrentUser();
      setState((prev) => ({ ...prev, user }));
    } catch (error) {
      const status = (error as any)?.status;
      console.error('Erro ao atualizar dados do usuário:', error);
      if (status === 401 || status === 419) {
        await logout();
      } else {
        // mantém a sessão em caso de erro temporário
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    }
  };

  /**
   * syncUserData
   * pt-BR: Sincroniza apenas os dados do usuário com a API. Removida a requisição de saldo de pontos.
   * en-US: Sync only user profile data with the API. Removed points balance request.
   */
  const syncUserData = async (): Promise<void> => {
    try {
      // Buscar dados atualizados do usuário (sem saldo de pontos)
      const user = await authService.getCurrentUser();
      setState((prev) => ({ ...prev, user }));
    } catch (error) {
      console.error('Erro geral na sincronização de dados:', error);
    }
  };

  const updateProfile = async (data: Partial<User> | FormData): Promise<boolean> => {
    try {
      const updatedUser = await authService.updateProfile(data);
      setState((prev) => ({ ...prev, user: updatedUser }));
      
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      
      return false;
    }
  };

  const changePassword = async (passwordData: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }): Promise<boolean> => {
    try {
      await authService.changePassword(passwordData);
      
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso.",
      });
      
      return true;
    } catch (error: any) {
      // Tratamento específico para erros da API
      let errorMessage = "Erro ao alterar senha";
      
      if (error?.status === 422 && error?.body?.error) {
        // Erro de validação da API (ex: senha atual incorreta)
        errorMessage = error.body.error;
      } else if (error?.status) {
        // Outros erros HTTP
        errorMessage = "Erro na requisição";
      } else if (error?.message) {
        // Erros de rede ou outros
        errorMessage = "Erro na requisição";
      }
      
      toast({
        title: "Erro ao alterar senha",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    }
  };

  /**
   * Listener de token inválido
   * pt-BR: Escuta o evento global `auth:invalid_token` e executa logout.
   * en-US: Listens for global `auth:invalid_token` event and performs logout.
   */
  useEffect(() => {
    const handleInvalidToken = () => {
      logout();
    };
    window.addEventListener('auth:invalid_token', handleInvalidToken as EventListener);
    return () => {
      window.removeEventListener('auth:invalid_token', handleInvalidToken as EventListener);
    };
  }, []);

  /**
   * Listener de usuário inativo
   * pt-BR: Escuta o evento global `auth:inactive_user` e executa logout.
   * en-US: Listens for global `auth:inactive_user` event and performs logout.
   */
  useEffect(() => {
    const handleInactiveUser = () => {
      logout();
    };
    window.addEventListener('auth:inactive_user', handleInactiveUser as EventListener);
    return () => {
      window.removeEventListener('auth:inactive_user', handleInactiveUser as EventListener);
    };
  }, []);

  // Inicialização - verificar se há sessão salva
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = authService.getStoredToken();
      const storedUser = authService.getStoredUser();
      const storedPermissions = authService.getStoredPermissions() || [];
      const storedMenu = authService.getStoredMenu() || [];

      if (storedToken && storedUser) {
        // Hidratação otimista: considera autenticado imediatamente
        updateAuthState(storedUser, storedToken, storedPermissions, storedMenu);

        // Validação e sincronização em segundo plano
        try {
          const freshUser = await authService.getCurrentUser();
          updateAuthState(freshUser, storedToken, storedPermissions, storedMenu);
          
          // Sincronizar dados após validação bem-sucedida da sessão
          await syncUserData();
        } catch (error) {
          const status = (error as any)?.status;
          console.warn('Falha ao validar sessão ao iniciar:', error);
          if (status === 401 || status === 419) {
            authService.clearStorage();
            updateAuthState(null, null, [], []);
            setUserPointsBalance(null);
          } else {
            // Mantém a sessão em caso de erro temporário/servidor
            setState((prev) => ({ ...prev, isLoading: false }));
          }
        }
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initializeAuth();
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshUser,
    syncUserData,
    updateProfile,
    changePassword,
    userPointsBalance,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}