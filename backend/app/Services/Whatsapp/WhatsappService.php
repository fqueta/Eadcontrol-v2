<?php

namespace App\Services\Whatsapp;

use App\Contracts\Whatsapp\WhatsappProviderInterface;
use App\Jobs\ProcessWhatsappAgentReply;
use App\Models\AiAgent;
use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\WhatsappInstance;
use App\Services\Integrations\CredentialStore;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Orquestrador do ciclo de vida das instâncias WhatsApp e do webhook
 * de recebimento. Adaptado ao modelo multi-tenant por banco do Eadcontrol:
 * o tenant é resolvido pelo domínio e o nome técnico da instância é prefixado.
 */
class WhatsappService
{
    public function __construct(
        private WhatsappProviderFactory $factory,
        private AudioTranscriptionService $transcription,
    ) {}

    private function providerFor(WhatsappInstance $instance): WhatsappProviderInterface
    {
        return $this->factory->makeForInstance($instance);
    }

    // ─── Base pública para webhooks ────────────────────────────────────────

    private function resolveBackendBase(): string
    {
        // Credencial do tenant tem prioridade sobre o .env/config global.
        $effective = CredentialStore::for('evolution-go', (array) config('whatsapp.evolution_go', []));
        $configured = $effective['webhook_base_url'] ?? null;

        if (!empty($configured)) {
            return rtrim((string) $configured, '/');
        }

        try {
            $host = rtrim((string) request()->getSchemeAndHttpHost(), '/');
            if ($host !== '' && !preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $host)) {
                return $host;
            }
        } catch (\Throwable $e) {
            // Sem request (queue/CLI): usa APP_URL.
        }

