<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiKnowledgeChunk extends Model
{
    protected $table = 'ai_knowledge_chunks';

    protected $fillable = [
        'ai_knowledge_base_id',
        'content',
        'embedding',
        'metadata',
        'token_count',
        'chunk_index',
    ];

    protected $casts = [
        'metadata'    => 'array',
        'token_count' => 'integer',
        'chunk_index' => 'integer',
    ];

    public function knowledgeBase(): BelongsTo
    {
        return $this->belongsTo(AiKnowledgeBase::class, 'ai_knowledge_base_id');
    }

    /**
     * Embedding é gravado como JSON string (LONGTEXT) para evitar limites
     * de tamanho do tipo JSON do MySQL em vetores grandes.
     *
     * @return float[]
     */
    public function embeddingVector(): array
    {
        if (is_array($this->embedding)) {
            return $this->embedding;
        }

        if (is_string($this->embedding) && $this->embedding !== '') {
            $decoded = json_decode($this->embedding, true);
            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }
}
