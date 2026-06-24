<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * PT: Cria a tabela de faturas SaaS no banco central para cobrança dos tenants.
     */
    public function up(): void
    {
        Schema::create('saas_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_id')->constrained('saas_subscriptions')->onDelete('cascade');
            $table->string('tenant_id');
            $table->string('invoice_number')->unique();
            $table->decimal('amount', 10, 2);                        // Valor do plano
            $table->decimal('usage_amount', 10, 2)->default(0);      // Valor de uso extra
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('total', 10, 2);                         // amount + usage_amount - discount
            $table->date('due_date');
            $table->date('paid_at')->nullable();
            $table->decimal('paid_amount', 10, 2)->default(0);
            $table->enum('status', ['pending', 'paid', 'overdue', 'cancelled', 'refunded'])->default('pending');
            $table->string('payment_method')->nullable();            // pix, boleto, credit_card
            $table->string('gateway_payment_id')->nullable();        // ID do pagamento no Asaas
            $table->string('gateway_invoice_url')->nullable();       // URL da fatura no Asaas
            $table->string('gateway_boleto_url')->nullable();        // URL do boleto
            $table->text('gateway_pix_code')->nullable();            // Código PIX copia-e-cola
            $table->string('gateway_pix_qrcode_url')->nullable();    // URL da imagem QR Code PIX
            $table->json('usage_details')->nullable();               // Detalhamento do uso {"students": 120, "extra_students": 20, ...}
            $table->json('config')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants');
            $table->index(['tenant_id', 'status']);
            $table->index(['status', 'due_date']);
            $table->index('due_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('saas_invoices');
    }
};
