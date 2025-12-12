<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Não criamos mais a VIEW `clients`. Removemos se existir para evitar dependências.
     */
    public function up(): void
    {
        DB::statement('DROP VIEW IF EXISTS `clients`');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Nenhuma operação necessária
    }
};
