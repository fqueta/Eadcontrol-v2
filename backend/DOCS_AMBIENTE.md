🚀 Resumo de Configuração: Ambiente EAD Alta Performance
Contexto Atual:

Stack: Laravel (Backend) + React (Frontend).

Infra: Windows 11 + WSL2 + Docker (Laravel Sail).

Objetivo de Escala: 70.000 conexões simultâneas.

Configurações Realizadas:

Docker Compose: Adicionado serviço Redis com volume de persistência (sail-redis) e rede interna.

Conflitos de Porta: MySQL alterado para a porta externa 33061 no .env (FORWARD_DB_PORT=33061) para evitar conflitos com o Windows.

Drivers de Performance: * SESSION_DRIVER alterado para redis.

CACHE_STORE alterado para redis.

REDIS_HOST definido como redis (resolução interna do Docker).

Servidor de Aplicação: Configurado para usar Laravel Octane com servidor Swoole (preparado para alta concorrência).

Pendências e Próximos Passos:

CORS & Sanctum: Configurar o Laravel para aceitar requisições do frontend React que roda em eaddemo.localhost:4000.

Otimização de I/O: Mover o projeto para o sistema de arquivos nativo do Linux (diretório home) para máxima performance de leitura/escrita.

Limites do SO: Ajustar ulimits no Docker para suportar o volume de arquivos abertos simultâneos exigido por 70k usuários.