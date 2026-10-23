<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiKnowledgeBase extends Model
{
    protected $table = 'ai_knowledge_bases';

    protected $fillable = [
        'ai_agent_id',
        'name',
        'type',
        'content',
        'metadata',
        'is_active',
        'embeddings_status',
        'embeddings_error',
        'last_synced_at',
    ];

    protected $casts = [
        'metadata'       => 'array',
        'is_active'      => 'boolean',
        'last_synced_at' => 'datetime',
    ];

    public function agent(): BelongsTo
    {
        return $this->belongsTo(AiAgent::class, 'ai_agent_id');
    }

    public function chunks(): HasMany
    {
        return $this->hasMany(AiKnowledgeChunk::class, 'ai_knowledge_base_id');
    }
}
