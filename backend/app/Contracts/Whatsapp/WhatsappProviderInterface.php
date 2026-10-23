<?php

namespace App\Contracts\Whatsapp;

/**
 * Contrato (Strategy) dos provedores de WhatsApp.
 * Permite trocar Evolution GO por outro provedor sem alterar o serviço.
 */
interface WhatsappProviderInterface
{
    /**
     * Cria a instância no servidor do provedor.
     */
    public function createInstance(string $instanceName, array $config = []): array;

    /**
     * Inicia a conexão e retorna o QR Code.
     *
     * @return array{qr_code: ?string, status: string}
     */
    public function connectInstance(string $instanceName, array $options = []): array;

    /**
     * Solicita pareamento por código (telefone).
     */
    public function pair(string $phone, array $subscribe = []): array;

    /**
     * Status ao vivo: 'open' | 'connecting' | 'close'.
     */
    public function getStatus(string $instanceName): string;

    /**
     * Dados brutos da instância no servidor (nome, jid, etc.).
     */
    public function getInstanceInfo(string $instanceName): ?array;

    public function sendText(string $instanceName, string $phone, string $message): array;

    public function sendMedia(
        string $instanceName,
        string $phone,
        string $mediaUrl,
        string $caption = '',
        string $mediaType = 'image'
    ): array;

    public function setWebhook(string $instanceName, string $webhookUrl, array $events = []): array;

    public function disconnect(): bool;

    public function reconnect(): bool;

    public function logout(): bool;

    public function deleteInstance(string $instanceName): bool;

    /**
     * Baixa a mídia de uma mensagem recebida (base64) quando disponível.
     */
    public function getBase64FromMediaMessage(string $instanceName, array $messageData): ?string;
}
