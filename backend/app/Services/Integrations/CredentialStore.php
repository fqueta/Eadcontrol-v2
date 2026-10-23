<?php

namespace App\Services\Integrations;

use App\Models\ApiCredential;

/**
 * CredentialStore
 * pt-BR: Resolve credenciais de integração por tenant. A credencial cadastrada
 *        em Configurações > Integrações (api_credentials) tem prioridade sobre
 *        os valores padrão do .env/config. Assim, cada tenant pode usar a
 *        própria chave sem quebrar o fallback global.
 * en-US: Resolves per-tenant integration credentials. Credentials registered in
 *        Settings > Integrations take precedence over .env/config defaults.
 */
class CredentialStore
{
    /** @var array<string, array> */
    private static array $cache = [];

    /**
     * Retorna a configuração efetiva da integração.
     *
     * @param  string  $slug  Slug em api_credentials (ex.: evolution-go, openai)
     * @param  array   $defaults  Configuração padrão vinda do config()
     */
    public static function for(string $slug, array $defaults = []): array
    {
        $cacheKey = self::cacheKey($slug, $defaults);
        if (array_key_exists($cacheKey, self::$cache)) {
            return self::$cache[$cacheKey];
        }

        $config = $defaults;

        try {
            $credential = ApiCredential::query()
                ->where('slug', $slug)
                ->where('active', true)
                ->first();

            if ($credential) {
                $config = array_merge($config, self::extractFromCredential($credential));
            }
        } catch (\Throwable $e) {
            // Banco ainda não migrado ou credencial indisponível: usa defaults.
        }

        return self::$cache[$cacheKey] = $config;
    }

    /**
     * Indica se existe credencial ativa cadastrada para o slug.
     */
    public static function has(string $slug): bool
    {
        try {
            return ApiCredential::query()
                ->where('slug', $slug)
                ->where('active', true)
                ->exists();
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Limpa o cache (usar após salvar credenciais).
     */
    public static function flush(): void
    {
        self::$cache = [];
    }

    private static function extractFromCredential(ApiCredential $credential): array
    {
        $data = [];

        // 1. Metadados (api_credential_meta) — formato usado pelos dialogs do projeto.
        $metaKeys = [
            'api_key',
            'base_url',
            'default_model',
            'embedding_model',
            'timeout',
            'verify_token',
            'instance_prefix',
            'webhook_base_url',
        ];

        foreach ($metaKeys as $key) {
            $value = $credential->getMeta($key);
            if ($value !== null && $value !== '') {
                $data[$key] = $value;
            }
        }

        // 2. Coluna config (JSON) — também aceita os mesmos campos.
        if (is_array($credential->config)) {
            foreach ($metaKeys as $key) {
                if (!empty($credential->config[$key])) {
                    $data[$key] = $credential->config[$key];
                }
            }
        }

        return $data;
    }

    private static function cacheKey(string $slug, array $defaults): string
    {
        $tenant = null;
        try {
            $tenant = function_exists('tenant') ? tenant('id') : null;
        } catch (\Throwable $e) {
            $tenant = null;
        }

        return $slug . '|' . ($tenant ?? 'central') . '|' . md5(json_encode($defaults));
    }
}
