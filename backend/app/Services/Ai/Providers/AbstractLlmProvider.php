<?php

namespace App\Services\Ai\Providers;

use App\Contracts\Ai\LlmProviderInterface;
use App\DTOs\LlmResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Template Method: fluxo comum de chamada HTTP para LLMs.
 */
abstract class AbstractLlmProvider implements LlmProviderInterface
{
    public function __construct(protected array $config) {}

    abstract protected function getChatEndpoint(): string;

    abstract protected function buildChatPayload(array $messages, array $options): array;

    abstract protected function parseChatResponse(array $response): LlmResponse;

    abstract protected function getAuthHeaders(): array;

    public function chat(array $messages, array $options = []): LlmResponse
    {
        $payload = $this->buildChatPayload($messages, $options);
        $timeout = (int) ($options['timeout'] ?? $this->config['timeout'] ?? 40);

        $response = Http::timeout($timeout)
            ->retry(1, 300)
            ->withHeaders($this->getAuthHeaders())
            ->post($this->getChatEndpoint(), $payload);

        if ($response->failed()) {
            $error = $response->json('error.message') ?? $response->body();

            Log::error("[LLM:{$this->getName()}] erro", [
                'status' => $response->status(),
                'error'  => $error,
            ]);

            throw new \RuntimeException("[{$this->getName()}] API error: {$error}");
        }

        return $this->parseChatResponse($response->json() ?? []);
    }

    public function generateEmbedding(string $text): array
    {
        throw new \RuntimeException("Provider [{$this->getName()}] não suporta embeddings nativamente.");
    }

    public function supportsEmbeddings(): bool
    {
        return false;
    }

    protected function ensureApiKey(): string
    {
        $key = $this->config['api_key'] ?? null;

        if (empty($key)) {
            throw new \RuntimeException("API key não configurada para o provider [{$this->getName()}].");
        }

        return (string) $key;
    }
}
