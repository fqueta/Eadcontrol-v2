import { BaseApiService } from './BaseApiService';
import { ApiResponse, PaginatedResponse } from '@/types/index';

/**
 * Parâmetros para listagem genérica
 */
export interface GenericListParams {
  page?: number;
  per_page?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  [key: string]: any; // Permite parâmetros adicionais específicos
}

/**
 * Serviço genérico para operações CRUD
 * Permite usar qualquer endpoint passando-o como parâmetro
 */
export class GenericApiService<T = any, CreateInput = any, UpdateInput = any> extends BaseApiService {
  private endpoint: string;

  /**
   * Construtor do serviço genérico
   * @param endpoint - Endpoint base para as operações (ex: '/users', '/products')
   */
  constructor(endpoint: string) {
    super();
    this.endpoint = endpoint;
  }

  /**
   * Lista todos os registros com paginação e filtros
   * @param params - Parâmetros de filtro e paginação
   */
  async list(params?: GenericListParams): Promise<PaginatedResponse<T>> {
    const response = await this.get<any>(this.endpoint, params);
    return this.normalizePaginatedResponse<T>(response);
  }

  /**
   * Obtém um registro por ID
   * @param id - ID do registro
   */
  async getById(id: string | number): Promise<T> {
    /**
     * Fallback de normalização de resposta
     * pt-BR: Alguns endpoints retornam o objeto diretamente (sem wrapper { data }).
     *        Para evitar `undefined` no React Query, retornamos `response.data ?? response`.
     * en-US: Some endpoints return the object directly (without { data } wrapper).
     *        To avoid `undefined` in React Query, we return `response.data ?? response`.
     */
    const response = await this.get<any>(`${this.endpoint}/${id}`);
    const normalized = (response && typeof response === 'object' && 'data' in response)
      ? (response.data as T)
      : (response as T);
    return normalized;
  }

  /**
   * Cria um novo registro
   * @param data - Dados do registro
   */
  async create(data: CreateInput): Promise<T> {
    const response = await this.post<ApiResponse<T>>(this.endpoint, data);
    return response.data;
  }

  /**
   * Atualiza um registro existente
   * @param id - ID do registro
   * @param data - Dados para atualização
   */
  async update(id: string | number, data: UpdateInput): Promise<T> {
    const response = await this.put<ApiResponse<T>>(`${this.endpoint}/${id}`, data);
    return response.data;
  }

  /**
   * Exclui um registro
   * @param id - ID do registro
   */
  async deleteById(id: string | number): Promise<void> {
    await this.delete<void>(`${this.endpoint}/${id}`);
  }

  /**
   * Executa uma requisição GET personalizada
   * @param customEndpoint - Endpoint personalizado (será concatenado com o endpoint base)
   * @param params - Parâmetros de query
   */
  async customGet<R = any>(customEndpoint: string = '', params?: Record<string, any>): Promise<R> {
    const fullEndpoint = customEndpoint ? `${this.endpoint}${customEndpoint}` : this.endpoint;
    return this.get<R>(fullEndpoint, params);
  }

  /**
   * Executa uma requisição POST personalizada
   * @param customEndpoint - Endpoint personalizado (será concatenado com o endpoint base)
   * @param data - Dados para envio
   */
  async customPost<R = any>(customEndpoint: string = '', data?: any): Promise<R> {
    const fullEndpoint = customEndpoint ? `${this.endpoint}${customEndpoint}` : this.endpoint;
    return this.post<R>(fullEndpoint, data);
  }

  /**
   * customPostFormData
   * pt-BR: Executa POST (endpoint custom) com FormData — útil para uploads.
   * en-US: Executes POST (custom endpoint) with FormData — useful for uploads.
   */
  async customPostFormData<R = any>(customEndpoint: string = '', formData: FormData): Promise<R> {
    const fullEndpoint = customEndpoint ? `${this.endpoint}${customEndpoint}` : this.endpoint;
    return this.postFormData<R>(fullEndpoint, formData);
  }

