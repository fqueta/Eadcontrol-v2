# Sistema de Redirecionamento Após Login

Este documento descreve o sistema de redirecionamento implementado para garantir que os usuários sejam redirecionados para a página correta após fazer login ou registro.

## Funcionalidades

### 1. Redirecionamento Automático
- Quando um usuário não autenticado tenta acessar uma rota protegida, ele é redirecionado para a página de login
- Após o login bem-sucedido, o usuário é automaticamente redirecionado para a página que estava tentando acessar
- Preserva query parameters e hash fragments na URL

### 2. Múltiplas Formas de Redirecionamento

#### Via State (Prioridade 1)
Quando o `ProtectedRoute` redireciona para login, salva a localização atual no state:
```javascript
<Navigate to="/login?redirect=..." state={{ from: location }} replace />
```

#### Via Query Parameter (Prioridade 2)
Também adiciona um parâmetro `redirect` na URL:
```
/login?redirect=%2Fadmin%2Fproducts%3Fpage%3D2%23section
```

#### Fallback (Prioridade 3)
Se nenhuma das opções acima estiver disponível, redireciona para `/`

### 3. Lógica de Negócio Específica
- **Prioridade 1**: Se há uma URL específica para redirecionamento (diferente de '/'), o usuário é redirecionado para essa URL, independentemente de suas permissões
- **Prioridade 2**: Se não há redirecionamento específico e o usuário tem `permission_id < 5`, ele é redirecionado para `/admin`
- **Prioridade 3**: Fallback para a página inicial ('/')

## Componentes e Hooks

### `useRedirect` Hook
Hook personalizado que gerencia toda a lógica de redirecionamento:

```typescript
const { redirectAfterAuth, createLoginUrl, getRedirectUrl } = useRedirect();

// Redireciona após autenticação
redirectAfterAuth(user);

// Cria URL de login com redirecionamento
const loginUrl = createLoginUrl('/admin/products');

// Obtém URL de redirecionamento
const redirectUrl = getRedirectUrl();
```

### `LoginRedirectLink` Componente
Componente que automaticamente redireciona para login se necessário:

```tsx
import { LoginRedirectLink } from '@/components/auth/LoginRedirectLink';

// Link que requer autenticação
<LoginRedirectLink to="/admin/products" requireAuth={true}>
  Ver Produtos
</LoginRedirectLink>

// Link normal (não requer autenticação)
<LoginRedirectLink to="/public-page" requireAuth={false}>
  Página Pública
</LoginRedirectLink>
```

### `ProtectedRoute` Componente
Componente atualizado que preserva a URL completa:

```tsx
<ProtectedRoute>
  <AdminPanel />
</ProtectedRoute>
```

## Páginas de Autenticação

### Login e Register
Ambas as páginas usam o hook `useRedirect` para redirecionamento consistente:

```typescript
const { redirectAfterAuth } = useRedirect();

useEffect(() => {
  if (loginSuccess && isAuthenticated && user) {
    redirectAfterAuth(user);
    setLoginSuccess(false);
  }
}, [loginSuccess, isAuthenticated, user, redirectAfterAuth]);
```

## Exemplos de Uso

### Cenário 1: Usuário tenta acessar página protegida
1. Usuário acessa `/admin/products?page=2#section`
2. `ProtectedRoute` detecta que não está autenticado
3. Redireciona para `/login?redirect=%2Fadmin%2Fproducts%3Fpage%3D2%23section`
4. Usuário faz login
5. Sistema redireciona para `/admin/products?page=2#section`

### Cenário 2: Link direto para login com redirecionamento
```tsx
<LoginRedirectLink to="/admin/settings" requireAuth={true}>
  Configurações
</LoginRedirectLink>
```

### Cenário 3: Redirecionamento programático
```typescript
const { createLoginUrl } = useRedirect();
const loginUrl = createLoginUrl('/admin/dashboard');
navigate(loginUrl);
```

## Benefícios

1. **Experiência do Usuário**: Usuários são levados exatamente para onde queriam ir
2. **Preservação de Estado**: Query parameters e hash são mantidos
3. **Flexibilidade**: Múltiplas formas de especificar redirecionamento
4. **Consistência**: Mesmo comportamento em todas as páginas de autenticação
5. **Manutenibilidade**: Lógica centralizada no hook `useRedirect`

## Considerações de Segurança

- URLs de redirecionamento são validadas para evitar redirecionamentos maliciosos
- Apenas URLs internas são permitidas
- Encoding/decoding adequado para caracteres especiais