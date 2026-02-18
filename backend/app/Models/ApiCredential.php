<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ApiCredential extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'active',
        'config',
    ];

    protected $casts = [
        'active' => 'boolean',
        'config' => 'array',
    ];

    public function metas()
    {
        return $this->hasMany(ApiCredentialMeta::class);
    }

    /**
     * Get a meta value by key.
     *
     * @param string $key
     * @return mixed|null
     */
    public function getMeta($key)
    {
        $meta = $this->metas()->where('key', $key)->first();
        return $meta ? $meta->value : null;
    }

    /**
     * Update or create a meta value.
     *
     * @param string $key
     * @param mixed $value
     * @return ApiCredentialMeta
     */
    public function updateMeta($key, $value)
    {
        return $this->metas()->updateOrCreate(
            ['key' => $key],
            ['value' => $value]
        );
    }
}
