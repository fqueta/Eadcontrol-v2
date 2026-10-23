<?php

namespace App\Services\Whatsapp;

use App\Contracts\Whatsapp\WhatsappProviderInterface;
use App\Services\Integrations\CredentialStore;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Provedor WhatsApp para a API do Evolution GO (Go).
 *
 * Contrato real do Evolution GO:
 *  - Criação: POST /instance/create {name, token} (GLOBAL_API_KEY)
 *  - Conexão: POST /instance/connect {webhookUrl, subscribe, immediate}
 *  - QR Code: GET /instance/qr
 *  - Pareamento: POST /instance/pair {phone, subscribe}
 *  - Status: GET /instance/status
 *  - Logout: DELETE /instance/logout
 *  - Desconectar: POST /instance/disconnect | Reconectar: POST /instance/reconnect
 *  - Envio: POST /send/text | /send/media
 *  - Download: POST /message/downloadmedia
 *  - Remoção: DELETE /instance/delete/{uuid} (GLOBAL_API_KEY)
 */
class EvolutionGoProvider implements WhatsappProviderInterface
{
    private string $baseUrl;
    private string $globalApiKey;
    private ?string $instanceToken;
    private int $timeout;
    private array $subscribe;

    public function __construct(array $config = [])
    {
        $defaults = config('whatsapp.evolution_go', []);
        $config = array_merge($defaults, CredentialStore::for('evolution-go', $defaults), $config);

        $this->baseUrl = rtrim((string) ($config['base_url'] ?? 'http://localhost:8080'), '/');
        $this->globalApiKey = (string) ($config['api_key'] ?? '');
        $this->instanceToken = $config['instance_token'] ?? $config['token'] ?? null;
        $this->timeout = (int) ($config['timeout'] ?? 30);
        $this->subscribe = (array) ($config['subscribe'] ?? ['MESSAGE', 'CONNECTION', 'QRCODE']);
    }

    /**
     * Retorna um clone vinculado ao token exclusivo da instância.
     */
    public function withInstanceToken(?string $token): self
    {
        $clone = clone $this;
        $clone->instanceToken = $token;
        return $clone;
    }

    private function getHeaders(bool $useGlobalKey = false): array
    {
        $key = $useGlobalKey
            ? $this->globalApiKey
            : ($this->instanceToken ?: $this->globalApiKey);

        return [
            'apikey'       => $key,
            'Content-Type' => 'application/json',
            'Accept'       => 'application/json',
        ];
    }

    private function getUrl(string $path): string
    {
        return $this->baseUrl . (str_starts_with($path, '/') ? $path : '/' . $path);
    }

