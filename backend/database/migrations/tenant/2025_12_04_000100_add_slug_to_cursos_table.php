<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * PT: Adiciona a coluna 'slug' e índice à tabela 'cursos'.
     * EN: Add 'slug' column and index to 'cursos' table.
     */
    public function up(): void
    {
        if (Schema::hasTable('cursos')) {
            Schema::table('cursos', function (Blueprint $table) {
                if (!Schema::hasColumn('cursos', 'slug')) {
                    $table->string('slug', 200)->nullable()->after('titulo');
                    $table->unique('slug');
                }
                // Índice auxiliar para buscas por campo_bus (legado)
                if (Schema::hasColumn('cursos', 'campo_bus')) {
                    // Evitar erro se índice já existir
                    try {
                        $table->index('campo_bus');
                    } catch (\Throwable $e) {
                        // Ignora caso índice já exista
                    }
                }
            });
        }
    }

    /**
     * PT: Remove a coluna/índices adicionados (rollback).
     * EN: Drop added column/indexes on rollback.
     */
    public function down(): void
    {
        if (Schema::hasTable('cursos')) {
            Schema::table('cursos', function (Blueprint $table) {
                if (Schema::hasColumn('cursos', 'slug')) {
                    // Remover índice único antes de remover a coluna
                    try {
                        $table->dropUnique('cursos_slug_unique');
                    } catch (\Throwable $e) {
                        // Nome alternativo do índice em alguns bancos
                        try { $table->dropUnique(['slug']); } catch (\Throwable $e2) {}
                    }
                    $table->dropColumn('slug');
                }
                if (Schema::hasColumn('cursos', 'campo_bus')) {
                    try {
                        $table->dropIndex(['campo_bus']);
                    } catch (\Throwable $e) {
                        // Nome alternativo
                        try { $table->dropIndex('cursos_campo_bus_index'); } catch (\Throwable $e2) {}
                    }
                }
            });
        }
    }
};