# Filas Assíncronas e Batch

## Redis
- Configure `QUEUE_CONNECTION=redis` (feito) e defina filas por tipo de trabalho.
- Ajuste `retry_after` e concorrência no worker (Horizon recomendado).

## Batch
- Use `Bus::batch()` para agrupar jobs (importações, cálculos).
- Persistência em tabela `job_batches` conforme [config/queue.php](file:///home/fernando/Eadcontrol-v2/backend/config/queue.php#L88-L91).

## Boas Práticas
- Idempotência: jobs devem poder reexecutar sem efeitos colaterais.
- Backoff exponencial para falhas transitórias.
- Monitorar tempo de fila e taxa de falhas.

