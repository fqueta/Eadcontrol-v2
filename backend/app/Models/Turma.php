<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Turma extends Model
{
    use HasFactory;

    /**
     * Modelo Turma (PT/EN).
     *
     * PT: Representa turmas/classes com campos conforme schema legado.
     * EN: Represents classes/groups with fields based on the legacy schema.
     */

    protected $table = 'turmas';

    protected $fillable = [
        'token','id_curso','nome','inicio','fim','professor',
        'Pgto','Valor','Matricula','hora_inicio','hora_fim',
        'duracao','unidade_duracao',
        'dia1','dia2','dia3','dia4','dia5','dia6','dia7',
        'TemHorario','Quadro','autor','ativo','ordenar','data','atualiza',
        'CodGrade','Cidade','QuemseDestina','Novo','obs',
        'excluido','reg_excluido','deletado','reg_deletado',
        'max_alunos','min_alunos',
        'config',
    ];

    protected $casts = [
        'inicio' => 'date',
        'fim' => 'date',
        'hora_inicio' => 'datetime:H:i:s',
        'hora_fim' => 'datetime:H:i:s',
        'data' => 'datetime',
        'atualiza' => 'datetime',
        'config' => 'array',
        'Valor' => 'float',
        'Matricula' => 'float',
        'duracao' => 'integer',
        'ordenar' => 'integer',
        'CodGrade' => 'integer',
        'autor' => 'integer',
        'max_alunos' => 'integer',
        'min_alunos' => 'integer',
    ];
}