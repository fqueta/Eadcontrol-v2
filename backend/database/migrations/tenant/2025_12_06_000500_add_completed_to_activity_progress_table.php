<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Adiciona coluna booleana 'completed' na tabela 'activity_progress'.
     * EN: Adds boolean 'completed' column to 'activity_progress' table.
     */
    public function up(): void
    {
        Schema::table('activity_progress', function (Blueprint $table) {
            $table->boolean('completed')->default(false);
        });
    }

    /**
     * Remove a coluna 'completed' da tabela 'activity_progress'.
     * EN: Drops 'completed' column from 'activity_progress' table.
     */
    public function down(): void
    {
        Schema::table('activity_progress', function (Blueprint $table) {
            $table->dropColumn('completed');
        });
    }
};