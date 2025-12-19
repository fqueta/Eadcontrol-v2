<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Comment extends Model
{
    use HasFactory;

    /**
     * PT: Atributos permitidos para atribuição em massa.
     * EN: Mass assignable attributes.
     */
    protected $fillable = [
        'commentable_type',
        'commentable_id',
        'user_id',
        'body',
        'rating',
        'status',
        'parent_id',
        'meta',
    ];

    /**
     * PT: Conversões nativas.
     * EN: Native casts.
     */
    protected $casts = [
        // PT: Garante que user_id seja tratado como string (UUID compatível).
        // EN: Ensure user_id is treated as string (UUID-compatible).
        'user_id' => 'string',
        'rating' => 'integer',
        'meta' => 'array',
    ];

    /**
     * PT: Relacionamento polimórfico com alvo (curso/atividade).
     * EN: Polymorphic relationship to target (course/activity).
     */
    public function commentable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * PT: Autor do comentário (usuário).
     * EN: Comment author (user).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * replies
     * PT: Relação de respostas do comentário (auto-relacionamento). Retorna comentários com `parent_id = this.id`.
     * EN: Comment replies (self-relation). Returns comments with `parent_id = this.id`.
     */
    public function replies(): HasMany
    {
        return $this->hasMany(Comment::class, 'parent_id');
    }

    /**
     * parent
     * PT: Comentário pai (se este for uma resposta). Usa `parent_id` para referência.
     * EN: Parent comment (if this is a reply). Uses `parent_id` as reference.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Comment::class, 'parent_id');
    }
}