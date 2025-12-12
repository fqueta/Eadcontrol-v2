<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Cria a tabela 'activity_progress' para salvar posição de vídeo por atividade e matrícula.
     * EN: Creates 'activity_progress' table to store video position per activity and enrollment.
     */
    public function up(): void
    {
        Schema::create('activity_progress', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('activity_id');
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('id_matricula');
            $table->unsignedBigInteger('module_id')->nullable();
            $table->unsignedInteger('seconds')->default(0);
            $table->timestamps();

            // Índices e unicidade para evitar duplicidades por atividade+matricula
            $table->unique(['activity_id', 'id_matricula']);
            $table->index(['course_id', 'module_id']);
        });
    }

    /**
     * Remove a tabela 'activity_progress'.
     * EN: Drops 'activity_progress' table.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_progress');
    }
};