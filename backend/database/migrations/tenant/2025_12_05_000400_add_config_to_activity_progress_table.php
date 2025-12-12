<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Adiciona coluna JSON 'config' à tabela 'activity_progress' para metadados.
     * EN: Add JSON 'config' column to 'activity_progress' table for metadata.
     */
    public function up(): void
    {
        Schema::table('activity_progress', function (Blueprint $table) {
            $table->json('config')->nullable()->after('seconds');
        });
    }

    /**
     * Remove a coluna 'config'.
     * EN: Drop the 'config' column.
     */
    public function down(): void
    {
        Schema::table('activity_progress', function (Blueprint $table) {
            $table->dropColumn('config');
        });
    }
};