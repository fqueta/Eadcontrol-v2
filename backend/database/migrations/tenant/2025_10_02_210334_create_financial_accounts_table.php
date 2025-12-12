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
        Schema::create('financial_accounts', function (Blueprint $table) {
            $table->id();
            $table->decimal('amount', 10, 2); // Valor da conta
            $table->enum('type', ['payable', 'receivable'])->default('receivable'); // Tipo: a pagar ou a receber
            
            // Campos específicos para contas a pagar
            $table->string('supplier_name')->nullable(); // Nome do fornecedor
            $table->enum('priority', ['low', 'medium', 'high'])->default('medium'); // Prioridade
            
            // Campos específicos para contas a receber
            $table->string('customer_name', 255)->nullable(); // Nome do cliente
            $table->integer('installments')->default(1); // Número de parcelas
            $table->string('invoice_number', 100)->nullable(); // Número da fatura
            $table->string('contract_number', 100)->nullable(); // Número do contrato
            $table->decimal('discount_amount', 10, 2)->default(0); // Valor do desconto
            $table->decimal('interest_amount', 10, 2)->default(0); // Valor dos juros
            $table->decimal('paid_amount', 10, 2)->default(0); // Valor pago
            $table->date('payment_date')->nullable(); // Data do pagamento
            $table->uuid('client_id')->nullable(); // ID do cliente
            
            // Campos comuns
            $table->unsignedBigInteger('category_id')->nullable(); // ID da categoria financeira
            $table->text('description')->nullable(); // Descrição da conta
            $table->date('due_date'); // Data de vencimento
            $table->text('notes')->nullable(); // Observações
            $table->enum('payment_method', ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'pix', 'check', 'other'])->default('cash'); // Método de pagamento
            $table->enum('recurrence', ['none', 'daily', 'weekly', 'monthly', 'yearly'])->default('none'); // Recorrência
            $table->unsignedBigInteger('service_order_id')->nullable(); // ID da ordem de serviço
            $table->enum('status', ['pending', 'paid', 'overdue', 'cancelled'])->default('pending'); // Status da conta
            $table->string('token', 100)->nullable(); // Token
            $table->json('config')->nullable(); // Configurações JSON
            $table->boolean('excluido')->default(false); // Excluído
            $table->timestamp('reg_excluido')->nullable(); // Data de exclusão
            $table->boolean('deletado')->default(false); // Deletado
            $table->timestamp('reg_deletado')->nullable(); // Data de deleção
            $table->timestamps();

            // Índices para melhor performance
            $table->index('type');
            $table->index('supplier_name');
            $table->index('customer_name');
            $table->index('invoice_number');
            $table->index('contract_number');
            $table->index('priority');
            $table->index('category_id');
            $table->index('due_date');
            $table->index('status');
            $table->index('client_id');
            $table->index('payment_date');
            $table->index('service_order_id');
            $table->index('token');
            $table->index(['type', 'status']);
            $table->index(['due_date', 'status']);

            // Chaves estrangeiras
            $table->foreign('category_id')->references('id')->on('categories')->onDelete('set null');
            $table->foreign('service_order_id')->references('id')->on('service_orders')->onDelete('set null');
            $table->foreign('client_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('financial_accounts');
    }
};
