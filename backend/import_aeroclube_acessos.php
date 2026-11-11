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
echo "Iniciando importação de Registros de Acesso para o tenant: {$tenant->id}\n";
$db = \Illuminate\Support\Facades\DB::connection('tenant');

// Map Users: ID_antigo -> novo UUID
echo "Carregando mapa de usuários...\n";
$userRows = $db->table('users')->select('id', 'config')->get();
$userMap = [];
foreach ($userRows as $u) {
    $cfg = json_decode($u->config, true);
    if (!empty($cfg['ID_antigo'])) {
        $userMap[(string)$cfg['ID_antigo']] = $u->id;
    }
}
echo "Usuários mapeados: " . count($userMap) . "\n";

$parseDateSafe = function ($dateStr, $default) {
    if (empty($dateStr)) return $default;
    try {
        $ts = strtotime($dateStr);
        if ($ts === false || $ts < 0 || date('Y', $ts) < 2000) return $default;
        return date('Y-m-d H:i:s', $ts);
    } catch (\Exception $e) {
        return $default;
    }
};

$token = '2|gBU9dbAM2N6JCR43Wx990nOd3RZ4U6uw3hGrFtfz8f7a472d';
$baseUrl = 'https://api-legado-aero.eadcontrol.com.br/api/v1/acessos';
$perPage = 1000;
$page = 1;
$totalImported = 0;
$totalSkipped = 0;

$client = new \GuzzleHttp\Client([
    'timeout' => 60,
    'headers' => [
        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept' => 'application/json',
        'Authorization' => "Bearer {$token}",
    ]
]);

// Limpa tabela tracking_events
echo "Limpando tracking_events anterior...\n";
$db->table('tracking_events')->truncate();

do {
    $url = "{$baseUrl}?per_page={$perPage}&page={$page}&token={$token}";
    try {
        $response = $client->get($url);
        $json = json_decode($response->getBody()->getContents(), true);
    } catch (\Exception $e) {
        echo "Erro na página {$page}: " . $e->getMessage() . " - tentando novamente...\n";
        sleep(2);
        try {
            $response = $client->get($url);
            $json = json_decode($response->getBody()->getContents(), true);
        } catch (\Exception $e2) {
            echo "Falha definitiva na página {$page}: " . $e2->getMessage() . "\n";
            break;
        }
    }

    $records = $json['data'] ?? [];
    if (empty($records)) {
        break;
    }

    $lastPage = $json['meta']['last_page'] ?? $page;
    $totalRecords = $json['meta']['total'] ?? 0;

    $batchInsert = [];
    $now = date('Y-m-d H:i:s');

    foreach ($records as $row) {
        $legacyUserId = $row['id_usuario'] ?? null;
        $uuid = $userMap[(string)$legacyUserId] ?? null;

        $dt = $row['data_hora'] ?? ($row['data'] . ' ' . ($row['hora'] ?? '00:00:00'));
        $createdAt = $parseDateSafe($dt, $now);

        $metadata = json_encode([
            'id_antigo' => $row['id'] ?? null,
            'id_usuario_legado' => $legacyUserId,
            'acao' => $row['acao'] ?? 'login',
        ]);

        $batchInsert[] = [
            'event_type' => 'view',
            'user_id' => $uuid ?: (string)$legacyUserId,
            'phone' => null,
            'url' => '/login',
            'ip_address' => substr($row['ip'] ?? '', 0, 45) ?: null,
            'resource_type' => 'auth',
            'resource_id' => null,
            'metadata' => $metadata,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ];
    }

    if (!empty($batchInsert)) {
        foreach (array_chunk($batchInsert, 500) as $chunk) {
            $db->table('tracking_events')->insert($chunk);
        }
        $totalImported += count($batchInsert);
    }

    echo " [Página {$page}/{$lastPage}] Acessos importados: {$totalImported} (Total alvo: {$totalRecords})\n";

    $page++;
} while ($page <= $lastPage);

echo "\n=== Resumo da Importação de Acessos ===\n";
echo "Total de Registros de Acesso Importados: {$totalImported}\n";
