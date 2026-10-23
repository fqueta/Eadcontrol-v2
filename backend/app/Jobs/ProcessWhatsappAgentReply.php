<?php

namespace App\Jobs;

use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Services\Ai\AiAgentService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * ProcessWhatsappAgentReply
 * pt-BR: Processa a resposta do agente de IA fora do ciclo do webhook, para
 *        que o Evolution GO receba 200 imediatamente. O job reativa o contexto
 *        do tenant (banco por tenant) antes de tocar em qualquer model.
 * en-US: Runs the AI reply outside the webhook request cycle so Evolution GO
 *        gets an immediate 200. Re-initializes the tenant context before
 *        touching any model.
 */
class ProcessWhatsappAgentReply implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 120;

    public ?string $tenantId;
    public int $conversationId;
    public ?int $incomingMessageId;

    public function __construct(int $conversationId, ?int $incomingMessageId = null)
    {
        $this->tenantId = $this->currentTenantId();
        $this->conversationId = $conversationId;
        $this->incomingMessageId = $incomingMessageId;
    }

    private function currentTenantId(): ?string
    {
        try {
            return tenancy()->tenant?->id;
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function handle(AiAgentService $agentService): void
    {
        if ($this->tenantId) {
            try {
                if (!tenancy()->tenant || tenancy()->tenant->id !== $this->tenantId) {
                    tenancy()->initialize($this->tenantId);
                }
            } catch (\Throwable $e) {
                Log::warning('ProcessWhatsappAgentReply: tenant inválido', [
                    'tenant' => $this->tenantId,
                    'error'  => $e->getMessage(),
                ]);
                return;
            }
        }

        $conversation = AiConversation::query()->find($this->conversationId);

        if (!$conversation) {
            Log::warning('ProcessWhatsappAgentReply: conversa não encontrada', [
                'conversation_id' => $this->conversationId,
            ]);
            return;
        }

        if ($conversation->isAiPaused()) {
            return;
        }

        $incoming = $this->incomingMessageId
            ? AiMessage::query()->find($this->incomingMessageId)
            : $conversation->messages()->where('role', 'user')->latest('id')->first();

        if (!$incoming) {
            return;
        }

        $agentService->processIncoming($conversation, $incoming);
    }
}
