<?php

namespace App\Services\Integrations;

interface IntegrationProviderInterface
{
    /**
     * Retorna o identificador único (slug) do provedor.
     */
    public function getSlug(): string;

    /**
     * Retorna o nome amigável do provedor.
     */
    public function getName(): string;

    /**
     * Testa a conectividade usando as credenciais informadas.
     *
     * @param array $config
     * @return array ['success' => bool, 'message' => string, 'data' => mixed]
     */
    public function testConnection(array $config): array;

    /**
     * Valida os campos obrigatórios antes de persistir.
     *
     * @param array $config
     * @return array Lista de mensagens de erro se houver
     */
    public function validateConfig(array $config): array;
}
