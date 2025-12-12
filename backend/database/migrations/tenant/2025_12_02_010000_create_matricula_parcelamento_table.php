<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cria a tabela pivot para vincular matrículas a parcelamentos do curso.
     * Create pivot table to link enrollments to course-linked installment plans.
     */
    public function up(): void
    {
        // Corrige estados inconsistentes: se existir, dropa antes de criar
        Schema::dropIfExists('matricula_parcelamento');
        Schema::create('matricula_parcelamento', function (Blueprint $table) {
            $table->unsignedBigInteger('matricula_id');
            $table->unsignedInteger('parcelamento_id');
            $table->timestamps();

            $table->primary(['matricula_id', 'parcelamento_id']);

            $table->foreign('matricula_id')
                ->references('id')->on('matriculas')
                ->onDelete('cascade');

            $table->foreign('parcelamento_id')
                ->references('id')->on('parcelamentos')
                ->onDelete('cascade');
        });
    }

    /**
     * Remove a tabela pivot.
     * Drop the pivot table.
     */
    public function down(): void
    {
        Schema::dropIfExists('matricula_parcelamento');
    }
};