<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Cria a tabela 'parcelamentos' para planos de pagamento de cursos.
     * Adapta ao padrão do sistema atual (lixeira customizada e timestamps padrão).
     */
    public function up(): void
    {
        Schema::create('parcelamentos', function (Blueprint $table) {
            // Identificação
            $table->increments('id');
            // Associação opcional ao curso
            $table->unsignedInteger('id_curso')->nullable()->index();
            // Metadados básicos
            $table->string('nome', 200); // Nome do plano
            $table->string('slug', 200)->nullable()->index();
            $table->enum('ativo', ['n','s'])->default('s');

            // Configurações financeiras
            $table->integer('qtd_parcelas')->default(1); // número de parcelas
            $table->decimal('valor_total', 12, 2)->nullable();
            $table->decimal('valor_parcela', 12, 2)->nullable();
            $table->decimal('entrada', 12, 2)->nullable();
            $table->decimal('desconto', 12, 2)->nullable();
            $table->decimal('juros_percent', 6, 3)->nullable(); // juros em %
            $table->string('tipo_juros', 20)->nullable(); // ex.: simples|composto
            $table->string('metodo_pagamento', 30)->nullable(); // conforme App\Enums\PaymentMethod
            $table->string('periodicidade', 20)->default('mensal'); // mensal|semanal|quinzenal

            // Janela de vigência (opcional)
            $table->date('inicio_vigencia')->nullable();
            $table->date('fim_vigencia')->nullable();

            // Observações gerais
            $table->longText('obs')->nullable();
            $table->json('config')->nullable();

            // Lixeira (soft delete customizado)
            $table->enum('excluido', ['n','s'])->default('n');
            $table->enum('deletado', ['n','s'])->default('n');
            $table->text('excluido_por')->nullable();
            $table->text('deletado_por')->nullable();
            $table->json('reg_excluido')->nullable();
            $table->json('reg_deletado')->nullable();

            // Timestamps
            $table->timestamps();

            // FK opcional para cursos (sem cascade para preservar planos independentes)
            $table->foreign('id_curso')
                ->references('id')
                ->on('cursos')
                ->onDelete('set null');
        });
    }

    /**
     * Remove a tabela 'parcelamentos'.
     */
    public function down(): void
    {
        Schema::dropIfExists('parcelamentos');
    }
};