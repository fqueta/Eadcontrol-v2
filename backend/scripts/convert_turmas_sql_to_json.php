<?php
/**
 * PT: Converte INSERTs de turmas.sql para JSON em database/seeders/data/turmas.json.
 * EN: Convert INSERTs from turmas.sql to JSON at database/seeders/data/turmas.json.
 */

/**
 * PT: Lê o arquivo SQL e extrai todos os INSERT INTO turmas(... ) VALUES (...).
 * EN: Read SQL file and extract all INSERT INTO turmas(... ) VALUES (...).
 */
function extractTurmasInserts(string $sql): array {
    $results = [];
    $pattern = '/INSERT\s+INTO\s+`?turmas`?\s*\(([^)]+)\)\s*VALUES\s*(.+?);/is';
    if (preg_match_all($pattern, $sql, $matches, PREG_SET_ORDER)) {
        foreach ($matches as $m) {
            $columnsRaw = trim($m[1]);
            $valuesChunk = trim($m[2]);
            $columns = array_map(fn($c) => trim(str_replace('`', '', $c)), explode(',', $columnsRaw));
            $sets = splitValuesSets($valuesChunk);
            foreach ($sets as $set) {
                $values = splitFields($set);
                if (count($values) !== count($columns)) {
                    // Ignora linhas malformadas
                    continue;
                }
                $row = [];
                foreach ($columns as $i => $col) {
                    $row[$col] = normalizeSqlValue($values[$i]);
                }
                $results[] = $row;
            }
        }
    }
    return $results;
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
    $in = 'database/seeders/data/turmas.sql';
    $out = 'database/seeders/data/turmas.json';
    if (!file_exists($in)) {
        fwrite(STDERR, "Arquivo não encontrado: $in\n");
        return 1;
    }
    $sql = file_get_contents($in);
    $rows = extractTurmasInserts($sql);
    if (empty($rows)) {
        fwrite(STDERR, "Nenhum INSERT de turmas encontrado em $in\n");
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