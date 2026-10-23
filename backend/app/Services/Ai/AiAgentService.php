<?php

namespace App\Services\Ai;

use App\Models\AiAgent;
use App\Models\AiConversation;
use App\Models\AiKnowledgeBase;
use App\Models\AiMessage;
use App\Models\HumanTransfer;
use App\Services\Whatsapp\WhatsappService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Orquestrador do agente de atendimento:
 *  - Rate limit por conversa
 *  - Detecção de palavras-chave de transferência humana
 *  - Busca RAG + catálogo
 *  - Chamada do LLM e envio da resposta pelo WhatsApp
 */
class AiAgentService
{
    public function __construct(
        private RagService $rag,
        private PromptBuilder $promptBuilder,
        private CatalogContextService $catalog,
        private WhatsappService $whatsapp,
    ) {}

    /**
     * Processa a mensagem recebida e responde ao contato.
     */
    public function processIncoming(AiConversation $conversation, AiMessage $incoming): ?AiMessage
    {
        $agent = $conversation->agent
            ?: $conversation->whatsappInstance?->resolveAgent();

        if (!$agent || !$agent->is_active) {
            return null;
        }

        if ($conversation->isAiPaused()) {
            return null;
        }

        if ($this->isRateLimited($conversation)) {
            Log::info('AiAgentService: rate limit atingido', ['conversation_id' => $conversation->id]);
            return null;
        }

        $text = trim((string) $incoming->content);

        if ($text === '') {
            return null;
        }

        // Transferência por palavra-chave (ex.: "atendente", "humano").
        $keyword = $this->matchTransferKeyword($agent, $text);
        if ($keyword) {
            return $this->transferToHuman($conversation, $agent, 'Palavra-chave: ' . $keyword);
        }

        try {
            $ragResults = $this->rag->search($text, $agent);
            $catalogContext = $this->catalog->build($agent);

            $messages = $this->promptBuilder->build(
                $agent,
                $conversation,
                $text,
                $ragResults->all(),
                $catalogContext
            );

            $provider = LlmProviderFactory::create($agent->llm_provider);

            $response = $provider->chat($messages, [
                'model'       => $agent->llm_model,
                'temperature' => $agent->temperature,
                'max_tokens'  => $agent->max_tokens,
            ]);

            $content = trim($response->content);

            if ($content === '') {
                return null;
            }

            $outbound = AiMessage::create([
                'ai_conversation_id' => $conversation->id,
                'role'               => 'assistant',
                'content'            => $content,
                'tokens_used'        => $response->tokensUsed,
                'metadata'           => [
                    'channel'      => 'ai',
                    'provider'     => $response->provider,
                    'model'        => $response->model,
                    'input_tokens' => $response->inputTokens,
                    'output_tokens'=> $response->outputTokens,
                    'rag_chunks'   => $ragResults->count(),
                    'catalog'      => !empty($catalogContext),
                ],
            ]);

            $this->deliver($conversation, $outbound);

            return $outbound;
        } catch (\Throwable $e) {
            Log::error('AiAgentService: falha ao processar mensagem', [
                'conversation_id' => $conversation->id,
                'agent_id'        => $agent->id,
                'error'           => $e->getMessage(),
            ]);

            $this->deliver(
                $conversation,
                AiMessage::create([
                    'ai_conversation_id' => $conversation->id,
                    'role'               => 'assistant',
                    'content'            => 'Desculpe, tive um problema ao responder agora. Já chamei um atendente para continuar com você. 😊',
                    'metadata'           => ['channel' => 'ai_fallback', 'error' => $e->getMessage()],
                ])
            );

            $conversation->pauseAi(true);
            HumanTransfer::create([
                'ai_conversation_id' => $conversation->id,
                'status'             => 'pending',
                'priority'           => 2,
                'transfer_reason'    => 'Falha na IA: ' . mb_substr($e->getMessage(), 0, 150),
            ]);

            return null;
        }
    }

    /**
     * Envia e persiste a resposta no WhatsApp.
     */
    private function deliver(AiConversation $conversation, AiMessage $message): void
    {
        try {
            $instance = $conversation->whatsappInstance;

            if ($instance) {
                $this->whatsapp->sendMessage($instance, $conversation->contact_phone, (string) $message->content);
            }
        } catch (\Throwable $e) {
            $message->update([
                'metadata' => array_merge($message->metadata ?? [], ['send_error' => $e->getMessage()]),
            ]);
        }

        $conversation->update(['last_message_at' => now()]);
    }

    /**
     * Transfere a conversa para atendimento humano.
     */
    public function transferToHuman(AiConversation $conversation, AiAgent $agent, string $reason): ?AiMessage
    {
        $conversation->pauseAi(true);

        HumanTransfer::create([
            'ai_conversation_id' => $conversation->id,
            'status'             => 'pending',
            'priority'           => 1,
            'transfer_reason'    => mb_substr($reason, 0, 180),
        ]);

        return $this->whatsapp->replyAndPersist(
            $conversation,
            $agent->handoffMessage(),
            ['channel' => 'transfer', 'reason' => $reason]
        );
    }

    /**
     * Testa o agente sem WhatsApp (usado no painel).
     *
     * @return array{content: string, provider: string, model: string, tokens: int, rag_chunks: int}
     */
    public function testAgent(AiAgent $agent, string $message): array
    {
        $ragResults = $this->rag->search($message, $agent);
        $catalogContext = $this->catalog->build($agent);

        $messages = $this->promptBuilder->build(
            $agent,
            null,
            $message,
            $ragResults->all(),
            $catalogContext
        );

        $provider = LlmProviderFactory::create($agent->llm_provider);

        $response = $provider->chat($messages, [
            'model'       => $agent->llm_model,
            'temperature' => $agent->temperature,
            'max_tokens'  => $agent->max_tokens,
        ]);

        return [
            'content'    => trim($response->content),
            'provider'   => $response->provider,
            'model'      => $response->model,
            'tokens'     => $response->tokensUsed,
            'rag_chunks' => $ragResults->count(),
        ];
    }

    /**
     * Sincroniza o catálogo de cursos/produtos para uma base de conhecimento
     * (permite busca semântica sobre o catálogo).
     */
    public function syncCatalog(AiAgent $agent): AiKnowledgeBase
    {
        $content = $this->catalog->build($agent);

        $base = AiKnowledgeBase::firstOrCreate(
            [
                'ai_agent_id' => $agent->id,
                'type'        => 'catalog',
            ],
            [
                'name'      => 'Catálogo de cursos e produtos',
                'is_active' => true,
            ]
        );

        $base->update([
            'name'    => 'Catálogo de cursos e produtos',
            'content' => $content,
            'is_active' => true,
        ]);

        $this->rag->indexKnowledgeBase($base->fresh());

        return $base->fresh();
    }

    private function isRateLimited(AiConversation $conversation): bool
    {
        $limit = (int) config('ai.defaults.rate_limit', 12);
        if ($limit <= 0) {
            return false;
        }

        $key = 'ai:rate:' . $conversation->id . ':' . now()->format('YmdHi');

        if (!Cache::has($key)) {
            Cache::put($key, 1, 70);
            return false;
        }

        $count = (int) Cache::increment($key);

        return $count > $limit;
    }

    private function matchTransferKeyword(AiAgent $agent, string $text): ?string
    {
        $keywords = $agent->transferKeywords();
        if (empty($keywords)) {
            return null;
        }

        $haystack = mb_strtolower($text);

        foreach ($keywords as $keyword) {
            if ($keyword !== '' && str_contains($haystack, $keyword)) {
                return $keyword;
            }
        }

        return null;
    }
}
