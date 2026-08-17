<?php

namespace App\Services\Salon;

use App\Models\Appointment;
use RuntimeException;

/**
 * AppointmentStateMachine
 * pt-BR: Centraliza as transições de status permitidas do agendamento,
 * garantindo um fluxo consistente em todos os pontos de uso.
 * en-US: Centralizes allowed appointment status transitions.
 */
class AppointmentStateMachine
{
    public const TRANSITIONS = [
        'agendado' => ['confirmado', 'cancelado', 'nao_compareceu'],
        'confirmado' => ['agendado', 'em_atendimento', 'cancelado', 'nao_compareceu'],
        'em_atendimento' => ['concluido', 'cancelado'],
        'nao_compareceu' => ['agendado', 'confirmado', 'cancelado'],
        'cancelado' => ['agendado'],
        'concluido' => [],
    ];

    public static function canTransition(string $from, string $to): bool
    {
        return in_array($to, self::TRANSITIONS[$from] ?? [], true);
    }

    /**
     * @throws RuntimeException quando a transição não é permitida
     */
    public static function assertTransition(Appointment $appointment, string $to): void
    {
        if (!in_array($to, Appointment::STATUSES, true)) {
            throw new RuntimeException("Status inválido: {$to}");
        }

        $from = $appointment->status;
        if ($from === $to) {
            return;
        }

        if (!self::canTransition($from, $to)) {
            throw new RuntimeException("Transição não permitida: {$from} → {$to}");
        }
    }
}