<?php

namespace App\Services\Ai\Providers;

/**
 * DeepSeek: API compatível com OpenAI. Só muda o endpoint/modelos.
 * Embeddings continuam sendo gerados pela OpenAI (EmbeddingService).
 */
class DeepSeekProvider extends OpenAiProvider
{
    public function getName(): string
    {
        return 'deepseek';
    }

    public function supportsEmbeddings(): bool
    {
        return false;
    }

    public function getModels(): array
    {
        return $this->config['models'] ?? [];
    }

    protected function getChatEndpoint(): string
    {
        $baseUrl = rtrim($this->config['base_url'] ?? 'https://api.deepseek.com/v1', '/');

        return "{$baseUrl}/chat/completions";
    }

    protected function buildChatPayload(array $messages, array $options): array
    {
        $model = $options['model'] ?? ($this->config['default_model'] ?? 'deepseek-chat');

        return [
            'model'       => $model,
            'messages'    => $messages,
            'temperature' => $options['temperature'] ?? 0.7,
            'max_tokens'  => $options['max_tokens'] ?? 600,
        ];
    }
}
