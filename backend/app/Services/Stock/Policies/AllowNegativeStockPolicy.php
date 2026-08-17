<?php

namespace App\Services\Stock\Policies;

use App\Interfaces\StockPolicyInterface;
use App\Models\Product;

/**
 * AllowNegativeStockPolicy
 * pt-BR: Permite a baixa mesmo com saldo insuficiente (estoque pode ficar negativo).
 */
class AllowNegativeStockPolicy implements StockPolicyInterface
{
    public function canConsume(Product $product, int $quantity, int $currentBalance): bool
    {
        return true;
    }
}