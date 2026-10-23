<?php

namespace App\Services\Ai;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Geração e comparação de embeddings (RAG).
 * Usa sempre o provider configurado em ai.embedding (OpenAI por padrão),
 * independentemente do LLM escolhido no agente.
 */
class EmbeddingService
{
    public function __construct(
        private int $chunkSize = 500,
        private int $chunkOverlap = 50,
    ) {
        $this->chunkSize = (int) config('ai.embedding.chunk_size', 500);
        $this->chunkOverlap = (int) config('ai.embedding.chunk_overlap', 50);
    }

    public function isConfigured(): bool
    {
        try {
            $providerName = config('ai.embedding.provider', 'openai');
            $provider = LlmProviderFactory::create($providerName);

            return $provider->supportsEmbeddings();
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * @return float[]
     */
    public function generateEmbedding(string $text): array
    {
        $text = trim($text);
        if ($text === '') {
            return [];
        }

        $cacheKey = 'ai:embedding:' . md5($text);

        return Cache::remember($cacheKey, now()->addDay(), function () use ($text) {
            $providerName = config('ai.embedding.provider', 'openai');
            $provider = LlmProviderFactory::create($providerName);

            return $provider->generateEmbedding($text);
        });
    }

    /**
     * Gera embeddings em lote (uma chamada por texto).
     *
     * @param  string[]  $texts
     * @return array<int, float[]>
     */
    public function generateEmbeddingsBatch(array $texts): array
    {
        $results = [];

        foreach ($texts as $index => $text) {
            try {
                $results[$index] = $this->generateEmbedding($text);
            } catch (\Throwable $e) {
                Log::warning('EmbeddingService: falha ao gerar embedding', [
                    'index' => $index,
                    'error' => $e->getMessage(),
                ]);
                $results[$index] = [];
            }
        }

        return $results;
    }

    /**
     * Divide um texto em chunks por palavras.
     *
     * @return string[]
     */
    public function chunkText(string $text, ?int $chunkSize = null, ?int $overlap = null): array
    {
        $chunkSize = $chunkSize ?? $this->chunkSize;
        $overlap = $overlap ?? $this->chunkOverlap;

        $words = preg_split('/\s+/', trim($text), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $total = count($words);

        if ($total === 0) {
            return [];
        }

        $step = max(1, $chunkSize - $overlap);
        $chunks = [];

        for ($i = 0; $i < $total; $i += $step) {
            $chunk = trim(implode(' ', array_slice($words, $i, $chunkSize)));

            if ($chunk !== '') {
                $chunks[] = $chunk;
            }

            if ($i + $chunkSize >= $total) {
                break;
            }
        }

        return $chunks;
    }

    /**
     * @param  float[]  $a
     * @param  float[]  $b
     */
    public function cosineSimilarity(array $a, array $b): float
    {
        if (empty($a) || empty($b)) {
            return 0.0;
        }

        $dot = 0.0;
        $normA = 0.0;
        $normB = 0.0;
        $length = min(count($a), count($b));

        for ($i = 0; $i < $length; $i++) {
            $dot   += $a[$i] * $b[$i];
            $normA += $a[$i] * $a[$i];
            $normB += $b[$i] * $b[$i];
        }

        $denominator = sqrt($normA) * sqrt($normB);

        return $denominator > 0 ? $dot / $denominator : 0.0;
    }
}
