# Guia de Operação e Manutenção - EadControl Production

## Visão Geral

Este guia fornece instruções para operação, manutenção e troubleshooting do EadControl em ambiente de produção.

## Arquitetura

### Componentes
- **Gateway**: Nginx (reverse proxy, SSL termination)
- **Frontend**: React/Vite (SPA)
- **Backend**: Laravel Octane (RoadRunner)
- **Banco de Dados**: MySQL 8.0
- **Cache/Filas**: Redis
- **Queue Workers**: Laravel Queue Workers
- **Scheduler**: Laravel Task Scheduler
- **phpMyAdmin**: Interface de administração do banco

## Operação Diária

### Verificação de Saúde (Health Check)
```bash
bash backend/deployment/monitor.sh
```

### Monitoramento de Logs
```bash
# Ver logs do backend em tempo real
docker compose -f docker-compose.production.yml logs -f backend

# Ver logs do frontend
docker compose -f docker-compose.production.yml logs -f frontend

# Ver logs de todos os serviços
docker compose -f docker-compose.production.yml logs -f
```

### Verificar Status dos Serviços
```bash
docker compose -f docker-compose.production.yml ps
```

## Manutenção

### Atualização de Código (Deploy)

1. **Fazer backup antes de atualizar**
   ```bash
   bash backend/deployment/backup/mysql-backup.sh
   ```

2. **Pull das atualizações**
   ```bash
   git pull origin main
   ```

3. **Rebuild dos containers**
   ```bash
   docker compose -f docker-compose.production.yml build
   ```

4. **Restart dos serviços**
   ```bash
   docker compose -f docker-compose.production.yml down
   docker compose -f docker-compose.production.yml up -d
   ```

5. **Executar migrations (se necessário)**
   ```bash
   docker compose -f docker-compose.production.yml exec backend php artisan migrate
   ```

6. **Clear de cache**
   ```bash
   docker compose -f docker-compose.production.yml exec backend php artisan cache:clear
   docker compose -f docker-compose.production.yml exec backend php artisan config:clear
   docker compose -f docker-compose.production.yml exec backend php artisan route:clear
   docker compose -f docker-compose.production.yml exec backend php artisan view:clear
   ```

### Backup Automatizado

O backup é executado automaticamente diariamente às 2h da manhã (configure via crontab).

Para executar backup manual:
```bash
bash backend/deployment/backup/mysql-backup.sh
```

### Restauração de Backup

```bash
# Descompactar e restaurar
gunzip < backups/mysql_backup_YYYYMMDD.sql.gz | docker exec -i app_db mysql -u eadcontrol -pstrong-password eadcontrol
```

### Limpeza de Espaço

Remover containers e imagens não utilizados:
```bash
docker system prune -a
```

Remover volumes não utilizados (CUIDADO):
```bash
docker volume prune
```

## Troubleshooting

### Serviço não responde

1. Verificar status dos containers
   ```bash
   docker compose -f docker-compose.production.yml ps
   ```

2. Verificar logs de erros
   ```bash
   docker compose -f docker-compose.production.yml logs --tail=100
   ```

3. Reiniciar serviço específico
   ```bash
   docker compose -f docker-compose.production.yml restart backend
   ```

### Filas paradas

Verificar status das filas:
```bash
docker compose -f docker-compose.production.yml exec backend php artisan queue:failed
```

Reiniciar workers:
```bash
docker compose -f docker-compose.production.yml restart queue_worker
```

### Banco de Dados lento

Verificar slow queries:
```bash
docker compose -f docker-compose.production.yml exec db tail -f /var/lib/mysql/slow.log
```

### Memória alta

Verificar uso de memória:
```bash
docker stats
```

Reiniciar containers problemáticos:
```bash
docker compose -f docker-compose.production.yml restart
```

### Erros de CORS

Verificar configuração em `backend/config/cors.php` e reiniciar backend:
```bash
docker compose -f docker-compose.production.yml restart backend
```

### Certificados SSL expirados

Renovar certificados:
```bash
sudo certbot renew
docker compose -f docker-compose.production.yml restart gateway
```

## Escalabilidade

### Aumentar workers de Octane

Editar `backend/deployment/octane/rr.yaml`:
```yaml
pool:
  num_workers: 24  # Aumentar conforme necessário
```

Rebuild e restart:
```bash
docker compose -f docker-compose.production.yml build backend
docker compose -f docker-compose.production.yml up -d backend
```

### Aumentar workers de filas

Editar `docker-compose.production.yml` e adicionar mais serviços de queue_worker ou aumentar concorrência no comando.

## Comandos Úteis

### Artisan Commands
```bash
# Executar comando artisan no container
docker compose -f docker-compose.production.yml exec backend php artisan <command>

# Verificar status do Octane
docker compose -f docker-compose.production.yml exec backend php artisan octane:status

# Limpar cache de Octane
docker compose -f docker-compose.production.yml exec backend php artisan octane:reload
```

### MySQL Operations
```bash
# Acessar CLI do MySQL
docker compose -f docker-compose.production.yml exec db mysql -u eadcontrol -pstrong-password eadcontrol

# Verificar tamanho do banco
docker compose -f docker-compose.production.yml exec db mysql -u eadcontrol -pstrong-password -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.TABLES GROUP BY table_schema;"
```

### Redis Operations
```bash
# Acessar CLI do Redis
docker compose -f docker-compose.production.yml exec redis redis-cli

# Limpar todo o cache do Redis
docker compose -f docker-compose.production.yml exec redis redis-cli FLUSHALL
```

## Backup e Restore

### Backup Completo (Database + Volumes)
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker run --rm -v eadcontrol_db_data:/data -v $(pwd):/backup ubuntu tar czf /backup/db_backup_${DATE}.tar.gz -C /data .
docker run --rm -v eadcontrol_redis_data:/data -v $(pwd):/backup ubuntu tar czf /backup/redis_backup_${DATE}.tar.gz -C /data .
```

### Restore Completo
```bash
docker run --rm -v eadcontrol_db_data:/data -v $(pwd):/backup ubuntu tar xzf /backup/db_backup_DATE.tar.gz -C /data
docker run --rm -v eadcontrol_redis_data:/data -v $(pwd):/backup ubuntu tar xzf /backup/redis_backup_DATE.tar.gz -C /data
```

## Contatos e Suporte

- Logs: `/var/log/mysql-backup.log`, logs do Docker
- Documentação técnica: `backend/deployment/`
- Issues: Repositório do projeto
