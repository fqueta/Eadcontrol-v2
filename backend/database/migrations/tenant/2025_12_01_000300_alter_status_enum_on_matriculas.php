<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Atualiza a coluna status para ENUM('a','g','p') com default 'a'.
     * EN: Update status column to ENUM('a','g','p') with default 'a'.
     */
    public function up(): void
    {
        try {
            Schema::table('matriculas', function (Blueprint $table) {
                $table->enum('status', ['a','g','p'])->default('a')->nullable()->change();
            });
        } catch (\Throwable $e) {
            // Fallback para bancos que exigem mudança via SQL bruto
            DB::statement("ALTER TABLE `matriculas` MODIFY `status` ENUM('a','g','p') NULL DEFAULT 'a'");
        }
    }

    /**
     * Reverte a coluna status para INTEGER nullable.
     * EN: Revert status column back to INTEGER nullable.
     */
    public function down(): void
    {
        try {
            Schema::table('matriculas', function (Blueprint $table) {
                $table->integer('status')->nullable()->change();
            });
        } catch (\Throwable $e) {
            DB::statement("ALTER TABLE `matriculas` MODIFY `status` INT NULL");
        }
    }
};