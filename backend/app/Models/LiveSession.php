<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * LiveSession — Modelo de aulas ao vivo agendadas.
 * pt-BR: Representa um evento de aula ao vivo vinculado a um curso e turma.
 * en-US: Represents a live class event linked to a course and class group.
 */
class LiveSession extends Model
{
    protected $table = 'live_sessions';

    protected $fillable = [
        'id_curso',
        'id_turma',
        'titulo',
        'link',
        'duracao_minutos',
        'inicio',
        'fim',
        'descricao',
        'status',
        'criado_por',
        'cor',
        'config',
    ];

    protected $casts = [
        'inicio'           => 'datetime',
        'fim'              => 'datetime',
        'duracao_minutos'  => 'integer',
        'config'           => 'array',
    ];

    /**
     * Relacionamento com o curso.
     * en-US: Relationship to the course.
     */
    public function curso(): BelongsTo
    {
        return $this->belongsTo(Curso::class, 'id_curso', 'id');
    }

    /**
     * Relacionamento com a turma.
     * en-US: Relationship to the class group.
     */
    public function turma(): BelongsTo
    {
        return $this->belongsTo(Turma::class, 'id_turma', 'id');
    }

    /**
     * Criador da sessão.
     * en-US: Session creator.
     */
    public function criador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'criado_por', 'id');
    }

    /**
     * Faltas registradas nesta sessão.
     * en-US: Absences registered in this session.
     */
    public function absences()
    {
        return $this->hasMany(LiveSessionAbsence::class, 'live_session_id');
    }
}
