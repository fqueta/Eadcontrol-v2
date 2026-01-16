# Teste de Carga (k6)

## Metas
- P95 < 300 ms para operações de leitura.
- P99 < 800 ms para endpoints críticos.
- Taxa de erro < 0.5%.

## Cenários
1. Login e bootstrap (obtém perfil, cursos do usuário).
2. Listagem de cursos e busca/paginação.
3. Assistir aula (stream start + heartbeat).
4. Matrícula (criação + confirmação) em fila assíncrona.

## Execução
- Use scripts em `deployment/loadtest/k6-scenarios.js`.
- Colete métricas em Prometheus/Grafana e MySQL slow log.

