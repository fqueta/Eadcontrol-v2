<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agentes de atendimento (IA) do WhatsApp.
 * Um agente pode estar vinculado a uma instância (ou ficar global no tenant).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ai_agents')) {
            return;
        }

        Schema::create('ai_agents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('whatsapp_instance_id')->nullable();
            $table->string('name', 120);
            $table->string('llm_provider', 30)->default('openai')
                ->comment('openai | deepseek | gemini | claude');
            $table->string('llm_model', 100)->default('gpt-4o-mini');
            $table->text('system_prompt')->nullable()
                ->comment('Persona e regras de atendimento');
            $table->text('welcome_message')->nullable()
                ->comment('Primeira mensagem enviada ao contato');
            $table->boolean('is_active')->default(false);
            $table->decimal('temperature', 3, 2)->default(0.70);
            $table->unsignedSmallInteger('max_tokens')->default(600);
            $table->json('settings')->nullable()
                ->comment('Horário, palavras de transferência, catálogo, etc.');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('whatsapp_instance_id')
                ->references('id')->on('whatsapp_instances')
                ->onDelete('set null');

            $table->index(['is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_agents');
    }
};
