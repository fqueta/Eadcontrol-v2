<?php

namespace App\Services\Ai\Providers;

use App\DTOs\LlmResponse;
use Illuminate\Support\Facades\Http;

/**
 * Anthropic Claude (Messages API).
 */
class ClaudeProvider extends AbstractLlmProvider
{
    public function getName(): string
    {
        return 'claude';
    }

    public function getModels(): array
    {
        return $this->config['models'] ?? [];
    }

    protected function getChatEndpoint(): string
    {
        $baseUrl = rtrim($this->config['base_url'] ?? 'https://api.anthropic.com/v1', '/');

        return "{$baseUrl}/messages";
    }

    protected function getAuthHeaders(): array
    {
        return [
            'x-api-key'         => $this->ensureApiKey(),
            'anthropic-version' => '2023-06-01',
            'Content-Type'      => 'application/json',
        ];
    }

    protected function buildChatPayload(array $messages, array $options): array
    {
        $system = '';
        $conversation = [];

        foreach ($messages as $message) {
            if (($message['role'] ?? '') === 'system') {
                $system .= $message['content'] . "\n";
                continue;
            }

            $conversation[] = [
                'role'    => ($message['role'] ?? '') === 'assistant' ? 'assistant' : 'user',
                'content' => $message['content'],
            ];
        }

        $payload = [
            'model'       => $options['model'] ?? ($this->config['default_model'] ?? 'claude-3-5-haiku-latest'),
            'messages'    => $conversation,
            'max_tokens'  => $options['max_tokens'] ?? 600,
            'temperature' => $options['temperature'] ?? 0.7,
        ];

        if ($system !== '') {
            $payload['system'] = trim($system);
        }

        return $payload;
    }

    protected function parseChatResponse(array $response): LlmResponse
    {
        $usage = $response['usage'] ?? [];
        $content = collect($response['content'] ?? [])
            ->where('type', 'text')
            ->pluck('text')
            ->implode("\n");

        $input = (int) ($usage['input_tokens'] ?? 0);
        $output = (int) ($usage['output_tokens'] ?? 0);

        return new LlmResponse(
            content:      $content,
            tokensUsed:   $input + $output,
            inputTokens:  $input,
            outputTokens: $output,
            model:        (string) ($response['model'] ?? ''),
            provider:     $this->getName(),
            metadata:     ['finish_reason' => $response['stop_reason'] ?? null],
        );
    }
}
