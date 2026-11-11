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
echo "Iniciando importação de Matrículas para o tenant: {$tenant->id}\n";

$token = '2|gBU9dbAM2N6JCR43Wx990nOd3RZ4U6uw3hGrFtfz8f7a472d';
$url = "https://api-legado-aero.eadcontrol.com.br/api/v1/matriculas/export?token={$token}";

$response = \Illuminate\Support\Facades\Http::withHeaders([
    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept' => 'application/json',
])->timeout(240)->get($url);

if (!$response->successful()) {
    echo "Erro ao buscar matrículas da API legada. Status: " . $response->status() . "\n";
    exit(1);
}

$data = $response->json()['data'] ?? [];
echo "Total de matrículas recebidas: " . count($data) . "\n";

// Map Cursos by ID_antigo
$cursoMap = [];
foreach (\App\Models\Curso::all() as $c) {
    $cfg = is_array($c->config) ? $c->config : json_decode($c->config, true);
    if (!empty($cfg['ID_antigo'])) {
        $cursoMap[(string)$cfg['ID_antigo']] = $c->id;
    }
}

// Map Turmas by ID_antigo
$turmaMap = [];
foreach (\App\Models\Turma::all() as $t) {
    $cfg = is_array($t->config) ? $t->config : json_decode($t->config, true);
    if (!empty($cfg['ID_antigo'])) {
        $turmaMap[(string)$cfg['ID_antigo']] = $t->id;
    }
}

// Map Users/Students by ID_antigo
$userMap = [];
foreach (\App\Models\User::all() as $u) {
    $cfg = is_array($u->config) ? $u->config : json_decode($u->config, true);
    if (!empty($cfg['ID_antigo'])) {
        $userMap[(string)$cfg['ID_antigo']] = $u->id;
    }
}

$imported = 0;
$updated = 0;
$skipped = 0;
$errors = 0;

foreach ($data as $m) {
    try {
        $legacyId = $m['id'] ?? null;
        $legacyClientId = $m['id_cliente'] ?? null;
        $legacyCursoId = $m['id_curso'] ?? null;
        $legacyTurmaId = $m['id_turma'] ?? null;

        if (!$legacyId) {
            $skipped++;
            continue;
        }

        $userId = $userMap[(string)$legacyClientId] ?? null;
        $cursoId = $cursoMap[(string)$legacyCursoId] ?? null;

        if (!$userId || !$cursoId) {
            $skipped++;
            continue;
        }

        $turmaId = $turmaMap[(string)$legacyTurmaId] ?? 0;

        $matricula = \App\Models\Matricula::where('config->ID_antigo', (string)$legacyId)->first();
        $isNew = !$matricula;
        if ($isNew) {
            $matricula = new \App\Models\Matricula();
        }

        $config = is_array($m['config'] ?? null) ? $m['config'] : (json_decode($m['config'] ?? '', true) ?: []);
        $config['ID_antigo'] = (string)$legacyId;
        if (!empty($m['meta'])) $config['meta'] = $m['meta'];

        $matricula->id_cliente = (string)$userId;
        $matricula->id_curso = (int)$cursoId;
        $matricula->id_turma = (int)$turmaId;
        $matricula->desconto = !empty($m['desconto']) ? (float)$m['desconto'] : 0.00;
        $matricula->subtotal = !empty($m['subtotal']) ? (float)$m['subtotal'] : 0.00;
        $matricula->total = !empty($m['total']) ? (float)$m['total'] : 0.00;
        $matricula->ativo = ($m['ativo'] ?? 's') === 's' ? 's' : 'n';
        $matricula->status = 'a';
        $matricula->config = $config;
        $matricula->save();

        if ($isNew) {
            $imported++;
        } else {
            $updated++;
        }
    } catch (\Exception $e) {
        $errors++;
    }
}

echo "\n--- Resumo da Importação de Matrículas ---\n";
echo "Total: " . count($data) . "\n";
echo "Importadas: {$imported}\n";
echo "Atualizadas: {$updated}\n";
echo "Puladas (sem aluno ou curso correspondente): {$skipped}\n";
echo "Erros: {$errors}\n";
