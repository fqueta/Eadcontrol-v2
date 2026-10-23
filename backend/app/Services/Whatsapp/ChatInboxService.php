<?php

namespace App\Services\Whatsapp;

use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\WhatsappInstance;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

/**
 * Service do Inbox unificado estilo WhatsApp Web.
 * Todo o isolamento é garantido pelo banco do tenant.
 */
class ChatInboxService
{
    public function __construct(private WhatsappService $whatsappService) {}

    /**
     * Lista as conversas do inbox.
     */
    public function listInbox(array $filters = []): LengthAwarePaginator|Collection
    {
        $instances = WhatsappInstance::query()
            ->when(!empty($filters['instance_id']), fn ($q) => $q->where('id', $filters['instance_id']))
            ->get();

        $instanceIds = $instances->pluck('id');

        $selfPhones = $instances->pluck('phone_number')
            ->filter()
            ->map(fn ($phone) => preg_replace('/\D/', '', (string) $phone))
            ->filter()
            ->values()
            ->all();

        $query = AiConversation::query()
            ->whereIn('whatsapp_instance_id', $instanceIds)
            ->with([
                'whatsappInstance:id,display_name,instance_name,provider,phone_number,status',
                'agent:id,name',
                'messages' => fn ($q) => $q->latest('id')->limit(1),
            ])
            ->when(!empty($selfPhones), fn ($q) => $q->whereNotIn('contact_phone', $selfPhones))
            ->where(function ($q) {
                $q->where('contact_phone', 'not like', '120363%')
                    ->where('contact_phone', 'not like', '%@g.us%')
                    ->whereNull('metadata->is_group');
            })
            ->when(!empty($filters['status']), function ($q) use ($filters) {
                if ($filters['status'] === 'active') {
                    $q->whereIn('status', ['active', 'transferred']);
                } elseif ($filters['status'] === 'all') {
                    // sem filtro
                } else {
                    $q->where('status', $filters['status']);
                }
            })
            ->when(!empty($filters['q']), function ($q) use ($filters) {
                $term = '%' . $filters['q'] . '%';
                $q->where(fn ($w) => $w->where('contact_phone', 'like', $term)
                    ->orWhere('contact_name', 'like', $term));
            })
            ->orderByDesc('last_message_at')
            ->orderByDesc('updated_at');

        if (!empty($filters['per_page'])) {
            return $query->paginate((int) $filters['per_page']);
        }

        return $query->limit(100)->get()->map(function (AiConversation $conversation) {
            $data = $conversation->toArray();
            $last = $conversation->messages->first();

            $data['last_message']  = $this->previewContent($last);
            $data['last_role']     = $last?->role;
            $data['unread_count']  = (int) data_get($conversation->metadata ?? [], 'unread_count', 0);
            $data['ai_paused']     = $conversation->isAiPaused();

            unset($data['messages']);

            return $data;
        });
    }

    private function previewContent(?AiMessage $message): ?string
    {
        if (!$message) {
            return null;
        }

        $content = trim((string) $message->content);

        if ($content !== '') {
            return mb_strimwidth($content, 0, 120, '...');
        }

        $type = $message->mediaType();

        return match ($type) {
            'audio'    => '🎧 Áudio',
            'image'    => '📷 Imagem',
            'video'    => '🎬 Vídeo',
            'document' => '📄 Documento',
            default    => null,
        };
    }

    /**
     * Mensagens paginadas (mais recentes primeiro; coleção invertida).
     */
    public function getMessages(AiConversation $conversation, int $perPage = 50): LengthAwarePaginator
    {
        $paginator = $conversation->messages()
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage);

        $paginator->setCollection($paginator->getCollection()->reverse()->values());

