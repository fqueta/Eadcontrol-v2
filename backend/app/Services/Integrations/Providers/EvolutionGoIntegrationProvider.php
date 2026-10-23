<?php

namespace App\Services\Integrations\Providers;

use App\Services\Integrations\IntegrationProviderInterface;
use Illuminate\Support\Facades\Http;

/**
 * EvolutionGoIntegrationProvider
 * pt-BR: Testa a conectividade com o servidor Evolution GO usando a URL base e
 *        a API key global. A rota /instance/all exige a chave global e devolve
 *        a lista de instâncias, sendo um bom health check.
 */
class EvolutionGoIntegrationProvider implements IntegrationProviderInterface
{
    public function getSlug(): string
    {
        return 'evolution-go';
    }

    public function getName(): string
    {
        return 'Evolution GO (WhatsApp)';
    }

    public function validateConfig(array $config): array
    {
        $errors = [];

        if (empty(trim((string) ($config['base_url'] ?? '')))) {
            $errors['base_url'] = 'A URL do servidor Evolution GO é obrigatória.';
        }

        if (empty(trim((string) ($config['api_key'] ?? '')))) {
            $errors['api_key'] = 'A API key do Evolution GO é obrigatória.';
        }

        return $errors;
    }

    public function testConnection(array $config): array
    {
        $validationErrors = $this->validateConfig($config);

        if (!empty($validationErrors)) {
            return [
                'success' => false,
                'message' => 'Parâmetros incompletos.',
                'errors'  => $validationErrors,
            ];
        }

        $baseUrl = rtrim(trim((string) $config['base_url']), '/');
        $apiKey = trim((string) $config['api_key']);

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'apikey' => $apiKey,
                    'Accept' => 'application/json',
                ])
                ->get($baseUrl . '/instance/all');

            if ($response->successful()) {
                $payload = $response->json();
                $instances = $payload['data'] ?? $payload['instances'] ?? $payload;

                $count = is_array($instances) ? count($instances) : 0;

                return [
                    'success' => true,
                    'message' => "Conectado ao Evolution GO com sucesso! {$count} instância(s) encontrada(s) no servidor.",
                    'data'    => [
                        'base_url'  => $baseUrl,
                        'instances' => $count,
                    ],
                ];
            }

            return [
                'success' => false,
                'message' => 'O servidor respondeu com HTTP ' . $response->status() . '. Confira a URL e a API key.',
                'data'    => ['status' => $response->status()],
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => 'Não foi possível alcançar o servidor Evolution GO: ' . $e->getMessage(),
            ];
        }
    }
}
