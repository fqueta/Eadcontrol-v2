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
        Schema::create('questions', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->text('enunciado');
            $blueprint->string('tipo_pergunta')->comment('multipla_escolha, verdadeiro_falso');
            $blueprint->text('explicacao')->nullable();
            $blueprint->decimal('pontos', 8, 2)->default(0);
            $blueprint->unsignedBigInteger('author_id')->nullable();
            $blueprint->string('active', 1)->default('s');
            $blueprint->timestamps();
            $blueprint->softDeletes();
        });

        Schema::create('question_options', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->foreignId('question_id')->constrained('questions')->onDelete('cascade');
            $blueprint->text('texto');
            $blueprint->string('correta', 1)->default('n');
            $blueprint->timestamps();
        });

        Schema::create('activity_questions', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->unsignedBigInteger('activity_id')->comment('ID from posts table (activity)');
            $blueprint->foreignId('question_id')->constrained('questions')->onDelete('cascade');
            $blueprint->integer('ordem')->default(0);
            $blueprint->timestamps();

            // Index for faster lookups
            $blueprint->index('activity_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_questions');
        Schema::dropIfExists('question_options');
        Schema::dropIfExists('questions');
    }
};
