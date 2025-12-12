<?php

use Illuminate\Support\Str;

if (! function_exists('tenant_slug')) {
    /**
     * Obtém o slug do tenant ativo.
     *
     * Prioriza o valor salvo em `tenant('slug')`. Em caso de ausência,
     * tenta derivar a partir do primeiro domínio do tenant (subdomínio).
     * Como último recurso, retorna o `tenant('id')`.
     *
     * @return string|null Slug atual do tenant ou null se não estiver inicializado
     */
    function tenant_slug(): ?string
    {
        $t = tenant();
        if (! $t) {
            return null;
        }

        // 1) Preferência: slug salvo em data (stancl/tenancy usa coluna JSON `data`)
        $slug = tenant('slug');
        if (is_string($slug) && $slug !== '') {
            return $slug;
        }

        // 2) Fallback: primeiro domínio -> parte antes do primeiro ponto (subdomínio)
        $domain = optional($t->domains()->first())->domain;
        if (is_string($domain) && $domain !== '') {
            $firstLabel = Str::before($domain, '.');

            // Se usar prefixo "api-" nos subdomínios (ex.: api-crm.localhost) e quiser somente "crm",
            // descomente as linhas abaixo:
            // if (str_starts_with($firstLabel, 'api-')) {
            //     return substr($firstLabel, 4);
            // }

            if ($firstLabel !== '') {
                return $firstLabel;
            }
        }

        // 3) Último recurso: chave primária do tenant
        return tenant('id');
    }
}
