<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Adiciona a coluna situacao_id na tabela matriculas.
     * EN: Add situacao_id column to matriculas table.
     */
    public function up(): void
    {
        // Evita erro se a coluna já existir
        if (!Schema::hasColumn('matriculas', 'situacao_id')) {
            Schema::table('matriculas', function (Blueprint $table) {
                $table->integer('situacao_id')->nullable()->after('id_turma');
            });
        }
    }

    /**
     * Remove a coluna situacao_id da tabela matriculas.
     * EN: Drop situacao_id column from matriculas table.
     */
    public function down(): void
    {
        if (Schema::hasColumn('matriculas', 'situacao_id')) {
            Schema::table('matriculas', function (Blueprint $table) {
                $table->dropColumn('situacao_id');
            });
        }
    }
};