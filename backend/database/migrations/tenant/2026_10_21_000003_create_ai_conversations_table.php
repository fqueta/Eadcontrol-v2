<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Conversas do inbox de atendimento (WhatsApp Web style).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ai_conversations')) {
            return;
        }

        Schema::create('ai_conversations', function (Blueprint $table) {
            $table->id();
            $table->string('public_code', 12)->unique()
                ->comment('Código curto usado no link único do atendimento');
            $table->unsignedBigInteger('ai_agent_id')->nullable();
            $table->unsignedBigInteger('whatsapp_instance_id');
            $table->string('contact_phone', 40)
                ->comment('Número do contato ou LID quando não há telefone');
            $table->string('contact_lid', 60)->nullable();
            $table->string('contact_name', 180)->nullable();
            $table->string('status', 30)->default('active')
                ->comment('active | closed | transferred');
            $table->uuid('transferred_to')->nullable()
                ->comment('Usuário que assumiu o atendimento');
            $table->json('metadata')->nullable()
                ->comment('ai_paused, is_group, push_name, etc.');
            $table->timestamp('last_message_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->foreign('ai_agent_id')
                ->references('id')->on('ai_agents')
                ->onDelete('set null');
            $table->foreign('whatsapp_instance_id')
                ->references('id')->on('whatsapp_instances')
                ->onDelete('cascade');
            $table->foreign('transferred_to')
                ->references('id')->on('users')
                ->onDelete('set null');

            $table->index(['whatsapp_instance_id', 'contact_phone']);
            $table->index(['status']);
            $table->index(['last_message_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_conversations');
    }
};
