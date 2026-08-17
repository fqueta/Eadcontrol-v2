<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CreateStockMovementsTable
 * pt-BR: Linhas de movimentação de estoque (livro auxiliar - auxílio logístico).
 * en-US: Stock movement lines (auxiliary ledger - logistics aid).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('stock_entry_id')->nullable()->index()->comment('FK: stock_entries.id');
            $table->unsignedBigInteger('product_id')->index()->comment('FK: posts.ID (produto)');
            $table->enum('type', ['entrada', 'saida'])->comment('entrada = +saldo, saida = -saldo');
            $table->integer('quantity')->comment('Quantidade (sempre positiva; o sinal vem do tipo)');
            $table->decimal('unit_cost', 10, 2)->nullable()->comment('Custo unitário (entrada)');
            $table->decimal('unit_price', 10, 2)->nullable()->comment('Preço de venda unitário (saída)');
            $table->decimal('total_cost', 10, 2)->nullable()->comment('Custo total da linha');
            $table->unsignedBigInteger('service_order_id')->nullable()->index()->comment('FK: service_orders.id (origem da saída)');
            $table->unsignedBigInteger('appointment_id')->nullable()->index()->comment('FK: appointments.id (origem da saída)');
            $table->string('reason', 255)->nullable()->comment('Motivo/observação da movimentação');
            $table->string('created_by', 36)->nullable()->index()->comment('FK: users.id');
            $table->timestamps();

            $table->index(['product_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};