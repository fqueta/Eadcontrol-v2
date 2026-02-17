import { useLocation, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Hook personalizado para gerenciar redirecionamentos após autenticação
 * Preserva a URL completa incluindo query parameters e hash
 */
export function useRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * Obtém a URL de destino após o login
   * Prioriza: state.from > query param 'redirect' > '/'
   */
  const getRedirectUrl = useCallback(() => {
    // Primeiro, verifica se há uma URL salva no state (vinda do ProtectedRoute)
    if (location.state?.from) {
      const fromLocation = location.state.from;
      return fromLocation.pathname + (fromLocation.search || '') + (fromLocation.hash || '');
    }

    // Segundo, verifica se há um parâmetro 'redirect' na URL atual
    const urlParams = new URLSearchParams(location.search);
    const redirectParam = urlParams.get('redirect');
    
    if (redirectParam) {
      try {
        // Decodifica a URL para garantir que caracteres especiais sejam tratados corretamente
        return decodeURIComponent(redirectParam);
      } catch {
        // Se falhar ao decodificar, usa a URL como está
        return redirectParam;
      }
    }

    // Fallback para a página inicial
    return '/';
  }, [location]);

  /**
   * Executa o redirecionamento baseado na lógica de negócio
   * @param user - Dados do usuário autenticado
   */
  const redirectAfterAuth = useCallback((user: any) => {
    const redirectUrl = getRedirectUrl();
    
    // Se há uma URL específica para redirecionamento (diferente de '/'), sempre prioriza ela
    if (redirectUrl !== '/') {
      navigate(redirectUrl, { replace: true });
      return;
    }
    
    // Lógica específica: usuários com permission_id < 5 vão para /admin apenas se não há redirecionamento específico
    if (user?.permission_id && parseInt(user.permission_id) < 5) {
      navigate('/admin', { replace: true });
      return;
    }

    // pt-BR: Fallback para alunos: sempre redireciona para a listagem de cursos
    // en-US: Fallback for students: always redirect to course listing
    navigate('/aluno/cursos', { replace: true });
  }, [navigate, getRedirectUrl]);

  /**
   * Cria uma URL de login com redirecionamento
   * @param targetUrl - URL para onde redirecionar após o login
   */
  const createLoginUrl = useCallback((targetUrl?: string) => {
    const url = targetUrl || (location.pathname + location.search + location.hash);
    const encodedUrl = encodeURIComponent(url);
    return `/login?redirect=${encodedUrl}`;
  }, [location]);

  return {
    getRedirectUrl,
    redirectAfterAuth,
    createLoginUrl
  };
}