<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Up
     * pt-BR: Altera a coluna user_id em comments para VARCHAR(36) (UUID).
     * en-US: Change comments.user_id column to VARCHAR(36) to store UUIDs.
     */
    public function up(): void
    {
        // Remover índice (se existir) para evitar conflitos na alteração de tipo
        try { DB::statement('ALTER TABLE `comments` DROP INDEX `comments_user_id_index`'); } catch (\Throwable $e) {}

        // Alterar o tipo da coluna para VARCHAR(36)
        DB::statement('ALTER TABLE `comments` MODIFY `user_id` VARCHAR(36) NOT NULL');

        // Recriar índice
        Schema::table('comments', function ($table) {
            $table->index('user_id');
        });
    }

    /**
     * Down
     * pt-BR: Reverte o tipo para BIGINT UNSIGNED (cuidado: pode falhar se houver valores não numéricos).
     * en-US: Revert type to BIGINT UNSIGNED (warning: may fail if non-numeric values exist).
     */
    public function down(): void
    {
        try { DB::statement('ALTER TABLE `comments` DROP INDEX `comments_user_id_index`'); } catch (\Throwable $e) {}
        DB::statement('ALTER TABLE `comments` MODIFY `user_id` BIGINT UNSIGNED NOT NULL');
        Schema::table('comments', function ($table) {
            $table->index('user_id');
        });
    }
};