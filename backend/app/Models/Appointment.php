<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Appointment
 * pt-BR: Agendamento de horário no salão. Serve tanto para o painel admin
 * quanto para o agendamento público do cliente.
 */
class Appointment extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $table = 'appointments';

    protected $fillable = [
        'client_id',
        'service_id',
        'service_order_id',
        'assigned_to',
        'title',
        'start_at',
        'end_at',
        'duration_minutes',
        'status',
        'source',
        'client_name',
        'client_phone',
        'client_email',
        'color',
        'notes',
        'token',
        'config',
    ];

    protected $casts = [
        'start_at' => 'datetime',
        'end_at' => 'datetime',
        'duration_minutes' => 'integer',
        'service_id' => 'integer',
        'config' => 'array',
    ];

    /**
     * Lista de status válidos.
     */
    public const STATUSES = [
        'agendado',
        'confirmado',
        'em_atendimento',
        'concluido',
        'nao_compareceu',
        'cancelado',
    ];

    /**
     * Cliente (usuário logado do portal, opcional).
     */
    public function client()
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    /**
     * Profissional responsável (usuário).
     */
    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Serviço agendado (posts com post_type=service).
     */
    public function service()
    {
        return $this->belongsTo(Service::class, 'service_id', 'ID');
    }

    /**
     * Ordem de serviço gerada a partir deste agendamento.
     */
    public function serviceOrder()
    {
        return $this->belongsTo(ServiceOrder::class, 'service_order_id');
    }

    /**
     * Verifica se o agendamento ainda "ocupa" a agenda (não cancelado).
     */
    public function occupiesSlot(): bool
    {
        return !in_array($this->status, ['cancelado'], true);
    }
}