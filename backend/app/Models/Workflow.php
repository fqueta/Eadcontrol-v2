<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modelo para gerenciar workflows do sistema
 */
class Workflow extends Model
{
    /**
     * Campos que podem ser preenchidos em massa
     */
    protected $fillable = [
        'name',
        'description',
        'funnel_id',
        'isActive',
        'settings',
    ];

    /**
     * Casts para conversão automática de tipos
     */
    protected $casts = [
        'isActive' => 'boolean',
        'settings' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relacionamento com Funnel
     * Um workflow pertence a um funil
     */
    public function funnel(): BelongsTo
    {
        return $this->belongsTo(Funnel::class);
    }

    /**
     * Mapeia campos do frontend para o backend
     * Converte funnelId para funnel_id
     */
    public static function map_campos(array $dados): array
    {
        if (isset($dados['funnelId'])) {
            $dados['funnel_id'] = $dados['funnelId'];
            unset($dados['funnelId']);
        }

        return $dados;
    }
}
