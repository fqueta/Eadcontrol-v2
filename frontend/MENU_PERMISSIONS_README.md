# Sistema de Menus Dinâmicos e Permissões

## Visão Geral

O sistema agora suporta menus personalizados baseados em permissões do usuário. O menu pode ser fornecido pela API durante o login ou usar um menu padrão com filtros de permissão.

## Arquitetura

### Tipos Definidos

**MenuItemDTO** - Formato esperado da API:
```typescript
interface MenuItemDTO {
  title: string;
  url?: string;
  icon?: string;          // Nome do ícone Lucide (ex: "Home", "Users")
  permission?: string;    // Código da permissão (ex: "dashboard.view")
  items?: MenuItemDTO[];  // Sub-itens do menu
}
```

**MenuItemResolved** - Formato interno com ícones resolvidos:
```typescript
interface MenuItemResolved {
  title: string;
  url?: string;
  icon: LucideIcon;      // Componente do ícone
  permission?: string;
  items?: MenuItemResolved[];
}
```

### Estrutura de Permissões

Sistema hierárquico baseado em módulos:

```
dashboard.view
clients.view
service-objects.view
catalog.view
  ├── catalog.products.view
  ├── catalog.services.view
  └── catalog.categories.view
budgets.view
service-orders.view
finance.view
  ├── finance.payments.view
  ├── finance.cash-flow.view
  ├── finance.accounts-receivable.view
  └── finance.accounts-payable.view
reports.view
  ├── reports.revenue.view
  ├── reports.service-orders.view
  ├── reports.top-products.view
  └── reports.financial.view
settings.view
  ├── settings.users.view
  ├── settings.user-profiles.view
  ├── settings.permissions.view
  ├── settings.os-statuses.view
  ├── settings.payment-methods.view
  └── settings.system.view
```

## Integração com a API

### Resposta do Login

A API pode retornar permissões e/ou menu personalizado:

```json
{
  "user": { ... },
  "token": "...",
  "permissions": [
    "dashboard.view",
    "clients.view",
    "catalog.products.view"
  ],
  "menu": [
    {
      "title": "Dashboard",
      "url": "/",
      "icon": "Home",
      "permission": "dashboard.view"
    },
    {
      "title": "Catálogo",
      "icon": "Package",
      "permission": "catalog.view",
      "items": [
        {
          "title": "Produtos",
          "url": "/products",
          "permission": "catalog.products.view"
        }
      ]
    }
  ]
}
```

### Endpoints Opcionais

Se o login não retornar menu/permissões, o sistema tentará buscar via:

- `GET /api/v1/user/permissions` → `{ permissions: string[] }`
- `GET /api/v1/user/menu` → `{ menu: MenuItemDTO[] }`

## Comportamento do Sistema

### Prioridades

1. **Menu da API**: Se fornecido no login, usa o menu personalizado
2. **Menu Padrão**: Usa o menu padrão definido em `src/lib/menu.ts`

### Filtro de Permissões

- Se o usuário tem permissões definidas, filtra itens sem permissão
- Grupos sem sub-itens visíveis são removidos
- Itens sem `permission` são sempre visíveis

### Ícones Suportados

```typescript
const iconMap = {
  Home, Users, Wrench, Package, FileText,
  ClipboardList, DollarSign, BarChart3, Settings
}
```

Ícones não encontrados usam `FileText` como fallback.

## Persistência

Os dados são salvos no `localStorage`:

- `auth_permissions`: Array de strings com permissões
- `auth_menu`: Array de MenuItemDTO personalizado (se fornecido)
- `auth_user`, `auth_token`: Dados do usuário e token

## Futuras Melhorias

1. **Proteção de Rotas**: Verificar permissões antes de acessar páginas
2. **Preferências do Usuário**: Persistir estado do sidebar (colapsado/expandido)
3. **Cache Inteligente**: Atualizar menu/permissões periodicamente
4. **Ícones Dinâmicos**: Suporte a mais ícones via importação dinâmica