<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CreateLiveSessionsTable
 * pt-BR: Cria a tabela de sessões ao vivo (aulas online agendadas por turma/curso).
 * en-US: Creates the live_sessions table for scheduled online class events per class/course.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('live_sessions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_curso')->nullable()->index()->comment('FK: cursos.id');
            $table->unsignedBigInteger('id_turma')->nullable()->index()->comment('FK: turmas.id');
            $table->string('titulo', 255)->comment('Nome/título da aula ao vivo');
            $table->string('link', 500)->nullable()->comment('Link da videoconferência');
            $table->integer('duracao_minutos')->nullable()->comment('Duração estimada em minutos');
            $table->dateTime('inicio')->comment('Data/hora de início da sessão');
            $table->dateTime('fim')->nullable()->comment('Data/hora de término da sessão');
            $table->text('descricao')->nullable()->comment('Descrição ou pauta da aula');
            $table->enum('status', ['agendado', 'ao_vivo', 'encerrado', 'cancelado'])->default('agendado');
            $table->string('criado_por', 36)->nullable()->index()->comment('FK: users.id');
            $table->string('cor', 20)->nullable()->default('#6366f1')->comment('Cor no calendário (hex)');
            $table->json('config')->nullable()->comment('Configurações extras em JSON');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('live_sessions');
    }
};
