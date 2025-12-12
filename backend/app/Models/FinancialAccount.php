<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class FinancialAccount extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'amount',
        'type',
        'supplier_name',
        'priority',
        'customer_name',
        'installments',
        'invoice_number',
        'contract_number',
        'discount_amount',
        'interest_amount',
        'paid_amount',
        'payment_date',
        'client_id',
        'description',
        'notes',
        'category_id',
        'due_date',
        'payment_method',
        'recurrence',
        'service_order_id',
        'status',
        'token',
        'config',
        'excluido',
        'reg_excluido',
        'deletado',
        'reg_deletado',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'interest_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'due_date' => 'date',
        'payment_date' => 'date',
        'installments' => 'integer',
        'config' => 'array',
        'excluido' => 'boolean',
        'deletado' => 'boolean',
        'reg_excluido' => 'datetime',
        'reg_deletado' => 'datetime',
    ];

    /**
     * Escopo global para filtrar registros não excluídos
     */
    protected static function booted()
    {
        static::addGlobalScope('notDeleted', function (Builder $builder) {
            $builder->where(function($query) {
                $query->whereNull('excluido')->orWhere('excluido', '!=', 's');
            })->where(function($query) {
                $query->whereNull('deletado')->orWhere('deletado', '!=', 's');
            });
        });
    }

    /**
     * Relacionamento com categoria financeira
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    /**
     * Relacionamento com ordem de serviço
     */
    public function serviceOrder(): BelongsTo
    {
        return $this->belongsTo(ServiceOrder::class, 'service_order_id');
    }

    /**
     * Relacionamento com cliente
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    /**
     * Scope para contas a receber
     */
    public function scopeReceivable($query)
    {
        return $query->where('type', 'receivable');
    }

    /**
     * Scope para contas a pagar
     */
    public function scopePayable($query)
    {
        return $query->where('type', 'payable');
    }

    /**
     * Scope para contas pendentes
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope para contas pagas
     */
    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    /**
     * Scope para contas vencidas
     */
    public function scopeOverdue($query)
    {
        return $query->where('status', 'overdue')
                    ->orWhere(function($q) {
                        $q->where('status', 'pending')
                          ->where('due_date', '<', now());
                    });
    }

    /**
     * Scope para filtrar por método de pagamento
     */
    public function scopePaymentMethod($query, $method)
    {
        return $query->where('payment_method', $method);
    }

    /**
     * Scope para filtrar por período de vencimento
     */
    public function scopeDueBetween($query, $startDate, $endDate)
    {
        return $query->whereBetween('due_date', [$startDate, $endDate]);
    }

    /**
     * Scope para filtrar por cliente
     */
    public function scopeByClient($query, $clientId)
    {
        return $query->where('client_id', $clientId);
    }

    /**
     * Scope para filtrar por fornecedor
     */
    public function scopeBySupplier($query, $supplierName)
    {
        return $query->where('supplier_name', 'like', '%' . $supplierName . '%');
    }

    /**
     * Scope para filtrar por prioridade
     */
    public function scopeByPriority($query, $priority)
    {
        return $query->where('priority', $priority);
    }

    /**
     * Verifica se a conta está vencida
     */
    public function isOverdue(): bool
    {
        return $this->status === 'pending' && $this->due_date < now()->toDateString();
    }

    /**
     * Verifica se a conta está paga
     */
    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }

    /**
     * Calcula o valor restante a ser pago
     */
    public function getRemainingAmountAttribute(): float
    {
        if ($this->isPaid()) {
            return 0.0;
        }
        return $this->amount - ($this->paid_amount ?? 0);
    }

    /**
     * Calcula o valor líquido (com desconto e juros)
     */
    public function getNetAmountAttribute(): float
    {
        $amount = $this->amount;
        $amount -= ($this->discount_amount ?? 0);
        $amount += ($this->interest_amount ?? 0);
        return $amount;
    }

    /**
     * Verifica se é conta a pagar
     */
    public function isPayable(): bool
    {
        return $this->type === 'payable';
    }

    /**
     * Verifica se é conta a receber
     */
    public function isReceivable(): bool
    {
        return $this->type === 'receivable';
    }

    /**
     * Opções de tipo de conta
     */
    public static function getTypeOptions(): array
    {
        return [
            'receivable' => 'A Receber',
            'payable' => 'A Pagar',
        ];
    }

    /**
     * Opções de status
     */
    public static function getStatusOptions(): array
    {
        return [
            'pending' => 'Pendente',
            'paid' => 'Pago',
            'overdue' => 'Vencido',
            'cancelled' => 'Cancelado',
        ];
    }

    /**
     * Opções de método de pagamento
     */
    public static function getPaymentMethodOptions(): array
    {
        return [
            'cash' => 'Dinheiro',
            'credit_card' => 'Cartão de Crédito',
            'debit_card' => 'Cartão de Débito',
            'bank_transfer' => 'Transferência Bancária',
            'pix' => 'PIX',
            'check' => 'Cheque',
            'other' => 'Outro',
        ];
    }

    /**
     * Opções de recorrência
     */
    public static function getRecurrenceOptions(): array
    {
        return [
            'none' => 'Nenhuma',
            'daily' => 'Diária',
            'weekly' => 'Semanal',
            'monthly' => 'Mensal',
            'yearly' => 'Anual',
        ];
    }

    /**
     * Opções de prioridade
     */
    public static function getPriorityOptions(): array
    {
        return [
            'low' => 'Baixa',
            'medium' => 'Média',
            'high' => 'Alta',
        ];
    }
}
