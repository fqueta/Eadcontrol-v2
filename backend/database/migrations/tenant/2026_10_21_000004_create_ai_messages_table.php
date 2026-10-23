<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Histórico de mensagens das conversas (inbound, outbound e IA).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ai_messages')) {
            return;
        }

        Schema::create('ai_messages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('ai_conversation_id');
            $table->string('role', 30)->default('user')
                ->comment('user | assistant | system | human_agent');
            $table->text('content')->nullable();
            $table->unsignedInteger('tokens_used')->default(0);
            $table->json('metadata')->nullable()
                ->comment('provider, model, media, latência, erro de envio, etc.');
            $table->timestamps();

            $table->foreign('ai_conversation_id')
                ->references('id')->on('ai_conversations')
                ->onDelete('cascade');

            $table->index(['ai_conversation_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_messages');
    }
};