  /**
   * Executa uma requisição PUT personalizada
   * @param customEndpoint - Endpoint personalizado (será concatenado com o endpoint base)
   * @param data - Dados para envio
   */
  async customPut<R = any>(customEndpoint: string = '', data?: any): Promise<R> {
    const fullEndpoint = customEndpoint ? `${this.endpoint}${customEndpoint}` : this.endpoint;
    return this.put<R>(fullEndpoint, data);
  }

  /**
   * customPutFormData
   * pt-BR: Executa PUT (endpoint custom) com FormData — atualização de arquivos.
   * en-US: Executes PUT (custom endpoint) with FormData — file updates.
   */
  async customPutFormData<R = any>(customEndpoint: string = '', formData: FormData): Promise<R> {
    const fullEndpoint = customEndpoint ? `${this.endpoint}${customEndpoint}` : this.endpoint;
    return this.putFormData<R>(fullEndpoint, formData);
  }

  /**
   * Executa uma requisição DELETE personalizada
   * @param customEndpoint - Endpoint personalizado (será concatenado com o endpoint base)
   */
  async customDelete<R = any>(customEndpoint: string = ''): Promise<R> {
    const fullEndpoint = customEndpoint ? `${this.endpoint}${customEndpoint}` : this.endpoint;
    return this.delete<R>(fullEndpoint);
  }

  /**
   * Busca registros por termo de pesquisa
   * @param search - Termo de pesquisa
   * @param params - Parâmetros adicionais
   */
  async search(search: string, params?: GenericListParams): Promise<PaginatedResponse<T>> {
    const searchParams = { ...params, search };
    return this.list(searchParams);
  }

  /**
   * Obtém estatísticas ou dados agregados
   * @param statsEndpoint - Endpoint específico para estatísticas (ex: '/stats')
   */
  async getStats<StatsType = any>(statsEndpoint: string = '/stats'): Promise<StatsType> {
    const response = await this.get<ApiResponse<StatsType>>(`${this.endpoint}${statsEndpoint}`);
    return response.data;
  }

  /**
   * Atualiza apenas campos específicos de um registro
   * @param id - ID do registro
   * @param field - Nome do campo
   * @param value - Novo valor
   */
  async updateField(id: string | number, field: string, value: any): Promise<T> {
    const data = { [field]: value };
    const response = await this.put<ApiResponse<T>>(`${this.endpoint}/${id}/${field}`, data);
    return response.data;
  }

  /**
   * Duplica um registro existente
   * @param id - ID do registro a ser duplicado
   */
  async duplicate(id: string | number): Promise<T> {
    const response = await this.post<ApiResponse<T>>(`${this.endpoint}/${id}/duplicate`);
    return response.data;
  }

  /**
   * Obtém o endpoint atual configurado
   */
  getEndpoint(): string {
    return this.endpoint;
  }

  /**
   * Altera o endpoint do serviço
   * @param newEndpoint - Novo endpoint
   */
  setEndpoint(newEndpoint: string): void {
    this.endpoint = newEndpoint;
  }
}

/**
 * Factory function para criar instâncias do serviço genérico
 * @param endpoint - Endpoint base
 */
export function createGenericService<T = any, CreateInput = any, UpdateInput = any>(
  endpoint: string
): GenericApiService<T, CreateInput, UpdateInput> {
  return new GenericApiService<T, CreateInput, UpdateInput>(endpoint);
}

/**
 * Exemplos de uso:
 * 
 * // Para usuários
 * const usersService = createGenericService<User, CreateUserInput, UpdateUserInput>('/users');
 * 
 * // Para produtos
 * const productsService = createGenericService<Product, CreateProductInput, UpdateProductInput>('/products');
 * 
 * // Uso básico
 * const users = await usersService.list({ page: 1, per_page: 10 });
 * const user = await usersService.getById('123');
 * const newUser = await usersService.create({ name: 'João', email: 'joao@email.com' });
 * await usersService.update('123', { name: 'João Silva' });
 * await usersService.deleteById('123');
 * 
 * // Uso avançado
 * const stats = await usersService.getStats();
 * const searchResults = await usersService.search('joão');
 * const customData = await usersService.customGet('/active');
 * await usersService.customPost('/bulk-create', { users: [...] });
 */