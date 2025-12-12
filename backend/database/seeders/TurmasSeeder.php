<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class TurmasSeeder extends Seeder
{
    /**
     * PT: Popula a tabela 'turmas' com dados de exemplo e normaliza valores legados.
     * EN: Seeds the 'turmas' table with sample data and normalizes legacy values.
     */
    public function run(): void
    {
        // Busca um curso existente para relacionamento obrigatório
        $cursoId = DB::table('cursos')->value('id');
        if (!$cursoId) {
            // Sem curso, não é possível criar turmas (chave estrangeira obrigatória)
            // PT: Saímos silenciosamente para evitar erro de FK.
            // EN: Exit early to avoid FK violation when no course exists.
            return;
        }

        // Tenta carregar dados do JSON legado; se não existir, usa um dataset de exemplo.
        $rows = $this->loadJsonRows();
        if ($rows === null) {
            // Dataset de exemplo baseado no schema; substitua/expanda conforme necessário.
            $rows = [
                [
                    'token' => uniqid(),
                    'id_curso' => $cursoId,
                    'nome' => 'Turma Piloto Privado - Manhã',
                    'inicio' => '2025-01-10',
                    'fim' => '2025-03-30',
                    'professor' => 1,
                    'Pgto' => 'parcelado',
                    'Valor' => 1500.00,
                    'Matricula' => 250.00,
                    'hora_inicio' => '08:00:00',
                    'hora_fim' => '11:00:00',
                    'duracao' => 120,
                    'unidade_duracao' => 'horas',
                    'dia1' => 's',
                    'dia2' => 'n',
                    'dia3' => 's',
                    'dia4' => 'n',
                    'dia5' => 's',
                    'dia6' => 'n',
                    'dia7' => 'n',
                    'TemHorario' => 's',
                    'Quadro' => '',
                    'autor' => 1,
                    'ativo' => 's',
                    'ordenar' => 0,
                    'data' => Carbon::now()->format('Y-m-d H:i:s'),
                    'atualiza' => Carbon::now()->format('Y-m-d H:i:s'),
                    'CodGrade' => null,
                    'Cidade' => 'Juiz de Fora',
                    'QuemseDestina' => null,
                    'Novo' => null,
                    'obs' => '',
                    'excluido' => 'n',
                    'reg_excluido' => '',
                    'deletado' => 'n',
                    'reg_deletado' => '',
                    'max_alunos' => 20,
                    'min_alunos' => 5,
                    'config' => null,
                ],
            ];
        }

        foreach ($rows as $row) {
            $normalized = $this->normalizeRow($row);
            // Garantir FK válida: se id_curso não existir, usar o primeiro curso disponível
            if (!isset($normalized['id_curso']) || !DB::table('cursos')->where('id', $normalized['id_curso'])->exists()) {
                $normalized['id_curso'] = $cursoId;
            }

            // PT: Preservar ID vindo do JSON (inclui números como string), usando upsert por id.
            // EN: Preserve ID from JSON (including numeric strings), using id-based upsert.
            $id = (isset($normalized['id']) && is_numeric($normalized['id'])) ? (int) $normalized['id'] : null;

            // PT: Upsert para evitar duplicidade ao reexecutar o seeder (id/token)
            // EN: Upsert to avoid duplicates when reseeding (id/token)
            if ($id !== null) {
                DB::table('turmas')->updateOrInsert(['id' => $id], $normalized);
            } elseif (array_key_exists('token', $normalized) && is_string($normalized['token']) && trim($normalized['token']) !== '') {
                DB::table('turmas')->updateOrInsert(['token' => $normalized['token']], $normalized);
            } else {
                DB::table('turmas')->insert($normalized);
            }
        }
    }

    /**
     * PT: Normaliza e garante valores válidos conforme a migração atual.
     * EN: Normalize and ensure valid values according to current migration.
     */
    private function normalizeRow(array $row): array
    {
        // Datas: converter '0000-00-00' e strings vazias para null
        foreach (['inicio', 'fim'] as $dateField) {
            if (array_key_exists($dateField, $row)) {
                $v = trim((string)($row[$dateField] ?? ''));
                $row[$dateField] = ($v === '' || $v === '0000-00-00') ? null : $v;
            }
        }

        // Horas: strings vazias para null
        foreach (['hora_inicio', 'hora_fim'] as $timeField) {
            if (array_key_exists($timeField, $row)) {
                $v = trim((string)($row[$timeField] ?? ''));
                $row[$timeField] = ($v === '') ? null : $v;
            }
        }

        // Numéricos decimais: strings vazias para null
        foreach (['Valor', 'Matricula'] as $decField) {
            if (array_key_exists($decField, $row)) {
                $v = $row[$decField];
                $row[$decField] = (is_string($v) && trim($v) === '') ? null : $v;
            }
        }

        // Inteiros: garantir inteiros ou defaults
        $row['duracao'] = $this->ensureIntOrNull($row['duracao'] ?? null);
        $row['ordenar'] = $this->ensureInt($row['ordenar'] ?? 0, 0);
        $row['professor'] = $this->ensureInt($row['professor'] ?? 0, 0);
        $row['max_alunos'] = $this->ensureInt($row['max_alunos'] ?? 20, 20);
        $row['min_alunos'] = $this->ensureInt($row['min_alunos'] ?? 5, 5);

        // Enums s/n: normalizar para 's' ou 'n'
        foreach (['dia1','dia2','dia3','dia4','dia5','dia6','dia7','TemHorario','ativo','excluido','deletado'] as $flag) {
            $row[$flag] = $this->normalizeSN($row[$flag] ?? 'n');
        }

        // Campos NOT NULL de texto: garantir pelo menos string vazia
        foreach (['Quadro','obs','reg_excluido','reg_deletado'] as $notNullText) {
            $row[$notNullText] = isset($row[$notNullText]) ? (string)$row[$notNullText] : '';
        }

        // Unidade de duração obrigatória
        $row['unidade_duracao'] = isset($row['unidade_duracao']) && trim((string)$row['unidade_duracao']) !== ''
            ? (string)$row['unidade_duracao']
            : 'horas';

        // Datas e autor obrigatórios
        // PT: Sanitiza '0000-00-00 00:00:00' e vazio para timestamps válidos
        // EN: Sanitize '0000-00-00 00:00:00' and empty to valid timestamps
        foreach (['data','atualiza'] as $dtField) {
            if (array_key_exists($dtField, $row)) {
                $v = trim((string)($row[$dtField] ?? ''));
                $row[$dtField] = ($v === '' || $v === '0000-00-00 00:00:00')
                    ? Carbon::now()->format('Y-m-d H:i:s')
                    : $v;
            } else {
                $row[$dtField] = Carbon::now()->format('Y-m-d H:i:s');
            }
        }
        $row['autor'] = $this->ensureInt($row['autor'] ?? 1, 1);

        // Config: aceitar array/objeto e converter para JSON; strings inválidas viram null
        if (array_key_exists('config', $row)) {
            $cfg = $row['config'];
            if (is_array($cfg) || is_object($cfg)) {
                $row['config'] = json_encode($cfg, JSON_UNESCAPED_UNICODE);
            } elseif (!is_string($cfg) || trim($cfg) === '' || !$this->isValidJsonString($cfg)) {
                $row['config'] = null;
            }
        } else {
            $row['config'] = null;
        }

        // Token obrigatório
        $row['token'] = isset($row['token']) && trim((string)$row['token']) !== '' ? (string)$row['token'] : uniqid();

        return $row;
    }

    /**
     * PT: Normaliza enum s/n.
     * EN: Normalize s/n enum.
     */
    private function normalizeSN($value): string
    {
        $v = is_string($value) ? strtolower(trim($value)) : $value;
        return $v === 's' ? 's' : 'n';
    }

    /**
     * PT: Garante inteiro com default.
     * EN: Ensure integer with default.
     */
    private function ensureInt($value, int $default): int
    {
        if (is_numeric($value)) {
            return (int)$value;
        }
        return $default;
    }

    /**
     * PT: Converte para inteiro ou null.
     * EN: Convert to int or null.
     */
    private function ensureIntOrNull($value): ?int
    {
        if ($value === null) return null;
        return is_numeric($value) ? (int)$value : null;
    }

    /**
     * PT: Valida string JSON.
     * EN: Validate JSON string.
     */
    private function isValidJsonString($value): bool
    {
        if (!is_string($value)) return false;
        json_decode($value, true);
        return json_last_error() === JSON_ERROR_NONE;
    }

    /**
     * PT: Carrega linhas de turmas a partir de um JSON em database/seeders/data/turmas.json.
     * EN: Loads class rows from a JSON at database/seeders/data/turmas.json.
     *
     * - PT: Faz mapeamento básico de chaves legadas (ex.: idCurso -> id_curso, dt_inicio -> inicio).
     * - EN: Performs basic legacy key mapping (e.g., idCurso -> id_curso, dt_inicio -> inicio).
     *
     * @return array|null Lista de linhas ou null se não houver arquivo/dados válidos.
     */
    private function loadJsonRows(): ?array
    {
        $jsonPath = base_path('database/seeders/data/turmas.json');
        if (!file_exists($jsonPath)) {
            return null;
        }
        $raw = file_get_contents($jsonPath);
        $data = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            return null;
        }

        $mapped = [];
        foreach ($data as $row) {
            if (!is_array($row)) continue;
            // Mapeamento de chaves comuns do legado
            $map = [
                'idCurso' => 'id_curso',
                'curso_id' => 'id_curso',
                'dt_inicio' => 'inicio',
                'dt_fim' => 'fim',
                'hora_inicial' => 'hora_inicio',
                'hora_final' => 'hora_fim',
                'pgto' => 'Pgto',
                'valor' => 'Valor',
                'matricula' => 'Matricula',
            ];
            foreach ($map as $from => $to) {
                if (array_key_exists($from, $row) && !array_key_exists($to, $row)) {
                    $row[$to] = $row[$from];
                }
            }

            // Gera token se não informado
            if (empty($row['token'])) {
                $row['token'] = uniqid('turma_', true);
            }

            $mapped[] = $row;
        }

        return $mapped;
    }
}