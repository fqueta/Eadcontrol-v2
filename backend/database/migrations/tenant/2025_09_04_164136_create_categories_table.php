<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100); // Nome da categoria (obrigatório, max 100 caracteres)
            $table->string('description', 500)->nullable(); // Descrição da categoria (opcional, max 500 caracteres)
            $table->unsignedBigInteger('parent_id')->nullable(); // ID da categoria pai (opcional)
            $table->boolean('active')->default(true); // Status ativo da categoria (padrão true)
            $table->string('token')->nullable();
            $table->json('config')->nullable();
            $table->enum('excluido',['n','s'])->default('n');
            $table->text('reg_excluido')->nullable();
            $table->enum('deletado',['n','s'])->default('n');
            $table->text('reg_deletado')->nullable();
            $table->timestamps(); // created_at e updated_at
            // Índices para melhor performance
            $table->index('parent_id');
            $table->index('active');
            $table->index(['active', 'parent_id']);

            // Chave estrangeira para parent_id
            $table->foreign('parent_id')->references('id')->on('categories')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
