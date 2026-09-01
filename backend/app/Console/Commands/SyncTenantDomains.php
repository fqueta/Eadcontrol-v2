<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;
use Stancl\Tenancy\Database\Models\Domain;

class SyncTenantDomains extends Command
{
    protected $signature = 'tenancy:sync-domains';

    protected $description = 'Garante que os domínios (frontend + API) de cada tenant estejam registrados na tabela domains';

    /**
     * Mapa central de domínios por tenant.
     * Mantenha em sincronia com os server_name do nginx (backend/deployment/nginx/eadcontrol.conf).
     *
     * @var array<string, array<int, string>>
     */
    private array $domainMap = [
        'api-cursos' => [
            'cursos.incluireeducar.com.br',
            'api-cursos.incluireeducar.com.br',
        ],
        'hairacademyrj' => [
            'hairacademyrj.eadcontrol.com.br',
            'hairacademycursos.com.br',
            'api-hairacademyrj.eadcontrol.com.br',
            'api.hairacademycursos.com.br',
            'api-hairacademycursos.com.br',
            'api-hairacademycursos.eadcontrol.com.br',
        ],
        'api-aeroclubejf' => [
            'api-aeroclubejf2.eadcontrol.com.br',
        ],
    ];

    public function handle(): int
    {
        $created = 0;
        $skipped = 0;

        foreach ($this->domainMap as $tenantId => $domains) {
            $tenant = Tenant::find($tenantId);

            if (! $tenant) {
                $this->error("[{$tenantId}] Tenant não encontrado. Ignorando domínio(s).");
                continue;
            }

            foreach ($domains as $domain) {
                if (Domain::where('domain', $domain)->exists()) {
                    $this->line("[OK] {$domain} -> {$tenantId} (já registrado)");
                    $skipped++;
                    continue;
                }

                $tenant->domains()->create(['domain' => $domain]);
                $this->info("[+] {$domain} -> {$tenantId} (criado)");
                $created++;
            }
        }

        $this->newLine();
        $this->info("Domínios criados: {$created}. Já existentes: {$skipped}.");

        return Command::SUCCESS;
    }
}
