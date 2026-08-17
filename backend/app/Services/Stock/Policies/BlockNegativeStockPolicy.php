<?php

namespace App\Services\Stock\Policies;

use App\Interfaces\StockPolicyInterface;
use App\Models\Product;

/**
 * BlockNegativeStockPolicy
 * pt-BR: Impede a baixa quando o saldo é insuficiente (sem estoque negativo).
 */
class BlockNegativeStockPolicy implements StockPolicyInterface
{
    public function canConsume(Product $product, int $quantity, int $currentBalance): bool
    {
        return $currentBalance >= $quantity;
    }
}