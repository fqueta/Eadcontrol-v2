<?php

namespace App\Services\Financial\InstallmentStrategies;

use Carbon\Carbon;

/**
 * Estratégia de Cronograma Personalizado (Custom):
 * Aceita a lista de faturas editadas diretamente pelo usuário (valores, datas, descrições e métodos individuais).
 */
class CustomScheduleStrategy implements InstallmentStrategyInterface
{
    public function getKey(): string
    {
        return 'custom';
    }

    public function calculateSchedule(array $params): array
    {
        $customInvoices = is_array($params['custom_invoices'] ?? null) ? $params['custom_invoices'] : [];
        if (empty($customInvoices)) {
            return [];
        }

        $courseTitle = trim((string) ($params['course_title'] ?? 'Curso'));
        $defaultMethod = (string) ($params['payment_method'] ?? 'pix');
        $totalCount = count($customInvoices);

        $schedule = [];
        foreach ($customInvoices as $idx => $inv) {
            $amount = round((float) ($inv['amount'] ?? 0), 2);
            if ($amount <= 0) {
                continue;
            }

            $dueDate = !empty($inv['due_date'])
                ? Carbon::parse($inv['due_date'])->format('Y-m-d')
                : now()->addDays(7)->format('Y-m-d');

            $installmentNumber = $idx + 1;
            $description = trim((string) ($inv['description'] ?? "Parcela {$installmentNumber}/{$totalCount} - {$courseTitle}"));

            $schedule[] = [
                'id'                 => $inv['id'] ?? null,
                'description'        => $description,
                'amount'             => $amount,
                'due_date'           => $dueDate,
                'payment_method'     => (string) ($inv['payment_method'] ?? $defaultMethod),
                'installment_type'   => (string) ($inv['installment_type'] ?? (str_contains(strtolower($description), 'matrícula') || str_contains(strtolower($description), 'inscrição') ? 'enrollment_fee' : 'tuition')),
                'installment_index'  => (int) ($inv['installment_index'] ?? $installmentNumber),
                'total_installments' => $totalCount,
            ];
        }

        return $schedule;
    }
}

