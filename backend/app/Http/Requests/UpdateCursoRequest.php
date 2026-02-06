<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCursoRequest extends FormRequest
{
    /**
     * PT: Autoriza a requisição.
     * EN: Authorize the request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * PT: Regras de validação para atualizar curso, incluindo módulos e atividades aninhados.
     * EN: Validation rules to update a course, including nested modules and activities.
     */
    public function rules(): array
    {
        return [
            // Campos principais
            'nome' => ['sometimes','string','max:300'],
            'titulo' => ['sometimes','nullable','string','max:300'],
            'slug' => ['sometimes','nullable','string','max:200'],
            'descricao' => ['sometimes','nullable','string'],
            'obs' => ['sometimes','nullable','string'],
            // Aliases de payload
            'descricao_curso' => ['sometimes','nullable','string'],
            'observacoes' => ['sometimes','nullable','string'],
            'professor' => ['sometimes','nullable','string','max:255'],
            'ativo' => ['sometimes','nullable', Rule::in(['s','n'])],
            'destaque' => ['sometimes','nullable', Rule::in(['s','n'])],
            'publicar' => ['sometimes','nullable', Rule::in(['s','n'])],
            'duracao' => ['sometimes','nullable','integer','min:0'],
            'unidade_duracao' => ['sometimes','nullable','string','max:20'],
            'tipo' => ['sometimes','nullable','string','max:20'],
            'categoria' => ['sometimes','nullable','string','max:100'],
            'token' => ['sometimes','nullable','string'],
            'autor' => ['sometimes','nullable','string'],

            // Campos financeiros opcionais
            'inscricao' => ['sometimes','nullable','regex:/^\d+(,\d{2}|\.\d{2})?$/'],
            'valor' => ['sometimes','nullable','regex:/^\d+(,\d{2}|\.\d{2})?$/'],
            'parcelas' => ['sometimes','nullable','integer','min:1'],
            'valor_parcela' => ['sometimes','nullable','regex:/^\d+(,\d{2}|\.\d{2})?$/'],

            // Config (JSON arbitrário)
            'config' => ['sometimes','nullable'],

            // Campos extras do payload

            // Imagem de capa (aceita topo para normalização em config.cover)
            'imagem_url' => ['sometimes','nullable','string'],
            'imagem_file_id' => ['sometimes','nullable'],
            'imagem_titulo' => ['sometimes','nullable','string'],

            // Módulos aninhados
            'modulos' => ['sometimes','nullable','array'],
            'modulos.*.module_id' => ['nullable','integer', Rule::exists('posts','ID')->where(function($q){ $q->where('post_type','modules'); })],
            'modulos.*.title' => ['required','string','max:300'],
            'modulos.*.name' => ['nullable','string','max:200'],
            'modulos.*.description' => ['nullable','string'],
            'modulos.*.content' => ['nullable'],
            'modulos.*.duration' => ['nullable','string','max:100'],
            'modulos.*.tipo_duracao' => ['nullable','string','max:50'],
            'modulos.*.active' => ['nullable', Rule::in(['s','n','true','false','1','0'])],

            // Atividades dentro de cada módulo
            'modulos.*.atividades' => ['sometimes','nullable','array'],
            'modulos.*.atividades.*.id' => ['nullable','integer', Rule::exists('posts','ID')->where(function($q){ $q->where('post_type','activities'); })],
            'modulos.*.atividades.*.activity_id' => ['nullable','integer', Rule::exists('posts','ID')->where(function($q){ $q->where('post_type','activities'); })],
            'modulos.*.atividades.*.title' => ['required','string','max:300'],
            'modulos.*.atividades.*.name' => ['nullable','string','max:200'],
            'modulos.*.atividades.*.description' => ['nullable','string'],
            'modulos.*.atividades.*.content' => ['nullable'],
            'modulos.*.atividades.*.duration' => ['nullable','string','max:100'],
            'modulos.*.atividades.*.type_duration' => ['nullable','string','max:50'],
            'modulos.*.atividades.*.type_activities' => ['required','string','max:50'],
            'modulos.*.atividades.*.active' => ['nullable', Rule::in(['s','n','true','false','1','0'])],
            
            // Campos de quiz
            'modulos.*.atividades.*.quiz_questions' => ['nullable', 'array'],
            'modulos.*.atividades.*.quiz_config' => ['nullable', 'array'],
        ];
    }
}
