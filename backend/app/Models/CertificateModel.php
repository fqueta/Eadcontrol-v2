<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * CertificateModel
 * pt-BR: Modelo de certificado configurável pelo administrador.
 *        Cada modelo pode ou não estar vinculado a uma turma (id_turma).
 * en-US: Configurable certificate template. Each model may optionally be
 *        bound to a class (id_turma).
 */
class CertificateModel extends Model
{
    use HasFactory;

    protected $table = 'certificate_models';

    protected $fillable = [
        'name',
        'id_turma',
        'config',
        'ativo',
    ];

    protected $casts = [
        'id_turma' => 'integer',
        'config' => 'array',
    ];

    /**
     * turma
     * pt-BR: Turma vinculada ao modelo (opcional).
     * en-US: Class bound to the model (optional).
     */
    public function turma()
    {
        return $this->belongsTo(Turma::class, 'id_turma');
    }
}
