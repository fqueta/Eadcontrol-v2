import { useState, useEffect } from 'react';
import { GenericApiService } from '@/services/GenericApiService';

/**
 * Interface para representar uma opção da API
 */
export interface ApiOption {
  id: number;
  name: string;
  url: string;
  value: string;
  tags: string;
  ativo: string;
  obs?: string;
}

/**
 * Interface para a resposta da API
 */
interface ApiOptionsResponse {
  data: {
    data: ApiOption[];
    current_page: number;
    total: number;
  };
}

/**
 * Hook para gerenciar opções da API
 * Busca dados do endpoint /options/all e filtra por tags específicas
 */
export const useApiOptions = () => {
  const [options, setOptions] = useState<ApiOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiService = new GenericApiService('/options');

  /**
   * Busca todas as opções da API
   */
  const fetchOptions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.get<ApiOptionsResponse>('/options/all');
      setOptions(response.data.data);
    } catch (err) {
      console.error('Erro ao buscar opções da API:', err);
      setError('Erro ao carregar configurações da API');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Atualiza uma opção específica
   */
  const updateOption = async (id: number, value: string) => {
    try {
      await apiService.put(`/${id}`, { value });
      
      // Atualiza o estado local
      setOptions(prev => 
        prev.map(option => 
          option.id === id ? { ...option, value } : option
        )
      );
      
      return true;
    } catch (err) {
      console.error('Erro ao atualizar opção:', err);
      setError('Erro ao salvar configuração');
      return false;
    }
  };

  /**
   * Salva múltiplas opções de API
   */
  const saveMultipleOptions = async (dataToSave: {[key: string]: string}): Promise<boolean> => {
    try {
      // Faz POST para /api/v1/options/all com os dados no formato {name_campo: value}
      await apiService.post('/options/all', dataToSave);
      
      // Atualiza o estado local com as novas opções
      setOptions(prevOptions => 
        prevOptions.map(option => {
          const newValue = dataToSave[option.name];
          return newValue !== undefined ? { ...option, value: newValue } : option;
        })
      );
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar múltiplas opções:', error);
      setError('Erro ao salvar configurações');
      return false;
    }
  };

  /**
   * Filtra opções por tags específicas
   */
  const getOptionsByTags = (tags: string[]) => {
    return options.filter(option => 
      option.tags && tags.some(tag => option.tags.includes(tag))
    );
  };

  /**
   * Busca opções com tags 'alloyal' e 'link'
   */
  const getApiConfigOptions = () => {
    return getOptionsByTags(['alloyal', 'link']);
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  return {
    options,
    isLoading,
    error,
    fetchOptions,
    updateOption,
    saveMultipleOptions,
    getOptionsByTags,
    getApiConfigOptions
  };
};