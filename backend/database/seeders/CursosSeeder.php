<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Curso;

class CursosSeeder extends Seeder
{
    /**
     * Executa o seeder dos cursos (PT/EN).
     *
     * PT: Normaliza os registros do seeder para o esquema atual da tabela
     *     `cursos` (migration consolidada), removendo colunas antigas e
     *     ajustando tipos/JSON conforme necessário.
     * EN: Normalizes seeder records to match the consolidated `cursos`
     *     migration, stripping legacy columns and fixing types/JSON.
     */
    /**
     * Executa o seeder dos cursos, priorizando dados legados de cursos.json (PT/EN).
     *
     * PT: Tenta carregar registros de `database/seeders/data/cursos.json`. Caso não exista
     *     ou seja inválido, usa o dataset legado abaixo como fallback. Cada linha é
     *     normalizada para o esquema atual do modelo Curso e gravada de forma idempotente.
     * EN: Tries to load records from `database/seeders/data/cursos.json`. If missing or
     *     invalid, it falls back to the legacy inline dataset below. Each row is normalized
     *     to match the current Curso model and persisted idempotently.
     */
    public function run()
    {
        // Primeiro tenta carregar de cursos.json (gerado a partir de cursos.sql)
        $jsonRows = $this->loadJsonRows(base_path('database/seeders/data/cursos.json'));

        /**
         * PT: Usa exclusivamente os dados de cursos.json; se o arquivo estiver ausente,
         *     inválido ou sem registros, a seeder não será executada.
         * EN: Use data exclusively from cursos.json; if the file is missing,
         *     invalid, or empty, the seeder will not run.
         */
        $rows = is_array($jsonRows) ? $jsonRows : [];
        if (empty($rows)) {
            $this->command?->warn('CursosSeeder: arquivo cursos.json ausente/vazio ou inválido. Seeder NÃO será executada.');
            return;
        }

        // PT: Preserva o ID vindo do cursos.json quando disponível.
        // EN: Preserve the ID from cursos.json when available.
        foreach ($rows as $legacy) {
            $data = $this->normalizeRow($legacy);

            // PT: Se o JSON trouxer 'id', utilizamos esse ID explicitamente.
            // EN: If JSON provides 'id', use that ID explicitly.
            $id = isset($legacy['id']) && is_numeric($legacy['id']) ? (int) $legacy['id'] : null;

            if ($id !== null) {
                // PT: Buscar por ID ignorando escopos globais (pode existir registro marcado como excluído).
                // EN: Find by ID ignoring global scopes (record might be marked as deleted).
                $existing = Curso::withoutGlobalScopes()->find($id);

                if ($existing) {
                    // PT: Atualiza o registro existente mantendo o mesmo ID.
                    // EN: Update existing record keeping the same ID.
                    $existing->fill($data);
                    $existing->save();
                } else {
                    // PT: Cria um novo registro com o ID explícito.
                    // EN: Create a new record with the explicit ID.
                    $curso = new Curso();
                    $curso->id = $id; // atribuição direta não passa por mass-assignment
                    $curso->fill($data);
                    $curso->save();
                }
            } else {
                // PT: Sem ID no JSON, usa chave por 'token' (ou 'nome') para idempotência.
                // EN: Without ID in JSON, use 'token' (or 'nome') as upsert key.
                $key = ['token' => $data['token'] ?? ($data['nome'] ?? uniqid('curso_'))];
                Curso::updateOrCreate($key, $data);
            }
        }
    }

    /**
     * PT: Carrega linhas de um arquivo JSON (cursos.json) e retorna como array.
     * EN: Load rows from a JSON file (cursos.json) and return as array.
     */
    private function loadJsonRows(string $path): ?array
    {
        try {
            if (!file_exists($path)) {
                return null;
            }
            $json = file_get_contents($path);
            $data = json_decode($json, true);
            if (!is_array($data)) {
                return null;
            }
            return $data;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * PT: Normaliza uma linha legada para os campos aceitos pelo modelo Curso.
     * EN: Normalize a legacy row to the fields accepted by the Curso model.
     */
    private function normalizeRow(array $legacy): array
    {
        // Gerar token se ausente
        $token = $legacy['token'] ?? null;
        if (!$token || !is_string($token) || trim($token) === '') {
            $token = uniqid('curso_', true);
        }

        // Preferir modulos; se ausente, tentar mapear de 'conteudo'
        $modulos = $legacy['modulos'] ?? null;
        if (($modulos === null || $modulos === '' || $modulos === []) && isset($legacy['conteudo'])) {
            $modulos = $legacy['conteudo'];
        }

        // Campos que o modelo aceita (ver App\Models\Curso::$fillable)
        $data = [
            'nome'             => $legacy['nome'] ?? null,
            'titulo'           => $legacy['titulo'] ?? ($legacy['nome'] ?? null),
            'ativo'            => $legacy['ativo'] ?? 'n',
            'destaque'         => $legacy['destaque'] ?? 'n',
            'publicar'         => $legacy['publicar'] ?? 'n',
            'duracao'          => $legacy['duracao'] ?? 0,
            'unidade_duracao'  => $legacy['unidade_duracao'] ?? null,
            'tipo'             => $legacy['tipo'] ?? null,
            'categoria'        => $legacy['categoria'] ?? null,
            'token'            => $token,
            'autor'            => $legacy['autor'] ?? null,
            'config'           => $legacy['config'] ?? null,
            'aeronaves'        => $this->nullifyEmpty($legacy['aeronaves'] ?? null),
            'modulos'          => $this->nullifyEmpty($modulos),
            'inscricao'        => $legacy['inscricao'] ?? null,
            'valor'            => $legacy['valor'] ?? null,
            'parcelas'         => $legacy['parcelas'] ?? null,
            'valor_parcela'    => $legacy['valor_parcela'] ?? null,
            // Campos de lixeira/registro
            'excluido'         => $legacy['excluido'] ?? null,
            'deletado'         => $legacy['deletado'] ?? null,
            'excluido_por'     => $legacy['excluido_por'] ?? null,
            'deletado_por'     => $legacy['deletado_por'] ?? null,
            'reg_excluido'     => $legacy['reg_excluido'] ?? null,
            'reg_deletado'     => $legacy['reg_deletado'] ?? null,
        ];

        // Sanitizar strings vazias para null onde apropriado
        foreach (['unidade_duracao','categoria','autor'] as $k) {
            if (isset($data[$k]) && is_string($data[$k]) && trim($data[$k]) === '') {
                $data[$k] = null;
            }
        }

        return $data;
    }

    /**
     * PT: Converte valores vazios ('' ou [ ]) para null para evitar ruídos.
     * EN: Convert empty values ('' or [ ]) to null to avoid noise.
     */
    private function nullifyEmpty($value)
    {
        if ($value === '' || $value === []) {
            return null;
        }
        return $value;
    }
}
