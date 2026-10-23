<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Provider padrão
    |--------------------------------------------------------------------------
    | Cada tenant possui seu próprio banco, portanto as instâncias são
    | naturalmente isoladas. O servidor Evolution GO pode ser compartilhado
    | entre todos os tenants (padrão) e o nome técnico da instância recebe
    | um prefixo do tenant para evitar colisão.
    */
    'default_provider' => env('WHATSAPP_PROVIDER', 'evolution-go'),

    'evolution_go' => [
        // Fallback do .env. A credencial `evolution-go` cadastrada em
        // Configurações > Integrações tem prioridade (por tenant).
        'base_url' => env('EVOLUTION_GO_URL', env('EVOLUTION_API_URL', 'http://localhost:8080')),
        'api_key'  => env('EVOLUTION_GO_API_KEY', env('EVOLUTION_API_KEY')),
        'timeout'  => (int) env('EVOLUTION_GO_TIMEOUT', 30),

        // Eventos assinados no POST /instance/connect
        'subscribe' => ['MESSAGE', 'CONNECTION', 'QRCODE'],

        // Trava anti-rajada de QR por instância. Pedir QR em sequência
        // derruba a sessão viva no Evolution GO.
        'qr_max_requests'   => (int) env('EVOLUTION_GO_QR_MAX_REQUESTS', 3),
        'qr_window_seconds' => (int) env('EVOLUTION_GO_QR_WINDOW_SECONDS', 600),

        // Limite de instâncias por tenant (0 = ilimitado)
        'max_instances' => (int) env('EVOLUTION_GO_MAX_INSTANCES', 5),

        // Prefixo dos nomes técnicos criados no servidor Go
        'instance_prefix' => env('EVOLUTION_GO_INSTANCE_PREFIX', 'ead'),

        // URL pública do backend para o webhook. Quando vazio, usa o host
        // da requisição atual (recomendado em produção).
        'webhook_base_url' => env('EVOLUTION_GO_WEBHOOK_BASE_URL'),
    ],

    'webhook' => [
        'events' => [
            'MESSAGE',
            'CONNECTION',
            'QRCODE',
        ],
    ],

    'message' => [
        // Limite por parte (o WhatsApp aceita ~4096 caracteres)
        'max_length' => (int) env('WHATSAPP_MESSAGE_MAX_LENGTH', 4000),
        // Delay de "digitando" antes de cada parte (ms)
        'typing_delay_ms' => (int) env('WHATSAPP_TYPING_DELAY_MS', 800),
    ],
];
