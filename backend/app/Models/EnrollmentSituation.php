<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class EnrollmentSituation extends Model
{
    use HasFactory;

    /**
     * Modelo com base na tabela posts para situações de matrícula.
     * EN: Model backed by posts table for enrollment situations.
     */
    protected $table = 'posts';

    /**
     * Chave primária e sua configuração.
     * EN: Primary key settings.
     */
    protected $primaryKey = 'ID';
    public $incrementing = true;
    protected $keyType = 'int';

    /**
     * Campos preenchíveis em massa.
     * EN: Mass assignable attributes.
     */
    protected $fillable = [
        'post_author',
        'post_content',
        'post_title',
        'post_excerpt',
        'post_status',
        'comment_status',
        'ping_status',
        'post_password',
        'post_name',
        'to_ping',
        'pinged',
        'post_content_filtered',
        'post_parent',
        'guid',
        'menu_order',
        'post_type',
        'post_mime_type',
        'comment_count',
        'config',
        'token',
        'excluido',
        'reg_excluido',
        'deletado',
        'reg_deletado',
    ];

    /**
     * Casts para tipos nativos.
     * EN: Attribute casts.
     */
    protected $casts = [
        'config' => 'array',
        'post_author' => 'string',
        'post_parent' => 'integer',
        'menu_order' => 'integer',
        'comment_count' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Escopos globais para filtrar por post_type e não deletados.
     * EN: Global scopes for post_type and not-deleted records.
     */
    protected static function booted()
    {
        static::addGlobalScope('situacaoMatriculaOnly', function (Builder $builder) {
            $builder->where('post_type', 'situacao_matricula');
        });
        static::addGlobalScope('notDeleted', function (Builder $builder) {
            $builder->where(function($query) {
                $query->whereNull('excluido')->orWhere('excluido', '!=', 's');
            })->where(function($query) {
                $query->whereNull('deletado')->orWhere('deletado', '!=', 's');
            });
        });
        // Definir automaticamente o post_type ao criar.
        static::creating(function ($model) {
            $model->post_type = 'situacao_matricula';
        });
    }
}