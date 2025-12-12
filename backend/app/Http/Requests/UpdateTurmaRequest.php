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
            'ativo' => ['nullable','string','max:1'],
            'excluido' => ['nullable','string','max:1'],
            'deletado' => ['nullable','string','max:1'],
            'config' => ['nullable','array'],
            'max_alunos' => ['nullable','integer','string'],
            'min_alunos' => ['nullable','integer','string'],
            'inicio' => ['nullable','date','string'],
            'fim' => ['nullable'],
            'duracao' => ['nullable','integer','string'],
            'unidade_duracao' => ['nullable','string','max:80'],
            'obs' => ['nullable','string'],
            'dia1' => ['in:s,n'],
            'dia2' => ['in:s,n'],
            'dia3' => ['in:s,n'],
            'dia4' => ['in:s,n'],
            'dia5' => ['in:s,n'],
            'dia6' => ['in:s,n'],
            'dia7' => ['in:s,n'],
        ];
    }
}
