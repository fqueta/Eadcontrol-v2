<?php

namespace App\Services\Integrations\Providers;

use App\Services\Integrations\IntegrationProviderInterface;
use Illuminate\Support\Facades\Http;

class VimeoProvider implements IntegrationProviderInterface
{
    public function getSlug(): string
    {
        return 'vimeo';
    }

    public function getName(): string
    {
        return 'Vimeo Video API';
    }

    public function validateConfig(array $config): array
    {
        $errors = [];
        if (empty($config['access_token'])) {
            $errors['access_token'] = 'O Access Token do Vimeo é obrigatório.';
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

        $token = trim($config['access_token']);

        try {
            $response = Http::withToken($token)
                ->timeout(10)
                ->get('https://api.vimeo.com/me');

            if ($response->successful()) {
                $userData = $response->json();
                $userName = $userData['name'] ?? 'Conta Vimeo';
                $membership = $userData['membership']['type'] ?? 'Standard';
                $canDownload = isset($userData['capabilities']['can_download']) ? ($userData['capabilities']['can_download'] ? 'Sim' : 'Não') : 'Indeterminado';

                return [
                    'success' => true,
                    'message' => "Token do Vimeo autenticado com sucesso! Usuário: {$userName} (Plano: {$membership}).",
                    'data' => [
                        'user_name' => $userName,
                        'membership' => $membership,
                        'can_download' => $canDownload,
                    ],
                ];
            }

            $status = $response->status();
            $errorMsg = $response->json('error') ?: ($response->json('developer_message') ?: "Erro HTTP {$status}");

            return [
                'success' => false,
                'message' => "Falha na autenticação do Vimeo ({$status}): {$errorMsg}",
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => "Erro ao conectar com Vimeo: " . $e->getMessage(),
            ];
        }
    }
}
