<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HumanTransfer extends Model
{
    protected $table = 'human_transfer_queue';

    protected $fillable = [
        'ai_conversation_id',
        'assigned_to',
        'status',
        'priority',
        'notes',
        'transfer_reason',
        'assigned_at',
        'completed_at',
    ];

    protected $casts = [
        'assigned_at'  => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(AiConversation::class, 'ai_conversation_id');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
