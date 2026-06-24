<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SaasGatewayConfig extends Model
{
    protected $connection = 'mysql';

    protected $table = 'saas_gateway_configs';

    protected $fillable = [
        'provider',
        'api_key',
        'environment',
        'webhook_secret',
        'active',
        'config',
    ];

    protected $casts = [
        'active' => 'boolean',
        'config' => 'array',
    ];

    public static function getActiveConfig(?string $provider = 'asaas'): ?self
    {
        return static::where('provider', $provider)->where('active', true)->first();
    }

    public function isSandbox(): bool
    {
        return $this->environment === 'sandbox';
    }
}
