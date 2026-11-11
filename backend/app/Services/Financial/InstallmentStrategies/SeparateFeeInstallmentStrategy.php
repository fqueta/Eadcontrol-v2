<?php

namespace App\Services\Financial\InstallmentStrategies;

use Carbon\Carbon;

/**
 * Estratégia de Taxa de Matrícula Separada + Parcelas do Curso:
 * Gera 1 fatura dedicada para a Taxa de Matrícula (entrada) e N parcelas para o saldo do curso.
 */
class SeparateFeeInstallmentStrategy implements InstallmentStrategyInterface
{
    public function getKey(): string
    {
        return 'separate_fee';
    }

    public function calculateSchedule(array $params): array
    {
        $total = round((float) ($params['total'] ?? 0), 2);
        $inscricao = round(max(0, (float) ($params['inscricao'] ?? 0)), 2);

        if ($total <= 0 && $inscricao <= 0) {
            return [];
        }

        $courseTitle = trim((string) ($params['course_title'] ?? 'Curso'));
        $paymentMethod = (string) ($params['payment_method'] ?? 'pix');
        $feePaymentMethod = (string) ($params['fee_payment_method'] ?? $paymentMethod);

        $firstDueDate = !empty($params['first_due_date'])
            ? Carbon::parse($params['first_due_date'])
            : now()->addDays(7);

        $feeDueDate = !empty($params['fee_due_date'])
            ? Carbon::parse($params['fee_due_date'])
            : $firstDueDate->copy();

        $offsetCourseAfterFee = filter_var($params['offset_course_after_fee'] ?? false, FILTER_VALIDATE_BOOLEAN);

        $schedule = [];

        if ($inscricao > 0) {
            $schedule[] = [
                'description'        => "Taxa de Matrícula - {$courseTitle}",
                'amount'             => $inscricao,
                'due_date'           => $feeDueDate->format('Y-m-d'),
                'payment_method'     => $feePaymentMethod,
                'installment_type'   => 'enrollment_fee',
                'installment_index'  => 0,
                'total_installments' => 1,
            ];
        }

        $tuitionTotal = round(max(0, $total - $inscricao), 2);
        if ($tuitionTotal <= 0) {
            return $schedule;
        }

        $qty = max(1, (int) ($params['parcelas'] ?? 1));
        $installmentValue = floor(($tuitionTotal / $qty) * 100) / 100;

        for ($i = 1; $i <= $qty; $i++) {
            $amount = ($i === $qty)
                ? round($tuitionTotal - ($installmentValue * ($qty - 1)), 2)
                : $installmentValue;

            $monthOffset = ($i - 1) + ($offsetCourseAfterFee ? 1 : 0);
            $dueDate = $firstDueDate->copy()->addMonthsNoOverflow($monthOffset)->format('Y-m-d');

            $schedule[] = [
                'description'        => "Parcela {$i}/{$qty} - {$courseTitle}",
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

