<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Cria a tabela 'cursos' completa (payload + lixeira).
     * Create 'cursos' table including payload fields and trash flags.
     */
    public function up(): void
    {
        Schema::create('cursos', function (Blueprint $table) {
            // Identificação básica
            $table->increments('id');
            $table->string('nome', 300);
            $table->string('titulo', 300)->nullable();

            // Flags principais
            $table->enum('ativo', ['n','s'])->default('n');
            $table->enum('destaque', ['n','s'])->default('n');
            $table->enum('publicar', ['n','s'])->default('n');

            // Metadados de curso
            $table->integer('duracao')->default(0);
            $table->string('unidade_duracao', 20)->nullable();
            $table->string('tipo', 20)->nullable();
            $table->string('categoria', 100)->nullable();

            // Identificadores e autoria
            $table->text('token')->nullable();
            $table->text('autor')->nullable();

            // Configurações gerais
            $table->json('config')->nullable();

            // Valores financeiros
            $table->decimal('inscricao', 12, 2)->nullable();
            $table->decimal('valor', 12, 2)->nullable();
            $table->integer('parcelas')->default(1);
            $table->decimal('valor_parcela', 12, 2)->nullable();

            // Payload avançado
            $table->string('campo_id', 50)->nullable();
            $table->string('campo_bus', 100)->nullable();
            $table->json('aeronaves')->nullable();
            $table->json('modulos')->nullable();

            // Lixeira (soft delete customizado)
            $table->enum('excluido', ['n','s'])->default('n');
            $table->enum('deletado', ['n','s'])->default('n');
            $table->text('excluido_por')->nullable();
            $table->text('deletado_por')->nullable();
            $table->json('reg_excluido')->nullable();
            $table->json('reg_deletado')->nullable();

            // Timestamps
            $table->timestamps();
        });
    }

    /**
     * Remove a tabela 'cursos'.
     * Drop 'cursos' table (rollback).
     */
    public function down(): void
    {
        Schema::dropIfExists('cursos');
    }
};