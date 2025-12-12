<?php

namespace App\Models;

use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;

class Tenant extends BaseTenant implements TenantWithDatabase
{
    use HasDatabase, HasDomains;

    /**
     * Accessor: retorna o slug salvo na coluna JSON `data` do tenant.
     *
     * Caso não exista, retorna null. Prefira usar `tenant_slug()` para
     * aplicar fallback automático baseado no domínio quando necessário.
     *
     * @return string|null Slug persistido no registro do tenant
     */
    public function getSlugAttribute(): ?string
    {
        return $this->data['slug'] ?? null;
    }
}
