<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Adiciona coluna enum 'ativo' à tabela 'matriculas'.
     * EN: Adds enum column 'ativo' to the 'matriculas' table.
     */
    public function up(): void
    {
        Schema::table('matriculas', function (Blueprint $table) {
            // 'ativo': 's' (sim/ativo) ou 'n' (não/inativo), padrão 's'
            $table->enum('ativo', ['s','n'])->default('s')->after('status');
            // Opcional: índice ajuda em filtros por ativo
            $table->index('ativo');
        });
    }

    /**
     * Remove a coluna 'ativo' da tabela 'matriculas'.
     * EN: Drops 'ativo' column from the 'matriculas' table.
     */
    public function down(): void
    {
        Schema::table('matriculas', function (Blueprint $table) {
            $table->dropIndex(['ativo']);
            $table->dropColumn('ativo');
        });
    }
};