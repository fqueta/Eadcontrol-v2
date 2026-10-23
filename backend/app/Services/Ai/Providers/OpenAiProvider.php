<?php

namespace App\Services\Ai\Providers;

use App\DTOs\LlmResponse;

/**
 * OpenAI (e endpoints compatíveis, como OpenRouter e DeepSeek).
 */
class OpenAiProvider extends AbstractLlmProvider
{
    public function getName(): string
    {
        return 'openai';
    }

    public function supportsEmbeddings(): bool
    {
        return true;
    }

    public function getModels(): array
    {
        return $this->config['models'] ?? [];
    }

    protected function getChatEndpoint(): string
    {
        $baseUrl = rtrim($this->config['base_url'] ?? 'https://api.openai.com/v1', '/');

        return "{$baseUrl}/chat/completions";
    }

    protected function getAuthHeaders(): array
    {
        return [
            'Authorization' => 'Bearer ' . $this->ensureApiKey(),
            'Content-Type'  => 'application/json',
        ];
    }

    protected function buildChatPayload(array $messages, array $options): array
    {
        return [
            'model'       => $options['model'] ?? ($this->config['default_model'] ?? 'gpt-4o-mini'),
            'messages'    => $messages,
            'temperature' => $options['temperature'] ?? 0.7,
            'max_tokens'  => $options['max_tokens'] ?? 600,
        ];
    }

    protected function parseChatResponse(array $response): LlmResponse
    {
        $choice = $response['choices'][0] ?? [];
        $usage = $response['usage'] ?? [];

        $input = (int) ($usage['prompt_tokens'] ?? 0);
        $output = (int) ($usage['completion_tokens'] ?? 0);

        return new LlmResponse(
            content:      (string) ($choice['message']['content'] ?? ''),
            tokensUsed:   (int) ($usage['total_tokens'] ?? ($input + $output)),
            inputTokens:  $input,
            outputTokens: $output,
            model:        (string) ($response['model'] ?? ''),
            provider:     $this->getName(),
            metadata:     ['finish_reason' => $choice['finish_reason'] ?? null],
        );
    }

    public function generateEmbedding(string $text): array
    {
        $baseUrl = rtrim($this->config['base_url'] ?? 'https://api.openai.com/v1', '/');
        $model = $this->config['embedding_model'] ?? 'text-embedding-3-small';

        $response = \Illuminate\Support\Facades\Http::timeout(60)
            ->withHeaders($this->getAuthHeaders())
            ->post("{$baseUrl}/embeddings", [
                'model' => $model,
                'input' => $text,
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Erro ao gerar embedding: ' . $response->body());
        }

        return (array) $response->json('data.0.embedding', []);
    }
}
