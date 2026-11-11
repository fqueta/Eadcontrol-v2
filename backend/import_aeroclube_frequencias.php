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
echo "Iniciando importação de Frequências para o tenant: {$tenant->id}\n";

$db = \Illuminate\Support\Facades\DB::connection('tenant');
echo "Banco conectado: " . $db->getDatabaseName() . "\n";

// Map Matrículas: ID_antigo -> novo ID
echo "Carregando mapa de matrículas...\n";
$matriculaRows = $db->table('matriculas')->select('id', 'config')->get();
$matriculaMap = [];
foreach ($matriculaRows as $m) {
    $cfg = json_decode($m->config, true);
    if (!empty($cfg['ID_antigo'])) {
        $matriculaMap[(string)$cfg['ID_antigo']] = $m->id;
    }
}
echo "Matrículas mapeadas: " . count($matriculaMap) . "\n";

// Map Cursos: ID_antigo -> novo ID
echo "Carregando mapa de cursos...\n";
$cursoRows = $db->table('cursos')->select('id', 'config')->get();
$cursoMap = [];
foreach ($cursoRows as $c) {
    $cfg = json_decode($c->config, true);
    if (!empty($cfg['ID_antigo'])) {
        $cursoMap[(string)$cfg['ID_antigo']] = $c->id;
    }
}
echo "Cursos mapeados: " . count($cursoMap) . "\n";

// Função para sanitizar e normalizar datas inválidas (-0001, 0000-00-00, null, etc.)
$parseDateSafe = function ($dateStr, $default) {
    if (empty($dateStr)) {
        return $default;
    }
    try {
        $ts = strtotime($dateStr);
        if ($ts === false || $ts < 0 || date('Y', $ts) < 2000) {
            return $default;
        }
        return date('Y-m-d H:i:s', $ts);
    } catch (\Exception $e) {
        return $default;
    }
};

$token = '2|gBU9dbAM2N6JCR43Wx990nOd3RZ4U6uw3hGrFtfz8f7a472d';
$baseUrl = 'https://api-legado-aero.eadcontrol.com.br/api/v1/frequencias';
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

// Limpa tabela antes de reimportar completo
echo "Limpando activity_progress anterior para importação limpa...\n";
$db->table('activity_progress')->truncate();

do {
    $url = "{$baseUrl}?per_page={$perPage}&page={$page}&token={$token}";
    try {
        $response = $client->get($url);
        $json = json_decode($response->getBody()->getContents(), true);
    } catch (\Exception $e) {
        echo "Erro na página {$page}: " . $e->getMessage() . " - tentando novamente em 2s...\n";
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
        $legacyMatriculaId = $row['id_matricula'] ?? null;
        $legacyCursoId = $row['id_curso'] ?? null;
        $legacyAtividadeId = $row['id_atividade'] ?? 0;
        $legacyModuloId = $row['id_modulo'] ?? null;

        $newMatriculaId = $matriculaMap[(string)$legacyMatriculaId] ?? null;
        $newCursoId = $cursoMap[(string)$legacyCursoId] ?? (int)$legacyCursoId;

        if (!$newMatriculaId) {
            $totalSkipped++;
            continue;
        }

        $concluido = ($row['concluido'] ?? 'n') === 's' ? 1 : 0;
        $progresso = (int)($row['progresso'] ?? 0);
        $duracao = (int)($row['duracao'] ?? 0);
        
        $seconds = $duracao > 0 ? (int)(($progresso / 100) * $duracao) : ($concluido ? 1 : 0);

        $createdAt = $parseDateSafe($row['data'] ?? null, $now);
        $updatedAt = $parseDateSafe($row['ultimo_acesso'] ?? null, $createdAt);

        $config = json_encode([
            'id_antigo' => $row['id'] ?? null,
            'id_cliente_antigo' => $row['id_cliente'] ?? null,
            'progresso_percent' => $progresso,
            'tipo' => $row['tipo'] ?? null,
        ]);

        $batchInsert[] = [
            'activity_id' => (int)$legacyAtividadeId,
            'course_id' => (int)$newCursoId,
            'id_matricula' => (int)$newMatriculaId,
            'module_id' => $legacyModuloId ? (int)$legacyModuloId : null,
            'seconds' => $seconds,
            'completed' => $concluido,
            'config' => $config,
            'created_at' => $createdAt,
            'updated_at' => $updatedAt,
        ];
    }

    if (!empty($batchInsert)) {
        foreach (array_chunk($batchInsert, 500) as $chunk) {
            $db->table('activity_progress')->insert($chunk);
        }
        $totalImported += count($batchInsert);
    }

    echo " [Página {$page}/{$lastPage}] Processados: {$totalImported} | Pulados: {$totalSkipped} (Total alvo: {$totalRecords})\n";

    $page++;
} while ($page <= $lastPage);

echo "\n=== Resumo da Importação de Frequências ===\n";
echo "Total de Frequências Importadas: {$totalImported}\n";
echo "Total Puladas (matrícula não encontrada): {$totalSkipped}\n";
