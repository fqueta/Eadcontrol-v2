<?php

namespace App\Interfaces;

use App\Models\Product;

/**
 * StockPolicyInterface
 * pt-BR: Define a regra de baixa de estoque de um produto.
 * Cada negócio pode escolher sua política no cadastro do produto.
 */
interface StockPolicyInterface
{
    /**
     * Verifica se a baixa de $quantity unidades é permitida.
     *
     * @return bool
     */
    public function canConsume(Product $product, int $quantity, int $currentBalance): bool;
}