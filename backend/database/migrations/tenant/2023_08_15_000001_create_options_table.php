<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('options', function (Blueprint $table) {
            $table->increments('id',20);
            $table->timestamps();
            $table->string('token')->nullable();
            $table->string('name');
            $table->string('url')->nullable();
            $table->text('value')->nullable();
            $table->enum('ativo', ['s', 'n'])->default('s');
            $table->text('obs')->nullable();
            $table->enum('excluido', ['s', 'n'])->nullable()->default('n');
            $table->text('reg_excluido')->nullable();
            $table->enum('deletado', ['s', 'n'])->nullable()->default('n');
            $table->text('reg_deletado')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('options');
    }
};
