# Guia de Inicialização do Servidor de Desenvolvimento

## Método Recomendado: Docker Compose (Laravel Sail)

### Iniciar todos os serviços
```bash
docker compose up -d
```

### Parar todos os serviços
```bash
docker compose down
```

### Ver status dos containers
```bash
docker compose ps
```

### Ver logs do servidor Laravel
```bash
docker compose logs -f laravel.test
```

### Acessar o container Laravel
```bash
docker compose exec laravel.test bash
```

---

## ⚠️ IMPORTANTE: Execução de Comandos Artisan

Sempre execute comandos `php artisan` através do Docker Compose. 

**Por que?**
O projeto está configurado para usar o banco de dados no host (`host.docker.internal`). Esse endereço só é resolvido **dentro** dos containers. Se você rodar o comando diretamente no seu terminal (host), receberá um erro de conexão:
`SQLSTATE[HY000] [2002] php_network_getaddresses: getaddrinfo for host.docker.internal failed`.

**Forma correta:**
```bash
docker compose exec laravel.test php artisan [comando]
```

## Serviços Disponíveis

Após iniciar com `docker compose up -d`, os seguintes serviços estarão disponíveis:

- **Backend Laravel (API)**: http://localhost:8002
- **Backend Central**: http://localhost:8000 (se configurado)
- **Frontend Vite**: http://localhost:5173
- **Redis**: localhost:6380

### Serviços Externos (não gerenciados pelo docker-compose.yml)

- **MySQL (MariaDB 10.5)**: localhost:3307 (container `mysql_container`)
- **phpMyAdmin**: http://localhost:8081 (container `phpmyadmin_container`)

## Troubleshooting: Porta 8000 em Uso

### Problema: Portainer bloqueando a porta 8000
Se você tiver o Portainer rodando, ele pode estar mapeado para a porta 8000. Para resolver:

```bash
# Parar o Portainer temporariamente
docker stop portainer

# Depois iniciar os serviços normalmente
docker compose up -d
```

### Verificar o que está usando a porta 8000
```bash
# Verificar containers Docker
docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Ports}}"

# Verificar processos do sistema
ss -lptn 'sport = :8000'
```

---

## Método Alternativo: Laravel Octane Standalone

Se preferir rodar o Octane diretamente (sem Docker):

### Iniciar o servidor com hot-reload
```bash
php artisan octane:start --server=roadrunner --watch
```

**Nota**: Para usar o `--watch`, você precisa instalar o chokidar:
```bash
npm install --save-dev chokidar
```

### Iniciar sem hot-reload
```bash
php artisan octane:start --server=roadrunner
```

### Usar porta diferente
```bash
php artisan octane:start --server=roadrunner --port=8080
```

## Liberar a Porta 8000

Se você receber o erro `Port 8000 is already in use`:

### Opção 1: Lsof
```bash
lsof -ti:8000 | xargs kill -9
```

### Opção 2: Fuser
```bash
fuser -k 8000/tcp
```

### Opção 3: Matar todos os processos PHP
```bash
killall -9 php
```

## Investigar processos em execução
```bash
# Ver todos os processos PHP
ps aux | grep php

# Ver processos do RoadRunner
ps aux | grep rr
```
