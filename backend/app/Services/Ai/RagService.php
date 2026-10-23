<?php

namespace App\Services\Ai;

use App\Models\AiAgent;
use App\Models\AiKnowledgeBase;
use App\Models\AiKnowledgeChunk;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

/**
 * Busca RAG híbrida:
 *  - Semântica (cosine similarity) quando os chunks possuem embeddings.
 *  - Fallback por sobreposição de palavras-chave quando não há embeddings.
 */
class RagService
{
    public function __construct(private EmbeddingService $embeddings) {}

    /**
     * @return Collection<int, array{content: string, score: float, source: ?string}>
     */
    public function search(string $query, AiAgent $agent, ?int $limit = null): Collection
    {
        $limit = $limit ?? (int) config('ai.rag.max_results', 5);
        $minScore = (float) config('ai.rag.min_score', 0.30);

        $bases = $agent->activeKnowledgeBases()->get();

        if ($bases->isEmpty()) {
            return collect();
        }

        $chunks = AiKnowledgeChunk::query()
            ->whereIn('ai_knowledge_base_id', $bases->pluck('id'))
            ->orderBy('ai_knowledge_base_id')
            ->orderBy('chunk_index')
            ->limit(2000)
            ->get();

        if ($chunks->isEmpty()) {
            return collect();
        }

        $queryVector = [];

        if ($this->embeddings->isConfigured()) {
            try {
                $queryVector = $this->embeddings->generateEmbedding($query);
            } catch (\Throwable $e) {
                Log::warning('RagService: falha ao gerar embedding da consulta', ['error' => $e->getMessage()]);
            }
        }

        $sourceNames = $bases->pluck('name', 'id');

        $scored = $chunks->map(function (AiKnowledgeChunk $chunk) use ($queryVector, $query, $sourceNames) {
            $score = 0.0;

            if (!empty($queryVector)) {
                $vector = $chunk->embeddingVector();
                if (!empty($vector)) {
                    $score = $this->embeddings->cosineSimilarity($queryVector, $vector);
                }
            }

            // Fallback / reforço por palavras-chave.
            if ($score <= 0.0) {
                $score = $this->keywordScore($query, $chunk->content);
            }

            return [
                'content' => $chunk->content,
                'score'   => round($score, 4),
                'source'  => $sourceNames[$chunk->ai_knowledge_base_id] ?? null,
            ];
        });

        return $scored
            ->filter(fn ($item) => $item['score'] >= $minScore)
            ->sortByDesc('score')
            ->take($limit)
            ->values();
    }

    /**
     * Formata os resultados para inclusão no prompt.
     */
    public function formatContextForPrompt(Collection $results): string
    {
        if ($results->isEmpty()) {
            return '';
        }

        $lines = $results->values()->map(function ($result, $index) {
            $source = $result['source'] ? " ({$result['source']})" : '';

            return '[' . ($index + 1) . ']' . $source . ' ' . trim($result['content']);
        });

        return "### Base de conhecimento relevante:\n" . $lines->implode("\n");
    }

    /**
     * Reindexa uma base de conhecimento (chunks + embeddings).
     */
    public function indexKnowledgeBase(AiKnowledgeBase $base): void
    {
        $content = trim((string) $base->content);

        $base->chunks()->delete();

        if ($content === '') {
            $base->update([
                'embeddings_status' => 'completed',
                'embeddings_error'  => null,
                'last_synced_at'    => now(),
            ]);
            return;
        }

        $base->update(['embeddings_status' => 'processing', 'embeddings_error' => null]);

        try {
            $chunks = $this->embeddings->chunkText($content);
            $vectors = $this->embeddings->isConfigured()
                ? $this->embeddings->generateEmbeddingsBatch($chunks)
                : [];

            foreach ($chunks as $index => $chunk) {
                $vector = $vectors[$index] ?? [];

                AiKnowledgeChunk::create([
                    'ai_knowledge_base_id' => $base->id,
                    'content'              => $chunk,
                    'embedding'            => !empty($vector) ? json_encode($vector) : null,
                    'metadata'             => ['indexed_with_embeddings' => !empty($vector)],
                    'token_count'          => (int) ceil(str_word_count($chunk) * 1.3),
                    'chunk_index'          => $index,
                ]);
            }

            $base->update([
                'embeddings_status' => !empty($vectors) ? 'completed' : 'completed',
                'embeddings_error'  => empty($vectors) ? 'Embeddings não configurados: busca por palavras-chave ativa.' : null,
                'last_synced_at'    => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error('RagService: falha ao indexar base de conhecimento', [
                'base_id' => $base->id,
                'error'   => $e->getMessage(),
            ]);

            $base->update([
                'embeddings_status' => 'failed',
                'embeddings_error'  => $e->getMessage(),
            ]);
        }
    }

    /**
     * Score simples de sobreposição de termos (fallback sem embeddings).
     */
    private function keywordScore(string $query, string $content): float
    {
        $normalize = function (string $text): array {
            $text = mb_strtolower($text);
            $text = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $text) ?? '';
            $words = preg_split('/\s+/', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [];

            $stopwords = ['a', 'o', 'e', 'de', 'da', 'do', 'das', 'dos', 'que', 'para', 'com', 'um', 'uma', 'em', 'no', 'na', 'por', 'se', 'ao', 'aos', 'as', 'os', 'como', 'mais', 'mas', 'ou'];

            return array_values(array_filter($words, fn ($w) => mb_strlen($w) > 2 && !in_array($w, $stopwords, true)));
        };

        $queryWords = array_unique($normalize($query));
        if (empty($queryWords)) {
            return 0.0;
        }

        $contentWords = array_unique($normalize($content));
        $matches = count(array_intersect($queryWords, $contentWords));

        return min(1.0, $matches / max(1, count($queryWords)));
    }
}
