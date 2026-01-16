# Estratégia de Banco de Dados

## Produção (MySQL)
- Use MySQL como banco principal para alta concorrência e multi-tenant.
- Configure leitura e escrita:
  - `.env`: `DB_WRITE_HOST`, `DB_READ_HOST` (ou Proxy/Router).
  - [database.php](file:///home/fernando/Eadcontrol-v2/backend/config/database.php#L45-L76) já suporta `read`/`write` com `sticky=true`.
- Redis para cache, sessão e filas.
- Tuning e logs: ver [my.cnf](file:///home/fernando/Eadcontrol-v2/backend/deployment/mysql/my.cnf) e replicação em [replication.md](file:///home/fernando/Eadcontrol-v2/backend/deployment/mysql/replication.md).

## Desenvolvimento/Testes (SQLite)
- Opcionalmente utilizar SQLite para testes rápidos e ambientes locais.
- Ajuste `.env`:
  - `DB_CONNECTION=sqlite`
  - `DB_DATABASE=database/database.sqlite`
- Limitações de concorrência: não usar em produção com alto volume de escrita.

