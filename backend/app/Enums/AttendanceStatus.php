<?php

namespace App\Enums;

/**
 * Enum para os status de atendimento de aeronaves
 */
enum AttendanceStatus: string
{
    case PENDING = 'pending';
    case IN_PROGRESS = 'in_progress';
    case COMPLETED = 'completed';
    case CANCELLED = 'cancelled';
    case ON_HOLD = 'on_hold';

    /**
     * Retorna o label em português para o status
     */
    public function label(): string
    {
        return match($this) {
            self::PENDING => 'Pendente',
            self::IN_PROGRESS => 'Em Andamento',
            self::COMPLETED => 'Concluído',
            self::CANCELLED => 'Cancelado',
            self::ON_HOLD => 'Em Espera',
        };
    }

    /**
     * Retorna a cor associada ao status
     */
    public function color(): string
    {
        return match($this) {
            self::PENDING => 'yellow',
            self::IN_PROGRESS => 'blue',
            self::COMPLETED => 'green',
            self::CANCELLED => 'red',
            self::ON_HOLD => 'orange',
        };
    }

    /**
     * Retorna todos os status disponíveis
     */
    public static function all(): array
    {
        return [
            self::PENDING,
            self::IN_PROGRESS,
            self::COMPLETED,
            self::CANCELLED,
            self::ON_HOLD,
        ];
    }

    /**
     * Retorna os status que indicam que o atendimento está ativo
     */
    public static function active(): array
    {
        return [
            self::PENDING,
            self::IN_PROGRESS,
            self::ON_HOLD,
        ];
    }

    /**
     * Retorna os status que indicam que o atendimento foi finalizado
     */
    public static function finished(): array
    {
        return [
            self::COMPLETED,
            self::CANCELLED,
        ];
    }

    /**
     * Verifica se o status é ativo
     */
    public function isActive(): bool
    {
        return in_array($this, self::active());
    }

    /**
     * Verifica se o status é finalizado
     */
    public function isFinished(): bool
    {
        return in_array($this, self::finished());
    }
}