        return rtrim((string) config('app.url', 'http://localhost'), '/');
    }

    public function webhookUrlFor(WhatsappInstance $instance): string
    {
        return $this->resolveBackendBase() . '/api/v1/whatsapp/webhook/' . $instance->instance_name;
    }

    // ─── Ciclo de vida ─────────────────────────────────────────────────────

    public function createInstance(WhatsappInstance $instance): array
    {
        $provider = $this->providerFor($instance);

        $token = $instance->getInstanceToken() ?: bin2hex(random_bytes(16));

        $data = $provider->createInstance($instance->instance_name, ['token' => $token]);

        $instanceId = $data['instance']['instanceId']
            ?? $data['instanceId']
            ?? $data['data']['id']
            ?? $data['id']
            ?? $instance->instance_name;

        $settings = array_merge($instance->settings ?? [], [
            'token'          => $token,
            'instance_token' => $token,
        ]);

        $instance->update([
            'api_key'     => $instance->api_key ?: $token,
            'instance_id' => $instanceId,
            'status'      => 'disconnected',
            'settings'    => $settings,
            'last_error'  => null,
        ]);

        $instance->refresh();
        $instance->update(['webhook_url' => $this->webhookUrlFor($instance)]);

        return $data;
    }

    public function connectInstance(WhatsappInstance $instance): array
    {
        $provider = $this->providerFor($instance);

        // Sessão viva nunca recebe pedido de QR — isso pode derrubar a conexão.
        try {
            $liveStatus = $provider->getStatus($instance->instance_name);
        } catch (\Throwable $e) {
            $liveStatus = null;
        }

        if ($liveStatus === 'open') {
            $instance->update([
                'status'      => 'connected',
                'qr_code'     => null,
                'connected_at' => $instance->connected_at ?: now(),
            ]);

            return [
                'qr_code' => null,
                'status'  => 'connected',
                'message' => 'Este WhatsApp já está conectado.',
            ];
        }

        // Trava anti-rajada de QR por instância.
        $qrMax = (int) config('whatsapp.evolution_go.qr_max_requests', 3);
        $qrWindow = (int) config('whatsapp.evolution_go.qr_window_seconds', 600);
        $settings = $instance->settings ?? [];
        $now = time();

        $recent = array_values(array_filter(
            array_map('intval', (array) ($settings['qr_requests'] ?? [])),
            fn ($timestamp) => ($now - $timestamp) < $qrWindow
        ));

        if (count($recent) >= $qrMax) {
            $wait = max(1, $qrWindow - ($now - min($recent)));
            throw new \RuntimeException(
                "Limite de QR atingido (máx. {$qrMax} a cada " . (int) ($qrWindow / 60) . " min). Aguarde ~{$wait}s — pedir QR em sequência derruba a conexão.",
                429
            );
        }

        $recent[] = $now;
        $settings['qr_requests'] = $recent;
        $instance->update(['settings' => $settings]);

        // Sempre recalcula com a configuração atual (credencial > .env > host
        // da requisição). Assim, alterar a URL pública do webhook em
        // Configurações > Integrações passa a valer no próximo connect.
        $webhookUrl = $this->webhookUrlFor($instance);

        $data = $provider->connectInstance($instance->instance_name, [
            'webhook_url' => $webhookUrl,
        ]);

        $instance->update([
            'qr_code'     => $data['qr_code'] ?? null,
            'status'      => 'connecting',
            'webhook_url' => $webhookUrl,
            'last_error'  => null,
        ]);

        return $data;
    }

    public function pair(WhatsappInstance $instance, string $phone): array
    {
        return $this->providerFor($instance)->pair($phone);
    }

    public function checkStatus(WhatsappInstance $instance, bool $persist = true): string
    {
        $provider = $this->providerFor($instance);
        $status = $provider->getStatus($instance->instance_name);

        $dbStatus = match ($status) {
            'open'       => 'connected',
            'connecting' => 'connecting',
            default      => 'disconnected',
        };

        $updates = ['status' => $dbStatus];

        if ($dbStatus === 'connected') {
            $updates['connected_at'] = $instance->connected_at ?: now();
            $updates['qr_code'] = null;

            // Tenta descobrir o número pareado (JID) para exibir no painel.
            try {
                $info = $provider->getInstanceInfo($instance->instance_name);
                $jid = $info['jid'] ?? $info['Jid'] ?? $info['phone'] ?? null;
                if ($jid) {
                    $phone = preg_replace('/\D/', '', explode('@', (string) $jid)[0]);
                    if ($phone) {
                        $updates['phone_number'] = $phone;
                    }
                }
            } catch (\Throwable $e) {
                // silencioso
            }
        }

        if ($persist) {
            $instance->update($updates);
        }

        return $dbStatus;
    }

    public function disconnectInstance(WhatsappInstance $instance): void
    {
        $this->providerFor($instance)->disconnect();

        $instance->update([
            'status'  => 'disconnected',
            'qr_code' => null,
        ]);
    }

    public function reconnectInstance(WhatsappInstance $instance): string
    {
        // Re-registra o webhook com a URL pública atual antes de reconectar,
        // para que mudanças em Configurações > Integrações passem a valer.
        $webhookUrl = $this->webhookUrlFor($instance);

        try {
            $this->providerFor($instance)->setWebhook($instance->instance_name, $webhookUrl);
            $instance->update(['webhook_url' => $webhookUrl]);
        } catch (\Throwable $e) {
            Log::warning('WhatsappService: falha ao re-registrar webhook no reconnect', [
                'instance' => $instance->instance_name,
                'error'    => $e->getMessage(),
            ]);
        }

        $this->providerFor($instance)->reconnect();

        return $this->checkStatus($instance);
    }

    public function logoutInstance(WhatsappInstance $instance): void
    {
        $this->providerFor($instance)->logout();

        $instance->update([
            'status'  => 'disconnected',
            'qr_code' => null,
        ]);
    }

    public function deleteInstance(WhatsappInstance $instance): bool
    {
        try {
            $this->providerFor($instance)->deleteInstance($instance->instance_name);
        } catch (\Throwable $e) {
            Log::warning('WhatsappService: falha ao remover instância no servidor Go', [
                'instance' => $instance->instance_name,
                'error'    => $e->getMessage(),
            ]);
        }

        return (bool) $instance->delete();
    }

    // ─── Envio ─────────────────────────────────────────────────────────────

    public function sendMessage(WhatsappInstance $instance, string $phone, string $message): array
    {
        $provider = $this->providerFor($instance);
        $parts = $this->splitResponseIntoParts($message);
        $responses = [];

        foreach ($parts as $index => $part) {
            if ($index > 0) {
                $delay = (int) config('whatsapp.message.typing_delay_ms', 800);
                if ($delay > 0) {
                    usleep($delay * 1000);
                }
            }

            $responses[] = $provider->sendText($instance->instance_name, $phone, $part);
        }

        return $responses;
    }

    public function sendMedia(
        WhatsappInstance $instance,
        string $phone,
        string $mediaUrl,
        string $caption = '',
        string $type = 'image'
    ): array {
        return $this->providerFor($instance)
            ->sendMedia($instance->instance_name, $phone, $mediaUrl, $caption, $type);
    }

    /**
     * Quebra respostas longas em partes respeitando parágrafos.
     *
     * @return string[]
     */
    public function splitResponseIntoParts(string $text, ?int $maxChars = null): array
    {
        $maxChars = $maxChars ?: (int) config('whatsapp.message.max_length', 4000);
        $text = trim($text);

        if ($text === '') {
            return [];
        }

        if (mb_strlen($text) <= $maxChars) {
            return [$text];
        }

        $parts = [];
        $paragraphs = preg_split('/\n{2,}/', $text) ?: [$text];
        $buffer = '';

        foreach ($paragraphs as $paragraph) {
            $candidate = $buffer === '' ? $paragraph : $buffer . "\n\n" . $paragraph;

            if (mb_strlen($candidate) <= $maxChars) {
                $buffer = $candidate;
                continue;
            }

            if ($buffer !== '') {
                $parts[] = $buffer;
                $buffer = '';
            }

            // Parágrafo sozinho maior que o limite: corta por sentença/espaço.
            while (mb_strlen($paragraph) > $maxChars) {
                $slice = mb_substr($paragraph, 0, $maxChars);
                $break = max(
                    (int) mb_strrpos($slice, '. '),
                    (int) mb_strrpos($slice, "\n"),
                    (int) mb_strrpos($slice, ' ')
                );

                if ($break < $maxChars * 0.5) {
                    $break = $maxChars;
                }

                $parts[] = trim(mb_substr($paragraph, 0, $break));
                $paragraph = trim(mb_substr($paragraph, $break));
            }

            $buffer = $paragraph;
        }

        if ($buffer !== '') {
            $parts[] = $buffer;
        }

        return array_values(array_filter($parts, fn ($part) => trim($part) !== ''));
    }

    // ─── Tokens ────────────────────────────────────────────────────────────

    public function encryptToken(?string $token): ?string
    {
        if (empty($token)) {
            return null;
        }

        try {
            return Crypt::encryptString($token);
        } catch (\Throwable $e) {
            return $token;
        }
    }

    public function decryptToken(?string $token): ?string
    {
        if (empty($token)) {
            return null;
        }

        try {
            return Crypt::decryptString($token);
        } catch (\Throwable $e) {
            return $token;
        }
    }

    // ─── Webhook ───────────────────────────────────────────────────────────

    public function handleWebhook(string $instanceName, array $payload): void
    {
        $event = strtoupper(trim((string) ($payload['event'] ?? '')));

        $instance = WhatsappInstance::query()
            ->where('instance_name', $instanceName)
            ->first();

        if (!$instance) {
            Log::warning('WhatsappService: instância não encontrada para webhook', [
                'instance' => $instanceName,
                'event'    => $event,
            ]);
            return;
        }

        Log::info('WhatsappService: webhook recebido', [
            'instance' => $instanceName,
            'event'    => $event,
            'top_keys' => array_keys($payload),
        ]);

        switch ($event) {
            case 'MESSAGES_UPSERT':
            case 'MESSAGE':
                $this->handleIncomingMessage($instance, $payload);
                break;

            case 'CONNECTION':
            case 'CONNECTION_UPDATE':
                $this->handleConnectionUpdate($instance, $payload);
                break;

            case 'QRCODE':
            case 'QRCODE_UPDATED':
                $this->handleQrUpdate($instance, $payload);
                break;

            default:
                Log::debug('WhatsappService: evento ignorado', ['event' => $event]);
        }
    }

    private function handleConnectionUpdate(WhatsappInstance $instance, array $payload): void
    {
        $data = $payload['data'] ?? $payload;
        $state = strtolower((string) ($data['status'] ?? $data['state'] ?? $data['connection'] ?? ''));

        $updates = [];

        if (in_array($state, ['open', 'connected'], true)) {
            $updates['status'] = 'connected';
            $updates['qr_code'] = null;
            $updates['connected_at'] = $instance->connected_at ?: now();

            $jid = $data['jid'] ?? $data['Jid'] ?? null;
            if ($jid) {
                $phone = preg_replace('/\D/', '', explode('@', (string) $jid)[0]);
                if ($phone) {
                    $updates['phone_number'] = $phone;
                }
            }
        } elseif (in_array($state, ['close', 'closed', 'disconnected'], true)) {
            $updates['status'] = 'disconnected';
        }

        if (!empty($updates)) {
            $instance->update($updates);
        }
    }

    private function handleQrUpdate(WhatsappInstance $instance, array $payload): void
    {
        $data = $payload['data'] ?? $payload;
        $qr = $data['qrcode'] ?? $data['base64'] ?? $data['qr'] ?? null;

        if (is_string($qr) && $qr !== '') {
            if (str_contains($qr, '|')) {
                $qr = trim(explode('|', $qr, 2)[0]);
            }
            if (!str_starts_with($qr, 'data:image')) {
                $qr = 'data:image/png;base64,' . $qr;
            }

            $instance->update([
                'qr_code' => $qr,
                'status'  => 'connecting',
            ]);
        }
    }

    /**
     * Processa mensagem recebida (formato Go ou Node).
     */
    private function handleIncomingMessage(WhatsappInstance $instance, array $payload): void
    {
        $isGoFormat = isset($payload['data']['Info']) || isset($payload['Info']);
        $goInfo = $payload['data']['Info'] ?? $payload['Info'] ?? [];
        $goMsg = $payload['data']['Message'] ?? $payload['Message'] ?? [];

        $fromMe = false;
        $phone = '';
        $lid = null;
        $contactName = '';
        $text = '';
        $messageType = 'conversation';
        $messageData = [];

        if ($isGoFormat) {
            $fromMe = (bool) ($goInfo['IsFromMe'] ?? $goInfo['fromMe'] ?? false);

            $chatJid = (string) ($goInfo['Chat'] ?? $goInfo['Sender'] ?? '');
            $senderJid = (string) ($goInfo['Sender'] ?? '');
            $chatAlt = (string) ($goInfo['ChatAlt'] ?? $goInfo['chatAlt'] ?? '');
            $senderAlt = (string) ($goInfo['SenderAlt'] ?? $goInfo['senderAlt'] ?? '');

            [$phone, $lid, $isGroup] = $this->extractPhoneAndLid($chatJid, $senderJid, $chatAlt, $senderAlt, $fromMe);

            $contactName = (string) ($goInfo['PushName'] ?? $goInfo['pushName'] ?? '');
            $messageType = (string) ($goInfo['Type'] ?? 'conversation');

            $text = $goMsg['conversation']
                ?? $goMsg['extendedTextMessage']['text']
                ?? $goMsg['imageMessage']['caption']
                ?? $goMsg['videoMessage']['caption']
                ?? $goMsg['documentMessage']['caption']
                ?? (is_string($goMsg) ? $goMsg : '');

            $messageData = [
                'key' => [
                    'remoteJid' => $chatJid,
                    'fromMe'    => $fromMe,
                    'id'        => $goInfo['ID'] ?? null,
                ],
                'pushName'    => $contactName,
                'messageType' => $messageType,
                'message'     => is_array($goMsg) ? $goMsg : ['conversation' => $text],
                'base64'      => $payload['data']['base64'] ?? $payload['base64'] ?? null,
            ];
        } else {
            $messageData = $payload['data']['messages'][0] ?? null;

            if (!$messageData) {
                return;
            }

            $fromMe = (bool) ($messageData['key']['fromMe'] ?? false);
            $remoteJid = $messageData['key']['remoteJid'] ?? '';
            $participantJid = $messageData['key']['participant'] ?? '';

            [$phone, $lid, $isGroup] = $this->extractPhoneAndLid($remoteJid, $participantJid, '', '', $fromMe);

            $contactName = $messageData['pushName'] ?? '';
            $messageType = $messageData['messageType']
                ?? (isset($messageData['message']['imageMessage']) ? 'imageMessage'
                    : (isset($messageData['message']['audioMessage']) ? 'audioMessage' : 'conversation'));

            $text = $messageData['message']['conversation']
                ?? $messageData['message']['extendedTextMessage']['text']
                ?? '';
        }

        if (empty($phone) && empty($lid)) {
            return;
        }

        // Grupos, canais e broadcasts não entram no atendimento 1:1.
        if (!empty($isGroup)) {
            Log::info('WhatsappService: mensagem de grupo ignorada', ['instance' => $instance->instance_name]);
            return;
        }

        $cleanPhone = preg_replace('/\D/', '', (string) ($phone ?: $lid));

        // O próprio número da instância não deve aparecer como cliente.
        $instancePhone = preg_replace('/\D/', '', (string) ($instance->phone_number ?? ''));
        if ($instancePhone !== '' && $cleanPhone !== '' && (
            $cleanPhone === $instancePhone
            || str_ends_with($cleanPhone, $instancePhone)
            || str_ends_with($instancePhone, $cleanPhone)
        )) {
            return;
        }

        // Dedupe por ID nativo da mensagem.
        $messageId = (string) ($messageData['key']['id'] ?? '');
        if ($messageId !== '') {
            $already = AiMessage::query()
                ->where('metadata->raw_key->id', $messageId)
                ->whereHas('conversation', fn ($query) => $query->where('whatsapp_instance_id', $instance->id))
                ->exists();

            if ($already) {
                return;
            }
        }

        $media = $this->resolveIncomingMedia($instance, $messageData, $messageType, $text);

        if ($text === '' && !empty($media['placeholder'])) {
            $text = $media['placeholder'];
        }

        // pt-BR: Ignora o eco (fromMe) dos alertas administrativos enviados pelo
        //        próprio sistema, evitando conversas artificiais no inbox.
        if ($fromMe && WhatsappAdminNotifier::isAlertEcho((string) $text)) {
            Log::info('WhatsappService: eco de alerta administrativo ignorado', [
                'instance' => $instance->instance_name,
            ]);
            return;
        }

        $conversation = AiConversation::findOrStart(
            $instance->id,
            $cleanPhone,
            $contactName ?: null,
            $instance->resolveAgent()?->id,
            $lid
        );

        $agent = $conversation->agent ?: $instance->resolveAgent();

        // Primeira mensagem do contato: envia a saudação do agente (se houver).
        if (!$fromMe && $conversation->wasRecentlyCreated && $agent && !empty($agent->welcome_message)) {
            $this->replyAndPersist($conversation, (string) $agent->welcome_message, ['channel' => 'welcome']);
        }

        // Mensagem enviada pelo próprio aparelho: apenas sincroniza o histórico.
        if ($fromMe) {
            if (trim((string) $text) === '' && empty($media)) {
                return;
            }

            // Evita duplicar a resposta do bot (o eco dela chega aqui).
            if ($this->isEchoOfRecentAssistantMessage($conversation, (string) $text)) {
                return;
            }

            AiMessage::create([
                'ai_conversation_id' => $conversation->id,
                'role'               => 'human_agent',
                'content'            => $text !== '' ? $text : ($media['placeholder'] ?? ''),
                'metadata'           => [
                    'channel'  => 'device_sync',
                    'raw_key'  => $messageData['key'] ?? null,
                    'media'    => $media ?: null,
                    'push_name' => $contactName,
                ],
            ]);

            $conversation->update(['last_message_at' => now()]);

            return;
        }

        // Mensagem do contato: persiste e dispara a IA (se aplicável).
        $aiMessage = AiMessage::create([
            'ai_conversation_id' => $conversation->id,
            'role'               => 'user',
            'content'            => $text,
            'metadata'           => [
                'channel'      => 'whatsapp',
                'raw_key'      => $messageData['key'] ?? null,
                'media'        => $media ?: null,
                'push_name'    => $contactName,
                'message_type' => $messageType,
            ],
        ]);

        $conversation->update(['last_message_at' => now()]);

        if (!$agent || !$agent->is_active || $conversation->isAiPaused()) {
            return;
        }

        // Horário de atendimento: fora do expediente responde o aviso e não chama o LLM.
        if (!$agent->isWithinBusinessHours()) {
            $this->replyAndPersist($conversation, $agent->offlineMessage(), ['channel' => 'offline']);
            return;
        }

        ProcessWhatsappAgentReply::dispatch($conversation->id, $aiMessage->id);
    }

    private function isEchoOfRecentAssistantMessage(AiConversation $conversation, string $text): bool
    {
        $normalized = trim($text);
        if ($normalized === '') {
            return false;
        }

        return $conversation->messages()
            ->whereIn('role', ['assistant', 'human_agent'])
            ->where('content', $normalized)
            ->where('created_at', '>=', now()->subMinutes(3))
            ->exists();
    }

    /**
     * Extrai telefone, LID e flag de grupo a partir dos JIDs do WhatsApp.
     *
     * @return array{0: string, 1: ?string, 2: bool}
     */
    private function extractPhoneAndLid(
        string $chatJid,
        string $senderJid,
        string $chatAlt,
        string $senderAlt,
        bool $fromMe
    ): array {
        $isGroup = str_contains($chatJid, '@g.us')
            || str_contains($senderJid, '@g.us')
            || str_contains($chatAlt, '@g.us');

        $primary = $fromMe ? ($chatJid ?: $chatAlt) : ($senderJid ?: $senderAlt ?: $chatJid);
        $alt = $fromMe ? ($chatAlt ?: $chatJid) : ($senderAlt ?: $senderJid);

        $phone = '';
        $lid = null;

        foreach ([$primary, $alt, $chatJid, $senderJid] as $jid) {
            if (empty($jid) || !str_contains($jid, '@')) {
                continue;
            }

            [$user, $server] = explode('@', $jid, 2);

            if (str_contains($server, 'lid')) {
                $lid = $lid ?: $user;
                continue;
            }

            if (str_contains($server, 's.whatsapp.net') && $phone === '') {
                $phone = preg_replace('/\D/', '', $user);
            }
        }

        if ($phone === '' && $lid === null) {
            $digits = preg_replace('/\D/', '', $chatJid ?: $senderJid);
            $phone = $digits;
        }

        return [$phone, $lid, $isGroup];
    }

    /**
     * Baixa e salva mídia recebida, retornando metadados para o chat.
     */
    private function resolveIncomingMedia(
        WhatsappInstance $instance,
        array $messageData,
        string $messageType,
        string &$text
    ): ?array {
        $message = $messageData['message'] ?? [];

        $type = null;
        $extension = 'bin';
        $mime = null;
        $placeholder = null;
        $fileName = null;

        if (isset($message['imageMessage']) || str_contains(strtolower($messageType), 'image')) {
            $type = 'image';
            $extension = 'jpg';
            $mime = 'image/jpeg';
            $placeholder = '📷 [Imagem recebida]';
        } elseif (isset($message['audioMessage']) || in_array(strtolower($messageType), ['audiomessage', 'audio', 'ptt', 'voice'], true)) {
            $type = 'audio';
            $extension = 'ogg';
            $mime = 'audio/ogg';
            $placeholder = '🎧 [Áudio recebido]';
        } elseif (isset($message['videoMessage']) || str_contains(strtolower($messageType), 'video')) {
            $type = 'video';
            $extension = 'mp4';
            $mime = 'video/mp4';
            $placeholder = '🎬 [Vídeo recebido]';
        } elseif (isset($message['documentMessage']) || str_contains(strtolower($messageType), 'document')) {
            $type = 'document';
            $extension = 'pdf';
            $mime = 'application/octet-stream';
            $fileName = $message['documentMessage']['fileName'] ?? null;
            $placeholder = '📄 [Documento' . ($fileName ? ': ' . $fileName : '') . ' recebido]';
        }

        if (!$type) {
            return null;
        }

        $base64 = $this->providerFor($instance)->getBase64FromMediaMessage($instance->instance_name, $messageData);

        $stored = null;

        if ($base64) {
            // Remove prefixo data URI, se existir.
            if (str_contains($base64, ',')) {
                $base64 = explode(',', $base64, 2)[1];
            }

            $binary = base64_decode($base64, true);

            if ($binary !== false) {
                $path = 'chat-media/' . Str::uuid() . '.' . $extension;

                try {
                    Storage::disk('public')->put($path, $binary);

                    $stored = [
                        'path' => $path,
                        'url'  => $this->publicUrl($path),
                        'type' => $type,
                        'mime' => $mime,
                        'size' => strlen($binary),
                        'name' => $fileName,
                    ];
                } catch (\Throwable $e) {
                    Log::warning('WhatsappService: falha ao salvar mídia recebida', [
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        // Transcrição de áudio para a IA entender o conteúdo.
        if ($type === 'audio' && $stored && $this->transcription->isConfigured()) {
            try {
                $transcription = $this->transcription->transcribePath($stored['path']);
                if ($transcription) {
                    $text = $transcription;
                    $stored['transcription'] = $transcription;
                    $stored['placeholder'] = '🎧 [Áudio transcrito]';
                } elseif ($text === '') {
                    $text = $placeholder;
                }
            } catch (\Throwable $e) {
                Log::warning('WhatsappService: falha na transcrição de áudio', ['error' => $e->getMessage()]);
                if ($text === '') {
                    $text = $placeholder;
                }
            }
        }

        if ($stored) {
            $stored['placeholder'] = $placeholder;
            return $stored;
        }

        return $placeholder ? ['placeholder' => $placeholder, 'type' => $type] : null;
    }

    public function publicUrl(string $path): string
    {
        try {
            if (function_exists('tenant_asset')) {
                $initialized = false;
                try {
                    $initialized = (bool) (tenancy()->initialized ?? false);
                } catch (\Throwable $e) {
                    $initialized = false;
                }

                if ($initialized) {
                    return tenant_asset($path);
                }
            }
        } catch (\Throwable $e) {
            // fallback abaixo
        }

        return rtrim(config('app.url', ''), '/') . '/storage/' . ltrim($path, '/');
    }

    /**
     * Persiste e envia uma resposta avulsa (ex.: aviso de fora do horário).
     */
    public function replyAndPersist(AiConversation $conversation, string $content, array $metadata = []): ?AiMessage
    {
        $content = trim($content);
        if ($content === '') {
            return null;
        }

        $message = AiMessage::create([
            'ai_conversation_id' => $conversation->id,
            'role'               => 'assistant',
            'content'            => $content,
            'metadata'           => array_merge(['channel' => 'system'], $metadata),
        ]);

        try {
            if ($conversation->whatsappInstance) {
                $this->sendMessage($conversation->whatsappInstance, $conversation->contact_phone, $content);
            }
        } catch (\Throwable $e) {
            $message->update([
                'metadata' => array_merge($message->metadata ?? [], ['send_error' => $e->getMessage()]),
            ]);
        }

        $conversation->update(['last_message_at' => now()]);

        return $message;
    }
}
