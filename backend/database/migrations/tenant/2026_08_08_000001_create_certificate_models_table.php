<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Create certificate models table for tenant DB.
     * pt-BR: Tabela de modelos de certificado. Cada modelo pode ou não estar
     *        vinculado a uma turma (id_turma NULL = modelo padrão/global).
     * en-US: Certificate models table. Each model may optionally be bound
     *        to a class (id_turma NULL = default/global model).
     */
    public function up(): void
    {
        if (Schema::hasTable('certificate_models')) {
            return;
        }
        Schema::create('certificate_models', function (Blueprint $table) {
            $table->id();
            $table->string('name', 200)->default('Modelo de Certificado');
            $table->unsignedInteger('id_turma')->nullable()->index();
            $table->json('config')->nullable();
            $table->enum('ativo', ['s', 'n'])->default('s');
            $table->timestamps();

            $table->foreign('id_turma')->references('id')->on('turmas')->nullOnDelete();
        });
    }

    /**
     * Drop certificate models table.
     */
    public function down(): void
    {
        Schema::dropIfExists('certificate_models');
    }
};
