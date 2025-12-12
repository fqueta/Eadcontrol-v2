<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adiciona a coluna 'order' à tabela de funis para suportar reordenação.
     */
    public function up(): void
    {
        Schema::table('funnels', function (Blueprint $table) {
            // Coluna de ordenação (inteiro). Começa com 0 por padrão.
            $table->integer('order')->default(0)->after('isActive');
        });
    }

    /**
     * Remove a coluna 'order' em caso de rollback.
     */
    public function down(): void
    {
        Schema::table('funnels', function (Blueprint $table) {
            $table->dropColumn('order');
        });
    }
};