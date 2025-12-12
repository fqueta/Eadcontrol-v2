# Serviços de API

Este diretório contém os serviços para comunicação com a API do backend.

## GenericApiService

O `GenericApiService` é um serviço genérico que permite realizar operações CRUD em qualquer endpoint da API, seguindo o padrão estabelecido pelo projeto.

### Características

- **Flexível**: Permite usar qualquer endpoint passando-o como parâmetro
- **Type-safe**: Suporte completo ao TypeScript com generics
- **Reutilizável**: Evita duplicação de código entre serviços
- **Extensível**: Pode ser estendido para adicionar métodos específicos
- **Consistente**: Mantém o mesmo padrão de todos os serviços do projeto

### Uso Básico

```typescript
import { createGenericService } from '@/services/GenericApiService';

// Criar serviço para qualquer endpoint
const usersService = createGenericService('/users');
const productsService = createGenericService('/products');
const categoriesService = createGenericService('/categories');

// Operações CRUD básicas
const users = await usersService.list({ page: 1, per_page: 10 });
const user = await usersService.getById('123');
const newUser = await usersService.create({ name: 'João', email: 'joao@email.com' });
const updatedUser = await usersService.update('123', { name: 'João Silva' });
await usersService.deleteById('123');
```

### Uso com TypeScript

```typescript
interface User {
  id: string;
  name: string;
  email: string;
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

// Serviço tipado
const usersService = createGenericService<User, CreateUserInput, UpdateUserInput>('/users');

// Agora todas as operações são type-safe
const users: PaginatedResponse<User> = await usersService.list();
const user: User = await usersService.getById('123');
```

### Métodos Disponíveis

#### Operações CRUD
- `list(params?)` - Lista registros com paginação e filtros
- `getById(id)` - Obtém um registro por ID
- `create(data)` - Cria um novo registro
- `update(id, data)` - Atualiza um registro existente
- `deleteById(id)` - Exclui um registro

#### Métodos Auxiliares
- `search(term, params?)` - Busca registros por termo
- `getStats(endpoint?)` - Obtém estatísticas
- `updateField(id, field, value)` - Atualiza um campo específico
- `duplicate(id)` - Duplica um registro

#### Métodos Customizados
- `customGet(endpoint?, params?)` - GET personalizado
- `customPost(endpoint?, data?)` - POST personalizado
- `customPut(endpoint?, data?)` - PUT personalizado
- `customDelete(endpoint?)` - DELETE personalizado

### Estendendo o Serviço

Para adicionar métodos específicos, estenda a classe:

```typescript
class UsersService extends GenericApiService<User, CreateUserInput, UpdateUserInput> {
  constructor() {
    super('/users');
  }

  async resetPassword(id: string): Promise<{ message: string }> {
    return this.customPost(`/${id}/reset-password`);
  }

  async getActiveUsers(): Promise<User[]> {
    const response = await this.customGet('/active');
    return response.data;
  }
}

export const usersService = new UsersService();
```

### Exemplo Prático: Serviço de Métricas

```typescript
class MetricsService extends GenericApiService {
  constructor() {
    super('/dashboard-metrics');
  }

  async importAeroclube(data: { ano: number; numero: number; tipo: string }) {
    return this.customPost('/import-aeroclube', data);
  }

  async getMetricsByPeriod(startDate: string, endDate: string) {
    return this.customGet('', { start_date: startDate, end_date: endDate });
  }
}

export const metricsService = new MetricsService();

// Uso
await metricsService.importAeroclube({ ano: 2024, numero: 1, tipo: 'mes' });
const metrics = await metricsService.getMetricsByPeriod('2024-01-01', '2024-01-31');
```

### Vantagens

1. **Redução de Código**: Elimina a necessidade de criar serviços completos para endpoints simples
2. **Consistência**: Todos os serviços seguem o mesmo padrão
3. **Manutenibilidade**: Mudanças na BaseApiService se refletem automaticamente
4. **Flexibilidade**: Pode ser usado para qualquer endpoint
5. **Type Safety**: Suporte completo ao TypeScript
6. **Extensibilidade**: Fácil de estender para casos específicos

### Migração de Serviços Existentes

Para migrar um serviço existente:

1. Substitua a herança de `BaseApiService` por `GenericApiService`
2. Passe o endpoint no construtor
3. Remova métodos CRUD básicos (já estão implementados)
4. Mantenha apenas métodos específicos do domínio
5. Use `customGet`, `customPost`, etc. para operações específicas

### Arquivos de Exemplo

- `GenericApiService.ts` - Implementação do serviço genérico
- `exampleUsageService.ts` - Exemplos práticos de uso
- `serviceOrdersService.ts` - Exemplo de serviço específico (padrão atual)

### Compatibilidade

O `GenericApiService` é totalmente compatível com:
- Hooks existentes (`useGenericApi`)
- Padrões de resposta da API
- Sistema de autenticação
- Tratamento de erros
- Normalização de respostas paginadas