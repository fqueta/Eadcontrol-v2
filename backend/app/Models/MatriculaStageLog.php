<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatriculaStageLog extends Model
{
    protected $table = 'matricula_stage_logs';

    protected $fillable = [
        'matricula_id',
        'from_stage_id',
        'to_stage_id',
        'funnel_id',
        'stage_id',
        'trigger',
        'from_situacao_id',
        'to_situacao_id',
        'from_situacao_name',
        'to_situacao_name',
        'actor_id',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    public function matricula(): BelongsTo
    {
        return $this->belongsTo(Matricula::class, 'matricula_id');
    }

    public function fromStage(): BelongsTo
    {
        return $this->belongsTo(Stage::class, 'from_stage_id');
    }

    public function toStage(): BelongsTo
    {
        return $this->belongsTo(Stage::class, 'to_stage_id');
    }

    public function funnel(): BelongsTo
    {
        return $this->belongsTo(Funnel::class, 'funnel_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id', 'id');
    }
}
