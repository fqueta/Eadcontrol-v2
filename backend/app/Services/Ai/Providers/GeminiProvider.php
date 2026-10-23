<?php

namespace App\Services\Ai\Providers;

use App\DTOs\LlmResponse;
use Illuminate\Support\Facades\Http;

/**
 * Google Gemini (formato próprio, diferente do OpenAI).
 */
class GeminiProvider extends AbstractLlmProvider
{
    public function getName(): string
    {
        return 'gemini';
    }

    public function getModels(): array
    {
        return $this->config['models'] ?? [];
    }

    protected function getAuthHeaders(): array
    {
        return ['Content-Type' => 'application/json'];
    }

    protected function getChatEndpoint(): string
    {
        $baseUrl = rtrim($this->config['base_url'] ?? 'https://generativelanguage.googleapis.com/v1beta', '/');
        $model = $this->config['default_model'] ?? 'gemini-2.0-flash';

        return "{$baseUrl}/models/{$model}:generateContent?key=" . $this->ensureApiKey();
    }

    protected function buildChatPayload(array $messages, array $options): array
    {
        $contents = [];
        $systemText = '';

        foreach ($messages as $message) {
            if (($message['role'] ?? '') === 'system') {
                $systemText .= $message['content'] . "\n";
                continue;
            }

            $contents[] = [
                'role'  => ($message['role'] ?? '') === 'assistant' ? 'model' : 'user',
                'parts' => [['text' => $message['content']]],
            ];
        }

        $payload = [
            'contents' => $contents,
            'generationConfig' => [
                'temperature'     => $options['temperature'] ?? 0.7,
                'maxOutputTokens' => $options['max_tokens'] ?? 600,
            ],
        ];

        if ($systemText !== '') {
            $payload['systemInstruction'] = [
                'parts' => [['text' => trim($systemText)]],
            ];
        }

        return $payload;
    }

    protected function parseChatResponse(array $response): LlmResponse
    {
        $candidate = $response['candidates'][0] ?? [];
        $usage = $response['usageMetadata'] ?? [];

        $input = (int) ($usage['promptTokenCount'] ?? 0);
        $output = (int) ($usage['candidatesTokenCount'] ?? 0);

        // Concatena todas as partes textuais (alguns modelos retornam múltiplas).
        $parts = $candidate['content']['parts'] ?? [];
        $content = collect($parts)->pluck('text')->filter()->implode("\n");

        return new LlmResponse(
            content:      $content,
            tokensUsed:   $input + $output,
            inputTokens:  $input,
            outputTokens: $output,
            model:        (string) ($response['modelVersion'] ?? ($this->config['default_model'] ?? 'gemini')),
            provider:     $this->getName(),
            metadata:     ['finish_reason' => $candidate['finishReason'] ?? null],
        );
    }

    public function chat(array $messages, array $options = []): LlmResponse
    {
        $model = $options['model'] ?? ($this->config['default_model'] ?? 'gemini-2.0-flash');
        $fallback = 'gemini-1.5-flash';
        $modelsToTry = array_values(array_unique(array_filter([$model, $fallback])));

        $baseUrl = rtrim($this->config['base_url'] ?? 'https://generativelanguage.googleapis.com/v1beta', '/');
        $apiKey = $this->ensureApiKey();
        $payload = $this->buildChatPayload($messages, $options);
        $lastError = null;

        foreach ($modelsToTry as $candidateModel) {
            $response = Http::timeout(60)
                ->retry(1, 500)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post("{$baseUrl}/models/{$candidateModel}:generateContent?key={$apiKey}", $payload);

            if ($response->successful()) {
                return $this->parseChatResponse($response->json() ?? []);
            }

            $lastError = $response->body();
        }

        throw new \RuntimeException('[gemini] API error: ' . ($lastError ?: 'Erro desconhecido'));
    }
}
