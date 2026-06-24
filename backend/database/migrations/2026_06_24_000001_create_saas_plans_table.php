<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * PT: Cria a tabela de planos de assinatura SaaS no banco central.
     */
    public function up(): void
    {
        Schema::create('saas_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');                                    // "Básico", "Profissional", "Enterprise"
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->decimal('price_monthly', 10, 2)->default(0);       // Preço mensal
            $table->decimal('price_yearly', 10, 2)->nullable();        // Preço anual (desconto)
            $table->json('features')->nullable();                      // {"max_students": 100, "max_courses": 10, "max_storage_mb": 5120, ...}
            $table->json('usage_pricing')->nullable();                 // {"extra_student": 2.50, "extra_course": 15.00, ...}
            $table->json('config')->nullable();                        // Configurações extras
            $table->boolean('active')->default(true);
            $table->boolean('is_free')->default(false);                // Plano gratuito (trial/freemium)
            $table->integer('trial_days')->default(0);                 // Dias de trial para este plano
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('saas_plans');
    }
};
