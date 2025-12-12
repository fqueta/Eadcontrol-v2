<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Atualiza o tipo da coluna id_responsavel para aceitar UUID/string.
     * EN: Update id_responsavel column type to accept UUID/string.
     */
    public function up(): void
    {
        Schema::table('matriculas', function (Blueprint $table) {
            // Altera de integer para text para suportar UUID (36 chars com hífens)
            $table->text('id_responsavel')->nullable()->change();
        });
    }

    /**
     * Reverte a alteração do tipo da coluna id_responsavel.
     * EN: Revert id_responsavel column type change.
     */
    public function down(): void
    {
        Schema::table('matriculas', function (Blueprint $table) {
            $table->integer('id_responsavel')->nullable()->change();
        });
    }
};