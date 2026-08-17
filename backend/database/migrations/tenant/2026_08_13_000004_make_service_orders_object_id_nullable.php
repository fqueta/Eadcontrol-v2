<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations — torna object_id opcional (OS sem aeronave/equipamento).

     * Ordens de serviço podem ser geradas sem objeto físico vinculado
     * (ex.: a partir de um agendamento de salão), então object_id não pode
     * ser NOT NULL sem default em MySQL estrito.
     */
    public function up(): void
    {
        Schema::table('service_orders', function (Blueprint $table) {
            $table->unsignedBigInteger('object_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('service_orders', function (Blueprint $table) {
            $table->unsignedBigInteger('object_id')->nullable(false)->change();
        });
    }
};