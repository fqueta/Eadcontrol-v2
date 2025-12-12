<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Menu extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'url',
        'icon',
        'items',
        'parent_id', // importante para estruturar hierarquia
    ];

    protected $casts = [
        'items' => 'array',
    ];

    /**
     * Menu pai (um menu pode ter um pai).
     */
    public function parent()
    {
        return $this->belongsTo(Menu::class, 'parent_id');
    }

    /**
     * Submenus (um menu pode ter vários filhos).
     */
    public function submenus()
    {
        return $this->hasMany(Menu::class, 'parent_id');
    }

    /**
     * Relacionamento com permissões.
     */
    public function permissions()
    {
        return $this->belongsToMany(Permission::class, 'menu_permission');
    }
    public function children()
    {
        return $this->hasMany(Menu::class, 'parent_id')->with('children');
    }
}
