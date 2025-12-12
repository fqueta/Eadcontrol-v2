<?php
/**
 * PT: Converte INSERTs de cursos.sql para JSON em database/seeders/data/cursos.json.
 * EN: Convert INSERTs from cursos.sql to JSON at database/seeders/data/cursos.json.
 */

/**
 * PT: Lê o arquivo SQL e extrai todos os INSERT INTO cursos(... ) VALUES (...).
 * EN: Read SQL file and extract all INSERT INTO cursos(... ) VALUES (...).
 */
function extractCursosInserts(string $sql): array {
    /**
     * PT: Faz parsing manual do arquivo SQL para encontrar blocos de INSERT em `cursos`,
     *     garantindo que o ponto-e-vírgula final seja capturado apenas em nível top (fora de strings).
     * EN: Manually parse the SQL file to find INSERT blocks for `cursos`,
     *     ensuring the terminating semicolon is captured only at top-level (outside strings).
     */
    $results = [];
    $len = strlen($sql);
    $i = 0;
    while ($i < $len) {
        // PT: Procura próximo "INSERT INTO cursos" (com ou sem crases)
        // EN: Find next "INSERT INTO cursos" (with or without backticks)
        $pos = stripos($sql, 'INSERT INTO', $i);
        if ($pos === false) break;
        $i = $pos;
        // Confirma que é para a tabela cursos
        $after = substr($sql, $i, 5000); // janela suficiente
        if (!preg_match('/^INSERT\s+INTO\s+`?cursos`?/i', $after)) {
            $i += 11; // avança além de INSERT
            continue;
        }
        // Extrai cabeçalho de colunas: ( ... )
        $openCols = strpos($sql, '(', $i);
        if ($openCols === false) { $i += 11; continue; }
        [$columnsRaw, $closeColsPos] = readBracketBlock($sql, $openCols);
        if ($columnsRaw === null) { $i = $openCols + 1; continue; }
        // Avança até VALUES
        $afterCols = stripos($sql, 'VALUES', $closeColsPos);
        if ($afterCols === false) { $i = $closeColsPos + 1; continue; }
        $afterValues = $afterCols + 6;
        // Lê bloco de VALUES até ';' top-level
        [$valuesChunk, $stmtEnd] = readUntilTopLevelSemicolon($sql, $afterValues);
        if ($valuesChunk === null) { $i = $afterValues + 1; continue; }

        $columns = array_map(fn($c) => trim(str_replace('`', '', $c)), explode(',', trim($columnsRaw)));
        $sets = splitValuesSets(trim($valuesChunk));
        foreach ($sets as $set) {
            $values = splitFields($set);
            if (count($values) !== count($columns)) {
                // PT: Ignora linhas malformadas; pode haver campos extras/menos por dados sujos.
                // EN: Skip malformed rows; may happen with dirty data.
                continue;
            }
            $row = [];
            foreach ($columns as $idx => $col) {
                $row[$col] = normalizeSqlValue($values[$idx]);
            }
            $results[] = $row;
        }
        // Continua após o fim da instrução
        $i = $stmtEnd + 1;
    }
    return $results;
}

/**
 * PT: Lê um bloco delimitado por parênteses a partir de uma posição, respeitando aspas/escapes.
 * EN: Read a parenthesis-delimited block from a position, honoring quotes/escapes.
 */
function readBracketBlock(string $src, int $openPos): array {
    $len = strlen($src);
    $buf = '';
    $depth = 0;
    $inSingle = false;
    $inDouble = false;
    for ($i = $openPos; $i < $len; $i++) {
        $ch = $src[$i];
        $prev = $i > 0 ? $src[$i-1] : null;
        if ($ch === "'" && !$inDouble && ($prev !== '\\')) { $inSingle = !$inSingle; }
        elseif ($ch === '"' && !$inSingle && ($prev !== '\\')) { $inDouble = !$inDouble; }
        if (!$inSingle && !$inDouble) {
            if ($ch === '(') { $depth++; }
            if ($ch === ')') { $depth--; if ($depth === 0) { // fecha
                return [substr($buf, 1), $i]; // remove o '(' inicial
            }}
        }
        $buf .= $ch;
    }
    return [null, $openPos];
}

/**
 * PT: Lê até ponto-e-vírgula ';' em nível top (fora de aspas/parenteses), devolvendo o conteúdo e posição.
 * EN: Read until a top-level ';' (outside quotes/parentheses), returning content and position.
 */
