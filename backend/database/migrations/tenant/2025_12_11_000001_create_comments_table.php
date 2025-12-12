<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     * PT: Cria a tabela de comentários com relação polimórfica.
     * EN: Create comments table with polymorphic relation.
     */
    public function up(): void
    {
        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            // Polymorphic relation to Curso (cursos.id) or Activity (posts.ID)
            $table->string('commentable_type');
            $table->unsignedBigInteger('commentable_id');
            // Author (users.id)
            $table->unsignedBigInteger('user_id');
            // Comment body
            $table->text('body');
            // Optional rating (1-5)
            $table->unsignedTinyInteger('rating')->nullable();
            // Moderation status: pending, approved, rejected
            $table->string('status', 20)->default('pending');
            // Optional parent for replies
            $table->unsignedBigInteger('parent_id')->nullable();
            // Extra metadata
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['commentable_type', 'commentable_id']);
            $table->index(['status']);
            $table->index(['user_id']);
        });
    }

    /**
     * Reverse the migrations.
     * PT: Remove a tabela de comentários.
     * EN: Drop the comments table.
     */
    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};