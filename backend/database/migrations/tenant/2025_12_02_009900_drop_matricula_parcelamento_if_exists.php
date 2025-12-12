<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Dropa a tabela pivot antiga se existir (corrige estado inconsistente).
     * EN: Drop legacy/inconsistent pivot table if present.
     */
    public function up(): void
    {
        if (Schema::hasTable('matricula_parcelamento')) {
            Schema::drop('matricula_parcelamento');
        }
    }

    /**
     * Sem ação de rollback — tabela será recriada pela migration seguinte.
     */
    public function down(): void
    {
        // no-op
    }
};