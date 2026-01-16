# Observabilidade da Aplicação

## Laravel Telescope
- Útil para inspecionar requisições, queries, jobs e eventos.
- Instalação sugerida (documentação oficial) e habilitação apenas em staging/produção restrita.

## Laravel Horizon
- Dashboard e métricas para filas Redis.
- Recomenda-se instalar em produção com alerta em tempo de fila e tempo de execução.

## Prometheus
- Exporte métricas (HTTP, DB, filas) via pacote compatível (ex.: spatie/laravel-prometheus).
- Colete com Prometheus e visualize no Grafana.

## MySQL
- Slow query log habilitado em [my.cnf](file:///home/fernando/Eadcontrol-v2/backend/deployment/mysql/my.cnf).
- Use performance_schema para métricas e tuning.

