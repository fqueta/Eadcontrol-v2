<?php

namespace App\Services\Financial\InstallmentStrategies;

use Carbon\Carbon;

/**
 * Estratégia de parcelamento unificado:
 * Soma Curso + Taxa de Matrícula - Desconto e divide igualmente em N parcelas.
 */
class BundledInstallmentStrategy implements InstallmentStrategyInterface
{
    public function getKey(): string
    {
        return 'bundled';
    }

    public function calculateSchedule(array $params): array
    {
        $total = round((float) ($params['total'] ?? 0), 2);
        if ($total <= 0) {
            return [];
        }

        $qty = max(1, (int) ($params['parcelas'] ?? 1));
        $baseDate = !empty($params['first_due_date'])
            ? Carbon::parse($params['first_due_date'])
            : now()->addDays(7);

        $courseTitle = trim((string) ($params['course_title'] ?? 'Curso'));
        $paymentMethod = (string) ($params['payment_method'] ?? 'pix');

        $installmentValue = floor(($total / $qty) * 100) / 100;
        $schedule = [];

        for ($i = 1; $i <= $qty; $i++) {
            $amount = ($i === $qty)
                ? round($total - ($installmentValue * ($qty - 1)), 2)
                : $installmentValue;

            $dueDate = $baseDate->copy()->addMonthsNoOverflow($i - 1)->format('Y-m-d');

            $schedule[] = [
                'description'        => $qty === 1
                    ? "Parcela Única - {$courseTitle}"
                    : "Parcela {$i}/{$qty} - {$courseTitle}",
                'amount'             => $amount,
                'due_date'           => $dueDate,
                'payment_method'     => $paymentMethod,
                'installment_type'   => 'tuition',
                'installment_index'  => $i,
                'total_installments' => $qty,
            ];
        }

        return $schedule;
    }
}

