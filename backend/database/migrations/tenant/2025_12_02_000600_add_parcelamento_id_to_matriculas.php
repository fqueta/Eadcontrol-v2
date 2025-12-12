<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Adiciona coluna parcelamento_id em 'matriculas' para vincular ao plano.
     */
    public function up(): void
    {
        Schema::table('matriculas', function (Blueprint $table) {
            $table->unsignedInteger('parcelamento_id')->nullable()->after('id_turma');
            $table->foreign('parcelamento_id')
                ->references('id')
                ->on('parcelamentos')
                ->onDelete('set null');
        });
    }

    /**
     * Remove a coluna parcelamento_id.
     */
    public function down(): void
    {
        Schema::table('matriculas', function (Blueprint $table) {
            $table->dropForeign(['parcelamento_id']);
            $table->dropColumn('parcelamento_id');
        });
    }
};