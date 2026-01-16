# Workers PHP e Pool de Conexões

## Octane (RoadRunner)
- Ajuste workers e max requests via CLI:
  - `php artisan octane:start --server=roadrunner --workers=64 --max-requests=1000`
- Dimensione trabalhadores para manter conexões de BD abaixo de limites saudáveis (ex.: < 1000).

## Recomendações
- Evite conexões persistentes indiscriminadas.
- Use cache (Redis) para leituras frequentes.
- Use separação read/write e réplicas para escalar leitura.
- Limite concurrency de filas e tarefas pesadas.

