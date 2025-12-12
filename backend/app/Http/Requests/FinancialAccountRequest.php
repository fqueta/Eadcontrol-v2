<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FinancialAccountRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'amount' => 'required|numeric|min:0.01|max:999999999.99',
            'category' => 'required|exists:categories,id',
            'customerName' => 'nullable|string|max:255',
            'description' => 'required|string|min:3|max:500',
            'dueDate' => 'required|date|after_or_equal:today',
            'installments' => 'nullable|integer|min:1|max:999',
            'invoiceNumber' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:1000',
            'paymentMethod' => ['required', 'string', Rule::in(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'pix', 'check', 'other'])],
            'recurrence' => ['nullable', 'string', Rule::in(['none', 'daily', 'weekly', 'monthly', 'yearly'])],
            'serviceOrderId' => 'nullable|exists:service_orders,id',
            'type' => ['nullable', 'string', Rule::in(['receivable', 'payable'])],
            'status' => ['nullable', 'string', Rule::in(['pending', 'paid', 'overdue', 'cancelled'])],
            'paymentDate' => 'nullable|date',
            'paidAmount' => 'nullable|numeric|min:0|max:999999999.99'
        ];

        // Validações condicionais baseadas no método HTTP
        if ($this->isMethod('PUT') || $this->isMethod('PATCH')) {
            // Para updates, tornar campos opcionais
            $rules['amount'] = 'sometimes|required|numeric|min:0.01|max:999999999.99';
            $rules['category'] = 'sometimes|required|exists:categories,id';
            $rules['description'] = 'sometimes|required|string|min:3|max:500';
            $rules['dueDate'] = 'sometimes|required|date';
            $rules['paymentMethod'] = ['sometimes', 'required', 'string', Rule::in(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'pix', 'check', 'other'])];
        }

        return $rules;
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array
     */
    public function messages(): array
    {
        return [
            'amount.required' => 'O valor é obrigatório',
            'amount.numeric' => 'O valor deve ser um número',
            'amount.min' => 'O valor deve ser maior que zero',
            'amount.max' => 'O valor não pode exceder R$ 999.999.999,99',
            'category.required' => 'A categoria é obrigatória',
            'category.exists' => 'A categoria selecionada é inválida',
            'description.required' => 'A descrição é obrigatória',
            'description.min' => 'A descrição deve ter pelo menos 3 caracteres',
            'description.max' => 'A descrição não pode exceder 500 caracteres',
            'dueDate.required' => 'A data de vencimento é obrigatória',
            'dueDate.date' => 'A data de vencimento deve ser uma data válida',
            'dueDate.after_or_equal' => 'A data de vencimento não pode ser anterior a hoje',
            'installments.integer' => 'O número de parcelas deve ser um número inteiro',
            'installments.min' => 'O número de parcelas deve ser pelo menos 1',
            'installments.max' => 'O número de parcelas não pode exceder 999',
            'invoiceNumber.max' => 'O número da fatura não pode exceder 100 caracteres',
            'notes.max' => 'As observações não podem exceder 1000 caracteres',
            'paymentMethod.required' => 'O método de pagamento é obrigatório',
            'paymentMethod.in' => 'O método de pagamento selecionado é inválido',
            'recurrence.in' => 'A recorrência selecionada é inválida',
            'serviceOrderId.exists' => 'A ordem de serviço selecionada é inválida',
            'type.in' => 'O tipo de conta selecionado é inválido',
            'status.in' => 'O status selecionado é inválido',
            'paymentDate.date' => 'A data de pagamento deve ser uma data válida',
            'paidAmount.numeric' => 'O valor pago deve ser um número',
            'paidAmount.min' => 'O valor pago não pode ser negativo',
            'paidAmount.max' => 'O valor pago não pode exceder R$ 999.999.999,99'
        ];
    }

    /**
     * Configure the validator instance.
     *
     * @param  \Illuminate\Validation\Validator  $validator
     * @return void
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Validação customizada: valor pago não pode ser maior que o valor total
            if ($this->filled('paidAmount') && $this->filled('amount')) {
                if ($this->paidAmount > $this->amount) {
                    $validator->errors()->add('paidAmount', 'O valor pago não pode ser maior que o valor total');
                }
            }

            // Validação customizada: se status é 'paid', deve ter data de pagamento
            if ($this->status === 'paid' && !$this->filled('paymentDate')) {
                $validator->errors()->add('paymentDate', 'A data de pagamento é obrigatória quando o status é "pago"');
            }

            // Validação customizada: se tem data de pagamento, deve ter valor pago
            if ($this->filled('paymentDate') && !$this->filled('paidAmount')) {
                $validator->errors()->add('paidAmount', 'O valor pago é obrigatório quando há data de pagamento');
            }

            // Validação customizada: parcelas só fazem sentido para recorrência mensal ou anual
            if ($this->filled('installments') && $this->installments > 1) {
                if (!in_array($this->recurrence, ['monthly', 'yearly'])) {
                    $validator->errors()->add('installments', 'Parcelas só são permitidas para recorrência mensal ou anual');
                }
            }
        });
    }
}
