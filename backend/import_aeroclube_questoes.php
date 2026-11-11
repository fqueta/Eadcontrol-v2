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
echo "Iniciando importação de Questões de Provas/Simulados para o tenant: {$tenant->id}\n";
$db = \Illuminate\Support\Facades\DB::connection('tenant');

$token = '2|gBU9dbAM2N6JCR43Wx990nOd3RZ4U6uw3hGrFtfz8f7a472d';
$client = new \GuzzleHttp\Client([
    'timeout' => 60,
    'headers' => [
        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept' => 'application/json',
        'Authorization' => "Bearer {$token}",
    ]
]);

// 1. Busca lista de simulados
$respSimulados = $client->get("https://api-legado-aero.eadcontrol.com.br/api/v1/simulados?token={$token}");
$simulados = json_decode($respSimulados->getBody()->getContents(), true)['data'] ?? [];
echo "Total de simulados encontrados: " . count($simulados) . "\n";

$totalQuestoes = 0;
$totalOpcoes = 0;

foreach ($simulados as $sim) {
    $simId = $sim['id'] ?? null;
    $simNome = $sim['nome'] ?? '';
    $simToken = $sim['token'] ?? '';
    $totalPrevisto = $sim['total_questoes'] ?? 0;

    if (!$simId || $totalPrevisto == 0) continue;

    // Baixa o CSV com as questões do simulado
    $exportUrl = "https://api-legado-aero.eadcontrol.com.br/api/v1/simulados/{$simId}/export?formato=csv&token={$token}";
    try {
        $respCsv = $client->get($exportUrl);
        $csvContent = $respCsv->getBody()->getContents();
    } catch (\Exception $e) {
        echo " [x] Erro ao baixar simulado {$simId} ({$simNome}): " . $e->getMessage() . "\n";
        continue;
    }

    $stream = fopen('php://temp', 'r+');
    fwrite($stream, $csvContent);
    rewind($stream);

    $header = fgetcsv($stream);
    if (!$header) {
        fclose($stream);
        continue;
    }
    $headerMap = array_flip($header);

    $countSimQuestoes = 0;

    // No sistema legado, os gabaritos das 4 opções (A, B, C, D) são exportados com letras B..E (1-indexed):
    // B -> A, C -> B, D -> C, E -> D
    $mapGabarito = [
        'B' => 'A',
        'C' => 'B',
        'D' => 'C',
        'E' => 'D',
        'A' => 'A', // Fallback caso algum use A
    ];

    while (($row = fgetcsv($stream)) !== false) {
        $enunciado = trim($row[$headerMap['PERGUNTA'] ?? 4] ?? '');
        $rawGabarito = strtoupper(trim($row[$headerMap['GABARITO'] ?? 10] ?? ''));
        $gabarito = $mapGabarito[$rawGabarito] ?? $rawGabarito;
        $pontos = (float)($row[$headerMap['PONTOS'] ?? 11] ?? 1.0);
        if ($pontos <= 0) {
            $pontos = 1.0;
        }
        $ativo = strtolower(trim($row[$headerMap['ATIVO'] ?? 12] ?? 's')) === 'n' ? 'n' : 's';
        $ordem = (int)($row[$headerMap['ORDEM'] ?? 3] ?? 0);

        if (empty($enunciado)) continue;

        // Insere a questão na tabela questions
        $questionId = $db->table('questions')->insertGetId([
            'enunciado' => $enunciado,
            'tipo_pergunta' => 'multipla_escolha',
            'explicacao' => $row[$headerMap['OBSERVACAO'] ?? 13] ?? null,
            'pontos' => $pontos,
            'active' => $ativo,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Vincula na tabela activity_questions com o ID do simulado/atividade
        $db->table('activity_questions')->insert([
            'activity_id' => (int)$simId,
            'question_id' => $questionId,
            'ordem' => $ordem,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Opções A, B, C, D, E
        $opcoes = [
            'A' => $row[$headerMap['OPCAO_A'] ?? 5] ?? '',
            'B' => $row[$headerMap['OPCAO_B'] ?? 6] ?? '',
            'C' => $row[$headerMap['OPCAO_C'] ?? 7] ?? '',
            'D' => $row[$headerMap['OPCAO_D'] ?? 8] ?? '',
            'E' => $row[$headerMap['OPCAO_E'] ?? 9] ?? '',
        ];

        foreach ($opcoes as $letra => $textoOpcao) {
            $trimmedOpcao = trim($textoOpcao);
            if ($trimmedOpcao !== '') {
                $isCorreta = ($gabarito === $letra) ? 's' : 'n';
                $db->table('question_options')->insert([
                    'question_id' => $questionId,
                    'texto' => $trimmedOpcao,
                    'correta' => $isCorreta,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $totalOpcoes++;
            }
        }

        $countSimQuestoes++;
        $totalQuestoes++;
    }

    fclose($stream);

    echo " [+] Simulado [ID {$simId}] {$simNome}: {$countSimQuestoes} questões importadas com alternativas\n";
}

echo "\n=== Resumo da Importação de Questões ===\n";
echo "Total de Questões Importadas: {$totalQuestoes}\n";
echo "Total de Opções/Alternativas Gravadas: {$totalOpcoes}\n";
