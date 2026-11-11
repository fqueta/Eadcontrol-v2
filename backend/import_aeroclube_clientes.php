<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$tenantId = 'api-aeroclubejf';
$tenant = \App\Models\Tenant::find($tenantId);
if (!$tenant) {
    echo "Tenant {$tenantId} não encontrado.\n";
    exit(1);
}

tenancy()->initialize($tenant);
echo "Iniciando importação de Clientes para o tenant: {$tenant->id}\n";

$token = '2|gBU9dbAM2N6JCR43Wx990nOd3RZ4U6uw3hGrFtfz8f7a472d';
$url = "https://api-legado-aero.eadcontrol.com.br/api/v1/clientes/export?token={$token}";

$response = \Illuminate\Support\Facades\Http::withHeaders([
    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept' => 'application/json',
])->timeout(180)->get($url);

if (!$response->successful()) {
    echo "Erro ao buscar clientes da API legada. Status: " . $response->status() . "\n";
    exit(1);
}

$data = $response->json()['data'] ?? [];
echo "Total de clientes recebidos: " . count($data) . "\n";

// Map existing users in tenant
$existingUsers = \App\Models\User::all();
$existingByLegacy = [];
$existingByEmail = [];
$existingByCpf = [];

foreach ($existingUsers as $u) {
    $cfg = is_array($u->config) ? $u->config : json_decode($u->config, true);
    if (!empty($cfg['ID_antigo'])) {
        $existingByLegacy[(string)$cfg['ID_antigo']] = $u;
    }
    if (!empty($u->email)) {
        $existingByEmail[strtolower(trim($u->email))] = $u;
    }
    if (!empty($u->cpf)) {
        $cleanCpf = preg_replace('/\D/', '', $u->cpf);
        if ($cleanCpf) $existingByCpf[$cleanCpf] = $u;
    }
}

$defaultPassword = \Illuminate\Support\Facades\Hash::make('mudar12@3');
$imported = 0;
$updated = 0;
$errors = 0;

foreach ($data as $c) {
    try {
        $legacyId = $c['id'] ?? null;
        $email = !empty($c['email']) ? strtolower(trim($c['email'])) : null;
        $rawCpf = $c['cpf'] ?? null;
        $cleanCpf = $rawCpf ? preg_replace('/\D/', '', $rawCpf) : null;
        
        $nome = trim(($c['nome'] ?? '') . ' ' . ($c['sobrenome'] ?? ''));
        if (empty($nome)) {
            $nome = $email ?: "Aluno {$legacyId}";
        }

        // Buscar usuário existente
        $user = null;
        if ($legacyId && isset($existingByLegacy[(string)$legacyId])) {
            $user = $existingByLegacy[(string)$legacyId];
        } elseif ($email && isset($existingByEmail[$email])) {
            $user = $existingByEmail[$email];
        } elseif ($cleanCpf && isset($existingByCpf[$cleanCpf])) {
            $user = $existingByCpf[$cleanCpf];
        }

        $isNew = !$user;
        if ($isNew) {
            $user = new \App\Models\User();
            $user->id = (string)\Illuminate\Support\Str::uuid();
            $user->password = $defaultPassword;
            $user->permission_id = 7; // Cliente
        }

        $config = is_array($user->config) ? $user->config : (json_decode($user->config, true) ?: []);
        $config['ID_antigo'] = (string)$legacyId;
        if (!empty($c['canac'])) $config['canac'] = $c['canac'];
        if (!empty($c['id_asaas'])) $config['id_asaas'] = $c['id_asaas'];
        if (!empty($c['cidade'])) $config['cidade'] = $c['cidade'];
        if (!empty($c['uf'])) $config['uf'] = $c['uf'];

        $user->name = $nome;
        $user->tipo_pessoa = 'pf';
        if ($email) $user->email = $email;
        if ($cleanCpf) $user->cpf = $cleanCpf;
        $user->celular = !empty($c['celular']) ? $c['celular'] : ($c['telefone'] ?? null);
        $isAtivo = in_array((string)($c['ativo'] ?? '1'), ['1', 's', 'true'], true);
        $user->status = $isAtivo ? 'actived' : 'inactived';
        $user->ativo = $isAtivo ? 's' : 'n';
        $user->config = $config;
        $user->save();

        if ($legacyId) $existingByLegacy[(string)$legacyId] = $user;
        if ($email) $existingByEmail[$email] = $user;
        if ($cleanCpf) $existingByCpf[$cleanCpf] = $user;

        if ($isNew) {
            $imported++;
        } else {
            $updated++;
        }
    } catch (\Exception $e) {
        $errors++;
        // Se der conflito de chave única (ex: email vazio duplicado), loga
    }
}

echo "\n--- Resumo da Importação de Clientes ---\n";
echo "Total: " . count($data) . "\n";
echo "Importados: {$imported}\n";
echo "Atualizados: {$updated}\n";
echo "Erros: {$errors}\n";
