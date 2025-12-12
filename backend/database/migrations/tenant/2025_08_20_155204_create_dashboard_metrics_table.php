<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('dashboard_metrics', function (Blueprint $table) {
            $table->id();

            // Caso seja multiusuário (vinculado a quem cadastrou os dados)
            // $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            // $table->foreignId('user_id')->nullable();
            $table->string('user_id')->nullable();
            // Período de referência
            $table->date('period')->nullable(); // exemplo: 2025-01-01 (usaremos esse campo para ano/mês/semana)

            // KPIs principais (dados brutos)
            $table->decimal('investment', 12, 2)->nullable(); // investimento em mídia
            $table->integer('visitors')->nullable();
            $table->integer('bot_conversations')->nullable();
            $table->integer('human_conversations')->nullable();
            $table->integer('proposals')->nullable();
            $table->integer('closed_deals')->nullable();
            $table->text('campaign_id')->nullable();
            $table->json('meta')->nullable();
            $table->string('token')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dashboard_metrics');
    }
};
