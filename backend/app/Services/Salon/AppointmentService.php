<?php

namespace App\Services\Salon;

use App\Models\Appointment;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * AppointmentService
 * pt-BR: Regras de negócio do agendamento: conflitos de horário e disponibilidade
 * de slots para o painel e para o agendamento público.
 */
class AppointmentService
{
    /**
     * Busca agendamentos que conflitam com o intervalo [start_at, end_at).
     *
     * @return Collection<int, Appointment>
     */
    public function findConflicts(array $data, ?int $excludeId = null): Collection
    {
        $assignedTo = $data['assigned_to'] ?? null;
        if (empty($assignedTo)) {
            return collect();
        }

        $query = Appointment::query()
            ->where('assigned_to', $assignedTo)
            ->where('status', '!=', 'cancelado')
            ->where('start_at', '<', $data['end_at'])
            ->where('end_at', '>', $data['start_at']);

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->get();
    }

    /**
     * Gera os horários disponíveis para um profissional em uma data, respeitando
     * horário comercial, duração do serviço e agendamentos já existentes.
     *
     * @return array<int, array{start: string, end: string}>
     */
    public function availableSlots(string $date, int $durationMinutes = 30, ?string $assignedTo = null, array $opts = []): array
    {
        $openHour = (int) ($opts['open_hour'] ?? 9);
        $closeHour = (int) ($opts['close_hour'] ?? 18);
        $stepMinutes = (int) ($opts['step_minutes'] ?? 30);
        $bufferMinutes = (int) ($opts['buffer_minutes'] ?? 0);

        $dayStart = Carbon::parse($date)->startOfDay();
        $occupied = $assignedTo
            ? $this->findConflicts([
                'assigned_to' => $assignedTo,
                'start_at' => $dayStart->copy()->setHour($openHour),
                'end_at' => $dayStart->copy()->setHour($closeHour),
            ])
            : collect();

        $occupiedRanges = $occupied->map(fn (Appointment $a) => [
            'start' => Carbon::parse($a->start_at),
            'end' => Carbon::parse($a->end_at),
        ]);

        $slots = [];
        $cursor = $dayStart->copy()->setHour($openHour)->setMinute(0);

        while ($cursor->format('H') < $closeHour) {
            $end = $cursor->copy()->addMinutes($durationMinutes + $bufferMinutes);

            if ($end->gt($dayStart->copy()->setHour($closeHour)->setMinute(0))) {
                break;
            }

            // Não oferecer horários no passado quando a data é hoje
            if ($cursor->isBefore(Carbon::now()) && $cursor->isToday()) {
                $cursor = $cursor->addMinutes($stepMinutes);
                continue;
            }

            $overlap = $occupiedRanges->contains(function (array $range) use ($cursor, $end) {
                return $cursor->lt($range['end']) && $end->gt($range['start']);
            });

            if (!$overlap) {
                $slots[] = [
                    'start' => $cursor->toIso8601String(),
                    'end' => $end->toIso8601String(),
                ];
            }

            $cursor = $cursor->addMinutes($stepMinutes);
        }

        return $slots;
    }

    /**
     * Transforma um agendamento no formato da API (camelCase + nomes).
     */
    public function transform(Appointment $appointment): array
    {
        $service = $appointment->service;

        return [
            'id' => $appointment->id,
            'clientId' => $appointment->client_id,
            'serviceId' => $appointment->service_id,
            'serviceOrderId' => $appointment->service_order_id,
            'serviceName' => $service ? $service->post_title : null,
            'assignedTo' => $appointment->assigned_to,
            'assignedName' => $appointment->assignedUser?->name,
            'title' => $appointment->title ?? $service?->post_title,
            'start' => $appointment->start_at?->toIso8601String(),
            'end' => $appointment->end_at?->toIso8601String(),
            'duration' => $appointment->duration_minutes,
            'status' => $appointment->status,
            'source' => $appointment->source,
            'clientName' => $appointment->client_name,
            'clientPhone' => $appointment->client_phone,
            'clientEmail' => $appointment->client_email,
            'color' => $appointment->color,
            'notes' => $appointment->notes,
            'token' => $appointment->token,
        ];
    }

    /**
     * Retorna a duração de um serviço (config) ou o padrão informado.
     */
    public static function serviceDuration(?Service $service, int $default = 30): int
    {
        if (!$service) {
            return $default;
        }

        return (int) ($service->config['estimatedDuration'] ?? $service->config['duracao'] ?? $default) ?: $default;
    }
}