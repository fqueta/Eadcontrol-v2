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
        // Remove as tabelas separadas que não são mais necessárias
        Schema::dropIfExists('accounts_payable');
        Schema::dropIfExists('accounts_receivable');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recriar as tabelas caso seja necessário reverter
        Schema::create('accounts_payable', function (Blueprint $table) {
            $table->id();
            $table->decimal('amount', 10, 2);
            $table->string('supplier_name');
            $table->text('description')->nullable();
            $table->date('due_date');
            $table->date('payment_date')->nullable();
            $table->enum('status', ['pending', 'paid', 'overdue', 'cancelled'])->default('pending');
            $table->timestamps();
        });

        Schema::create('accounts_receivable', function (Blueprint $table) {
            $table->id();
            $table->decimal('amount', 10, 2);
            $table->string('customer_name');
            $table->text('description')->nullable();
            $table->date('due_date');
            $table->date('payment_date')->nullable();
            $table->enum('status', ['pending', 'paid', 'overdue', 'cancelled'])->default('pending');
            $table->timestamps();
        });
    }
};
