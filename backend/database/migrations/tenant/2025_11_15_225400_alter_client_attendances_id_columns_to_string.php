<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ajusta os campos de chave para suportar IDs string (UUID/ULID) em client_attendances.
     */
    public function up(): void
    {
        // Remover índices para evitar erros ao alterar tipo
        try {
            DB::statement('ALTER TABLE `client_attendances` DROP INDEX `client_attendances_client_id_index`');
        } catch (\Throwable $e) {
            // ignore se não existir
        }
        try {
            DB::statement('ALTER TABLE `client_attendances` DROP INDEX `client_attendances_attended_by_index`');
        } catch (\Throwable $e) {
            // ignore se não existir
        }

        // Alterar tipos para VARCHAR(26) (ULID)
        DB::statement('ALTER TABLE `client_attendances` MODIFY `client_id` VARCHAR(26) NOT NULL');
        DB::statement('ALTER TABLE `client_attendances` MODIFY `attended_by` VARCHAR(26) NOT NULL');

        // Recriar índices
        Schema::table('client_attendances', function ($table) {
            $table->index('client_id');
            $table->index('attended_by');
        });
    }

    /**
     * Reverte os campos para BIGINT caso necessário.
     */
    public function down(): void
    {
        try {
            DB::statement('ALTER TABLE `client_attendances` DROP INDEX `client_attendances_client_id_index`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `client_attendances` DROP INDEX `client_attendances_attended_by_index`');
        } catch (\Throwable $e) {
        }

        DB::statement('ALTER TABLE `client_attendances` MODIFY `client_id` BIGINT UNSIGNED NOT NULL');
        DB::statement('ALTER TABLE `client_attendances` MODIFY `attended_by` BIGINT UNSIGNED NOT NULL');

        Schema::table('client_attendances', function ($table) {
            $table->index('client_id');
            $table->index('attended_by');
        });
    }
};