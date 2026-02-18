<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApiCredentialMeta extends Model
{
    use HasFactory;

    protected $table = 'api_credential_meta';

    protected $fillable = [
        'api_credential_id',
        'key',
        'value',
    ];

    public function credential()
    {
        return $this->belongsTo(ApiCredential::class, 'api_credential_id');
    }
}