    public function createInstance(string $instanceName, array $config = []): array
    {
        $token = $config['token'] ?? $this->instanceToken ?? bin2hex(random_bytes(16));

        Log::info("EvolutionGo: criando instância '{$instanceName}'");

        $response = Http::timeout($this->timeout)
            ->withHeaders($this->getHeaders(true))
            ->post($this->getUrl('/instance/create'), [
                'name'  => $instanceName,
                'token' => $token,
            ]);

        if ($response->failed()) {
            Log::error("EvolutionGo: falha ao criar instância '{$instanceName}'", [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new \RuntimeException('Erro ao criar instância no Evolution GO: ' . $response->body());
        }

        $data = $response->json() ?? [];
        $data['token'] = $token;

        return $data;
    }

    public function connectInstance(string $instanceName, array $options = []): array
    {
        $webhookUrl = $options['webhook_url'] ?? $options['webhookUrl'] ?? null;
        $subscribe = $options['subscribe'] ?? $this->subscribe;

        $payload = [
            'immediate' => true,
            'subscribe' => $subscribe,
        ];

        if (!empty($webhookUrl)) {
            $payload['webhookUrl'] = $webhookUrl;
        }

        $connectRes = Http::timeout($this->timeout)
            ->withHeaders($this->getHeaders(false))
            ->post($this->getUrl('/instance/connect'), $payload);

        $qrCode = null;

        if ($connectRes->successful()) {
            $connectData = $connectRes->json() ?? [];
            $qrCode = $connectData['data']['qrcode']
                ?? $connectData['data']['base64']
                ?? $connectData['data']['qr']
                ?? $connectData['base64']
                ?? $connectData['qrcode']
                ?? $connectData['qr']
                ?? null;
        }

        if (empty($qrCode)) {
            $qrRes = Http::timeout(15)
                ->withHeaders($this->getHeaders(false))
                ->get($this->getUrl('/instance/qr'));

            if ($qrRes->successful()) {
                $qrData = $qrRes->json() ?? [];
                $qrCode = $qrData['data']['qrcode']
                    ?? $qrData['data']['base64']
                    ?? $qrData['data']['qr']
                    ?? $qrData['base64']
                    ?? $qrData['qrcode']
                    ?? $qrData['qr']
                    ?? null;
            }
        }

        // O Go pode devolver "data:image/png;base64,...|https://wa.me/settings/..."
        if ($qrCode && str_contains($qrCode, '|')) {
            $qrCode = trim(explode('|', $qrCode, 2)[0]);
        }

        if ($qrCode && !str_starts_with($qrCode, 'data:image')) {
            $qrCode = 'data:image/png;base64,' . $qrCode;
        }

        return [
            'qr_code' => $qrCode,
            'status'  => 'connecting',
        ];
    }

    public function pair(string $phone, array $subscribe = []): array
    {
        $response = Http::timeout($this->timeout)
            ->withHeaders($this->getHeaders(false))
            ->post($this->getUrl('/instance/pair'), [
                'phone'     => preg_replace('/\D/', '', $phone),
                'subscribe' => $subscribe ?: $this->subscribe,
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Erro ao gerar código de pareamento: ' . $response->body());
        }

        return $response->json() ?? [];
    }

    public function getStatus(string $instanceName): string
    {
        try {
            $response = Http::timeout(10)
                ->withHeaders($this->getHeaders(false))
                ->get($this->getUrl('/instance/status'));
        } catch (\Throwable $e) {
            return 'close';
        }

        if ($response->failed()) {
            return 'close';
        }

        $body = $response->json() ?? [];
        $data = $body['data'] ?? [];

        // No Evolution GO: { data: { Connected: true, LoggedIn: true } }
        // Connected=true com LoggedIn=false significa socket aberto sem aparelho.
        $connected = !empty($data['Connected']) || !empty($data['connected']);
        $loggedIn  = !empty($data['LoggedIn']) || !empty($data['loggedIn']);

        if ($connected && $loggedIn) {
            return 'open';
        }

        if ($connected) {
            return 'connecting';
        }

        $state = strtolower((string) ($data['status'] ?? $data['state'] ?? $body['status'] ?? $body['state'] ?? ''));

        return match ($state) {
            'open', 'connected' => 'open',
            'connecting'        => 'connecting',
            default             => 'close',
        };
    }

    public function getInstanceInfo(string $instanceName): ?array
    {
        try {
            $res = Http::timeout(10)
                ->withHeaders($this->getHeaders(true))
                ->get($this->getUrl('/instance/all'));
        } catch (\Throwable $e) {
            Log::warning('EvolutionGo: falha ao consultar /instance/all', ['error' => $e->getMessage()]);
            return null;
        }

        if (!$res->successful()) {
            return null;
        }

        foreach ($res->json()['data'] ?? [] as $instance) {
            if (($instance['name'] ?? '') === $instanceName) {
                return $instance;
            }
        }

        return null;
    }

    public function sendText(string $instanceName, string $phone, string $message): array
    {
        $payload = [
            'number' => preg_replace('/\D/', '', $phone),
            'text'   => $message,
        ];

        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders($this->getHeaders(false))
                ->post($this->getUrl('/send/text'), $payload);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error("EvolutionGo: timeout ao enviar texto para '{$phone}'", ['error' => $e->getMessage()]);
            throw new \RuntimeException(
                'Timeout ao contatar o Evolution GO (/send/text). O aparelho provavelmente não está pareado — verifique o status e escaneie o QR Code.'
            );
        }

        if ($response->failed()) {
            Log::error("EvolutionGo: falha ao enviar texto para '{$phone}'", ['body' => $response->body()]);
            throw new \RuntimeException('Erro ao enviar mensagem: ' . $response->body());
        }

        return $response->json() ?? [];
    }

    public function sendMedia(
        string $instanceName,
        string $phone,
        string $mediaUrl,
        string $caption = '',
        string $mediaType = 'image'
    ): array {
        $response = Http::timeout(60)
            ->withHeaders($this->getHeaders(false))
            ->post($this->getUrl('/send/media'), [
                'number'  => preg_replace('/\D/', '', $phone),
                'url'     => $mediaUrl,
                'type'    => $mediaType,
                'caption' => $caption,
            ]);

        if ($response->failed()) {
            Log::error("EvolutionGo: falha ao enviar mídia para '{$phone}'", ['body' => $response->body()]);
            throw new \RuntimeException('Erro ao enviar mídia: ' . $response->body());
        }

        return $response->json() ?? [];
    }

    public function setWebhook(string $instanceName, string $webhookUrl, array $events = []): array
    {
        return $this->connectInstance($instanceName, [
            'webhook_url' => $webhookUrl,
            'subscribe'   => $events ?: $this->subscribe,
        ]);
    }

    public function disconnect(): bool
    {
        $response = Http::timeout($this->timeout)
            ->withHeaders($this->getHeaders(false))
            ->post($this->getUrl('/instance/disconnect'));

        if ($response->failed()) {
            Log::warning('EvolutionGo: falha ao desconectar instância', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
        }

        return $response->successful();
    }

    public function reconnect(): bool
    {
        $response = Http::timeout($this->timeout)
            ->withHeaders($this->getHeaders(false))
            ->post($this->getUrl('/instance/reconnect'));

        return $response->successful();
    }

    public function logout(): bool
    {
        $response = Http::timeout($this->timeout)
            ->withHeaders($this->getHeaders(false))
            ->delete($this->getUrl('/instance/logout'));

        return $response->successful();
    }

    public function deleteInstance(string $instanceName): bool
    {
        $targetId = $instanceName;

        if (!$this->isUuid($targetId)) {
            $info = $this->getInstanceInfo($instanceName);
            $targetId = $info['id'] ?? $targetId;
        }

        if (!$this->isUuid($targetId)) {
            Log::info("EvolutionGo: instância '{$instanceName}' não existe no servidor. Removendo apenas localmente.");
            return true;
        }

        $response = Http::timeout($this->timeout)
            ->withHeaders($this->getHeaders(true))
            ->delete($this->getUrl("/instance/delete/{$targetId}"));

        return $response->successful();
    }

    public function getBase64FromMediaMessage(string $instanceName, array $messageData): ?string
    {
        // 1. Base64 já embutido no payload do webhook
        foreach ([
            $messageData['base64'] ?? null,
            $messageData['message']['imageMessage']['base64'] ?? null,
            $messageData['message']['audioMessage']['base64'] ?? null,
        ] as $base64) {
            if (is_string($base64) && trim($base64) !== '') {
                return trim($base64);
            }
        }

        // 2. Download nativo do Evolution GO
        try {
            $rawMessage = $messageData['message'] ?? $messageData['Message'] ?? $messageData;

            $response = Http::timeout(30)
                ->withHeaders($this->getHeaders(false))
                ->post($this->getUrl('/message/downloadmedia'), [
                    'message' => $rawMessage,
                ]);

            if ($response->successful()) {
                $body = $response->json() ?? [];

                foreach ([
                    $body['base64'] ?? null,
                    $body['data']['base64'] ?? null,
                    $body['data']['Base64'] ?? null,
                    $body['data']['data'] ?? null,
                    $body['data']['media'] ?? null,
                    $body['data'] ?? null,
                ] as $base64) {
                    if (is_string($base64) && trim($base64) !== '') {
                        return trim($base64);
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::warning('EvolutionGo: falha ao baixar mídia', [
                'instance' => $instanceName,
                'error'    => $e->getMessage(),
            ]);
        }

        return null;
    }

    private function isUuid(string $value): bool
    {
        return (bool) preg_match(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i',
            $value
        );
    }
}