function readUntilTopLevelSemicolon(string $src, int $start): array {
    $len = strlen($src);
    $buf = '';
    $inSingle = false;
    $inDouble = false;
    $depth = 0; // parenteses
    for ($i = $start; $i < $len; $i++) {
        $ch = $src[$i];
        $prev = $i > 0 ? $src[$i-1] : null;
        if ($ch === "'" && !$inDouble && ($prev !== '\\')) { $inSingle = !$inSingle; }
        elseif ($ch === '"' && !$inSingle && ($prev !== '\\')) { $inDouble = !$inDouble; }
        if (!$inSingle && !$inDouble) {
            if ($ch === '(') { $depth++; }
            elseif ($ch === ')') { $depth--; }
            elseif ($ch === ';' && $depth === 0) { return [$buf, $i]; }
        }
        $buf .= $ch;
    }
    return [null, $start];
}

/**
 * PT: Divide o bloco de VALUES em conjuntos individuais top-level: ( ... ), ( ... ).
 * EN: Split VALUES chunk into top-level sets: ( ... ), ( ... ).
 */
function splitValuesSets(string $chunk): array {
    $sets = [];
    $buf = '';
    $depth = 0;
    $inSingle = false;
    $inDouble = false;
    $len = strlen($chunk);
    for ($i = 0; $i < $len; $i++) {
        $ch = $chunk[$i];
        $prev = $i > 0 ? $chunk[$i-1] : null;
        if ($ch === "'" && !$inDouble && ($prev !== '\\')) {
            $inSingle = !$inSingle;
        } elseif ($ch === '"' && !$inSingle && ($prev !== '\\')) {
            $inDouble = !$inDouble;
        }
        if (!$inSingle && !$inDouble) {
            if ($ch === '(') $depth++;
            if ($ch === ')') $depth--;
            if ($depth === 0 && $ch === ',') {
                // fim de um set
                $sets[] = trim($buf);
                $buf = '';
                continue;
            }
        }
        $buf .= $ch;
    }
    if (trim($buf) !== '') {
        $sets[] = trim($buf);
    }
    // Remove parênteses exteriores
    $sets = array_map(function ($s) {
        $s = trim($s);
        if (strlen($s) >= 2 && $s[0] === '(' && substr($s, -1) === ')') {
            return substr($s, 1, -1);
        }
        return $s;
    }, $sets);
    return $sets;
}

/**
 * PT: Divide campos de um set considerando aspas e escapes.
 * EN: Split fields within a set respecting quotes and escapes.
 */
function splitFields(string $set): array {
    $fields = [];
    $buf = '';
    $inSingle = false;
    $inDouble = false;
    $len = strlen($set);
    for ($i = 0; $i < $len; $i++) {
        $ch = $set[$i];
        $prev = $i > 0 ? $set[$i-1] : null;
        if ($ch === "'" && !$inDouble && ($prev !== '\\')) {
            $inSingle = !$inSingle;
        } elseif ($ch === '"' && !$inSingle && ($prev !== '\\')) {
            $inDouble = !$inDouble;
        }
        if (!$inSingle && !$inDouble && $ch === ',') {
            $fields[] = trim($buf);
            $buf = '';
            continue;
        }
        $buf .= $ch;
    }
    if (trim($buf) !== '') {
        $fields[] = trim($buf);
    }
    return $fields;
}

/**
 * PT: Normaliza valor SQL (NULL, strings com aspas, escapes, números).
 * EN: Normalize SQL value (NULL, quoted strings, escapes, numbers).
 */
function normalizeSqlValue(string $value) {
    $v = trim($value);
    if (strcasecmp($v, 'NULL') === 0) {
        return null;
    }
    // Remove aspas simples/dobras externas
    if ((strlen($v) >= 2) && (($v[0] === "'" && substr($v, -1) === "'") || ($v[0] === '"' && substr($v, -1) === '"'))) {
        $v = substr($v, 1, -1);
        // Desescapa sequências comuns
        $v = str_replace(['\\"', "\\'", '\\n', '\\r', '\\t', '\\0'], ['"', "'", "\n", "\r", "\t", "\0"], $v);
    }
    // Numérico?
    if (is_numeric($v)) {
        return strpos($v, '.') !== false ? (float)$v : (int)$v;
    }
    return $v;
}

/**
 * PT: Executa conversão arquivo->JSON.
 * EN: Run file->JSON conversion.
 */
function run(): int {
    $in = 'database/seeders/data/cursos.sql';
    $out = 'database/seeders/data/cursos.json';
    if (!file_exists($in)) {
        fwrite(STDERR, "Arquivo não encontrado: $in\n");
        return 1;
    }
    $sql = file_get_contents($in);
    $rows = extractCursosInserts($sql);
    if (empty($rows)) {
        fwrite(STDERR, "Nenhum INSERT de cursos encontrado em $in\n");
        return 2;
    }
    $json = json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) {
        fwrite(STDERR, "Falha ao codificar JSON\n");
        return 3;
    }
    file_put_contents($out, $json);
    echo "Gravado JSON: $out (" . count($rows) . " registros)\n";
    return 0;
}

exit(run());