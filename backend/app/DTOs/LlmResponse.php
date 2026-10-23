<?php

namespace App\DTOs;

/**
 * Resposta padronizada de um provedor de LLM.
 */
readonly class LlmResponse
{
    public function __construct(
        public string $content,
        public int $tokensUsed,
        public int $inputTokens,
        public int $outputTokens,
        public string $model,
        public string $provider,
        public array $metadata = [],
    ) {}

    public function toArray(): array
    {
        return [
            'content'       => $this->content,
            'tokens_used'   => $this->tokensUsed,
            'input_tokens'  => $this->inputTokens,
            'output_tokens' => $this->outputTokens,
            'model'         => $this->model,
            'provider'      => $this->provider,
            'metadata'      => $this->metadata,
        ];
    }
}
