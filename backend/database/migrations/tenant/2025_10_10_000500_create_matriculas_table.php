<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     * Cria a tabela 'matriculas' com os campos principais informados.
     */
    public function up(): void
    {
        Schema::create('matriculas', function (Blueprint $table) {
            $table->id();
            $table->text('id_cliente');
            $table->integer('id_curso');
            $table->integer('id_responsavel')->nullable();
            $table->integer('id_consultor')->nullable();
            $table->integer('id_turma');
            // Situação da matrícula (referência a posts.ID com post_type='situacao_matricula')
            $table->integer('situacao_id')->nullable();
            $table->longText('descricao')->nullable();
            // Status: 'a' (Atendimento), 'g' (Ganho), 'p' (Perda)
            $table->enum('status', ['a','g','p'])->default('a');
            $table->longText('config')->nullable();
            $table->json('tag')->nullable();
            $table->integer('stage_id')->nullable();
            $table->integer('funnel_id')->nullable();
            $table->decimal('desconto', 12, 2)->nullable();
            $table->decimal('combustivel', 12, 2)->nullable();
            $table->decimal('subtotal', 12, 2)->nullable();
            $table->decimal('total', 12, 2)->nullable();
            $table->longText('orc')->nullable();

            // Timestamps customizados baseados no modelo atual
            $table->timestamp('data')->nullable();
            $table->timestamp('atualizado')->nullable();
            // Soft delete (coluna deleted_at) para lixeira de matrículas
            // $table->softDeletes();
            // Lixeira (soft delete customizado)
            $table->enum('excluido', ['n','s'])->default('n');
            $table->enum('deletado', ['n','s'])->default('n');
            $table->text('excluido_por')->nullable();
            $table->text('deletado_por')->nullable();
            $table->json('reg_excluido')->nullable();
            $table->json('reg_deletado')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     * Remove a tabela 'matriculas'.
     */
    public function down(): void
    {
        Schema::dropIfExists('matriculas');
    }
};
