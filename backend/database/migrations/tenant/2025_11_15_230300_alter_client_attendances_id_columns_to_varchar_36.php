<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Upgrades client_attendances foreign key fields to VARCHAR(36) for UUIDs.
     * Atualiza os campos client_id e attended_by para VARCHAR(36) (UUID).
     */
    public function up(): void
    {
        // Drop indexes if present to avoid conflicts during type change
        try { DB::statement('ALTER TABLE `client_attendances` DROP INDEX `client_attendances_client_id_index`'); } catch (\Throwable $e) {}
        try { DB::statement('ALTER TABLE `client_attendances` DROP INDEX `client_attendances_attended_by_index`'); } catch (\Throwable $e) {}

        // Widen columns to VARCHAR(36)
        DB::statement('ALTER TABLE `client_attendances` MODIFY `client_id` VARCHAR(36) NOT NULL');
        DB::statement('ALTER TABLE `client_attendances` MODIFY `attended_by` VARCHAR(36) NOT NULL');

        // Recreate indexes
        Schema::table('client_attendances', function ($table) {
            $table->index('client_id');
            $table->index('attended_by');
        });
    }

    /**
     * Reverts fields back to VARCHAR(26) (ULID) if needed.
     * Reverte para VARCHAR(26) caso necessário.
     */
    public function down(): void
    {
        try { DB::statement('ALTER TABLE `client_attendances` DROP INDEX `client_attendances_client_id_index`'); } catch (\Throwable $e) {}
        try { DB::statement('ALTER TABLE `client_attendances` DROP INDEX `client_attendances_attended_by_index`'); } catch (\Throwable $e) {}

        DB::statement('ALTER TABLE `client_attendances` MODIFY `client_id` VARCHAR(26) NOT NULL');
        DB::statement('ALTER TABLE `client_attendances` MODIFY `attended_by` VARCHAR(26) NOT NULL');

        Schema::table('client_attendances', function ($table) {
            $table->index('client_id');
            $table->index('attended_by');
        });
    }
};