<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaasInvoice extends Model
{
    use HasFactory;

    /**
     * Usar conexão central (não é afetado pela troca de tenancy).
     */
    protected $connection = 'mysql';

    protected $table = 'saas_invoices';

    protected $fillable = [
        'subscription_id',
        'tenant_id',
        'invoice_number',
        'amount',
        'usage_amount',
        'discount',
        'total',
        'due_date',
        'paid_at',
        'paid_amount',
        'status',
        'payment_method',
        'gateway_payment_id',
        'gateway_invoice_url',
        'gateway_boleto_url',
        'gateway_pix_code',
        'gateway_pix_qrcode_url',
        'usage_details',
        'config',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'usage_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'due_date' => 'date',
        'paid_at' => 'date',
        'usage_details' => 'array',
        'config' => 'array',
    ];

    // ─── Relationships ────────────────────────────────────────

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(SaasSubscription::class, 'subscription_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id', 'id');
    }

    // ─── Scopes ───────────────────────────────────────────────

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', 'overdue')
            ->orWhere(function ($q) {
                $q->where('status', 'pending')
                  ->where('due_date', '<', now()->toDateString());
            });
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    public function scopeForTenant($query, string $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function scopeDueBetween($query, $start, $end)
    {
        return $query->whereBetween('due_date', [$start, $end]);
    }

    // ─── Status Checkers ──────────────────────────────────────

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }

    public function isOverdue(): bool
    {
        return $this->status === 'overdue'
            || ($this->status === 'pending' && $this->due_date && $this->due_date->isPast());
    }

    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }

    // ─── Actions ──────────────────────────────────────────────

    /**
     * Marca a fatura como paga.
     */
    public function markAsPaid(?string $paymentMethod = null, ?float $paidAmount = null): self
    {
        $this->status = 'paid';
        $this->paid_at = now();
        $this->paid_amount = $paidAmount ?? $this->total;

        if ($paymentMethod) {
            $this->payment_method = $paymentMethod;
        }

        $this->save();

        // Se a assinatura estava em atraso ou suspensa, reativar
        $subscription = $this->subscription;
        if ($subscription && in_array($subscription->status, ['past_due', 'suspended'])) {
            // Verificar se todas as faturas pendentes foram pagas
            $pendingCount = $subscription->invoices()
                ->where('status', 'pending')
                ->where('due_date', '<=', now())
                ->count();

            if ($pendingCount === 0) {
                $subscription->activate();
            }
        }

        return $this;
    }

    /**
     * Marca a fatura como vencida e toma ações na assinatura.
     */
    public function markAsOverdue(): self
    {
        $this->status = 'overdue';
        $this->save();

        // Marcar assinatura como em atraso
        $subscription = $this->subscription;
        if ($subscription && $subscription->isActive()) {
            $subscription->markPastDue();
        }

        // Contar faturas vencidas - se tiver mais de 1, suspender
        if ($subscription) {
            $overdueCount = $subscription->invoices()
                ->where('status', 'overdue')
                ->count();

            if ($overdueCount >= 2) {
                $subscription->suspend('Múltiplas faturas vencidas');
            }
        }

        return $this;
    }

    /**
     * Cancela a fatura.
     */
    public function cancelInvoice(): self
    {
        $this->status = 'cancelled';
        $this->save();

        return $this;
    }

    // ─── Accessors ────────────────────────────────────────────

    /**
     * Retorna o valor total formatado em BRL.
     */
    public function getFormattedTotalAttribute(): string
    {
        return 'R$ ' . number_format($this->total, 2, ',', '.');
    }

    /**
     * Retorna o label de status.
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'Pendente',
            'paid' => 'Paga',
            'overdue' => 'Vencida',
            'cancelled' => 'Cancelada',
            'refunded' => 'Reembolsada',
            default => ucfirst($this->status),
        };
    }

    /**
     * Retorna o label de método de pagamento.
     */
    public function getPaymentMethodLabelAttribute(): string
    {
        return match ($this->payment_method) {
            'pix' => 'PIX',
            'boleto' => 'Boleto',
            'credit_card' => 'Cartão de Crédito',
            default => $this->payment_method ?? '-',
        };
    }

    /**
     * Saldo restante.
     */
    public function getRemainingAmountAttribute(): float
    {
        return max(0, $this->total - ($this->paid_amount ?? 0));
    }

    // ─── Static Helpers ───────────────────────────────────────

    /**
     * Gera um número de fatura único.
     */
    public static function generateInvoiceNumber(string $tenantId): string
    {
        $prefix = 'SAAS';
        $date = now()->format('Ymd');
        $count = self::where('tenant_id', $tenantId)
            ->whereYear('created_at', now()->year)
            ->count() + 1;

        return "{$prefix}-{$tenantId}-{$date}-" . str_pad($count, 4, '0', STR_PAD_LEFT);
    }
}
