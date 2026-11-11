<?php
/**
 * Script to find and fix missing ID_antigo mappings in tenant DB.
 * Run inside container: php fix_legacy_ids.php
 */

require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Configure tenant connection
config(['database.connections.tenant' => [
    'driver' => 'mysql',
    'host' => env('DB_HOST', 'mysql'),
    'port' => env('DB_PORT', '3306'),
    'database' => 'eadconto_api-hairacademyrj',
    'username' => env('DB_USERNAME', 'eadcontrol'),
    'password' => env('DB_PASSWORD', 'A3d5C8e2M8'),
    'charset' => 'utf8mb4',
    'prefix' => '',
]]);

$db = \Illuminate\Support\Facades\DB::connection('tenant');

echo "=== Fetching clients from legacy API ===\n";
$response = \Illuminate\Support\Facades\Http::withToken('4|tt8vdJRBa8nMmQr2r1EwT8uIDSBGuEJkmsCRwh2ged18e349')
    ->timeout(120)
    ->get('https://api-legado-hair.eadcontrol.com.br/api/v1/clientes/export');
$clients = $response->json()['data'] ?? $response->json();
echo "Total clients from API: " . count($clients) . "\n";

// Build map: legacy_id => client data
$legacyClients = [];
foreach ($clients as $c) {
    $legacyClients[(string)$c['id']] = $c;
}

echo "=== Fetching enrollments from legacy API ===\n";
$response = \Illuminate\Support\Facades\Http::withToken('4|tt8vdJRBa8nMmQr2r1EwT8uIDSBGuEJkmsCRwh2ged18e349')
    ->timeout(120)
    ->get('https://api-legado-hair.eadcontrol.com.br/api/v1/matriculas/export');
$enrollments = $response->json()['data'] ?? $response->json();
echo "Total enrollments from API: " . count($enrollments) . "\n";

// Collect all unique id_cliente from enrollments
$idClientes = [];
foreach ($enrollments as $e) {
    if (!empty($e['id_cliente'])) {
        $idClientes[(string)$e['id_cliente']] = true;
    }
}
$idClientes = array_keys($idClientes);
echo "Unique id_cliente values in enrollments: " . count($idClientes) . "\n";

// Check which id_cliente values are mapped to users via ID_antigo
$mappedInDb = [];
$rows = $db->table('users')
    ->select('id', 'config')
    ->whereRaw("JSON_EXTRACT(config, '\$.ID_antigo') IS NOT NULL")
    ->get();
foreach ($rows as $row) {
    $cfg = json_decode($row->config, true);
    if ($legacyId = $cfg['ID_antigo'] ?? null) {
        $mappedInDb[(string)$legacyId] = $row->id;
    }
}
echo "Users with ID_antigo mapped: " . count($mappedInDb) . "\n";

// Find unmapped id_cliente values
$unmapped = [];
foreach ($idClientes as $cid) {
    if (!isset($mappedInDb[$cid])) {
        $unmapped[] = $cid;
    }
}
echo "Unmapped id_cliente values: " . count($unmapped) . "\n";
echo "Unmapped list: " . implode(', ', $unmapped) . "\n";

// For each unmapped, find client in legacy API and find matching DB user
echo "\n=== Analyzing unmapped id_cliente values ===\n";
$fixes = []; // legacy_id => db_user_id
$orphans = []; // legacy IDs not found in client API

