<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('service_order_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('service_order_id'); // ID da ordem de serviço
            $table->enum('item_type', ['product', 'service']); // Tipo do item: produto ou serviço
            $table->unsignedBigInteger('item_id'); // ID do produto ou serviço
            $table->integer('quantity')->default(1); // Quantidade
            $table->decimal('unit_price', 10, 2); // Preço unitário
            $table->decimal('total_price', 10, 2); // Preço total (quantity * unit_price)
            $table->text('notes')->nullable(); // Notas específicas do item
            $table->timestamps();
            $table->softDeletes();
            
            // Chave estrangeira
            $table->foreign('service_order_id')->references('id')->on('service_orders')->onDelete('cascade');
            
            // Índices para melhor performance
            $table->index(['service_order_id']);
            $table->index(['item_type', 'item_id']);
            $table->index(['item_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('service_order_items');
    }
};