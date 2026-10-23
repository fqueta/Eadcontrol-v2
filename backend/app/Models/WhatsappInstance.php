<?php

namespace App\Models;

use App\Services\Integrations\CredentialStore;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class WhatsappInstance extends Model
{
    use SoftDeletes;

    protected $table = 'whatsapp_instances';

    protected $fillable = [
        'display_name',
        'instance_name',
        'instance_id',
        'phone_number',
        'status',
        'provider',
        'api_key',
        'qr_code',
        'webhook_url',
        'settings',
        'last_error',
        'connected_at',
    ];

    protected $casts = [
        'settings'     => 'array',
        'connected_at' => 'datetime',
    ];

    protected $hidden = [
        'api_key',
    ];

    // ─── Relacionamentos ───────────────────────────────────────────────────

    public function agents(): HasMany
    {
        return $this->hasMany(AiAgent::class, 'whatsapp_instance_id');
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(AiConversation::class, 'whatsapp_instance_id');
    }

    // ─── Scopes ────────────────────────────────────────────────────────────

    public function scopeConnected($query)
    {
        return $query->where('status', 'connected');
    }

    // ─── Helpers ───────────────────────────────────────────────────────────

    public function isConnected(): bool
    {
        return $this->status === 'connected';
    }

    public function isEvolutionGo(): bool
    {
        return ($this->provider ?? 'evolution-go') === 'evolution-go';
    }

    /**
     * Agente de IA ativo vinculado à instância (ou agente global do tenant).
     */
    public function resolveAgent(): ?AiAgent
    {
        return $this->agents()->where('is_active', true)->orderByDesc('id')->first()
            ?? AiAgent::query()->whereNull('whatsapp_instance_id')->where('is_active', true)->orderByDesc('id')->first();
    }

    /**
     * Configuração efetiva do Evolution GO (integração do tenant > .env).
     */
    public static function evolutionConfig(): array
    {
        return CredentialStore::for('evolution-go', config('whatsapp.evolution_go', []));
    }

    public function getEffectiveBaseUrl(): string
    {
        return (string) (self::evolutionConfig()['base_url'] ?? 'http://localhost:8080');
    }

    public function getEffectiveApiKey(): string
    {
        return (string) (self::evolutionConfig()['api_key'] ?? '');
    }

    /**
     * Token exclusivo da instância (fallback para a chave global).
     */
    public function getInstanceToken(): ?string
    {
        return $this->api_key
            ?: ($this->settings['token'] ?? null)
            ?: ($this->settings['instance_token'] ?? null);
    }

    public function getDisplayNameAttribute($value): string
    {
        return $value ?: ($this->instance_name ?: 'WhatsApp');
    }
}
