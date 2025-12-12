<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Executa a criação da tabela client_attendances.
     *
     * Cria a estrutura básica para registrar atendimentos de clientes,
     * permitindo observação opcional do atendimento prestado.
     */
    public function up(): void
    {
        Schema::create('client_attendances', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('client_id');
            $table->unsignedBigInteger('attended_by');
            $table->string('channel')->nullable(); // ex.: phone, email, presencial
            $table->text('observation')->nullable(); // observação opcional do atendimento
            $table->json('metadata')->nullable(); // metadados em JSON para armazenar dados flexíveis (array)
            $table->timestamps();

            $table->index('client_id');
            $table->index('attended_by');
            // Relações básicas (não forçando constraints para compatibilidade em ambientes existentes)
            // $table->foreign('client_id')->references('id')->on('users')->onDelete('cascade');
            // $table->foreign('attended_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverte a criação da tabela client_attendances.
     */
    public function down(): void
    {
        Schema::dropIfExists('client_attendances');
    }
};