<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Executa as migrations para criar a tabela aeronaves
     */
    public function up(): void
    {
        Schema::create('aeronaves', function (Blueprint $table) {
            // Chave primária
            $table->increments('id');

            // Campos principais (baseados no SQL fornecido)
            $table->string('nome', 300);
            $table->string('codigo', 12)->nullable();
            // Tipo da aeronave (ex.: monomotor, bimotor, etc.)
            $table->string('tipo')->nullable();
            // Estrutura de pacotes em JSON para armazenar preços, moedas e limites
            $table->json('pacotes')->nullable();
            // Autor como texto para suportar IDs longos ou valores não numéricos
            $table->text('autor')->nullable();
            $table->text('token')->nullable();
            $table->enum('ativo', ['n','s'])->default('s');
            $table->enum('publicar', ['n','s'])->default('n');
            $table->longText('ficha')->nullable();
            $table->text('url')->nullable();
            $table->text('meta_descricao')->nullable();
            $table->longText('obs')->nullable();
            // Configurações gerais (combustível, prefixos, etc.)
            $table->json('config')->nullable();
            // Valor por hora de rescisão (normalizado para decimal)
            $table->decimal('hora_rescisao', 12, 2)->nullable();
            $table->integer('ordenar');
            $table->enum('excluido', ['n','s'])->default('n');
            $table->text('excluido_por')->nullable();
            $table->enum('deletado', ['n','s'])->default('n');
            $table->text('deletado_por')->nullable();
            $table->longText('descricao')->nullable();
            $table->text('reg_excluido')->nullable();
            $table->text('reg_deletado')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverte as migrations
     */
    public function down(): void
    {
        Schema::dropIfExists('aeronaves');
    }
};
