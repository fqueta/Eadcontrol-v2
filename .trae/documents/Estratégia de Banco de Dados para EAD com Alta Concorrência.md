## Diagnóstico do Projeto
- Stack atual: Laravel + Eloquent + stancl/tenancy (multi-tenant) usando MySQL.
- Produção e desenvolvimento apontam para MySQL: [.env](file:///home/fernando/Eadcontrol-v2/.env#L15-L22), [backend/.env](file:///home/fernando/Eadcontrol-v2/backend/.env#L28-L35), [docker-compose.yml](file:///home/fernando/Eadcontrol-v2/docker-compose.yml#L31-L41), [docker-compose.production.yml](file:///home/fernando/Eadcontrol-v2/docker-compose.production.yml#L103-L114).
- Suporte a múltiplos drivers existe, mas o tenancy e o app estão configurados para MySQL: [database.php](file:///home/fernando/Eadcontrol-v2/backend/config/database.php#L45-L76), [tenancy.php](file:///home/fernando/Eadcontrol-v2/backend/config/tenancy.php#L41-L76).

## SQLite vs MySQL (70k simultâneas)
- SQLite é embutido, arquivo único, ótimo para testes/local; concorrência: muitas leituras, escrita bloqueia (mesmo com WAL). Não atende alta concorrência/multi-tenant com alto volume de escrita.
- MySQL é servidor, suporta pooling, replicação, failover, tuning de conexões (max_connections), índices e sharding/particionamento. É adequado para alta concorrência quando combinado com arquitetura correta.

## Decisão
- Manter MySQL em produção para atender 70k usuários simultâneos (via arquitetura com limites saudáveis de conexões de app e DB).
- Usar SQLite somente para testes unitários e desenvolvimento simples.

## Ajustes de Produção
- Tuning do MySQL: InnoDB Buffer Pool, max_connections, thread_pool, conexões TLS quando relevante.
- Replicação e leitura: configurar réplicas de leitura e front com ProxySQL/MySQL Router.
- Storage e backups: snapshots, PITR, backup automático, política de retenção.

## Ajustes na Aplicação (Laravel)
- Separação read/write: usar hosts distintos em [database.php](file:///home/fernando/Eadcontrol-v2/backend/config/database.php) para leitura e escrita.
- Tenancy: garantir que `tenant_connection` permaneça em MySQL: [tenancy.php](file:///home/fernando/Eadcontrol-v2/backend/config/tenancy.php#L41-L56).
- Cache e fila em Redis: sessions/cache/queue para reduzir pressão no DB: [queue.php](file:///home/fernando/Eadcontrol-v2/backend/config/queue.php#L89-L109).
- Índices: revisar migrations em [backend/database/migrations](file:///home/fernando/Eadcontrol-v2/backend/database/migrations) para índices em colunas de busca/junção.

## Observabilidade
- Ativar slow query log e métricas de performance.
- Instrumentar tempos de queries (Laravel Telescope/Horizon, Prometheus + Grafana).

## Teste de Carga
- Definir cenários (login, listar cursos, assistir aulas, matrículas) e metas.
- Ferramentas: k6/Locust. Validar throughput, latência P95/P99, erros.

## Riscos e Mitigações
- Gargalo em escrita: usar fila assíncrona e batch.
- Explosão de conexões: controlar workers PHP (FPM/Octane), limitar pool de conexões, usar caches agressivos.

Confirme se avançamos com esta estratégia (MySQL em produção; SQLite para testes/dev) e, em seguida, aplico as alterações de configuração e documentação correspondentes no projeto.