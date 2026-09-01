<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matricula_stage_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('matricula_id')->index();
            $table->foreign('matricula_id')->references('id')->on('matriculas')->cascadeOnDelete();
            $table->unsignedBigInteger('from_stage_id')->nullable();
            $table->unsignedBigInteger('to_stage_id')->nullable();
            $table->unsignedBigInteger('funnel_id')->nullable();
            $table->unsignedBigInteger('stage_id')->nullable();
            $table->enum('trigger', ['enter', 'exit']);
            $table->unsignedBigInteger('from_situacao_id')->nullable();
            $table->unsignedBigInteger('to_situacao_id')->nullable();
            $table->string('from_situacao_name')->nullable();
            $table->string('to_situacao_name')->nullable();
            $table->uuid('actor_id')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['matricula_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matricula_stage_logs');
    }
};
