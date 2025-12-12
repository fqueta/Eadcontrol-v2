<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Option extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'token',
        'name',
        'url',
        'value',
        'ativo',
        'obs',
        'excluido',
        'reg_excluido',
        'deletado',
        'reg_deletado',
    ];

    // protected $casts = [
    //     'value' => 'array',
    // ];

    public $incrementing = false;   // 👈 precisa porque o id não é int
    protected $keyType = 'string';  // 👈 precisa porque UUID é string

    /**
     * Escopo global para filtrar apenas registros não excluídos
     */
    protected static function booted()
    {
        static::addGlobalScope('active', function ($query) {
            $query->where(function($q) {
                $q->whereNull('deletado')->orWhere('deletado', '!=', 's');
            })->where(function($q) {
                $q->whereNull('excluido')->orWhere('excluido', '!=', 's');
            });
        });
    }
}
