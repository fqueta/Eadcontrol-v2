<?php

namespace App\Services\Financial\InstallmentStrategies;

interface InstallmentStrategyInterface
{
    /**
     * Identificador único da estratégia.
     */
    public function getKey(): string;

    /**
     * Calcula o cronograma de faturas com base nos parâmetros financeiros da matrícula/proposta.
     *
     * @param array $params {
     *   subtotal: float,
     *   inscricao: float,
     *   desconto: float,
     *   total: float,
     *   parcelas: int,
     *   first_due_date: string,
     *   fee_due_date?: string,
     *   offset_course_after_fee?: bool,
     *   payment_method: string,
     *   fee_payment_method?: string,
     *   course_title: string,
     *   custom_invoices?: array
     * }
     * @return array<int, array{
     *   description: string,
     *   amount: float,
     *   due_date: string,
     *   payment_method: string,
     *   installment_type: string,
     *   installment_index: int,
     *   total_installments: int
     * }>
     */
    public function calculateSchedule(array $params): array;
}

