<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Atualiza o tipo da coluna id_consultor para aceitar UUID/string.
     * EN: Update id_consultor column type to accept UUID/string.
     */
    public function up(): void
    {
        Schema::table('matriculas', function (Blueprint $table) {
            // Altera de integer para text para suportar UUID
            $table->text('id_consultor')->nullable()->change();
        });
    }

    /**
     * Reverte a alteração do tipo da coluna id_consultor.
     * EN: Revert id_consultor column type change.
     */
    public function down(): void
    {
        Schema::table('matriculas', function (Blueprint $table) {
            $table->integer('id_consultor')->nullable()->change();
        });
    }
};