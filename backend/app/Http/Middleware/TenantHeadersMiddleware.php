<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TenantHeadersMiddleware
{
    /**
     * Adiciona cabeçalhos com informações do tenant na resposta.
     *
     * - X-Tenant-Id: ID do tenant ativo (por domínio).
     * - X-Tenant-Slug: Slug do tenant ativo (helper tenant_slug). 
     *
     * Essa informação facilita o debug no frontend e em ferramentas como curl/postman.
     * O middleware não interfere no corpo da resposta nem nos status codes.
     */
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        // Obtém o ID do tenant atual
        $tenantId = null;
        try {
            $tenantId = tenant('id') ?? (tenancy()->tenant?->id ?? null);
        } catch (\Throwable $e) {
            // Ignora silenciosamente se o tenancy não estiver inicializado
        }

        // Obtém o slug via helper, quando disponível
        $tenantSlug = null;
        try {
            if (\function_exists('tenant_slug')) {
                $tenantSlug = tenant_slug();
            }
        } catch (\Throwable $e) {
            // Ignora silenciosamente caso não seja possível derivar o slug
        }

        if (!empty($tenantId)) {
            $response->headers->set('X-Tenant-Id', (string) $tenantId);
        }
        if (!empty($tenantSlug)) {
            $response->headers->set('X-Tenant-Slug', (string) $tenantSlug);
        }

        return $response;
    }
}