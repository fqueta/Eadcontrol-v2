<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class ProductUnit extends Model
{
    use HasFactory;

    /**
     * A tabela associada ao modelo
     */
    protected $table = 'posts';

    /**
     * A chave primária da tabela
     */
    protected $primaryKey = 'ID';

    /**
     * Indica se a chave primária é auto-incrementável
     */
    public $incrementing = true;

    /**
     * O tipo da chave primária
     */
    protected $keyType = 'int';

    /**
     * Os atributos que podem ser preenchidos em massa
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
     * Os atributos que devem ser convertidos para tipos nativos
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
     * Os atributos que devem ser ocultos para serialização
     */
    protected $hidden = [
        'post_password',
    ];

    /**
     * Escopo global para filtrar apenas product-units e registros não excluídos
     */
    protected static function booted()
    {
        static::addGlobalScope('productUnitsOnly', function (Builder $builder) {
            $builder->where('post_type', 'product-units');
        });

        static::addGlobalScope('notDeleted', function (Builder $builder) {
            $builder->where(function($query) {
                $query->whereNull('excluido')->orWhere('excluido', '!=', 's');
            })->where(function($query) {
                $query->whereNull('deletado')->orWhere('deletado', '!=', 's');
            });
        });

        // Definir automaticamente o post_type como 'product-units' ao criar
        static::creating(function ($model) {
            $model->post_type = 'product-units';
        });
    }

    /**
     * Relacionamento com o autor da unidade de produto (User)
     */
    public function author()
    {
        return $this->belongsTo(User::class, 'post_author');
    }

    /**
     * Relacionamento com a unidade de produto pai
     */
    public function parent()
    {
        return $this->belongsTo(ProductUnit::class, 'post_parent', 'ID');
    }

    /**
     * Relacionamento com unidades de produto filhas
     */
    public function children()
    {
        return $this->hasMany(ProductUnit::class, 'post_parent', 'ID');
    }

    /**
     * Escopo para unidades de produto publicadas
     */
    public function scopePublished($query)
    {
        return $query->where('post_status', 'publish');
    }

    /**
     * Escopo para unidades de produto na lixeira
     */
    public function scopeOnlyTrashed($query)
    {
        return $query->withoutGlobalScope('notDeleted')
                    ->where('post_type', 'product-units')
                    ->where(function($q) {
                        $q->where('deletado', 's')->orWhere('excluido', 's');
                    });
    }

    /**
     * Gera um slug único para a unidade de produto
     */
    public function generateSlug($title)
    {
        $slug = Str::slug($title);
        $count = static::where('post_name', $slug)->count();
        
        if ($count > 0) {
            $slug = $slug . '-' . ($count + 1);
        }
        
        return $slug;
    }
}