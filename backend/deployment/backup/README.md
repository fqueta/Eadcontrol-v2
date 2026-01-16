# Backups de Banco (MySQL)

## Estratégia
- Diários incrementais via `mysqldump`/`mydumper`, semanais completos.
- Retenção: 7 dias incrementais, 4 semanas completos.
- Armazenamento externo (S3/Backblaze) com criptografia.

## Execução
1. Montar script `run.sh` que:
   - Gera dump com timestamp.
   - Comprime (`xz`).
   - Envia para armazenamento externo.
2. Agendar com `crond` no container de backup ou fora do cluster.

## Restauração
- Validar em ambiente de staging periodicamente (DR test).

