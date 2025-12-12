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
        Schema::create('stages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('color', 7)->default('#3b82f6');
            $table->foreignId('funnel_id')->constrained('funnels')->onDelete('cascade');
            $table->boolean('isActive')->default(true);
            $table->integer('order')->default(1);
            $table->json('settings')->nullable();
            $table->timestamps();
            
            // Índices para melhor performance
            $table->index(['funnel_id', 'order']);
            $table->index(['funnel_id', 'isActive']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stages');
    }
};
