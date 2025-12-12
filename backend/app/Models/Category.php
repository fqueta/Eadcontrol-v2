<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'parent_id',
        'active',
        'entidade',
        'token',
        'excluido',
        'reg_excluido',
        'deletado',
        'reg_deletado',
        'config',
    ];

    protected $casts = [
        'active' => 'boolean',
        'config' => 'array',
    ];

    /**
     * Valores válidos para o campo entidade.
     */
    public const ENTIDADES = [
        'servicos' => 'Serviços',
        'produtos' => 'Produtos',
        'financeiro' => 'Financeiro',
        'outros' => 'Outros'
    ];

    /**
     * Categoria pai (uma categoria pode ter uma categoria pai).
     */
    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    /**
     * Subcategorias (uma categoria pode ter várias categorias filhas).
     */
    public function children()
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    /**
     * Subcategorias com relacionamentos aninhados (para árvore completa).
     */
    public function childrenRecursive()
    {
        return $this->hasMany(Category::class, 'parent_id')->with('childrenRecursive');
    }

    /**
     * Scope para buscar apenas categorias ativas.
     */
    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    /**
     * Scope para buscar apenas categorias raiz (sem pai).
     */
    public function scopeRoot($query)
    {
        return $query->whereNull('parent_id');
    }

    /**
     * Scope para filtrar categorias por entidade.
     */
    public function scopeByEntidade($query, $entidade)
    {
        return $query->where('entidade', $entidade);
    }

    /**
     * Verifica se a categoria é uma categoria raiz.
     */
    public function isRoot()
    {
        return is_null($this->parent_id);
    }

    /**
     * Verifica se a categoria tem filhos.
     */
    public function hasChildren()
    {
        return $this->children()->count() > 0;
    }

    /**
     * Retorna o caminho completo da categoria (breadcrumb).
     */
    public function getFullPath($separator = ' > ')
    {
        $path = [];
        $category = $this;

        while ($category) {
            array_unshift($path, $category->name);
            $category = $category->parent;
        }

        return implode($separator, $path);
    }

    /**
     * Retorna todos os ancestrais da categoria.
     */
    public function getAncestors()
    {
        $ancestors = collect();
        $category = $this->parent;

        while ($category) {
            $ancestors->push($category);
            $category = $category->parent;
        }

        return $ancestors->reverse();
    }

    /**
     * Retorna todos os descendentes da categoria.
     */
    public function getDescendants()
    {
        $descendants = collect();

        foreach ($this->children as $child) {
            $descendants->push($child);
            $descendants = $descendants->merge($child->getDescendants());
        }

        return $descendants;
    }
}
