<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * StockEntry
 * pt-BR: Cabeçalho dos lançamentos de estoque (auxílio logístico interno).
 * Reúne um conjunto de movimentações (linhas) de um mesmo documento/referência.
 */
class StockEntry extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $table = 'stock_entries';

    protected $fillable = [
        'type',
        'supplier_name',
        'document_number',
        'document_type',
        'movement_date',
        'total_amount',
        'status',
        'notes',
        'created_by',
        'config',
    ];

    protected $casts = [
        'movement_date' => 'date',
        'total_amount' => 'decimal:2',
        'config' => 'array',
    ];

    public const TYPES = ['inicial', 'entrada', 'saida', 'ajuste'];
    public const STATUSES = ['processada', 'cancelada'];

    /**
     * Linhas de movimentação do lançamento.
     */
    public function movements()
    {
        return $this->hasMany(StockMovement::class, 'stock_entry_id');
    }

    /**
     * Usuário que registrou o lançamento.
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}