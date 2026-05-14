<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Cria a tabela 'cupons' para gerenciamento de cupons de desconto.
     * Create 'cupons' table for discount coupon management.
     */
    public function up(): void
    {
        Schema::create('cupons', function (Blueprint $table) {
            $table->increments('id');
            $table->string('codigo', 50)->unique();
            $table->enum('tipo', ['percentual', 'fixo'])->default('percentual');
            $table->decimal('valor_desconto', 12, 2);
            $table->dateTime('validade_inicio')->nullable();
            $table->dateTime('validade_fim')->nullable();
            $table->integer('limite_uso')->nullable();
            $table->integer('usos')->default(0);
            $table->decimal('valor_minimo', 12, 2)->nullable();
            $table->enum('ativo', ['s', 'n'])->default('s');
            $table->text('descricao')->nullable();
            $table->string('cursos_ids', 500)->nullable();

            $table->enum('excluido', ['n', 's'])->default('n');
            $table->enum('deletado', ['n', 's'])->default('n');
            $table->text('excluido_por')->nullable();
            $table->text('deletado_por')->nullable();
            $table->json('reg_excluido')->nullable();
            $table->json('reg_deletado')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cupons');
    }
};
