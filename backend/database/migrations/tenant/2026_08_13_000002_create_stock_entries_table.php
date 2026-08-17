<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CreateStockEntriesTable
 * pt-BR: Cabeçalho dos lançamentos de estoque (auxílio logístico - não é documento fiscal).
 * en-US: Stock entries header (logistics aid - not a fiscal document).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_entries', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['inicial', 'entrada', 'saida', 'ajuste'])->default('entrada');
            $table->string('supplier_name', 255)->nullable()->comment('Fornecedor (referência)');
            $table->string('document_number', 100)->nullable()->comment('Nº de referência externa (NF do fornecedor/NFS) - não emite documento fiscal');
            $table->string('document_type', 60)->nullable()->comment('Tipo de referência (nf, recibo, outro)');
            $table->date('movement_date')->default('2000-01-01');
            $table->decimal('total_amount', 10, 2)->default(0)->comment('Total do lançamento');
            $table->enum('status', ['processada', 'cancelada'])->default('processada');
            $table->text('notes')->nullable()->comment('Observações');
            $table->string('created_by', 36)->nullable()->index()->comment('FK: users.id');
            $table->json('config')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_entries');
    }
};