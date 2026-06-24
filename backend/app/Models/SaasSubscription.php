<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SaasSubscription extends Model
{
    use HasFactory;

    /**
     * Usar conexão central (não é afetado pela troca de tenancy).
     */
    protected $connection = 'mysql';

    protected $table = 'saas_subscriptions';

    protected $fillable = [
        'tenant_id',
        'plan_id',
        'billing_cycle',
        'status',
        'starts_at',
        'ends_at',
        'trial_ends_at',
        'next_billing_date',
        'suspended_at',
        'cancelled_at',
        'cancellation_reason',
        'gateway_subscription_id',
        'gateway_customer_id',
        'usage_data',
        'config',
    ];

    protected $casts = [
        'starts_at' => 'date',
        'ends_at' => 'date',
        'trial_ends_at' => 'date',
        'next_billing_date' => 'date',
        'suspended_at' => 'date',
        'cancelled_at' => 'date',
        'usage_data' => 'array',
        'config' => 'array',
    ];

    // ─── Relationships ────────────────────────────────────────

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id', 'id');
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SaasPlan::class, 'plan_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(SaasInvoice::class, 'subscription_id');
    }

    // ─── Scopes ───────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeTrial($query)
    {
        return $query->where('status', 'trial');
    }

    public function scopeSuspended($query)
    {
        return $query->where('status', 'suspended');
    }

    public function scopePastDue($query)
    {
        return $query->where('status', 'past_due');
    }

    public function scopeActiveOrTrial($query)
    {
        return $query->whereIn('status', ['active', 'trial']);
    }

    public function scopeForTenant($query, string $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    // ─── Status Checkers ──────────────────────────────────────

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isTrial(): bool
    {
        return $this->status === 'trial';
    }

    public function isSuspended(): bool
    {
        return $this->status === 'suspended';
    }

    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }

    public function isPastDue(): bool
    {
        return $this->status === 'past_due';
    }

    /**
     * Verifica se o acesso deve ser permitido (ativo ou em trial válido).
     */
    public function hasAccess(): bool
    {
        if ($this->isActive()) {
            return true;
        }

        if ($this->isTrial() && $this->trial_ends_at && $this->trial_ends_at->isFuture()) {
            return true;
        }

        return false;
    }

    /**
     * Verifica se o trial expirou.
     */
    public function isTrialExpired(): bool
    {
        return $this->isTrial() && $this->trial_ends_at && $this->trial_ends_at->isPast();
    }

    // ─── Actions ──────────────────────────────────────────────

    /**
     * Ativa a assinatura.
     */
    public function activate(): self
    {
        $this->status = 'active';
        $this->suspended_at = null;
        $this->save();

        // Reativar o tenant
        $tenant = $this->tenant;
        if ($tenant) {
            $tenant->ativo = 's';
            $tenant->save();
        }

        return $this;
    }

    /**
     * Suspende a assinatura (inadimplência).
     */
    public function suspend(string $reason = 'Inadimplência'): self
    {
        $this->status = 'suspended';
        $this->suspended_at = now();
        $this->cancellation_reason = $reason;
        $this->save();

        // Suspender o tenant
        $tenant = $this->tenant;
        if ($tenant) {
            $tenant->ativo = 'n';
            $tenant->save();
        }

        return $this;
    }

    /**
     * Cancela a assinatura.
     */
    public function cancel(string $reason = 'Cancelado pelo administrador'): self
    {
        $this->status = 'cancelled';
        $this->cancelled_at = now();
        $this->cancellation_reason = $reason;
        $this->ends_at = now();
        $this->save();

        return $this;
    }

    /**
     * Marca como em atraso (past_due).
     */
    public function markPastDue(): self
    {
        $this->status = 'past_due';
        $this->save();

        return $this;
    }

    /**
     * Troca o plano (upgrade/downgrade).
     */
    public function changePlan(int $newPlanId, ?string $newCycle = null): self
    {
        $this->plan_id = $newPlanId;

        if ($newCycle) {
            $this->billing_cycle = $newCycle;
        }

        $this->save();

        return $this;
    }

    // ─── Usage Helpers ────────────────────────────────────────

    /**
     * Retorna o valor de uso atual de uma métrica.
     */
    public function getUsage(string $key, $default = 0)
    {
        return $this->usage_data[$key] ?? $default;
    }

    /**
     * Atualiza os dados de uso.
     */
    public function updateUsage(string $key, $value): self
    {
        $usage = $this->usage_data ?? [];
        $usage[$key] = $value;
        $this->usage_data = $usage;
        $this->save();

        return $this;
    }

    /**
     * Verifica se o uso de uma métrica excede o limite do plano.
     */
    public function isOverLimit(string $featureKey): bool
    {
        $limit = $this->plan->getFeatureLimit($featureKey);

        if ($limit === null || $limit === -1) {
            return false; // Sem limite ou ilimitado
        }

        $currentUsage = $this->getUsage("current_{$featureKey}", 0);

        return $currentUsage > $limit;
    }

    /**
     * Calcula o uso extra acima do plano para uma métrica.
     */
    public function getExtraUsage(string $featureKey): int
    {
        $limit = $this->plan->getFeatureLimit($featureKey, 0);
        $currentUsage = $this->getUsage("current_{$featureKey}", 0);

        return max(0, $currentUsage - $limit);
    }

    /**
     * Calcula o valor total de uso extra.
     */
    public function calculateUsageCharges(): float
    {
        $plan = $this->plan;
        $total = 0;

        if (!$plan->usage_pricing) {
            return $total;
        }

        foreach ($plan->usage_pricing as $key => $unitPrice) {
            $featureKey = str_replace('extra_', '', $key);
            $extraUsage = $this->getExtraUsage($featureKey);
            $total += $extraUsage * (float) $unitPrice;
        }

        return round($total, 2);
    }

    // ─── Accessors ────────────────────────────────────────────

    /**
     * Retorna o preço atual da assinatura com base no ciclo.
     */
    public function getCurrentPriceAttribute(): float
    {
        return $this->plan->getPriceForCycle($this->billing_cycle);
    }

    /**
     * Retorna label amigável do status.
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'active' => 'Ativa',
            'suspended' => 'Suspensa',
            'cancelled' => 'Cancelada',
            'trial' => 'Trial',
            'past_due' => 'Em Atraso',
            default => ucfirst($this->status),
        };
    }

    /**
     * Retorna label do ciclo de cobrança.
     */
    public function getBillingCycleLabelAttribute(): string
    {
        return match ($this->billing_cycle) {
            'monthly' => 'Mensal',
            'yearly' => 'Anual',
            default => ucfirst($this->billing_cycle),
        };
    }
}
