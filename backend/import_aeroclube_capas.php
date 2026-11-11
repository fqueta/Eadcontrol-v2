<?php

$dbHost = '127.0.0.1';
$dbName = 'eadconto_api-aeroclubejf';
$dbUser = 'eadcontrol';
$dbPass = '1qazxsw23edc';

try {
    $pdo = new PDO("mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4", $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
} catch (Exception $e) {
    die("Erro ao conectar no banco de dados: " . $e->getMessage() . "\n");
}

$storageDir = '/var/lib/docker/volumes/eadcontrol_storage_data/_data/tenantapi-aeroclubejf/app/public/file-storage';
if (!is_dir($storageDir)) {
    mkdir($storageDir, 0775, true);
    chown($storageDir, 'www-data');
    chgrp($storageDir, 'www-data');
}

$token = '2|gBU9dbAM2N6JCR43Wx990nOd3RZ4U6uw3hGrFtfz8f7a472d';
$page = 1;
$allCourses = [];

echo "Coletando cursos da API legada...\n";
while (true) {
    $url = "https://api-legado-aero.eadcontrol.com.br/api/v1/cursos?per_page=5&page={$page}&token={$token}";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $res = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        echo "Página {$page} retornou HTTP {$httpCode}. Encerrando paginação.\n";
        break;
    }

    $json = json_decode($res, true);
    $items = $json['data'] ?? [];
    if (empty($items)) {
        break;
    }

    foreach ($items as $item) {
        $allCourses[] = $item;
    }
    echo "Página {$page} carregada (" . count($items) . " cursos, acumulado: " . count($allCourses) . ")\n";
    $page++;
}

echo "Total de cursos encontrados na API legada: " . count($allCourses) . "\n";

$downloaded = 0;
$skipped = 0;
$failed = 0;

foreach ($allCourses as $c) {
    $legacyId = $c['ID_antigo'] ?? $c['id'] ?? null;
    $nome = $c['nome'] ?? $c['titulo'] ?? '';
    $rawCoverUrl = $c['imagem_capa'] ?? null;

    if (empty($rawCoverUrl)) {
        echo "[-] Curso ID_antigo {$legacyId} ('{$nome}'): sem imagem de capa informada.\n";
        $skipped++;
        continue;
    }

    // Replace eadcontrol.com.br with aeroclubejf.eadcontrol.com.br to reach cloudflare origin
    $downloadUrl = str_replace('https://eadcontrol.com.br/', 'https://aeroclubejf.eadcontrol.com.br/', $rawCoverUrl);
    $downloadUrl = str_replace('http://eadcontrol.com.br/', 'https://aeroclubejf.eadcontrol.com.br/', $downloadUrl);

    // Determine extension
    $pathParts = pathinfo(parse_url($downloadUrl, PHP_URL_PATH));
    $ext = strtolower($pathParts['extension'] ?? 'png');
    if (!in_array($ext, ['png', 'jpg', 'jpeg', 'webp', 'gif'])) {
        $ext = 'png';
    }

    // Match course in local database by ID_antigo or slug/nome
    $stmt = $pdo->prepare("SELECT id, nome, slug, config FROM cursos WHERE JSON_UNQUOTE(JSON_EXTRACT(config, '$.ID_antigo')) = :legacyId OR nome = :nome LIMIT 1");
    $stmt->execute([
        ':legacyId' => (string)$legacyId,
        ':nome' => $nome
    ]);
    $localCourse = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$localCourse) {
        echo "[!] Curso ID_antigo {$legacyId} ('{$nome}') não encontrado no banco local.\n";
        $failed++;
        continue;
    }

    $localCourseId = $localCourse['id'];
    $filename = "curso_{$localCourseId}_capa.{$ext}";
    $localFilePath = "{$storageDir}/{$filename}";
    $publicUrl = "https://api-aeroclubejf2.eadcontrol.com.br/tenancy/assets/file-storage/{$filename}";

    // Download file if not present or empty
    if (!file_exists($localFilePath) || filesize($localFilePath) === 0) {
        $ch = curl_init($downloadUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        $imgData = curl_exec($ch);
        $imgCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($imgCode === 200 && !empty($imgData)) {
            file_put_contents($localFilePath, $imgData);
            chown($localFilePath, 'www-data');
            chgrp($localFilePath, 'www-data');
            chmod($localFilePath, 0775);
            echo "[+] Imagem baixada para Curso {$localCourseId} ('{$nome}'): {$filename} (" . strlen($imgData) . " bytes)\n";
        } else {
            echo "[!] Falha ao baixar imagem do curso {$localCourseId}: HTTP {$imgCode} de {$downloadUrl}\n";
            $failed++;
            continue;
        }
    } else {
        echo "[=] Imagem já existente para Curso {$localCourseId}: {$filename}\n";
    }

    // Update config in database
    $config = json_decode($localCourse['config'] ?? '{}', true) ?: [];
    $config['cover'] = [
        'url' => $publicUrl,
        'title' => $nome,
        'file_id' => null
    ];
    // Also set imagem_capa for compatibility
    $config['imagem_capa'] = $publicUrl;

    $updateStmt = $pdo->prepare("UPDATE cursos SET config = :config WHERE id = :id");
    $updateStmt->execute([
        ':config' => json_encode($config, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        ':id' => $localCourseId
    ]);

    $downloaded++;
}

echo "\n=========================================\n";
echo "Importação de capas finalizada!\n";
echo "Total processado: " . count($allCourses) . "\n";
echo "Atualizados com capa: {$downloaded}\n";
echo "Sem imagem: {$skipped}\n";
echo "Falhas: {$failed}\n";
echo "=========================================\n";
