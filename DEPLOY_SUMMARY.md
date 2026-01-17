# Guia de Deploy e Solução de Problemas (Produção)

Este documento resume os passos críticos e correções realizadas para colocar o ambiente de produção (VPS) em funcionamento.

## 1. Configuração de Domínios e SSL (Nginx)

### Problema Comum
O Nginx entra em loop de reinicialização (`Restarting`) se os certificados SSL não existirem ou se o caminho no `nginx.conf` estiver incorreto.

### Solução
1.  **Parar o Nginx** (para liberar a porta 80):
    ```bash
    docker compose -f docker-compose.production.yml down
    ```
2.  **Gerar Certificados (Certbot Standalone)**:
    ```bash
    sudo certbot certonly --standalone \
      -d cursos.incluireeducar.com.br \
      -d api-cursos.incluireeducar.com.br \
      --email seu-email@exemplo.com --agree-tos --no-eff-email
    ```
3.  **Configurar Nginx (`backend/deployment/nginx/nginx.ssl.conf`)**:
    Certifique-se de que os caminhos `ssl_certificate` e `ssl_certificate_key` apontam para a pasta correta gerada (geralmente a do primeiro domínio listado).
4.  **Cifras SSL**: Use cifras compatíveis para evitar erro `no cipher match`:
    ```nginx
    ssl_ciphers HIGH:!aNULL:!MD5;
    ```

## 2. Banco de Dados e Tenancy

### Permissões de Usuário
O pacote `stancl/tenancy` precisa criar novos bancos de dados para cada tenant. O usuário padrão do `.env` pode não ter permissão.
**Correção**:
```bash
docker compose -f docker-compose.production.yml exec db mysql -u root -p
# Senha: verifique DB_PASSWORD no .env
GRANT ALL PRIVILEGES ON *.* TO 'eadcontrol'@'%';
FLUSH PRIVILEGES;
```

### Erro de Índice em Coluna TEXT
Migrations que criam índices em colunas `TEXT` (como `id_cliente`) falham no MySQL sem tamanho definido.
**Correção na Migration**:
```php
$table->index([\DB::raw('id_cliente(36)')], 'nome_do_indice');
```
**Correção Manual (Emergencial)**: Alterar tipo para `VARCHAR(36)` via PhpMyAdmin.

## 3. Rotas e Identificação de Tenant

### Erro 404 em Rotas Centrais (`/api/v1/login`)
Se a API retorna 404 mesmo a rota existindo, o domínio pode estar sendo tratado como Tenant (que não tem essas rotas) em vez de Central.

**Correção**: Adicionar o domínio da API em `backend/config/tenancy.php`:
```php
'central_domains' => [
    '127.0.0.1',
    'localhost',
    'api-cursos.incluireeducar.com.br', // Adicionar aqui
],
```

## 4. Frontend (Vite/React)

### Variáveis de Ambiente
Variáveis `VITE_` são injetadas no **momento do build**. Se alterar o `.env` ou `docker-compose.yml`, o container precisa ser reconstruído.

**Comando de Rebuild**:
```bash
docker compose -f docker-compose.production.yml up -d --build frontend
```

## 5. Comandos Úteis de Manutenção

### Limpar Cache (Backend)
Essencial após qualquer mudança de configuração ou código no Laravel Octane.
```bash
docker compose -f docker-compose.production.yml exec backend php artisan optimize:clear
docker compose -f docker-compose.production.yml exec backend php artisan route:clear
docker compose -f docker-compose.production.yml restart backend
```

### Criar Tenant Manualmente (Tinker)
```bash
docker compose -f docker-compose.production.yml exec backend php artisan tinker
```
```php
$tenant = App\Models\Tenant::create(['id' => 'api-cursos']);
$tenant->domains()->create(['domain' => 'api-cursos.incluireeducar.com.br']);
$tenant->run(function () {
    App\Models\User::create([
        'name' => 'Admin',
        'email' => 'admin@exemplo.com',
        'password' => bcrypt('senha'),
    ]);
});
```

---
*Atualizado em 17/01/2026*
