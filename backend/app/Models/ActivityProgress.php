<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityProgress extends Model
{
    use HasFactory;

    /**
     * Nome da tabela explícito.
     * EN: Explicit table name.
     */
    protected $table = 'activity_progress';

    /**
     * Campos permitidos para atribuição em massa.
     * EN: Mass-assignable fields.
     */
    protected $fillable = [
        'activity_id',
        'course_id',
        'id_matricula',
        'module_id',
        'seconds',
        'completed',
        'config',
    ];

    /**
     * Conversões de tipos (casts) para atributos do modelo.
     * EN: Attribute type casts for the model.
     */
    protected $casts = [
        'seconds' => 'integer',
        'completed' => 'boolean',
        'config' => 'array',
    ];

    /**
     * Relationship: Enrollment (Matricula)
     */
    public function matricula()
    {
        return $this->belongsTo(Matricula::class, 'id_matricula');
    }

    /**
     * Relationship: Activity
     */
    public function activity()
    {
        return $this->belongsTo(Activity::class, 'activity_id');
    }
}