import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { getTenantApiUrl, getVersionApi } from '@/lib/qlib';

/**
 * Interface para resposta do token
 */
interface TokenResponse {
  token: string;
  expires_at?: string;
}

/**
 * Hook para gerenciar tokens de formulário público
 * Gera e gerencia tokens para proteção de formulários públicos
 */
export const useFormToken = () => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Gera um novo token para o formulário
   */
  const generateToken = useCallback(async (): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const apiBaseUrl = getTenantApiUrl() + getVersionApi();
      const response = await fetch(`${apiBaseUrl}/public/form-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar token de segurança');
      }

      const data: TokenResponse = await response.json();
      setToken(data.token);
      return data.token;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error('Erro ao gerar token de segurança');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Limpa o token atual
   */
  const clearToken = useCallback(() => {
    setToken(null);
    setError(null);
  }, []);

  /**
   * Verifica se o token é válido (não nulo e não vazio)
   */
  const isTokenValid = useCallback(() => {
    return token !== null && token.trim() !== '';
  }, [token]);

  return {
    token,
    isLoading,
    error,
    generateToken,
    clearToken,
    isTokenValid
  };
};