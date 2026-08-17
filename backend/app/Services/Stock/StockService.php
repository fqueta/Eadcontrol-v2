<?php

namespace App\Services\Stock;

use App\Models\Product;
use App\Models\ServiceOrder;
use App\Models\StockEntry;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;

/**
 * StockService
 * pt-BR: Núcleo do controle de estoque (auxílio logístico). O saldo de cada
 * produto é sempre derivado do livro de movimentações. `comment_count` do post
 * é mantido como cache denormalizado para compatibilidade com as telas atuais.
 */
class StockService
{
    /**
     * Calcula saldo, custo médio e custo total de um produto a partir do livro de movimentações.
     *
     * @param Product|int $product
     * @return array{balance: int, average_cost: float, total_cost: float}
     */
    public function balanceFor($product): array
    {
        $productId = $product instanceof Product ? $product->ID : (int) $product;

        $movements = StockMovement::where('product_id', $productId)
            ->orderBy('id')
            ->get(['type', 'quantity', 'unit_cost']);

        $balance = 0;
        $averageCost = 0.0;
        $accumulated = 0.0;

        foreach ($movements as $movement) {
            $qty = (int) $movement->quantity;

            if ($movement->type === 'entrada') {
                $unitCost = (float) ($movement->unit_cost ?? 0);
                $totalValue = $balance * $averageCost + $qty * $unitCost;
                $accumulated = $balance + $qty;
                $averageCost = $accumulated > 0 ? $totalValue / $accumulated : 0.0;
                $balance += $qty;
                continue;
            }

            // saída
            $balance -= $qty;
        }

        return [
            'balance' => $balance,
            'average_cost' => round($accumulated > 0 ? $averageCost : 0.0, 2),
            'total_cost' => round($balance * $averageCost, 2),
        ];
    }

    /**
     * Sincroniza o saldo calculado para o campo denormalizado do produto.
     */
    public function syncStock(Product $product): void
    {
        $balance = $this->balanceFor($product)['balance'];
        $product->timestamps = false;
        $product->update(['comment_count' => (int) $balance]);
        $product->timestamps = true;
    }

    /**
     * Se o produto passou a rastrear estoque mas ainda não tem movimentações,
     * gera o lançamento "inicial" com o saldo já existente no cadastro.
     */
    public function ensureInitialStock(Product $product): void
    {
        if (!$product->track_stock) {
            return;
        }

        $hasMovements = StockMovement::where('product_id', $product->ID)->exists();
        $current = (int) $product->comment_count;

        if (!$hasMovements && $current > 0) {
            $this->addMovement([
                'product_id' => $product->ID,
                'type' => 'entrada',
                'quantity' => $current,
                'unit_cost' => (float) $product->cost_price,
                'reason' => 'Estoque inicial (produto criado sem livro de estoque)',
            ]);
            $this->syncStock($product);
        }
    }

    /**
     * Adiciona uma movimentação de estoque e sincroniza o saldo do produto.
     */
    public function addMovement(array $data): StockMovement
    {
        $data['quantity'] = max(0, (int) ($data['quantity'] ?? 0));

        return DB::transaction(function () use ($data) {
            $movement = StockMovement::create($data);
            $product = Product::find($data['product_id']);
            if ($product && $product->track_stock) {
                $this->syncStock($product);
            }

            return $movement;
        });
    }

    /**
     * Valida se uma ordem poderia ser concluída sem estourar o estoque.
     *
     * @return array{ok: bool, missing: array<int, array{product_id: int, name: string, available: int, needed: int}>}
     */
    public function checkOrder(ServiceOrder $order): array
    {
        $missing = [];

        foreach ($order->products()->get() as $item) {
            $product = Product::find($item->item_id);
            if (!$product || !$product->track_stock) {
                continue;
            }

            $needed = (int) ($item->quantity ?? 0);
            if ($needed <= 0) {
                continue;
            }

            $balance = $this->balanceFor($product)['balance'];
            $policy = StockPolicyFactory::for($product);

            if (!$policy->canConsume($product, $needed, $balance)) {
                $missing[] = [
                    'product_id' => (int) $product->ID,
                    'name' => $product->name,
                    'available' => $balance,
                    'needed' => $needed,
                ];
            }
        }

        return ['ok' => empty($missing), 'missing' => $missing];
    }

    /**
     * Consome o estoque dos produtos de uma ordem de serviço (ao concluir).
     * Executa em transação própria; lança exceção se houver produto bloqueante com saldo insuficiente.
     *
     * @throws \RuntimeException
     */
    public function consumeFromOrder(ServiceOrder $order): void
    {
        // Guarda contra baixa duplicada (mesma ordem já consumiu o estoque).
        $alreadyConsumed = StockMovement::where('service_order_id', $order->id)->exists();
        if ($alreadyConsumed) {
            return;
        }

        $check = $this->checkOrder($order);
        if (!$check['ok']) {
            $labels = collect($check['missing'])->map(
                fn ($m) => "{$m['name']} (disponível: {$m['available']}, necessário: {$m['needed']})"
            )->implode(', ');

            throw new \RuntimeException("Estoque insuficiente: {$labels}");
        }

        DB::transaction(function () use ($order) {
            foreach ($order->products()->get() as $item) {
                $product = Product::find($item->item_id);
                if (!$product || !$product->track_stock) {
                    continue;
                }

                $averageCost = $this->balanceFor($product)['average_cost'];

                StockMovement::create([
                    'stock_entry_id' => null,
                    'product_id' => (int) $product->ID,
                    'type' => 'saida',
                    'quantity' => (int) ($item->quantity ?? 0),
                    'unit_cost' => $averageCost,
                    'unit_price' => (float) ($item->unit_price ?? $product->sale_price ?? 0),
                    'total_cost' => round($averageCost * (int) ($item->quantity ?? 0), 2),
                    'service_order_id' => (int) $order->id,
                    'reason' => 'Consumo por ordem de serviço #' . $order->id,
                ]);

                $this->syncStock($product);
            }
        });
    }

