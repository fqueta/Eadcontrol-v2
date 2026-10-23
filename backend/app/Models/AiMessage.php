<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiMessage extends Model
{
    protected $table = 'ai_messages';

    protected $fillable = [
        'ai_conversation_id',
        'role',
        'content',
        'tokens_used',
        'metadata',
    ];

    protected $casts = [
        'metadata'    => 'array',
        'tokens_used' => 'integer',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(AiConversation::class, 'ai_conversation_id');
    }

    public function isFromContact(): bool
    {
        return $this->role === 'user';
    }

    public function mediaUrl(): ?string
    {
        return data_get($this->metadata ?? [], 'media.url');
    }

    public function mediaType(): ?string
    {
        return data_get($this->metadata ?? [], 'media.type');
    }
}
