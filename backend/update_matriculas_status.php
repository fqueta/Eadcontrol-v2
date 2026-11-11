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
echo "Iniciando atualização de status das Matrículas para o tenant: {$tenant->id}\n";
$db = \Illuminate\Support\Facades\DB::connection('tenant');

// Mapeamento de status legado para situações (posts de situacao_matricula) e status enum ('a','g','p')
// 1 = Interessado (ID 1), 2 = Aguardando Matrícula / Realocar (ID 2/3), 3 = Matriculado (ID 2),
// 4 = Cursando (ID 4), 5 = Concluído (ID 5), 6 = Cancelado (ID 9)
$situacaoMap = [
    1 => ['situacao_id' => 1, 'status' => 'a'], // Interessado
    2 => ['situacao_id' => 2, 'status' => 'g'], // Aguardando
    3 => ['situacao_id' => 2, 'status' => 'a'], // Matriculado
    4 => ['situacao_id' => 4, 'status' => 'a'], // Cursando
    5 => ['situacao_id' => 5, 'status' => 'a'], // Concluído
    6 => ['situacao_id' => 9, 'status' => 'p'], // Cancelado
];

$token = '2|gBU9dbAM2N6JCR43Wx990nOd3RZ4U6uw3hGrFtfz8f7a472d';
$url = "https://api-legado-aero.eadcontrol.com.br/api/v1/matriculas/export?token={$token}";

$response = \Illuminate\Support\Facades\Http::withHeaders([
    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept' => 'application/json',
])->timeout(240)->get($url);

if (!$response->successful()) {
    echo "Erro ao buscar matrículas. Status: " . $response->status() . "\n";
    exit(1);
}

$data = $response->json()['data'] ?? [];
echo "Total de matrículas recebidas: " . count($data) . "\n";

$updatedCount = 0;
$notFound = 0;

foreach ($data as $m) {
    $legacyId = $m['id'] ?? null;
    $statusNum = (int)($m['status_numero'] ?? $m['status'] ?? 0);
    $statusNome = $m['status_nome'] ?? '';
    
    if (!$legacyId) continue;

    $mapInfo = $situacaoMap[$statusNum] ?? null;
    $situacaoId = $mapInfo['situacao_id'] ?? null;
    $statusEnum = $mapInfo['status'] ?? 'a';

    $matricula = \App\Models\Matricula::where('config->ID_antigo', (string)$legacyId)->first();
    if ($matricula) {
        $cfg = is_array($matricula->config) ? $matricula->config : (json_decode($matricula->config, true) ?: []);
        $cfg['status_numero_legado'] = $statusNum;
        $cfg['status_nome_legado'] = $statusNome;
        $cfg['is_matriculado'] = $m['is_matriculado'] ?? false;
        $cfg['is_interessado'] = $m['is_interessado'] ?? false;

        $matricula->situacao_id = $situacaoId;
        $matricula->status = $statusEnum;
        $matricula->config = $cfg;
        $matricula->save();
        $updatedCount++;
    } else {
        $notFound++;
    }
}

echo "Matrículas atualizadas com status e situacao_id: {$updatedCount}\n";
echo "Não encontradas no banco: {$notFound}\n";
