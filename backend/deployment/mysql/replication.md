# Replicação MySQL (Leitura)

## Objetivo
Habilitar uma réplica de leitura para descarregar SELECTs do primário e aumentar throughput.

## Passos (alto nível)
1. Configure `my.cnf` no primário com:
   - `server-id=1`, `log_bin` habilitado, `binlog_format=ROW`, `sync_binlog=1`.
2. Suba a instância réplica com `server-id=2` e `read_only=ON`.
3. Execute `CHANGE MASTER TO ...` apontando para o binlog do primário.
4. Valide replicação com `SHOW SLAVE STATUS\\G` (MySQL 8: `SHOW REPLICA STATUS\\G`).
5. Configure a aplicação para usar `DB_READ_HOST` apontando para a réplica.

## Aplicação (Laravel)
- Já suportado em [database.php](file:///home/fernando/Eadcontrol-v2/backend/config/database.php#L45-L76) via `read.host` e `write.host`.
- Defina em `.env`:
  - `DB_WRITE_HOST` = host do primário
  - `DB_READ_HOST` = host do Proxy/Router ou réplica

## Proxy (Opcional)
- Use ProxySQL/MySQL Router para roteamento e failover:
  - Porta de clientes: 6033
  - Configure regras: `read_only=true` para réplicas; `writer` para primário.

## Observações
- Monitore atraso de replicação e redirecione queries sensíveis para o primário.
- Use `sticky=true` no Laravel para que leitura após escrita vá ao primário.

