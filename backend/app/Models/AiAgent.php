<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AiAgent extends Model
{
    use SoftDeletes;

    protected $table = 'ai_agents';

    protected $fillable = [
        'whatsapp_instance_id',
        'name',
        'llm_provider',
        'llm_model',
        'system_prompt',
        'welcome_message',
        'is_active',
        'temperature',
        'max_tokens',
        'settings',
    ];

    protected $casts = [
        'settings'  => 'array',
        'is_active' => 'boolean',
        'temperature' => 'float',
        'max_tokens'  => 'integer',
    ];

    // ─── Relacionamentos ───────────────────────────────────────────────────

    public function instance(): BelongsTo
    {
        return $this->belongsTo(WhatsappInstance::class, 'whatsapp_instance_id');
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(AiConversation::class, 'ai_agent_id');
    }

    public function knowledgeBases(): HasMany
    {
        return $this->hasMany(AiKnowledgeBase::class, 'ai_agent_id');
    }

    public function activeKnowledgeBases(): HasMany
    {
        return $this->knowledgeBases()->where('is_active', true);
    }

    // ─── Configurações (settings JSON) ──────────────────────────────────────

    public function setting(string $key, $default = null)
    {
        return data_get($this->settings ?? [], $key, $default);
    }

    public function transferKeywords(): array
    {
        $raw = $this->setting('transfer_keywords', []);

        if (is_string($raw)) {
            $raw = preg_split('/[,;\n]/', $raw);
        }

        return collect($raw)
            ->map(fn ($v) => mb_strtolower(trim((string) $v)))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    public function handoffMessage(): string
    {
        return (string) $this->setting(
            'handoff_message',
            'Tudo bem! Vou chamar um atendente da nossa equipe para continuar com você. 😊'
        );
    }

    public function useCatalog(): bool
    {
        return (bool) $this->setting('use_catalog', true);
    }

    public function businessHours(): array
    {
        return (array) $this->setting('business_hours', [
            'enabled' => false,
        ]);
    }

    /**
     * Verifica se o horário atual está dentro do expediente configurado.
     * Sem configuração ativa, considera sempre aberto.
     */
    public function isWithinBusinessHours(?Carbon $now = null): bool
    {
        $config = $this->businessHours();

        if (empty($config['enabled'])) {
            return true;
        }

        try {
            $timezone = $config['timezone'] ?? config('app.timezone', 'America/Sao_Paulo');
            $now = $now ? $now->copy()->setTimezone($timezone) : Carbon::now($timezone);

            $day = strtolower($now->format('D')); // mon, tue, ...
            $ranges = $config['days'][$day] ?? [];

            if (empty($ranges)) {
                return false;
            }

            // Aceita tanto {start,end} quanto lista de faixas.
            $ranges = isset($ranges['start']) ? [$ranges] : $ranges;

            foreach ($ranges as $range) {
                $start = $range['start'] ?? null;
                $end = $range['end'] ?? null;
                if (!$start || !$end) {
                    continue;
                }

                $current = $now->format('H:i');
                if ($current >= $start && $current <= $end) {
                    return true;
                }
            }
        } catch (\Throwable $e) {
            return true;
        }

        return false;
    }

    public function offlineMessage(): string
    {
        return (string) $this->setting(
            'offline_message',
            'Nosso atendimento está fora do horário comercial no momento. Deixe sua mensagem que responderemos no próximo horário disponível. 🙏'
        );
    }
}
