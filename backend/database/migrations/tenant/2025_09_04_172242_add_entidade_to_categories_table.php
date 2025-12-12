<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->enum('entidade', ['servicos', 'produtos', 'financeiro', 'outros'])
                  ->default('outros')
                  ->after('active')
                  ->comment('Tipo de entidade da categoria: servicos, produtos, financeiro, outros');
            // Adicionar índice para otimizar consultas por entidade
            $table->index(['entidade', 'active']);

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropIndex(['entidade', 'active']);
            $table->dropColumn('entidade');
        });
    }
};
