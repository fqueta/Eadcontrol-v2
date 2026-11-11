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
echo "Iniciando importação de Turmas para o tenant: {$tenant->id}\n";

$token = '2|gBU9dbAM2N6JCR43Wx990nOd3RZ4U6uw3hGrFtfz8f7a472d';
$url = "https://api-legado-aero.eadcontrol.com.br/api/v1/turmas/export?token={$token}";

$response = \Illuminate\Support\Facades\Http::withHeaders([
    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept' => 'application/json',
])->timeout(180)->get($url);

if (!$response->successful()) {
    echo "Erro ao buscar turmas da API legada. Status: " . $response->status() . "\n";
    echo $response->body() . "\n";
    exit(1);
}

$data = $response->json()['data'] ?? [];
echo "Total de turmas recebidas: " . count($data) . "\n";

// Mapeia cursos existentes por ID legado
$cursos = \App\Models\Curso::all();
$cursoMapByLegacy = [];
foreach ($cursos as $c) {
    $cfg = is_array($c->config) ? $c->config : json_decode($c->config, true);
    if (!empty($cfg['ID_antigo'])) {
        $cursoMapByLegacy[(string)$cfg['ID_antigo']] = $c->id;
    }
}

$imported = 0;
$updated = 0;
$skipped = 0;
$errors = 0;

foreach ($data as $turmaData) {
    try {
        $legacyId = $turmaData['id'] ?? null;
        $legacyCursoId = $turmaData['id_curso'] ?? null;
        $nome = $turmaData['nome'] ?? '';

        if (!$legacyId || empty($nome)) {
            $skipped++;
            continue;
        }

        $cursoId = $cursoMapByLegacy[(string)$legacyCursoId] ?? null;
        if (!$cursoId) {
            echo " [!] Curso legado {$legacyCursoId} não encontrado para turma '{$nome}' (Legacy ID: {$legacyId})\n";
            $skipped++;
            continue;
        }

        $turma = \App\Models\Turma::where('config->ID_antigo', (string)$legacyId)->first();
        $isNew = !$turma;
        if ($isNew) {
            $turma = new \App\Models\Turma();
            $turma->token = \Illuminate\Support\Str::uuid();
        }

        $config = is_array($turmaData['config'] ?? null) ? $turmaData['config'] : [];
        $config['ID_antigo'] = (string)$legacyId;

        $parseDate = function($val) {
            if (empty($val)) return null;
            try {
                return \Carbon\Carbon::parse($val)->format('Y-m-d');
            } catch (\Exception $e) {
                return null;
            }
        };

        $turma->id_curso = $cursoId;
        $turma->nome = $nome;
        $turma->inicio = $parseDate($turmaData['inicio'] ?? null);
        $turma->fim = $parseDate($turmaData['fim'] ?? null);
        $turma->max_alunos = (int)($turmaData['max_alunos'] ?? 0);
        $turma->ativo = ($turmaData['ativo'] ?? 's') === 's' ? 's' : 'n';
        $turma->config = $config;
        $turma->save();

        if ($isNew) {
            $imported++;
            echo " [+] Turma importada: [ID: {$turma->id} | Legacy: {$legacyId}] {$nome} -> Curso {$cursoId}\n";
        } else {
            $updated++;
            echo " [~] Turma atualizada: [ID: {$turma->id} | Legacy: {$legacyId}] {$nome}\n";
        }
    } catch (\Exception $e) {
        $errors++;
        echo " [x] Erro na turma: " . $e->getMessage() . "\n";
    }
}

echo "\n--- Resumo da Importação de Turmas ---\n";
echo "Total: " . count($data) . "\n";
echo "Importadas: {$imported}\n";
echo "Atualizadas: {$updated}\n";
echo "Puladas: {$skipped}\n";
echo "Erros: {$errors}\n";
