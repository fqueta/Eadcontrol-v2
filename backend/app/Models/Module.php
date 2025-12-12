<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class Module extends Model
{
    use HasFactory;

    /**
     * Tabela associada ao modelo.
     * EN: Backing table for the model.
     */
    protected $table = 'posts';

    /**
     * Nome da chave primária.
     * EN: Primary key name.
     */
    protected $primaryKey = 'ID';

    /**
     * Indica se a chave é auto-incrementável.
     * EN: Indicates if the key is auto-incrementing.
     */
    public $incrementing = true;

    /**
     * Tipo da chave primária.
     * EN: Primary key type.
     */
    protected $keyType = 'int';

    /**
     * Atributos preenchíveis em massa.
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
        'post_value1',
        'post_value2',
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
     * Conversões de atributos para tipos nativos.
     * EN: Attribute casts to native types.
     */
    protected $casts = [
        'config' => 'array',
        'post_author' => 'string',
        'post_parent' => 'integer',
        'menu_order' => 'integer',
        'comment_count' => 'integer',
        'post_value1' => 'decimal:2',
        'post_value2' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Escopos globais: manter apenas modules e não deletados.
     * EN: Global scopes: keep only 'modules' and non-deleted records.
     */
    protected static function booted()
    {
        static::addGlobalScope('modulesOnly', function (Builder $builder) {
            $builder->where('post_type', 'modules');
        });

        static::addGlobalScope('notDeleted', function (Builder $builder) {
            $builder->where(function($query) {
                $query->whereNull('excluido')->orWhere('excluido', '!=', 's');
            })->where(function($query) {
                $query->whereNull('deletado')->orWhere('deletado', '!=', 's');
            });
        });

        // Garantir post_type na criação
        // EN: Ensure post_type on creating
        static::creating(function ($model) {
            $model->post_type = 'modules';
        });
    }

    /**
     * Gera um slug baseado no título.
     * EN: Generate a slug based on a given string.
     */
    public function generateSlug(string $name): string
    {
        return Str::slug($name);
    }
}