<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Give excluido/deletado an explicit default 'n'.

     * Em MySQL não-estrito o default implícito de ENUM é o primeiro valor,
     * por isso OS criadas via ServiceOrderController (que não informa esses
     * campos) resultam em 'n'. Em MySQL estrito (dev), a ausência de default
     * dispara erro 1364. Este default explícito reproduz o comportamento de
     * produção nos dois modos de sql_mode.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE service_orders MODIFY COLUMN excluido ENUM('n','s') NOT NULL DEFAULT 'n'");
        DB::statement("ALTER TABLE service_orders MODIFY COLUMN deletado ENUM('n','s') NOT NULL DEFAULT 'n'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE service_orders MODIFY COLUMN excluido ENUM(\'n\',\'s\') NOT NULL');
        DB::statement('ALTER TABLE service_orders MODIFY COLUMN deletado ENUM(\'n\',\'s\') NOT NULL');
    }
};