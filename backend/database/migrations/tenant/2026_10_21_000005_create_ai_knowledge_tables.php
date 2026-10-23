<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Base de conhecimento do agente (RAG).
 * `ai_knowledge_bases` guarda o corpus bruto; `ai_knowledge_chunks`
 * guarda os pedaços vetorizados usados na busca semântica.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('ai_knowledge_bases')) {
            Schema::create('ai_knowledge_bases', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ai_agent_id');
                $table->string('name', 150);
                $table->string('type', 30)->default('text')
                    ->comment('text | faq | catalog | url');
                $table->longText('content')->nullable();
                $table->json('metadata')->nullable();
                $table->boolean('is_active')->default(true);
                $table->string('embeddings_status', 20)->default('pending')
                    ->comment('pending | processing | completed | failed');
                $table->text('embeddings_error')->nullable();
                $table->timestamp('last_synced_at')->nullable();
                $table->timestamps();

                $table->foreign('ai_agent_id')
                    ->references('id')->on('ai_agents')
                    ->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('ai_knowledge_chunks')) {
            Schema::create('ai_knowledge_chunks', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ai_knowledge_base_id');
                $table->text('content');
                $table->longText('embedding')->nullable()
                    ->comment('Vetor JSON (ex.: text-embedding-3-small, 1536 dims)');
                $table->json('metadata')->nullable();
                $table->unsignedSmallInteger('token_count')->default(0);
                $table->unsignedInteger('chunk_index')->default(0);
                $table->timestamps();

                $table->foreign('ai_knowledge_base_id')
                    ->references('id')->on('ai_knowledge_bases')
                    ->onDelete('cascade');

                $table->index(['ai_knowledge_base_id', 'chunk_index']);
            });

            // Busca por palavra-chave (fallback quando não há embeddings).
            try {
                Schema::table('ai_knowledge_chunks', function (Blueprint $table) {
                    $table->fullText('content');
                });
            } catch (\Throwable $e) {
                // Storage engine sem suporte a FULLTEXT (ex.: SQLite em testes).
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_knowledge_chunks');
        Schema::dropIfExists('ai_knowledge_bases');
    }
};
