<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiConversation extends Model
{
    protected $table = 'ai_conversations';

    protected $fillable = [
        'public_code',
        'ai_agent_id',
        'whatsapp_instance_id',
        'contact_phone',
        'contact_lid',
        'contact_name',
        'status',
        'transferred_to',
        'metadata',
        'last_message_at',
        'closed_at',
    ];

    protected $casts = [
        'metadata'        => 'array',
        'last_message_at' => 'datetime',
        'closed_at'       => 'datetime',
    ];

    // ─── Boot ──────────────────────────────────────────────────────────────

    protected static function booted(): void
    {
        static::creating(function (self $conversation) {
            if (empty($conversation->public_code)) {
                $conversation->public_code = self::generatePublicCode();
            }
        });
    }

    public static function generatePublicCode(): string
    {
        // Alfabeto sem caracteres ambíguos (0/O, 1/l/I).
        $alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

        do {
            $code = '';
            for ($i = 0; $i < 9; $i++) {
                $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
        } while (self::query()->where('public_code', $code)->exists());

        return $code;
    }

    // ─── Relacionamentos ───────────────────────────────────────────────────

    public function instance(): BelongsTo
    {
        return $this->belongsTo(WhatsappInstance::class, 'whatsapp_instance_id');
    }

    public function whatsappInstance(): BelongsTo
    {
        return $this->belongsTo(WhatsappInstance::class, 'whatsapp_instance_id');
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(AiAgent::class, 'ai_agent_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(AiMessage::class, 'ai_conversation_id');
    }

    public function transfers(): HasMany
    {
        return $this->hasMany(HumanTransfer::class, 'ai_conversation_id');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'transferred_to');
    }

    // ─── Scopes ────────────────────────────────────────────────────────────

    public function scopeOpen($query)
    {
        return $query->whereIn('status', ['active', 'transferred']);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────

    public function isAiPaused(): bool
    {
        return (bool) data_get($this->metadata ?? [], 'ai_paused', false)
            || $this->status === 'transferred';
    }

    public function pauseAi(bool $paused = true): void
    {
        $metadata = $this->metadata ?? [];
        $metadata['ai_paused'] = $paused;

        $this->update([
            'metadata' => $metadata,
            'status'   => $paused ? 'transferred' : 'active',
        ]);
    }

    public function rememberLid(?string $lid, ?string $phone = null): void
    {
        $updates = [];
        if ($lid && $this->contact_lid !== $lid) {
            $updates['contact_lid'] = $lid;
        }
        if ($phone && (!$this->contact_phone || str_starts_with($this->contact_phone, 'lid:'))) {
            $updates['contact_phone'] = $phone;
        }

        if (!empty($updates)) {
            $this->update($updates);
        }
    }

    /**
     * Recupera a conversa aberta do contato (telefone ou LID) na instância.
     */
    public static function findOpenByPhoneOrLid(int $instanceId, ?string $phone, ?string $lid = null): ?self
    {
        $phone = $phone ? preg_replace('/\D/', '', $phone) : null;
        $lid = $lid ? preg_replace('/\D/', '', $lid) : null;

        if (!$phone && !$lid) {
            return null;
        }

        return self::query()
            ->where('whatsapp_instance_id', $instanceId)
            ->where(function ($query) use ($phone, $lid) {
                if ($phone) {
                    $query->where('contact_phone', $phone);
                }
                if ($lid) {
                    $query->orWhere('contact_lid', $lid);
                }
            })
            ->whereIn('status', ['active', 'transferred'])
            ->orderByDesc('id')
            ->first();
    }

    /**
     * Recupera ou cria a conversa em aberto do contato.
     */
    public static function findOrStart(
        int $instanceId,
        string $phone,
        ?string $contactName = null,
        ?int $agentId = null,
        ?string $lid = null
    ): self {
        $cleanPhone = preg_replace('/\D/', '', $phone) ?: $phone;
        $conversation = self::findOpenByPhoneOrLid($instanceId, $cleanPhone, $lid);

        if ($conversation) {
            $updates = [];
            if ($contactName && $conversation->contact_name !== $contactName) {
                $updates['contact_name'] = $contactName;
            }
            if ($agentId && !$conversation->ai_agent_id) {
                $updates['ai_agent_id'] = $agentId;
            }
            if (!empty($updates)) {
                $conversation->update($updates);
            }

            return $conversation;
        }

        return self::create([
            'ai_agent_id'          => $agentId,
            'whatsapp_instance_id' => $instanceId,
            'contact_phone'        => $cleanPhone,
            'contact_lid'          => $lid ? preg_replace('/\D/', '', $lid) : null,
            'contact_name'         => $contactName,
            'status'               => 'active',
            'metadata'             => [],
        ]);
    }
}
