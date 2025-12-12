<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Adiciona campos 'descricao', 'obs' e 'professor' à tabela 'cursos'.
     * EN: Add 'descricao', 'obs' and 'professor' columns to 'cursos' table.
     */
    public function up(): void
    {
        if (Schema::hasTable('cursos')) {
            Schema::table('cursos', function (Blueprint $table) {
                if (!Schema::hasColumn('cursos', 'descricao')) {
                    $table->longText('descricao')->nullable()->after('titulo');
                }
                if (!Schema::hasColumn('cursos', 'obs')) {
                    $table->longText('obs')->nullable()->after('descricao');
                }
                if (!Schema::hasColumn('cursos', 'professor')) {
                    $table->string('professor', 255)->nullable()->after('obs');
                }
            });
        }
    }

    /**
     * Remove os campos adicionados (rollback).
     * EN: Drop added columns on rollback.
     */
    public function down(): void
    {
        if (Schema::hasTable('cursos')) {
            Schema::table('cursos', function (Blueprint $table) {
                if (Schema::hasColumn('cursos', 'professor')) {
                    $table->dropColumn('professor');
                }
                if (Schema::hasColumn('cursos', 'obs')) {
                    $table->dropColumn('obs');
                }
                if (Schema::hasColumn('cursos', 'descricao')) {
                    $table->dropColumn('descricao');
                }
            });
        }
    }
};