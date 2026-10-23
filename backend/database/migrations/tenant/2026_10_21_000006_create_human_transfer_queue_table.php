<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fila de transferência para atendimento humano.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('human_transfer_queue')) {
            return;
        }

        Schema::create('human_transfer_queue', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('ai_conversation_id');
            $table->uuid('assigned_to')->nullable();
            $table->string('status', 20)->default('pending')
                ->comment('pending | assigned | completed | cancelled');
            $table->unsignedTinyInteger('priority')->default(1)
                ->comment('1=normal, 2=alta, 3=urgente');
            $table->text('notes')->nullable();
            $table->string('transfer_reason', 180)->nullable();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->foreign('ai_conversation_id')
                ->references('id')->on('ai_conversations')
                ->onDelete('cascade');
            $table->foreign('assigned_to')
                ->references('id')->on('users')
                ->onDelete('set null');

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('human_transfer_queue');
    }
};
