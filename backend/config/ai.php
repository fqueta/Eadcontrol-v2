<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Provider padrão de LLM
    |--------------------------------------------------------------------------
    | As chaves podem vir do .env ou da credencial homônima cadastrada em
    | Configurações > Integrações (api_credentials). A credencial do tenant
    | tem prioridade sobre o .env.
    */
    'default_provider' => env('AI_DEFAULT_PROVIDER', 'openai'),

    'providers' => [
        'openai' => [
            'label'         => 'OpenAI',
            'base_url'      => env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
            'api_key'       => env('OPENAI_API_KEY'),
            'default_model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
            'embedding_model' => env('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'),
            'timeout'       => (int) env('OPENAI_TIMEOUT', 40),
            'models'        => [
                'gpt-4o-mini' => ['label' => 'GPT-4o mini', 'max_tokens' => 16384],
                'gpt-4o'      => ['label' => 'GPT-4o', 'max_tokens' => 16384],
                'gpt-4.1-mini'=> ['label' => 'GPT-4.1 mini', 'max_tokens' => 32768],
            ],
        ],

        'deepseek' => [
            'label'         => 'DeepSeek',
            'base_url'      => env('DEEPSEEK_BASE_URL', 'https://api.deepseek.com/v1'),
            'api_key'       => env('DEEPSEEK_API_KEY'),
            'default_model' => env('DEEPSEEK_MODEL', 'deepseek-chat'),
            'timeout'       => (int) env('DEEPSEEK_TIMEOUT', 40),
            'models'        => [
                'deepseek-chat'     => ['label' => 'DeepSeek Chat', 'max_tokens' => 8192],
                'deepseek-reasoner' => ['label' => 'DeepSeek Reasoner', 'max_tokens' => 8192],
            ],
        ],

        'gemini' => [
            'label'         => 'Google Gemini',
            'base_url'      => env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta'),
            'api_key'       => env('GEMINI_API_KEY'),
            'default_model' => env('GEMINI_MODEL', 'gemini-2.0-flash'),
            'timeout'       => (int) env('GEMINI_TIMEOUT', 60),
            'models'        => [
                'gemini-2.0-flash'      => ['label' => 'Gemini 2.0 Flash', 'max_tokens' => 8192],
                'gemini-1.5-flash'      => ['label' => 'Gemini 1.5 Flash', 'max_tokens' => 8192],
                'gemini-1.5-pro'        => ['label' => 'Gemini 1.5 Pro', 'max_tokens' => 8192],
            ],
        ],

        'claude' => [
            'label'         => 'Anthropic Claude',
            'base_url'      => env('CLAUDE_BASE_URL', 'https://api.anthropic.com/v1'),
            'api_key'       => env('CLAUDE_API_KEY'),
            'default_model' => env('CLAUDE_MODEL', 'claude-3-5-haiku-latest'),
            'timeout'       => (int) env('CLAUDE_TIMEOUT', 40),
            'models'        => [
                'claude-3-5-haiku-latest'  => ['label' => 'Claude 3.5 Haiku', 'max_tokens' => 8192],
                'claude-3-5-sonnet-latest' => ['label' => 'Claude 3.5 Sonnet', 'max_tokens' => 8192],
            ],
        ],
    ],

    // Embeddings (RAG). Usa OpenAI por padrão, independentemente do LLM do agente.
    'embedding' => [
        'provider'      => env('AI_EMBEDDING_PROVIDER', 'openai'),
        'chunk_size'    => (int) env('AI_CHUNK_SIZE', 500),
        'chunk_overlap' => (int) env('AI_CHUNK_OVERLAP', 50),
    ],

    'rag' => [
        'max_results' => (int) env('AI_RAG_MAX_RESULTS', 5),
        'min_score'   => (float) env('AI_RAG_MIN_SCORE', 0.30),
    ],

    'defaults' => [
        'temperature'      => (float) env('AI_DEFAULT_TEMPERATURE', 0.7),
        'max_tokens'       => (int) env('AI_DEFAULT_MAX_TOKENS', 600),
        'history_messages' => (int) env('AI_HISTORY_MESSAGES', 12),
        'rate_limit'       => (int) env('AI_RATE_LIMIT_PER_MINUTE', 12),
    ],
];
