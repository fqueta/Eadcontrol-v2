<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CursoCategoria extends Model
{
    protected $table = 'curso_categorias';

    protected $fillable = [
        'nome',
        'slug',
    ];

    public function cursos(): HasMany
    {
        return $this->hasMany(Curso::class, 'categoria_id');
    }
}
