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
        Schema::create('live_session_absences', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('live_session_id')->comment('Aula ao vivo');
            $table->string('user_id', 36)->comment('Aluno ausente (users.id)');
            $table->text('observacao')->nullable()->comment('Justificativa opcional');
            $table->timestamps();

            $table->foreign('live_session_id')->references('id')->on('live_sessions')->onDelete('cascade');
            // Assuming users table has string id
            // $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            
            $table->unique(['live_session_id', 'user_id'], 'session_user_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('live_session_absences');
    }
};
