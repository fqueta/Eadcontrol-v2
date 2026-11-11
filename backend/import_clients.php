<?php
require_once __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Initialize tenant manually
$tenantId = 'api-hairacademyrj';
$tenant = \App\Models\Tenant::find($tenantId);
if (!$tenant) {
    $tenant = \App\Models\Tenant::where('data->slug', $tenantId)->first();
}
if (!$tenant) {
    echo "Tenant '$tenantId' not found. Listing tenants:\n";
    foreach (\App\Models\Tenant::all() as $t) {
        echo "  - {$t->id} (domains: " . json_encode($t->domains) . ")\n";
    }
    exit(1);
}

echo "Tenant found: {$tenant->id}\n";
tenancy()->initialize($tenant);
echo "Tenant database: " . DB::connection('tenant')->getDatabaseName() . "\n";

// Now User queries should use the tenant database
$userCount = \App\Models\User::count();
echo "Current users in tenant: $userCount\n";

if ($userCount == 0) {
    echo "WARNING: No users found in tenant DB. Checking connection...\n";
    try {
        $result = DB::connection('tenant')->select('SELECT COUNT(*) as cnt FROM users');
        echo "  Direct query count: " . $result[0]->cnt . "\n";
    } catch (\Exception $e) {
        echo "  Error: " . $e->getMessage() . "\n";
    }
}

$url = 'https://api-legado-hair.eadcontrol.com.br/api/v1/clientes/export?token=4|tt8vdJRBa8nMmQr2r1EwT8uIDSBGuEJkmsCRwh2ged18e349';
$response = \Illuminate\Support\Facades\Http::timeout(120)->get($url);
$data = $response->json()['data'] ?? [];
echo "Total clients from API: " . count($data) . "\n";

$imported = 0; $updated = 0; $skipped = 0; $errors = 0;
$defaultPassword = \Illuminate\Support\Facades\Hash::make('mudar12@3');

// Get existing users by ID_antigo
$existingUsers = \App\Models\User::whereNotNull('config')->get();
$existingByLegacy = [];
foreach ($existingUsers as $u) {
    $cfg = $u->config;
    if (is_string($cfg)) $cfg = json_decode($cfg, true);
    if (isset($cfg['ID_antigo'])) {
        $existingByLegacy[$cfg['ID_antigo']] = $u;
    }
}
echo "Existing users by ID_antigo: " . count($existingByLegacy) . "\n";

foreach ($data as $row) {
    try {
        $legacyId = (string)$row['id'];
        $email = $row['email'] ?? null;
        $cpf = $row['cpf'] ?? null;
        $cpfClean = $cpf ? preg_replace('/\D/', '', $cpf) : null;
        if (empty($email) && empty($cpfClean)) { $skipped++; continue; }

        // Find existing
        $existing = $existingByLegacy[$legacyId] ?? null;
        if (!$existing && $email) {
            $existing = \App\Models\User::where('email', $email)->first();
        }
        if (!$existing && $cpfClean) {
            $existing = \App\Models\User::where('cpf', $cpfClean)->first();
        }

        $nome = trim(($row['nome'] ?? '') . ' ' . ($row['sobrenome'] ?? ''));
        if (empty($nome)) $nome = $row['name'] ?? $email ?? 'Cliente ' . $legacyId;

        $config = ['ID_antigo' => $legacyId];
        if (!empty($row['celular'])) $config['celular'] = $row['celular'];
        if (!empty($row['telefone'])) $config['telefone_residencial'] = $row['telefone'];
        if (!empty($row['endereco'])) {
            $config['endereco'] = $row['endereco'];
            $config['numero'] = $row['numero'] ?? '';
            $config['bairro'] = $row['bairro'] ?? '';
            $config['cidade'] = $row['cidade'] ?? '';
            $config['uf'] = $row['uf'] ?? '';
            $config['cep'] = $row['cep'] ?? '';
        }
        if (!empty($row['data_nascimento'])) $config['nascimento'] = $row['data_nascimento'];
        if (!empty($row['profissao'])) $config['profissao'] = $row['profissao'];

        $attrs = [
            'name' => $nome,
            'cpf' => $cpfClean,
            'status' => ($row['ativo'] ?? true) ? 'actived' : 'inactive',
            'ativo' => ($row['ativo'] ?? true) ? 's' : 'n',
            'genero' => 'ni',
            'tipo_pessoa' => 'pf',
            'password' => $defaultPassword,
            'config' => $config,
        ];
        if ($email) $attrs['email'] = $email;

        if ($existing) {
            $currentConfig = $existing->config ? (is_array($existing->config) ? $existing->config : json_decode($existing->config, true)) : [];
            $attrs['config'] = array_merge($currentConfig ?? [], $config);
            $existing->update($attrs);
            $updated++;
        } else {
            $attrs['token'] = \Illuminate\Support\Str::random(60);
            $attrs['email'] = $email; // Set email for new records
            \App\Models\User::create($attrs);
            $imported++;
        }
    } catch (\Exception $e) {
        echo "Error on ID {$row['id']}: {$e->getMessage()}\n";
        $errors++;
    }
}

echo "\n--- Result ---\n";
echo "Imported: $imported\n";
echo "Updated: $updated\n";
echo "Skipped: $skipped\n";
echo "Errors: $errors\n";
