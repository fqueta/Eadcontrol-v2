<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Cria a tabela 'turmas' baseada no schema legado (PT/EN).
     *
     * PT: Implementa a estrutura conforme o SQL fornecido, ajustando defaults
     *     inválidos (datas '0000-00-00') para `nullable()` e usando tipos
     *     equivalentes do Laravel/MySQL. Mantém nomes de colunas conforme
     *     legado para compatibilidade.
     * EN: Creates 'turmas' table based on the legacy schema, adjusting invalid
     *     defaults (dates '0000-00-00') to `nullable()` and using Laravel/MySQL
     *     types. Keeps column names for compatibility.
     */
    public function up(): void
    {
        Schema::create('turmas', function (Blueprint $table) {
            // Identificação
            $table->increments('id');
            $table->string('token', 50);
            $table->unsignedInteger('id_curso');

            // Campos principais
            $table->string('nome', 200)->nullable();
            // Datas legadas tinham default '0000-00-00' (inválido em strict mode)
            $table->date('inicio')->nullable();
            $table->date('fim')->nullable();
            $table->integer('professor')->nullable();

            // Pagamento e valores
            $table->string('Pgto', 20)->nullable();
            $table->double('Valor')->nullable();
            $table->double('Matricula')->nullable();

            // Horários
            $table->time('hora_inicio')->nullable();
            $table->time('hora_fim')->nullable();

            // Duração
            $table->integer('duracao')->nullable();
            $table->string('unidade_duracao', 80)->nullable();

            // Dias da semana (enums s/n)
            $table->enum('dia1', ['s','n'])->default('n');
            $table->enum('dia2', ['s','n'])->default('n');
            $table->enum('dia3', ['s','n'])->default('n');
            $table->enum('dia4', ['s','n'])->default('n');
            $table->enum('dia5', ['s','n'])->default('n');
            $table->enum('dia6', ['s','n'])->default('n');
            $table->enum('dia7', ['s','n'])->default('n');

            // Horário definido (set legado com 's','n' -> enum equivalente)
            $table->enum('TemHorario', ['s','n'])->default('n');

            // Quadro e metadata
            $table->mediumText('Quadro')->nullable();

            // Autor e flags
            $table->text('autor')->nullable();
            $table->enum('ativo', ['s','n']);

            // Ordenação e datas
            $table->integer('ordenar')->nullable();
            $table->dateTime('data')->nullable();
            $table->dateTime('atualiza')->nullable();

            // Campos adicionais
            $table->integer('CodGrade')->nullable();
            $table->string('Cidade', 30)->nullable();
            $table->mediumText('QuemseDestina')->nullable();
            $table->char('Novo', 1)->nullable();
            $table->text('obs')->nullable();

            // Lixeira e registros
            $table->enum('excluido', ['n','s']);
            $table->text('reg_excluido')->nullable();
            $table->enum('deletado', ['n','s']);
            $table->text('reg_deletado')->nullable();

            // Capacidade
            $table->integer('max_alunos')->nullable();
            $table->integer('min_alunos')->nullable();

            // Configuração (JSON moderno; compatível com longtext legado)
            $table->json('config')->nullable();

            // Índices e chave estrangeira
            $table->index('id_curso');
            $table->foreign('id_curso')->references('id')->on('cursos')->cascadeOnDelete();

            // Timestamps modernos (opcional no legado)
            $table->timestamps();
        });
    }

    /**
     * Remove a tabela 'turmas' (rollback) (PT/EN).
     *
     * PT: Descarta a tabela e constraints.
     * EN: Drops the table and constraints.
     */
    public function down(): void
    {
        Schema::dropIfExists('turmas');
    }
};
