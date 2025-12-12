<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    use HasFactory;

    protected $table = 'permissions';

    protected $fillable = [
        'name',
        // 'id_menu',
        'redirect_login',
        'config',
        'description',
        'guard_name',
        'active',
        'autor',
        'token',
        'excluido',
        'reg_excluido',
        'deletado',
        'reg_deletado',
    ];
    protected $casts = [
        'id_menu' => 'array',
        'config'  => 'array',
    ];
    /**
     * Relacionamento com permissões de menu
     */
    // public function menuPermissions()
    // {
    //     return $this->hasMany(MenuPermission::class, 'permission_id');
    // }

    // /**
    //  * Relacionamento com menus via pivot
    //  */
    // public function menus()
    // {
    //     return $this->belongsToMany(
    //         Menu::class,
    //         'menu_permission',
    //         'permission_id',
    //         'menu_id'
    //     )->withPivot(['can_view', 'can_create', 'can_edit', 'can_delete', 'can_upload']);
    // }
}
