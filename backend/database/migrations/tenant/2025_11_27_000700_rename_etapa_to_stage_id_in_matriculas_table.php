<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Renomeia a coluna 'etapa' para 'stage_id' na tabela 'matriculas' sem depender de DBAL.
     * Copia os dados de 'etapa' para a nova coluna e remove a antiga.
     */
    public function up(): void
    {
        Schema::table('matriculas', function (Blueprint $table) {
            if (!Schema::hasColumn('matriculas', 'stage_id')) {
                $table->integer('stage_id')->nullable()->after('config');
            }
        });

        // Copiar valores existentes de 'etapa' para 'stage_id' (quando ambas existirem)
        if (Schema::hasColumn('matriculas', 'etapa') && Schema::hasColumn('matriculas', 'stage_id')) {
            DB::statement('UPDATE matriculas SET stage_id = etapa WHERE stage_id IS NULL');
        }

        // Remover a coluna antiga 'etapa' se existir
        Schema::table('matriculas', function (Blueprint $table) {
            if (Schema::hasColumn('matriculas', 'etapa')) {
                $table->dropColumn('etapa');
            }
        });
    }

    /**
     * Restaura a coluna 'etapa' a partir de 'stage_id' em rollback.
     * Recria 'etapa', copia os dados e remove 'stage_id'.
     */
    public function down(): void
    {
        Schema::table('matriculas', function (Blueprint $table) {
            if (!Schema::hasColumn('matriculas', 'etapa')) {
                $table->integer('etapa')->nullable()->after('config');
            }
        });

        if (Schema::hasColumn('matriculas', 'etapa') && Schema::hasColumn('matriculas', 'stage_id')) {
            DB::statement('UPDATE matriculas SET etapa = stage_id WHERE etapa IS NULL');
        }

        Schema::table('matriculas', function (Blueprint $table) {
            if (Schema::hasColumn('matriculas', 'stage_id')) {
                $table->dropColumn('stage_id');
            }
        });
    }
};