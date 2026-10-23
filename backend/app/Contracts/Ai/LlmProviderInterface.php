<?php

namespace App\Contracts\Ai;

use App\DTOs\LlmResponse;

/**
 * Contrato (Strategy) dos provedores de LLM.
 */
interface LlmProviderInterface
{
    /**
     * @param  array<int, array{role: string, content: string}>  $messages
     */
    public function chat(array $messages, array $options = []): LlmResponse;

    /**
     * @return float[]
     */
    public function generateEmbedding(string $text): array;

    public function getModels(): array;

    public function supportsEmbeddings(): bool;

    public function getName(): string;
}
