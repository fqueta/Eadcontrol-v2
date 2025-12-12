<?php

namespace App\Http\Requests;

use App\Rules\FullName;
use App\Rules\RightCpf;
use Illuminate\Foundation\Http\FormRequest;

class StoreClientesRequestApi extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Permitir o uso dessa request
    }
    public function rules(): array
    {
        return [
            'nome' => ['required','string',new FullName],
            'cpf'   =>[new  RightCpf,'required','unique:users']
        ];
    }
    public function messages(): array
    {
        return [
            'nome.required'=>__('O nome é obrigatório'),
            'nome.string'=>__('É necessário conter letras no nome'),
            'cpf.unique'=>__('CPF já cadastrado'),
        ];
    }
}
