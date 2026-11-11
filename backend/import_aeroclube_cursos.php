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
echo "Iniciando importação de Cursos para o tenant: {$tenant->id}\n";
echo "Banco conectado: " . \Illuminate\Support\Facades\DB::connection('tenant')->getDatabaseName() . "\n";

$token = '2|gBU9dbAM2N6JCR43Wx990nOd3RZ4U6uw3hGrFtfz8f7a472d';
$url = "https://api-legado-aero.eadcontrol.com.br/api/v1/cursos/export?token={$token}";

$response = \Illuminate\Support\Facades\Http::withHeaders([
    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept' => 'application/json',
])->timeout(180)->get($url);

if (!$response->successful()) {
    echo "Erro ao buscar cursos da API legada. Status: " . $response->status() . "\n";
    echo $response->body() . "\n";
    exit(1);
}

$data = $response->json()['data'] ?? [];
echo "Total de cursos recebidos: " . count($data) . "\n";

$imported = 0;
$updated = 0;
$errors = 0;

foreach ($data as $courseData) {
    try {
        $legacyId = $courseData['ID_antigo'] ?? $courseData['id'] ?? null;
        $nome = $courseData['nome'] ?? $courseData['titulo'] ?? '';
        $slug = $courseData['slug'] ?? \Illuminate\Support\Str::slug($nome);
        
        if (empty($nome)) {
            continue;
        }

        // Procura se o curso já existe pelo ID_antigo no config ou pelo slug
        $curso = \App\Models\Curso::where('config->ID_antigo', (string)$legacyId)
            ->orWhere('slug', $slug)
            ->first();

        $isNew = !$curso;
        if ($isNew) {
            $curso = new \App\Models\Curso();
        }

        $config = is_array($courseData['config'] ?? null) ? $courseData['config'] : [];
        $config['ID_antigo'] = (string)$legacyId;

        // Formata os módulos e atividades
        $modulos = [];
        if (!empty($courseData['modulos']) && is_array($courseData['modulos'])) {
            foreach ($courseData['modulos'] as $mIdx => $m) {
                $modItem = [
                    'module_id' => $m['module_id'] ?? ($mIdx + 1),
                    'title' => $m['title'] ?? $m['name'] ?? "Módulo " . ($mIdx + 1),
                    'name' => $m['name'] ?? $m['title'] ?? "Módulo " . ($mIdx + 1),
                    'description' => $m['description'] ?? '',
                    'duration' => $m['duration'] ?? 0,
                    'tipo_duracao' => $m['type_duration'] ?? $m['tipo_duracao'] ?? 'seg',
                    'active' => $m['active'] ?? 's',
                    'atividades' => []
                ];

                if (!empty($m['atividades']) && is_array($m['atividades'])) {
                    foreach ($m['atividades'] as $aIdx => $a) {
                        $modItem['atividades'][] = [
                            'activity_id' => $a['activity_id'] ?? $a['id_antigo'] ?? ($aIdx + 1),
                            'id' => $a['id'] ?? $a['id_antigo'] ?? ($aIdx + 1),
                            'title' => $a['title'] ?? $a['name'] ?? "Atividade " . ($aIdx + 1),
                            'name' => $a['name'] ?? $a['title'] ?? "Atividade " . ($aIdx + 1),
                            'description' => $a['description'] ?? '',
                            'content' => $a['content'] ?? '',
                            'duration' => $a['duration'] ?? 0,
                            'type_duration' => $a['type_duration'] ?? 'seg',
                            'type_activities' => $a['type_activities'] ?? 'video',
                            'active' => $a['active'] ?? 's',
                        ];
                    }
                }
                $modulos[] = $modItem;
            }
        }

        $curso->nome = $nome;
        $curso->titulo = $courseData['titulo'] ?? $nome;
        $curso->slug = $slug;
        $curso->descricao = $courseData['descricao_curso'] ?? $courseData['descricao'] ?? '';
        $curso->obs = $courseData['observacoes'] ?? $courseData['obs'] ?? null;
        $curso->professor = is_array($courseData['instrutor'] ?? null) ? json_encode($courseData['instrutor']) : ($courseData['instrutor'] ?? null);
        $curso->ativo = ($courseData['ativo'] ?? 's') === 's' ? 's' : 'n';
        $curso->publicar = ($courseData['publicar'] ?? 's') === 's' ? 's' : 'n';
        $curso->duracao = (int)($courseData['duracao'] ?? 0);
        $curso->unidade_duracao = $courseData['unidade_duracao'] ?? 'seg';
        $curso->tipo = $courseData['tipo'] ?? 'ead';
        $curso->categoria = $courseData['categoria'] ?? null;
        $curso->inscricao = !empty($courseData['inscricao']) ? (float)$courseData['inscricao'] : 0.00;
        $curso->valor = !empty($courseData['valor']) ? (float)$courseData['valor'] : 0.00;
        $curso->parcelas = (int)($courseData['parcelas'] ?? 1) ?: 1;
        $curso->valor_parcela = !empty($courseData['valor_parcela']) ? (float)$courseData['valor_parcela'] : 0.00;
        $curso->config = $config;
        $curso->modulos = $modulos;
        $curso->save();

        if ($isNew) {
            $imported++;
            echo " [+] Curso importado: [ID: {$curso->id} | Legacy: {$legacyId}] {$nome} (Módulos: " . count($modulos) . ")\n";
        } else {
            $updated++;
            echo " [~] Curso atualizado: [ID: {$curso->id} | Legacy: {$legacyId}] {$nome} (Módulos: " . count($modulos) . ")\n";
        }
    } catch (\Exception $e) {
        $errors++;
        echo " [x] Erro ao importar curso '{$nome}': " . $e->getMessage() . "\n";
    }
}

echo "\n--- Resumo da Importação de Cursos ---\n";
echo "Total: " . count($data) . "\n";
echo "Importados: {$imported}\n";
echo "Atualizados: {$updated}\n";
echo "Erros: {$errors}\n";