    /**
     * Cria um lançamento (nota interna) com suas linhas de movimentação.
     * Retorna o lançamento criado. Lança exceção em caso de saída sem saldo bloqueada.
     *
     * @param array $header {type, supplier_name, document_number, document_type, movement_date, notes, created_by}
     * @param array<int,array{product_id:int,quantity:int,unit_cost:float,unit_price:float}> $lines
     * @throws \RuntimeException
     */
    public function processEntry(array $header, array $lines): StockEntry
    {
        return DB::transaction(function () use ($header, $lines) {
            $movementDate = $header['movement_date'] ?? now()->toDateString();

            $entry = StockEntry::create([
                'type' => $header['type'] ?? 'entrada',
                'supplier_name' => $header['supplier_name'] ?? null,
                'document_number' => $header['document_number'] ?? null,
                'document_type' => $header['document_type'] ?? null,
                'movement_date' => $movementDate,
                'total_amount' => 0,
                'status' => 'processada',
                'notes' => $header['notes'] ?? null,
                'created_by' => $header['created_by'] ?? null,
                'config' => $header['config'] ?? null,
            ]);

            $total = 0.0;
            $isEntrada = in_array($entry->type, ['inicial', 'entrada'], true);

            foreach ($lines as $line) {
                $product = Product::find($line['product_id']);
                if (!$product) {
                    throw new \RuntimeException('Produto não encontrado (ID ' . $line['product_id'] . ')');
                }

                $qty = max(0, (int) ($line['quantity'] ?? 0));
                if ($qty <= 0) {
                    continue;
                }

                // Lançamentos de ajuste permitem definir a direção da linha
                if ($entry->type === 'ajuste') {
                    $movementType = ($line['line_type'] ?? 'entrada') === 'saida' ? 'saida' : 'entrada';
                    $isEntrada = $movementType === 'entrada';
                } else {
                    $movementType = $isEntrada ? 'entrada' : 'saida';
                }

                $balance = $this->balanceFor($product)['balance'];

                if ($isEntrada) {
                    $unitCost = (float) ($line['unit_cost'] ?? $product->cost_price ?? 0);
                } else {
                    $unitCost = $this->balanceFor($product)['average_cost'];
                    $policy = StockPolicyFactory::for($product);
                    if ($product->track_stock && !$policy->canConsume($product, $qty, $balance)) {
                        throw new \RuntimeException(
                            "Estoque insuficiente para {$product->name} (disponível: {$balance}, necessário: {$qty})"
                        );
                    }
                }

                $total += $unitCost * $qty;

                StockMovement::create([
                    'stock_entry_id' => $entry->id,
                    'product_id' => (int) $product->ID,
                    'type' => $movementType,
                    'quantity' => $qty,
                    'unit_cost' => round($unitCost, 2),
                    'unit_price' => $line['unit_price'] ?? null,
                    'total_cost' => round($unitCost * $qty, 2),
                    'reason' => $line['reason'] ?? null,
                ]);

                if ($product->track_stock) {
                    $this->syncStock($product);
                }
            }

            $entry->update(['total_amount' => round($total, 2)]);

            return $entry;
        });
    }

    /**
     * Cancela um lançamento revertendo as movimentações (espelho inverso).
     */
    public function reverseEntry(StockEntry $entry): void
    {
        DB::transaction(function () use ($entry) {
            foreach ($entry->movements as $movement) {
                StockMovement::create([
                    'stock_entry_id' => $entry->id,
                    'product_id' => (int) $movement->product_id,
                    'type' => $movement->type === 'entrada' ? 'saida' : 'entrada',
                    'quantity' => (int) $movement->quantity,
                    'unit_cost' => $movement->unit_cost,
                    'unit_price' => $movement->unit_price,
                    'total_cost' => $movement->total_cost,
                    'reason' => ($movement->reason ?? '') . ' | Estorno do lançamento #' . $entry->id,
                ]);

                $product = Product::find($movement->product_id);
                if ($product && $product->track_stock) {
                    $this->syncStock($product);
                }
            }

            $entry->update(['status' => 'cancelada']);
        });
    }

    /**
     * Resumo de estoque por produto (saldo, custo médio, custo total, alerta).
     *
     * @return array<int,array{product_id:int,name:string,balance:int,average_cost:float,total_cost:float,stock_min:int,low:bool}>
     */
    public function summary(): array
    {
        $products = Product::with('category')->get();

        return $products->map(function (Product $product) {
            $balance = $this->balanceFor($product);

            return [
                'product_id' => (int) $product->ID,
                'name' => $product->name,
                'sale_price' => (float) $product->sale_price,
                'unit' => $product->unit,
                'track_stock' => $product->track_stock,
                'stock_min' => $product->stock_min,
                'balance' => $balance['balance'],
                'average_cost' => $balance['average_cost'],
                'total_cost' => $balance['total_cost'],
                'low' => $product->track_stock && $balance['balance'] <= $product->stock_min,
                'id' => (int) $product->ID,
            ];
        })->values()->all();
    }
}