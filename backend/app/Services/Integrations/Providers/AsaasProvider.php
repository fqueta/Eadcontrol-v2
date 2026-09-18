<?php

namespace App\Services\Integrations\Providers;

use App\Services\Integrations\IntegrationProviderInterface;
use Illuminate\Support\Facades\Http;

class AsaasProvider implements IntegrationProviderInterface
{
    public function getSlug(): string
    {
        return 'asaas';
    }

    public function getName(): string
    {
        return 'Asaas Gateway de Pagamento';
    }

    public function validateConfig(array $config): array
    {
        $errors = [];
        $apiKey = $config['api_key'] ?? ($config['pass'] ?? null);
        if (empty($apiKey)) {
            $errors['api_key'] = 'Chave de API do Asaas é obrigatória.';
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
                'errors' => $validationErrors,
            ];
        }

        $apiKey = trim($config['api_key'] ?? ($config['pass'] ?? ''));
        $environment = ($config['environment'] ?? 'sandbox') === 'production' ? 'production' : 'sandbox';
        $baseUrl = $environment === 'production'
            ? 'https://api.asaas.com/v3'
            : 'https://sandbox.asaas.com/api/v3';

        try {
            $response = Http::withHeaders([
                'access_token' => $apiKey,
            ])->timeout(10)->get("{$baseUrl}/myAccount");

            if ($response->successful()) {
                $accountData = $response->json();
                $name = $accountData['name'] ?? ($accountData['companyName'] ?? 'Conta Asaas');
                $status = $accountData['status'] ?? 'Ativa';

                return [
                    'success' => true,
                    'message' => "Autenticado com sucesso no Asaas ({$environment})! Titular: {$name} (Status: {$status}).",
                    'data' => [
                        'name' => $name,
                        'environment' => $environment,
                        'status' => $status,
                    ],
                ];
            }

            $status = $response->status();
            $errorMsg = $response->json('errors.0.description') ?: "Erro HTTP {$status}";

            return [
                'success' => false,
                'message' => "Falha na conexão com Asaas: {$errorMsg}",
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => "Erro ao conectar com Asaas: " . $e->getMessage(),
            ];
        }
    }
}
