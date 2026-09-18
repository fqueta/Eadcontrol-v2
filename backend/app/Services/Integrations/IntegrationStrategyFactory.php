<?php

namespace App\Services\Integrations;

use App\Services\Integrations\Providers\CloudflareR2Provider;
use App\Services\Integrations\Providers\VimeoProvider;
use App\Services\Integrations\Providers\AsaasProvider;
use InvalidArgumentException;

class IntegrationStrategyFactory
{
    /**
     * Mapa de provedores suportados.
     */
    protected static array $providers = [
        'cloudflare-r2' => CloudflareR2Provider::class,
        'r2' => CloudflareR2Provider::class,
        'vimeo' => VimeoProvider::class,
        'asaas' => AsaasProvider::class,
        'asaas-payments' => AsaasProvider::class,
    ];

    /**
     * Retorna a instância da estratégia para o provedor solicitado.
     */
    public static function make(string $slug): IntegrationProviderInterface
    {
        $normalized = strtolower(trim($slug));

        if (!isset(self::$providers[$normalized])) {
            throw new InvalidArgumentException("Provedor de integração [{$slug}] não suportado pelo factory.");
        }

        $class = self::$providers[$normalized];
        return new $class();
    }

    /**
     * Retorna a lista de slugs de estratégias registradas.
     */
    public static function getRegisteredSlugs(): array
    {
        return array_keys(self::$providers);
    }
}
