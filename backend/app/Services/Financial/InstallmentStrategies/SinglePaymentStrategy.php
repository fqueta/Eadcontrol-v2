<?php

namespace App\Services\Financial\InstallmentStrategies;

use Carbon\Carbon;

/**
 * Estratégia de pagamento à vista (parcela única com valor total líquido).
 */
class SinglePaymentStrategy implements InstallmentStrategyInterface
{
    public function getKey(): string
    {
        return 'single';
    }

    public function calculateSchedule(array $params): array
    {
        $total = round((float) ($params['total'] ?? 0), 2);
        if ($total <= 0) {
            return [];
        }

        $dueDate = !empty($params['first_due_date'])
            ? Carbon::parse($params['first_due_date'])->format('Y-m-d')
            : now()->addDays(3)->format('Y-m-d');

        $courseTitle = trim((string) ($params['course_title'] ?? 'Curso'));
        $paymentMethod = (string) ($params['payment_method'] ?? 'pix');

        return [
            [
                'description'        => "Pagamento à Vista - {$courseTitle}",
                'amount'             => $total,
                'due_date'           => $dueDate,
                'payment_method'     => $paymentMethod,
                'installment_type'   => 'single',
                'installment_index'  => 1,
                'total_installments' => 1,
            ],
        ];
    }
}

