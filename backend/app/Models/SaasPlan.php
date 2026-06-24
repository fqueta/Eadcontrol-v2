<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SaasPlan extends Model
{
    use HasFactory;

    /**
     * Usar conexão central para garantir que este model
     * NÃO é afetado pela troca de tenancy.
     */
    protected $connection = 'mysql';

    protected $table = 'saas_plans';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'price_monthly',
        'price_yearly',
        'features',
        'usage_pricing',
        'config',
        'active',
        'is_free',
        'trial_days',
        'sort_order',
    ];

    protected $casts = [
        'price_monthly' => 'decimal:2',
        'price_yearly' => 'decimal:2',
        'features' => 'array',
        'usage_pricing' => 'array',
        'config' => 'array',
        'active' => 'boolean',
        'is_free' => 'boolean',
        'trial_days' => 'integer',
        'sort_order' => 'integer',
    ];

    // ─── Relationships ────────────────────────────────────────

    public function subscriptions(): HasMany
    {
        return $this->hasMany(SaasSubscription::class, 'plan_id');
    }

    // ─── Scopes ───────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('price_monthly');
    }

    // ─── Accessors ────────────────────────────────────────────

    /**
     * Retorna o preço formatado em BRL.
     */
    public function getFormattedPriceMonthlyAttribute(): string
    {
        return 'R$ ' . number_format($this->price_monthly, 2, ',', '.');
    }

    public function getFormattedPriceYearlyAttribute(): string
    {
        return $this->price_yearly
            ? 'R$ ' . number_format($this->price_yearly, 2, ',', '.')
            : '-';
    }

    /**
     * Calcula a economia (%) ao pagar anualmente.
     */
    public function getYearlySavingsPercentAttribute(): ?float
    {
        if (!$this->price_yearly || $this->price_monthly <= 0) {
            return null;
        }

        $monthlyTotal = $this->price_monthly * 12;
        $savings = (($monthlyTotal - $this->price_yearly) / $monthlyTotal) * 100;

        return round($savings, 1);
    }

    // ─── Helpers ──────────────────────────────────────────────

    /**
     * Retorna o preço pelo ciclo de cobrança.
     */
    public function getPriceForCycle(string $cycle): float
    {
        return match ($cycle) {
            'yearly' => (float) ($this->price_yearly ?? $this->price_monthly * 12),
            default => (float) $this->price_monthly,
        };
    }

    /**
     * Retorna o valor de um limite de feature específico.
     */
    public function getFeatureLimit(string $key, $default = null)
    {
        return $this->features[$key] ?? $default;
    }

    /**
     * Retorna o preço unitário de uso extra.
     */
    public function getUsagePrice(string $key, float $default = 0): float
    {
        return (float) ($this->usage_pricing[$key] ?? $default);
    }

    /**
     * Número de assinaturas ativas neste plano.
     */
    public function getActiveSubscriptionsCountAttribute(): int
    {
        return $this->subscriptions()->whereIn('status', ['active', 'trial'])->count();
    }
}
