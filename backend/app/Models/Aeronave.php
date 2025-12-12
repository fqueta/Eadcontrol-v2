<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class Aeronave extends Model
{
    use HasFactory;

    /**
     * Nome da tabela associada ao modelo
     */
    protected $table = 'aeronaves';

    /**
     * Chave primária
     */
    protected $primaryKey = 'id';

    /**
     * Indica se a chave primária é auto-incrementável
     */
    public $incrementing = true;

    /**
     * Tipo da chave primária
     */
    protected $keyType = 'int';

    /**
     * O modelo utiliza timestamps padrão do Laravel (created_at, updated_at)
     */
    public $timestamps = true;

    /**
     * Atributos preenchíveis em massa
     */
    protected $fillable = [
        'nome',
        'codigo',
        'tipo',
        'pacotes',
        'autor',
        'token',
        'ativo',
        'publicar',
        'ficha',
        'url',
        'meta_descricao',
        'obs',
        'config',
        'hora_rescisao',
        'ordenar',
        'excluido',
        'excluido_por',
        'deletado',
        'deletado_por',
        'descricao',
        'reg_excluido',
        'reg_deletado',
    ];

    /**
     * Conversões automáticas de tipos
     */
    protected $casts = [
        'hora_rescisao' => 'float',
        // Campos que podem conter JSON serializado
        'pacotes' => 'array',
        'config' => 'array',
    ];

    /**
     * Escopos globais para ocultar registros excluídos/deletados
     */
    protected static function booted()
    {
        static::addGlobalScope('notDeleted', function (Builder $builder) {
            $builder->where(function($q) {
                $q->whereNull('excluido')->orWhere('excluido', '!=', 's');
            })->where(function($q) {
                $q->whereNull('deletado')->orWhere('deletado', '!=', 's');
            });
        });
    }
}