<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Question extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'enunciado',
        'tipo_pergunta',
        'explicacao',
        'pontos',
        'author_id',
        'active'
    ];

    protected $casts = [
        'pontos' => 'decimal:2',
    ];

    public function options()
    {
        return $this->hasMany(QuestionOption::class);
    }

    public function activities()
    {
        return $this->belongsToMany(Activity::class, 'activity_questions', 'question_id', 'activity_id')
                    ->withPivot('ordem')
                    ->withTimestamps();
    }
}
