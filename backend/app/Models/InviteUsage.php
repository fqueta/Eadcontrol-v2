<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InviteUsage extends Model
{
    use HasFactory;

    /**
     * InviteUsage model for auditing invite token usage.
     * pt-BR: Modelo para registrar auditoria de uso de convites.
     * en-US: Model to store audit entries for invite usage.
     */
    protected $table = 'invite_usages';

    protected $fillable = [
        'invite_post_id',
        'client_id',
        'invite_token',
        'status',
        'reason',
        'ip',
        'user_agent',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    /**
     * Related invite post (convite).
     */
    public function invitePost(): BelongsTo
    {
        return $this->belongsTo(Post::class, 'invite_post_id', 'ID');
    }

    /**
     * Related client user.
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }
}