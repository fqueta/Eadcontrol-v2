<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTurmaRequest extends FormRequest
{
    /**
     * Validação para atualizar Turma (PT/EN).
     *
     * PT: Define regras para atualização do registro de turma.
     * EN: Defines validation rules for updating a turma record.
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id' => ['nullable','integer'],
            'id_curso' => ['sometimes','integer','exists:cursos,id'],
            'nome' => ['nullable','string','max:200'],
            'token' => ['nullable','string','max:200'],
            'professor' => ['nullable'],
            'Pgto' => ['nullable','string','max:255'],
            'Valor' => ['nullable','numeric'],
            'Matricula' => ['nullable','numeric'],
            'hora_inicio' => ['nullable','string'],
            'hora_fim' => ['nullable','string'],
            'TemHorario' => ['nullable','in:s,n'],
            'Quadro' => ['nullable','string'],
            'autor' => ['nullable','integer'],
            'ativo' => ['nullable','string','max:1'],
            'ordenar' => ['nullable','integer'],
            'CodGrade' => ['nullable','integer'],
            'Cidade' => ['nullable','string','max:255'],
            'QuemseDestina' => ['nullable','string'],
            'Novo' => ['nullable','string','max:1'],
            'excluido' => ['nullable','string','max:1'],
            'deletado' => ['nullable','string','max:1'],
            'config' => ['nullable','array'],
            'max_alunos' => ['nullable','integer'],
            'min_alunos' => ['nullable','integer'],
            'inicio' => ['nullable','date'],
            'fim' => ['nullable','date'],
            'duracao' => ['nullable','integer'],
            'unidade_duracao' => ['nullable','string','max:80'],
            'obs' => ['nullable','string'],
            'dia1' => ['nullable','in:s,n'],
            'dia2' => ['nullable','in:s,n'],
            'dia3' => ['nullable','in:s,n'],
            'dia4' => ['nullable','in:s,n'],
            'dia5' => ['nullable','in:s,n'],
            'dia6' => ['nullable','in:s,n'],
            'dia7' => ['nullable','in:s,n'],
        ];
    }
}
