<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model as EloquentModel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

/**
 * Modelo FileStorage
 *
 * Representa arquivos armazenados cujo metadata é persistido na tabela `posts`
 * com `post_type = 'file_storage'`.
 */
class FileStorage extends EloquentModel
{
    use HasFactory;

    /**
     * Nome da tabela associada.
     */
    protected $table = 'posts';

    /**
     * Chave primária da tabela.
     */
    protected $primaryKey = 'ID';

    /**
     * Indica se a chave primária é auto-incrementável.
     */
    public $incrementing = true;

    /**
     * Tipo da chave primária.
     */
    protected $keyType = 'int';

    /**
     * Atributos preenchíveis em massa.
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
     * Casts nativos.
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
     * Escopos globais: filtra por post_type=file_storage e registros não excluídos.
     */
    protected static function booted()
    {
        static::addGlobalScope('fileStorageType', function (Builder $builder) {
            $builder->where('post_type', 'file_storage');
        });

        static::addGlobalScope('notDeleted', function (Builder $builder) {
            $builder->where(function ($query) {
                $query->whereNull('excluido')->orWhere('excluido', '!=', 's');
            })->where(function ($query) {
                $query->whereNull('deletado')->orWhere('deletado', '!=', 's');
            });
        });

        // Define automaticamente o post_type durante criação
        static::creating(function ($model) {
            $model->post_type = 'file_storage';
        });
    }

    /**
     * Gera um slug único para o post (baseado no título).
     *
     * @param string $title
     * @return string
     */
    public function generateSlug($title)
    {
        $slug = Str::slug($title);
        $count = static::withoutGlobalScope('fileStorageType')->where('post_name', $slug)->count();
        if ($count > 0) {
            $slug = $slug . '-' . ($count + 1);
        }
        return $slug;
    }
}