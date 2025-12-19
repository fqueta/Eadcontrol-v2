<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Adjust column types for invite_usages to match referenced tables.
     * pt-BR: Ajusta tipos de colunas para compatibilidade com FKs e UUIDs.
     */
    public function up(): void
    {
        // Ensure table exists before altering
        if (!Schema::hasTable('invite_usages')) {
            return;
        }

        // Drop FK if it exists, then adjust column types
        try { DB::statement('ALTER TABLE `invite_usages` DROP FOREIGN KEY `invite_usages_invite_post_id_foreign`'); } catch (\Throwable $e) {}

        // Modify column types
        DB::statement('ALTER TABLE `invite_usages` MODIFY `invite_post_id` INT UNSIGNED NULL');
        DB::statement('ALTER TABLE `invite_usages` MODIFY `client_id` VARCHAR(36) NULL');

        // Recreate index (safety)
        try { DB::statement('ALTER TABLE `invite_usages` ADD INDEX `invite_usages_invite_post_id_index` (`invite_post_id`)'); } catch (\Throwable $e) {}
        try { DB::statement('ALTER TABLE `invite_usages` ADD INDEX `invite_usages_client_id_index` (`client_id`)'); } catch (\Throwable $e) {}

        // Re-add FK to posts.ID
        try { DB::statement('ALTER TABLE `invite_usages` ADD CONSTRAINT `invite_usages_invite_post_id_foreign` FOREIGN KEY (`invite_post_id`) REFERENCES `posts`(`ID`) ON DELETE CASCADE'); } catch (\Throwable $e) {}
    }

    /**
     * Optional down: no-op or revert type changes.
     */
    public function down(): void
    {
        // No-op: reverting types is not strictly necessary.
    }
};