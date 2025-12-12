import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Interface para os dados retornados pela API de CEP
 */
interface CepData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

/**
 * Interface para os dados de endereço formatados
 */
interface AddressData {
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
}

/**
 * Hook personalizado para buscar dados de CEP usando a API ViaCEP
 * @returns Objeto com função de busca, dados do endereço, estado de loading e erro
 */
export const useCep = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressData, setAddressData] = useState<AddressData | null>(null);

  /**
   * Função para limpar apenas os dígitos do CEP
   * @param cep CEP com ou sem formatação
   * @returns CEP apenas com dígitos
   */
  const cleanCep = (cep: string): string => {
    return cep.replace(/\D/g, '');
  };

  /**
   * Função para validar se o CEP tem o formato correto
   * @param cep CEP para validação
   * @returns true se o CEP é válido
   */
  const isValidCep = (cep: string): boolean => {
    const cleanedCep = cleanCep(cep);
    return cleanedCep.length === 8 && /^\d{8}$/.test(cleanedCep);
  };

  /**
   * Função para buscar dados do CEP na API ViaCEP
   * @param cep CEP para busca
   * @returns Promise com os dados do endereço ou null em caso de erro
   */
  const fetchCep = async (cep: string): Promise<AddressData | null> => {
    if (!isValidCep(cep)) {
      setError('CEP inválido. Digite um CEP com 8 dígitos.');
      toast.error('CEP inválido');
      return null;
    }

    const cleanedCep = cleanCep(cep);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
      
      if (!response.ok) {
        throw new Error('Erro na consulta do CEP');
      }

      const data: CepData = await response.json();

      if (data.erro) {
        setError('CEP não encontrado');
        toast.error('CEP não encontrado');
        return null;
      }

      const formattedData: AddressData = {
        endereco: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        uf: data.uf || ''
      };

      setAddressData(formattedData);
      toast.success('CEP encontrado com sucesso!');
      return formattedData;

    } catch (err) {
      const errorMessage = 'Erro ao buscar CEP. Verifique sua conexão.';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Função para limpar os dados de endereço
   */
  const clearAddressData = () => {
    setAddressData(null);
    setError(null);
  };

  return {
    fetchCep,
    loading,
    error,
    addressData,
    clearAddressData,
    isValidCep
  };
};