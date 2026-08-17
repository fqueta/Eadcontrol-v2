<?php

namespace App\Services\Stock;

use App\Interfaces\StockPolicyInterface;
use App\Models\Product;
use App\Services\Stock\Policies\AllowNegativeStockPolicy;
use App\Services\Stock\Policies\BlockNegativeStockPolicy;

/**
 * StockPolicyFactory
 * pt-BR: Resolve a política de baixa de estoque a partir da configuração do produto.
 * en-US: Resolves the consume policy from the product configuration.
 */
class StockPolicyFactory
{
    public static function for(Product $product): StockPolicyInterface
    {
        if ($product->allow_negative_stock) {
            return new AllowNegativeStockPolicy();
        }

        return new BlockNegativeStockPolicy();
    }
}