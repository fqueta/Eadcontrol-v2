<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cupom_curso', function (Blueprint $table) {
            $table->integer('cupom_id')->unsigned();
            $table->integer('curso_id')->unsigned();

            $table->foreign('cupom_id')
                ->references('id')
                ->on('cupons')
                ->onDelete('cascade');

            $table->foreign('curso_id')
                ->references('id')
                ->on('cursos')
                ->onDelete('cascade');

            $table->primary(['cupom_id', 'curso_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cupom_curso');
    }
};
