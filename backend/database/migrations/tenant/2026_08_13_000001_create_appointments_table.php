<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CreateAppointmentsTable
 * pt-BR: Agendamentos do salão (painel admin + agendamento público do cliente).
 * en-US: Salon appointments (admin panel + public client self-booking).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->string('client_id', 36)->nullable()->index()->comment('FK: users.id (cliente logado)');
            $table->unsignedBigInteger('service_id')->nullable()->index()->comment('FK: posts.ID (serviço)');
            $table->string('assigned_to', 36)->nullable()->index()->comment('FK: users.id (profissional)');
            $table->string('title', 255)->nullable()->comment('Título/serviço principal do agendamento');
            $table->dateTime('start_at')->comment('Data/hora de início');
            $table->dateTime('end_at')->nullable()->comment('Data/hora de término');
            $table->integer('duration_minutes')->nullable()->comment('Duração em minutos');
            $table->enum('status', ['agendado', 'confirmado', 'em_atendimento', 'concluido', 'nao_compareceu', 'cancelado'])->default('agendado');
            $table->enum('source', ['admin', 'client'])->default('admin')->comment('Quem criou o agendamento');
            $table->string('client_name', 255)->nullable()->comment('Nome do cliente (agendamento público)');
            $table->string('client_phone', 40)->nullable()->comment('Telefone do cliente (agendamento público)');
            $table->string('client_email', 255)->nullable()->comment('E-mail do cliente (agendamento público)');
            $table->string('color', 20)->nullable()->default('#8b5cf6')->comment('Cor no calendário (hex)');
            $table->text('notes')->nullable()->comment('Observações');
            $table->string('token', 100)->nullable()->unique()->comment('Token de referência pública');
            $table->json('config')->nullable()->comment('Configurações extras em JSON');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['start_at', 'assigned_to']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};