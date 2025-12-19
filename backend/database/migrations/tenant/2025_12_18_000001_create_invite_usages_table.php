<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Create invite usage audit table for tenant DB.
     * pt-BR: Cria tabela de auditoria de uso de convites com referência ao post e cliente.
     * en-US: Creates audit table to track invite usage with references to post and client.
     */
    public function up(): void
    {
        if (Schema::hasTable('invite_usages')) {
            // Já existe: evitar erro ao reexecutar migrações em tenants
            return;
        }
        Schema::create('invite_usages', function (Blueprint $table) {
            $table->id();
            // Referência ao post do convite (tabela posts, PK é 'ID')
            $table->unsignedInteger('invite_post_id')->nullable()->index();
            // Cliente que utilizou o convite (users)
            // Nota: em tenants, users.id é UUID (CHAR(36)); usar string(36) para compatibilidade
            $table->string('client_id', 36)->nullable()->index();
            // Token do convite (para depuração e correlação)
            $table->string('invite_token', 100)->nullable()->index();
            // Status do uso: sucesso ou falha
            $table->enum('status', ['success', 'failed']);
            // Motivo da falha (quando aplicável): not_found, expired, limit_reached, validation_error, other
            $table->string('reason', 100)->nullable();
            // Metadados de origem
            $table->string('ip', 45)->nullable();
            $table->text('user_agent')->nullable();
            // Metadados adicionais em JSON
            $table->json('meta')->nullable();
            $table->timestamps();

            // FK opcional ao post do convite (PK é INT UNSIGNED)
            $table->foreign('invite_post_id')->references('ID')->on('posts')->cascadeOnDelete();
            // Não cria FK para client_id por diferença de tipo (UUID CHAR(36) vs VARCHAR(36)).
        });
    }

    /**
     * Drop audit table.
     */
    public function down(): void
    {
        Schema::dropIfExists('invite_usages');
    }
};