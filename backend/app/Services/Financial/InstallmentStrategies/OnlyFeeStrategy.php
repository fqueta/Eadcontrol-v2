<?php

namespace App\Services\Financial\InstallmentStrategies;

use Carbon\Carbon;

/**
 * Estratégia de Apenas Taxa de Matrícula (Reserva / Interessado):
 * Gera exclusivamente a cobrança da Taxa de Matrícula/Inscrição, deixando o parcelamento do curso para depois.
 */
class OnlyFeeStrategy implements InstallmentStrategyInterface
{
    public function getKey(): string
    {
        return 'only_fee';
    }

    public function calculateSchedule(array $params): array
    {
        $inscricao = round(max(0, (float) ($params['inscricao'] ?? 0)), 2);
        if ($inscricao <= 0) {
            return [];
        }

        $dueDate = !empty($params['fee_due_date'])
            ? Carbon::parse($params['fee_due_date'])->format('Y-m-d')
            : (!empty($params['first_due_date'])
                ? Carbon::parse($params['first_due_date'])->format('Y-m-d')
                : now()->addDays(3)->format('Y-m-d'));

        $courseTitle = trim((string) ($params['course_title'] ?? 'Curso'));
        $paymentMethod = (string) ($params['fee_payment_method'] ?? $params['payment_method'] ?? 'pix');

        return [
            [
                'description'        => "Taxa de Matrícula - {$courseTitle}",
                'amount'             => $inscricao,
                'due_date'           => $dueDate,
                'payment_method'     => $paymentMethod,
                'installment_type'   => 'enrollment_fee',
                'installment_index'  => 0,
                'total_installments' => 1,
            ],
        ];
    }
}

