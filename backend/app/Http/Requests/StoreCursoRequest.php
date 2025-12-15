<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCursoRequest extends FormRequest
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
     * PT: Regras de validação para criar curso, incluindo módulos e atividades aninhados.
     * EN: Validation rules to create a course, including nested modules and activities.
     */
    public function rules(): array
    {
        // dd($this->all());
        // return [
        //     'id' => ['nullable','numeric'],
        //     'activity_id' => ['nullable','numeric'],
        // ];

        return [
            // Identificador opcional para update-or-create
            'id' => ['nullable','numeric'],
            'activity_id' => ['nullable','numeric'],
            // Campos principais
            'nome' => ['required','string','max:300'],
            'titulo' => ['nullable','string','max:300'],
            'slug' => ['nullable','string','max:200'],
            'descricao' => ['nullable','string'],
            'obs' => ['nullable','string'],
            // Aliases de payload
            'descricao_curso' => ['nullable','string'],
            'observacoes' => ['nullable','string'],
            'professor' => ['nullable','string','max:255'],
            'ativo' => ['nullable', Rule::in(['s','n'])],
            'destaque' => ['nullable', Rule::in(['s','n'])],
            'publicar' => ['nullable', Rule::in(['s','n'])],
            'duracao' => ['nullable','integer','min:0'],
            'unidade_duracao' => ['nullable','string','max:20'],
            'tipo' => ['nullable','string','max:20'],
            'categoria' => ['nullable','string','max:100'],
            'token' => ['nullable','string'],
            'autor' => ['nullable','string'],

            // Campos financeiros opcionais
            'inscricao' => ['nullable','regex:/^\d+(,\d{2}|\.\d{2})?$/'],
            'valor' => ['nullable','regex:/^\d+(,\d{2}|\.\d{2})?$/'],
            'parcelas' => ['nullable','integer','min:1'],
            'valor_parcela' => ['nullable','regex:/^\d+(,\d{2}|\.\d{2})?$/'],

            // Config (JSON arbitrário)
            'config' => ['nullable'],

            // Campos extras do payload

            // Imagem de capa (aceita topo para normalização em config.cover)
            'imagem_url' => ['nullable','string'],
            'imagem_file_id' => ['nullable'],
            'imagem_titulo' => ['nullable','string'],

            // Módulos aninhados
            'modulos' => ['nullable','array'],
            // 'modulos.*.module_id' => ['nullable','integer', Rule::exists('posts','ID')->where(function($q){ $q->where('post_type','modules'); })],
            'modulos.*.title' => ['required','string','max:300'],
            'modulos.*.name' => ['nullable','string','max:200'],
            'modulos.*.description' => ['nullable','string'],
            'modulos.*.content' => ['nullable'],
            'modulos.*.duration' => ['nullable','string','max:100'],
            'modulos.*.tipo_duracao' => ['nullable','string','max:50'],
            'modulos.*.active' => ['nullable', Rule::in(['s','n','true','false','1','0'])],

            // Atividades dentro de cada módulo
            'modulos.*.atividades' => ['nullable','array'],
            // 'modulos.*.atividades.*.id' => ['nullable','integer', Rule::exists('posts','ID')->where(function($q){ $q->where('post_type','activities'); })],
            'modulos.*.atividades.*.title' => ['required','string','max:300'],
            'modulos.*.atividades.*.name' => ['nullable','string','max:200'],
            'modulos.*.atividades.*.description' => ['nullable','string'],
            'modulos.*.atividades.*.content' => ['nullable'],
            'modulos.*.atividades.*.duration' => ['nullable','string','max:100'],
            'modulos.*.atividades.*.type_duration' => ['nullable','string','max:50'],
            'modulos.*.atividades.*.type_activities' => ['required','string','max:50'],
            'modulos.*.atividades.*.active' => ['nullable', Rule::in(['s','n','true','false','1','0'])],
        ];
    }
}
