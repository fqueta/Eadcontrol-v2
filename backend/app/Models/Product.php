<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class Product extends Model
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
     * Os atributos que devem ser convertidos para tipos nativos
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
     * Os atributos que devem ser ocultos para serialização
     */
    protected $hidden = [
        'post_password',
    ];

    /**
     * Escopo global para filtrar apenas products e registros não excluídos
     */
    protected static function booted()
    {
        static::addGlobalScope('productsOnly', function (Builder $builder) {
            $builder->where('post_type', 'products');
        });

        static::addGlobalScope('notDeleted', function (Builder $builder) {
            $builder->where(function($query) {
                $query->whereNull('excluido')->orWhere('excluido', '!=', 's');
            })->where(function($query) {
                $query->whereNull('deletado')->orWhere('deletado', '!=', 's');
            });
        });

        // Definir automaticamente o post_type como 'products' ao criar
        static::creating(function ($model) {
            $model->post_type = 'products';
        });
    }

    /**
     * Relacionamento com o autor do produto (User)
     */
    public function author()
    {
        return $this->belongsTo(User::class, 'post_author');
    }

    /**
     * Relacionamento com o produto pai
     */
    public function parent()
    {
        return $this->belongsTo(Product::class, 'post_parent', 'ID');
    }

    /**
     * Relacionamento com produtos filhos
     */
    public function children()
    {
        return $this->hasMany(Product::class, 'post_parent', 'ID');
    }

    /**
     * Relacionamento com categoria (usando guid)
     */
    public function category()
    {
        return $this->belongsTo(Category::class, 'guid');
    }

    /**
     * Escopo para produtos publicados
     */
    public function scopePublished($query)
    {
        return $query->where('post_status', 'publish');
    }

    /**
     * Escopo para produtos ativos
     */
    public function scopeActive($query)
    {
        return $query->where('post_status', 'publish');
    }

    /**
     * Accessor para nome do produto
     */
    public function getNameAttribute()
    {
        return $this->post_title;
    }

    /**
     * Accessor para descrição do produto
     */
    public function getDescriptionAttribute()
    {
        return $this->post_content;
    }

    /**
     * Accessor para slug do produto
     */
    public function getSlugAttribute()
    {
        return $this->post_name;
    }

    /**
     * Accessor para status ativo
     */
    public function getActiveAttribute()
    {
        return $this->post_status === 'publish';
    }

    /**
     * Accessor para categoria
     */
    public function getCategoryIdAttribute()
    {
        return $this->guid;
    }

    /**
     * Accessor para preço de custo
     */
    public function getCostPriceAttribute()
    {
        return $this->post_value1;
    }

    /**
     * Accessor para preço de venda
     */
    public function getSalePriceAttribute()
    {
        return $this->post_value2;
    }

    /**
     * Accessor para estoque
     */
    public function getStockAttribute()
    {
        return $this->comment_count;
    }

    /**
     * Accessor para unidade
     */
    public function getUnitAttribute()
    {
        return $this->config['unit'] ?? null;
    }

    /**
     * Mutator para nome do produto
     */
    public function setNameAttribute($value)
    {
        $this->attributes['post_title'] = $value;
        $this->attributes['post_name'] = $this->generateSlug($value);
    }

    /**
     * Mutator para descrição do produto
     */
    public function setDescriptionAttribute($value)
    {
        $this->attributes['post_content'] = $value;
    }

    /**
     * Mutator para status ativo
     */
    public function setActiveAttribute($value)
    {
        $this->attributes['post_status'] = $value ? 'publish' : 'draft';
    }

    /**
     * Mutator para categoria
     */
    public function setCategoryIdAttribute($value)
    {
        $this->attributes['guid'] = $value;
    }

    /**
     * Mutator para preço de custo
     */
    public function setCostPriceAttribute($value)
    {
        $this->attributes['post_value1'] = $value;
    }

    /**
     * Mutator para preço de venda
     */
    public function setSalePriceAttribute($value)
    {
        $this->attributes['post_value2'] = $value;
    }

    /**
     * Mutator para estoque
     */
    public function setStockAttribute($value)
    {
        $this->attributes['comment_count'] = $value;
    }

    /**
     * Mutator para unidade
     */
    public function setUnitAttribute($value)
    {
        $config = $this->config ?? [];
        $config['unit'] = $value;
        $this->attributes['config'] = $config;
    }

    /**
     * Gera um slug único para o produto
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