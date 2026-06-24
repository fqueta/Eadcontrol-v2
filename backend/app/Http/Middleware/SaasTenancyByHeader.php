<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Tenant;

/**
 * Middleware para inicializar a tenancy com base no header X-Tenant-Id.
 * Isso permite que rotas do domínio central (como o painel SaaS) autentiquem os tokens
 * gravados no banco do tenant correspondente.
 */
class SaasTenancyByHeader
{
    public function handle(Request $request, Closure $next)
    {
        $tenantId = $request->header('X-Tenant-Id');
        error_log('SaasTenancyByHeader - X-Tenant-Id: ' . ($tenantId ?? 'NULL'));

        if ($tenantId) {
            try {
                // Tenta achar diretamente (ex: api-hair) ou adicionando o prefixo padrão (ex: hair -> api-hair)
                $tenant = Tenant::find($tenantId) ?? Tenant::find('api-' . $tenantId);
                error_log('SaasTenancyByHeader - Found by ID/Prefix: ' . ($tenant ? $tenant->id : 'NO'));
                
                if (!$tenant) {
                    // Se ainda não achar, busca na tabela de domínios (ex: hair no meio de api-hair.localhost)
                    $domainRecord = \DB::table('domains')
                        ->where('domain', 'like', '%' . $tenantId . '%')
                        ->first();
                    error_log('SaasTenancyByHeader - Domain record query for "' . $tenantId . '": ' . ($domainRecord ? json_encode($domainRecord) : 'NOT FOUND'));
                    if ($domainRecord) {
                        $tenant = Tenant::find($domainRecord->tenant_id);
                        error_log('SaasTenancyByHeader - Found by domain query: ' . ($tenant ? $tenant->id : 'NO'));
                    }
                }

                if ($tenant) {
                    tenancy()->initialize($tenant);
                    error_log('SaasTenancyByHeader - Tenancy initialized successfully for: ' . $tenant->id);
                } else {
                    error_log('SaasTenancyByHeader - No tenant found for ID: ' . $tenantId);
                }
            } catch (\Throwable $e) {
                error_log('SaasTenancyByHeader - Error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            }
        } else {
            error_log('SaasTenancyByHeader - X-Tenant-Id header is missing.');
        }

        return $next($request);
    }
}
