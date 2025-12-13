<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Paths
    |--------------------------------------------------------------------------
    |
    | Aqui você define quais rotas terão CORS liberado.
    | Exemplo: ['api/*'] -> todas rotas que começam com /api
    | ['*'] -> todas as rotas
    |
    */
    // Aplica CORS a todas as rotas, inclusive respostas de erro
    'paths' => ['*'],

    /*
    |--------------------------------------------------------------------------
    | Allowed Methods
    |--------------------------------------------------------------------------
    |
    | Métodos HTTP permitidos. Use ['*'] para liberar todos.
    |
    */
    'allowed_methods' => ['*'],

    /*
    |--------------------------------------------------------------------------
    | Allowed Origins
    |--------------------------------------------------------------------------
    |
    | Quais domínios podem consumir sua API. Use ['*'] para liberar todos.
    | Exemplo: ['http://localhost:4000', 'https://meusite.com']
    |
    */
    'allowed_origins' => [
        // API subdomains
        'https://api-educar.eadcontrol.com.br',
        'https://api-aeroclube.eadcontrol.com.br',

        // Frontend production domains (explicit for credentials)
        'https://educar.eadcontrol.com.br',
        'https://www.educar.eadcontrol.com.br',

        //incluir N8N dominio
        'https://n8n-educar.eadcontrol.com.br',

        // Root domain (if hosting frontend at apex)
        'https://eadcontrol.com.br',
        // Dev/local origins
        'http://educar.localhost:3000',
        'http://educar.localhost:5173',
        'http://eaddemo.localhost:3000',
        'http://eaddemo.localhost:4000',
        'http://localhost:8000',
        'http://eadcontrol1.localhost:8080',
        'http://api-eaddemo.localhost:8000',
        'http://eaddemo.localhost:5173',
    ],

    /*
    |--------------------------------------------------------------------------
    | Allowed Origins Patterns
    |--------------------------------------------------------------------------
    |
    | Você pode usar regex para liberar origens.
    |
    */
    'allowed_origins_patterns' => [
        // Allow any subdomain of localhost on any port (dev)
        '/^https?:\\/\\/.*\\.localhost(:\\d+)?$/',
        // Allow any subdomain of eadcontrol.com.br (prod)
        '/^https:\\/\\/.*\\.eadcontrol\\.com\\.br$/',
        // Allow localhost with any port
        '/^http:\\/\\/localhost:.*$/',
    ],

    /*
    |--------------------------------------------------------------------------
    | Allowed Headers
    |--------------------------------------------------------------------------
    |
    | Cabeçalhos permitidos. Use ['*'] para liberar todos.
    |
    */
    'allowed_headers' => ['*'],

    /*
    |--------------------------------------------------------------------------
    | Exposed Headers
    |--------------------------------------------------------------------------
    |
    | Cabeçalhos que podem ser expostos para o navegador.
    |
    */
    // Expõe cabeçalhos úteis para debug multi-tenant no frontend
    'exposed_headers' => ['X-Tenant-Id', 'X-Tenant-Slug'],

    /*
    |--------------------------------------------------------------------------
    | Max Age
    |--------------------------------------------------------------------------
    |
    | Tempo em segundos que o navegador deve cachear as requisições preflight.
    |
    */
    'max_age' => 0,

    /*
    |--------------------------------------------------------------------------
    | Supports Credentials
    |--------------------------------------------------------------------------
    |
    | Se true, permite envio de cookies/autenticação cross-origin.
    |
    */
    'supports_credentials' => true,

];
