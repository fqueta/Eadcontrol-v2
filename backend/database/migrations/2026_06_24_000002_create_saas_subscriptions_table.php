<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * PT: Cria a tabela de assinaturas SaaS (vínculo tenant ↔ plano) no banco central.
     */
    public function up(): void
    {
        Schema::create('saas_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('plan_id')->constrained('saas_plans')->onDelete('restrict');
            $table->enum('billing_cycle', ['monthly', 'yearly'])->default('monthly');
            $table->enum('status', ['active', 'suspended', 'cancelled', 'trial', 'past_due'])->default('trial');
            $table->date('starts_at');
            $table->date('ends_at')->nullable();
            $table->date('trial_ends_at')->nullable();
            $table->date('next_billing_date')->nullable();
            $table->date('suspended_at')->nullable();
            $table->date('cancelled_at')->nullable();
            $table->string('cancellation_reason')->nullable();
            $table->string('gateway_subscription_id')->nullable();     // ID da assinatura no Asaas
            $table->string('gateway_customer_id')->nullable();         // ID do cliente no Asaas
            $table->json('usage_data')->nullable();                    // {"current_students": 45, "current_courses": 8, ...}
            $table->json('config')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->index(['tenant_id', 'status']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('saas_subscriptions');
    }
};
