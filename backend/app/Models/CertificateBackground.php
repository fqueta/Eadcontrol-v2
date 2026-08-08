<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * CertificateBackground
 * pt-BR: Imagem de fundo disponível na galeria de certificados.
 *        Cada modelo de certificado seleciona uma dessas imagens (bgUrl).
 * en-US: Background image available in the certificate gallery.
 *        Each certificate model picks one of these images (bgUrl).
 */
class CertificateBackground extends Model
{
    use HasFactory;

    protected $table = 'certificate_backgrounds';

    protected $fillable = [
        'name',
        'url',
        'ativo',
    ];
}
