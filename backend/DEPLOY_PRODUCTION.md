# Guia de Deploy em Produção (Docker / Portainer / EasyPanel)

Este guia descreve como colocar a aplicação **Eadcontrol-v2** em produção utilizando Docker Compose. A arquitetura consiste em:

1.  **Nginx (Gateway)**: Recebe todas as requisições na porta 80.
    -   `/api/*`, `/storage/*`, `/tenancy/*` → Redireciona para o Backend (Octane).
    -   `/*` (Todo o resto) → Redireciona para o Frontend (Single Page App).
2.  **Backend (Octane/Laravel)**: API e processamento.
3.  **Frontend (Nginx + Static)**: Serve os arquivos estáticos do React/Vite.
4.  **MySQL & Redis**: Banco de dados e Cache.

---

## 1. Preparação

Certifique-se de que os seguintes arquivos foram criados/atualizados (já fiz isso para você):

-   `frontend/Dockerfile`: Configuração para buildar o frontend.
-   `backend/docker-compose.prod.yml`: Orquestração dos serviços.
-   `backend/deployment/nginx/nginx.conf`: Roteamento de tráfego.

---

## 2. Deploy via Portainer (Stacks)

O método mais fácil no Portainer é conectar o repositório Git.

1.  Acesse seu **Portainer**.
2.  Vá em **Stacks** > **Add stack**.
3.  Escolha **Repository**.
4.  **Repository URL**: Coloque a URL do seu Git (ex: `https://github.com/seu-usuario/Eadcontrol-v2`).
5.  **Repository reference**: `refs/heads/main` (ou sua branch de produção).
6.  **Compose path**: `backend/docker-compose.prod.yml`
    -   *Nota*: O arquivo está dentro da pasta backend.
7.  **Environment variables**: Adicione as variáveis do seu `.env`. Copie o conteúdo do `.env` de produção e cole aqui.
    -   Certifique-se de ajustar `APP_URL`, `VITE_TENANT_API_URL`, `DB_PASSWORD`, etc.
8.  Clique em **Deploy the stack**.

O Portainer irá clonar o repositório, buildar as imagens (pode demorar alguns minutos na primeira vez) e subir os serviços.

### Ajuste de Caminhos (Importante)
Se o Portainer reclamar do caminho `../frontend` no build, pode ser necessário mover o `backend/docker-compose.prod.yml` para a **raiz do projeto** (`/`) no seu repositório Git e ajustar os caminhos:
-   `context: ../frontend` vira `context: ./frontend`
-   `context: .` (backend) vira `context: ./backend`

---

## 3. Deploy via EasyPanel

O EasyPanel também funciona muito bem com Docker Compose.

1.  Crie um **novo Projeto**.
2.  Adicione um **Service** do tipo **App** (ou Custom Docker Compose se disponível).
3.  Conecte seu **GitHub/GitLab**.
4.  No campo **Docker Compose**, especifique o caminho: `backend/docker-compose.prod.yml`.
5.  Em **Environment**, cole suas variáveis de ambiente (`.env`).
6.  Faça o deploy.

---

## 4. Deploy Manual (VPS com Docker)

Se quiser rodar na mão via terminal:

1.  Clone o repositório:
    ```bash
    git clone https://github.com/seu-usuario/Eadcontrol-v2.git
    cd Eadcontrol-v2/backend
    ```

2.  Crie o arquivo `.env` com as configurações de produção.

3.  Rode o build e suba:
    ```bash
    docker compose -f docker-compose.prod.yml up -d --build
    ```

---

## Variáveis de Ambiente Importantes

Certifique-se de definir estas variáveis no painel (Portainer/EasyPanel):

```ini
APP_NAME="Ead Control"
APP_ENV=production
APP_KEY=base64:...
APP_DEBUG=false
APP_URL=https://seu-dominio.com

# Database (Internal Docker Network)
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=ead_prod
DB_USERNAME=ead_user
DB_PASSWORD=senha_segura

# Redis
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

# Frontend
VITE_TENANT_API_URL=https://seu-dominio.com/api
```
