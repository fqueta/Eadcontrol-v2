<?php

namespace App\Services\Ai;

use App\Contracts\Ai\LlmProviderInterface;
use App\Services\Ai\Providers\ClaudeProvider;
use App\Services\Ai\Providers\DeepSeekProvider;
use App\Services\Ai\Providers\GeminiProvider;
use App\Services\Ai\Providers\OpenAiProvider;
use App\Services\Integrations\CredentialStore;

/**
 * Factory de providers de LLM.
 * Mescla config/ai.php com a credencial do tenant (api_credentials).
 */
class LlmProviderFactory
{
    public static function create(string $provider, array $overrides = []): LlmProviderInterface
    {
        $provider = strtolower(trim($provider)) ?: config('ai.default_provider', 'openai');

        $defaults = config("ai.providers.{$provider}", []);
        $config = array_merge(
            $defaults,
            CredentialStore::for($provider, $defaults),
            $overrides
        );

        return match ($provider) {
            'openai'   => new OpenAiProvider($config),
            'deepseek' => new DeepSeekProvider($config),
            'gemini'   => new GeminiProvider($config),
            'claude'   => new ClaudeProvider($config),
            default    => throw new \InvalidArgumentException("Provider de LLM '{$provider}' não suportado."),
        };
    }

    public static function createDefault(array $overrides = []): LlmProviderInterface
    {
        return static::create(config('ai.default_provider', 'openai'), $overrides);
    }

    /**
     * Providers disponíveis para o formulário do agente.
     */
    public static function availableProviders(): array
    {
        $providers = [];

        foreach (config('ai.providers', []) as $name => $config) {
            $isConfigured = !empty($config['api_key']) || CredentialStore::has($name);

            $providers[] = [
                'name'        => $name,
                'label'       => $config['label'] ?? ucfirst($name),
                'configured'  => $isConfigured,
                'default_model' => $config['default_model'] ?? null,
                'models'      => $config['models'] ?? [],
            ];
        }

        return $providers;
    }
}