foreach ($unmapped as $cid) {
    $client = $legacyClients[$cid] ?? null;
    if (!$client) {
        $orphans[] = $cid;
        echo "  id_cliente=$cid: NOT FOUND in legacy client API (orphan)\n";
        continue;
    }
    
    $cpf = preg_replace('/\D/', '', $client['cpf'] ?? '');
    $email = $client['email'] ?? '';
    $nome = ($client['nome'] ?? '') . ' ' . ($client['sobrenome'] ?? '');
    
    if (empty($cpf) && empty($email)) {
        $orphans[] = $cid;
        echo "  id_cliente=$cid ($nome): no CPF or email (orphan)\n";
        continue;
    }
    
    // Find user in DB by CPF
    $foundUser = null;
    if ($cpf) {
        $foundUser = $db->table('users')->where('cpf', $cpf)->first();
    }
    if (!$foundUser && $email) {
        $foundUser = $db->table('users')->where('email', $email)->first();
    }
    
    if ($foundUser) {
        $fixes[$cid] = [
            'user_id' => $foundUser->id,
            'legacy_id' => $cid,
            'client_name' => trim($nome),
            'matched_by' => $cpf ? 'CPF' : 'email',
        ];
        echo "  id_cliente=$cid -> user {$foundUser->id} ($nome) matched by {$fixes[$cid]['matched_by']}\n";
    } else {
        $orphans[] = $cid;
        echo "  id_cliente=$cid ($nome): no matching user found by CPF ($cpf) or email ($email)\n";
    }
}

echo "\n=== Summary ===\n";
echo "Total fixable: " . count($fixes) . "\n";
echo "Orphans (cannot fix): " . count($orphans) . " -> " . implode(', ', $orphans) . "\n";

if (count($fixes) === 0) {
    echo "No fixes needed.\n";
    exit(0);
}

echo "\n=== Applying fixes to tenant DB ===\n";

// For fixes: add the legacy ID to the user's legacy_ids array in config
$applied = 0;
foreach ($fixes as $cid => $fix) {
    $user = $db->table('users')->where('id', $fix['user_id'])->first();
    if (!$user) continue;
    
    $cfg = json_decode($user->config, true) ?? [];
    
    // Initialize legacy_ids array
    $legacyIds = $cfg['legacy_ids'] ?? [];
    if (!is_array($legacyIds)) $legacyIds = [$legacyIds];
    
    // Add current ID_antigo if not already in array
    $currentId = $cfg['ID_antigo'] ?? null;
    if ($currentId && !in_array((string)$currentId, $legacyIds)) {
        $legacyIds[] = (string)$currentId;
    }
    
    // Add the new legacy ID
    if (!in_array((string)$cid, $legacyIds)) {
        $legacyIds[] = (string)$cid;
    }
    
    // Also add ALL client IDs from the same CPF group
    $clientCpf = preg_replace('/\D/', '', $legacyClients[$cid]['cpf'] ?? '');
    if ($clientCpf) {
        foreach ($legacyClients as $otherId => $otherClient) {
            $otherCpf = preg_replace('/\D/', '', $otherClient['cpf'] ?? '');
            if ($otherCpf === $clientCpf && !in_array((string)$otherId, $legacyIds)) {
                $legacyIds[] = (string)$otherId;
            }
        }
    }
    
    $cfg['legacy_ids'] = array_values(array_unique($legacyIds));
    $newConfig = json_encode($cfg, JSON_UNESCAPED_UNICODE);
    
    $db->table('users')->where('id', $fix['user_id'])->update(['config' => $newConfig]);
    $applied++;
    
    echo "  Updated user {$fix['user_id']}: added legacy_ids=[" . implode(',', $cfg['legacy_ids']) . "]\n";
}

echo "\nApplied $applied fixes to DB.\n";

// Now re-check mapping
echo "\n=== Re-verifying mapping ===\n";
$mappedAfter = [];
$rows = $db->table('users')
    ->select('id', 'config')
    ->whereRaw("JSON_EXTRACT(config, '\$.ID_antigo') IS NOT NULL")
    ->get();
foreach ($rows as $row) {
    $cfg = json_decode($row->config, true);
    if ($legacyId = $cfg['ID_antigo'] ?? null) {
        $mappedAfter[(string)$legacyId] = $row->id;
    }
    // Also check legacy_ids array
    if ($legacyIds = $cfg['legacy_ids'] ?? null) {
        foreach ((array)$legacyIds as $lid) {
            $mappedAfter[(string)$lid] = $row->id;
        }
    }
}

$stillUnmapped = [];
foreach ($idClientes as $cid) {
    if (!isset($mappedAfter[$cid])) {
        $stillUnmapped[] = $cid;
    }
}
echo "Still unmapped: " . count($stillUnmapped) . " -> " . implode(', ', $stillUnmapped) . "\n";
echo "Done.\n";
