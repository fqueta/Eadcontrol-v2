<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientAttendance extends Model
{
    protected $table = 'client_attendances';

    protected $fillable = [
        'client_id',
        'attended_by',
        'channel',
        'observation',
        'metadata',
    ];

    /**
     * Definições de cast para atributos do modelo.
     *
     * - metadata: converte JSON para array automaticamente.
     */
    protected $casts = [
        'metadata' => 'array',
    ];

    /**
     * Retorna o cliente associado ao atendimento.
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    /**
     * Retorna o usuário que realizou o atendimento.
     */
    public function attendant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'attended_by');
    }
}