        return $paginator;
    }

    /**
     * Envia mensagem humana (texto ou mídia) e persiste no histórico.
     */
    public function sendAsHuman(
        AiConversation $conversation,
        ?string $userId,
        string $message,
        ?array $media = null
    ): AiMessage {
        $metadata = [
            'sent_by_user_id' => $userId,
            'channel'         => 'inbox',
        ];

        if (!empty($media)) {
            $metadata['media'] = $media;
        }

        $content = trim($message);

        if ($content === '' && !empty($media)) {
            $content = $media['placeholder'] ?? match ($media['type'] ?? '') {
                'audio'    => '🎧 [Áudio enviado]',
                'image'    => '📷 [Imagem enviada]',
                'video'    => '🎬 [Vídeo enviado]',
                'document' => '📄 [Documento enviado]',
                default    => '',
            };
        }

        $aiMessage = AiMessage::create([
            'ai_conversation_id' => $conversation->id,
            'role'               => 'human_agent',
            'content'            => $content,
            'metadata'           => $metadata,
        ]);

        try {
            $instance = $conversation->whatsappInstance;

            if ($instance) {
                if (!empty($media['url'])) {
                    $this->whatsappService->sendMedia(
                        $instance,
                        $conversation->contact_phone,
                        $media['url'],
                        trim($message),
                        $media['type'] ?? 'image'
                    );
                } else {
                    $this->whatsappService->sendMessage(
                        $instance,
                        $conversation->contact_phone,
                        $content
                    );
                }
            }
        } catch (\Throwable $e) {
            Log::warning('ChatInboxService: mensagem salva, mas o envio falhou', [
                'conversation_id' => $conversation->id,
                'error'           => $e->getMessage(),
            ]);

            $aiMessage->update([
                'metadata' => array_merge($aiMessage->metadata ?? [], ['send_error' => $e->getMessage()]),
            ]);
        }

        $conversation->update(['last_message_at' => now()]);

        return $aiMessage->fresh();
    }

    /**
     * Inicia uma conversa manual por telefone.
     */
    public function startConversation(
        WhatsappInstance $instance,
        string $phone,
        string $message,
        ?string $contactName = null,
        ?int $agentId = null
    ): AiConversation {
        $cleanPhone = preg_replace('/\D/', '', $phone);

        $agentId = $agentId
            ?? $instance->agents()->where('is_active', true)->value('id')
            ?? $instance->resolveAgent()?->id;

        $conversation = AiConversation::findOrStart(
            $instance->id,
            $cleanPhone,
            $contactName ?: $cleanPhone,
            $agentId
        );

        $this->whatsappService->sendMessage($instance, $cleanPhone, $message);

        AiMessage::create([
            'ai_conversation_id' => $conversation->id,
            'role'               => 'human_agent',
            'content'            => $message,
            'metadata'           => ['channel' => 'inbox_start'],
        ]);

        $conversation->update(['last_message_at' => now()]);

        return $conversation->fresh()->load(['whatsappInstance', 'agent', 'messages']);
    }

    /**
     * Resolve a conversa por ID numérico ou código público do link único.
     */
    public function resolveConversation(int|string $idOrCode): AiConversation
    {
        $query = AiConversation::query()->with(['whatsappInstance', 'agent']);

        if (is_numeric($idOrCode)) {
            return $query->findOrFail((int) $idOrCode);
        }

        return $query->where('public_code', (string) $idOrCode)->firstOrFail();
    }

    public function resolveInstance(int|string $id): WhatsappInstance
    {
        return WhatsappInstance::query()->findOrFail($id);
    }

    public function closeConversation(AiConversation $conversation): void
    {
        $conversation->update([
            'status'    => 'closed',
            'closed_at' => now(),
        ]);
    }

    /**
     * Marca a conversa como lida (zera o contador local).
     */
    public function markRead(AiConversation $conversation): void
    {
        $metadata = $conversation->metadata ?? [];
        $metadata['unread_count'] = 0;
        $metadata['last_read_at'] = now()->toIso8601String();

        $conversation->update(['metadata' => $metadata]);
    }
}
