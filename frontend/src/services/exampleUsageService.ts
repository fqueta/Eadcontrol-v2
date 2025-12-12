import { createGenericService, GenericApiService } from './GenericApiService';

/**
 * Exemplo de tipos para demonstrar o uso do serviço genérico
 */
interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

interface UpdateUserInput {
  name?: string;
  email?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  points: number;
  category: string;
  image: string;
  rating: number;
  reviews: number;
  availability: 'available' | 'limited' | 'unavailable';
  terms: string[];
  validUntil?: string;
}

interface CreateProductInput {
  name: string;
  price: number;
  stock: number;
  category_id: string;
}

interface UpdateProductInput {
  name?: string;
  price?: number;
  stock?: number;
  category_id?: string;
}

/**
 * Exemplos de como criar serviços específicos usando o GenericApiService
 */

// 1. Serviço simples usando factory function
export const usersService = createGenericService<User, CreateUserInput, UpdateUserInput>('/users');
export const productsService = createGenericService<Product, CreateProductInput, UpdateProductInput>('/products');
export const categoriesService = createGenericService('/categories');

// 2. Serviço customizado estendendo GenericApiService
class UsersService extends GenericApiService<User, CreateUserInput, UpdateUserInput> {
  constructor() {
    super('/users');
  }

  /**
   * Método específico para ativar/desativar usuário
   */
  async toggleStatus(id: string, active: boolean): Promise<User> {
    return this.updateField(id, 'active', active);
  }

  /**
   * Método específico para resetar senha
   */
  async resetPassword(id: string): Promise<{ message: string }> {
    return this.customPost(`/${id}/reset-password`);
  }

  /**
   * Método específico para obter usuários ativos
   */
  async getActiveUsers(): Promise<User[]> {
    const response = await this.customGet('/active');
    return response.data;
  }
}

// 3. Serviço para métricas usando o endpoint específico
class MetricsService extends GenericApiService {
  constructor() {
    super('/dashboard-metrics');
  }

  /**
   * Importa dados do aeroclube
   */
  async importAeroclube(data: { ano: number; numero: number; tipo: string }): Promise<any> {
    return this.customPost('/import-aeroclube', data);
  }

  /**
   * Obtém métricas por período
   */
  async getMetricsByPeriod(startDate: string, endDate: string): Promise<any> {
    return this.customGet('', { start_date: startDate, end_date: endDate });
  }
}

// 4. Instâncias dos serviços customizados
export const customUsersService = new UsersService();
export const metricsService = new MetricsService();

/**
 * Exemplos de uso dos serviços:
 */

// Uso básico com factory function
export async function exampleBasicUsage() {
  try {
    // Listar usuários
    const users = await usersService.list({ page: 1, per_page: 10 });
    console.log('Usuários:', users);

    // Buscar usuário por ID
    const user = await usersService.getById('123');
    console.log('Usuário:', user);

    // Criar novo usuário
    const newUser = await usersService.create({
      name: 'João Silva',
      email: 'joao@email.com',
      password: '123456'
    });
    console.log('Novo usuário:', newUser);

    // Atualizar usuário
    const updatedUser = await usersService.update('123', {
      name: 'João Santos'
    });
    console.log('Usuário atualizado:', updatedUser);

    // Deletar usuário
    await usersService.deleteById('123');
    console.log('Usuário deletado');

  } catch (error) {
    console.error('Erro:', error);
  }
}

// Uso avançado com métodos customizados
export async function exampleAdvancedUsage() {
  try {
    // Buscar produtos
    const products = await productsService.search('notebook', { page: 1 });
    console.log('Produtos encontrados:', products);

    // Obter estatísticas
    const stats = await productsService.getStats();
    console.log('Estatísticas:', stats);

    // Usar método customizado
    const activeUsers = await customUsersService.getActiveUsers();
    console.log('Usuários ativos:', activeUsers);

    // Resetar senha
    await customUsersService.resetPassword('123');
    console.log('Senha resetada');

    // Importar dados de métricas
    await metricsService.importAeroclube({
      ano: 2024,
      numero: 1,
      tipo: 'mes'
    });
    console.log('Dados importados');

  } catch (error) {
    console.error('Erro:', error);
  }
}

// Uso dinâmico - mudando endpoint em runtime
export async function exampleDynamicUsage() {
  const dynamicService = createGenericService('/initial-endpoint');
  
  // Usar com endpoint inicial
  await dynamicService.list();
  
  // Mudar para outro endpoint
  dynamicService.setEndpoint('/another-endpoint');
  await dynamicService.list();
  
  console.log('Endpoint atual:', dynamicService.getEndpoint());
}