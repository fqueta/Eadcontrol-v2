<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cria a tabela 'matriculameta' com os campos conforme a imagem.
     * Create 'matriculameta' table with fields based on provided schema.
     */
    public function up(): void
    {
        Schema::create('matriculameta', function (Blueprint $table) {
            // Chave primária
            $table->id();

            // ID da matrícula relacionada (bigint, nulo permitido)
            $table->unsignedBigInteger('matricula_id')->nullable()->index();

            // Chave e valor de metadados
            $table->text('meta_key')->nullable();
            $table->longText('meta_value')->nullable();

            // Timestamps com valores padrão current_timestamp
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            // Opcional: FK para manter integridade referencial
            $table->foreign('matricula_id')
                ->references('id')
                ->on('matriculas')
                ->onDelete('cascade');
        });
    }

    /**
     * Remove a tabela 'matriculameta'.
     * Drop 'matriculameta' table on rollback.
     */
    public function down(): void
    {
        Schema::dropIfExists('matriculameta');
    }
};