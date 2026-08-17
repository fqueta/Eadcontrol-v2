<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * StockMovement
 * pt-BR: Linha de movimentação do livro de estoque. O saldo do produto é
 * derivado da soma: entradas (+) menos saídas (-).
 */
class StockMovement extends Model
{
    use HasFactory;

    protected $table = 'stock_movements';

    protected $fillable = [
        'stock_entry_id',
        'product_id',
        'type',
        'quantity',
        'unit_cost',
        'unit_price',
        'total_cost',
        'service_order_id',
        'appointment_id',
        'reason',
        'created_by',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_cost' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'product_id' => 'integer',
        'stock_entry_id' => 'integer',
        'service_order_id' => 'integer',
        'appointment_id' => 'integer',
    ];

    /**
     * Produto movimentado.
     */
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'ID');
    }

    /**
     * Lançamento (cabeçalho) ao qual a linha pertence.
     */
    public function entry()
    {
        return $this->belongsTo(StockEntry::class, 'stock_entry_id');
    }

    /**
     * Sinal da movimentação para cálculo de saldo.
     */
    public function sign(): int
    {
        return $this->type === 'entrada' ? 1 : -1;
    }
}