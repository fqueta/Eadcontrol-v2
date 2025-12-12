<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Parcelamento;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class ParcelamentoController extends Controller
{
    /**
     * Serviço de permissões.
     */
    protected PermissionService $permissionService;

    public function __construct()
    {
        $this->permissionService = new PermissionService();
    }

    /**
     * Lista parcelamentos com filtros e paginação.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('view')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $perPage = (int) $request->input('per_page', 15);
        $includeTrashed = filter_var($request->input('include_trashed', false), FILTER_VALIDATE_BOOLEAN);
        $query = $includeTrashed ? Parcelamento::withoutGlobalScope('notDeleted') : Parcelamento::query();

        // Filtros
        if ($request->filled('id_curso')) { $query->where('id_curso', (int) $request->input('id_curso')); }
        if ($request->filled('ativo')) {
            $v = strtolower((string) $request->input('ativo'));
            if (in_array($v, ['s','n'])) { $query->where('ativo', $v); }
        }
        if ($search = $request->string('q')->toString()) {
            $query->where(function($q) use ($search) {
                $q->where('nome', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%");
            });
        }
        if ($request->filled('qtd_parcelas')) { $query->where('qtd_parcelas', (int) $request->input('qtd_parcelas')); }
        if ($request->filled('metodo_pagamento')) { $query->where('metodo_pagamento', $request->string('metodo_pagamento')->toString()); }

        $items = $query->orderByDesc('updated_at')->paginate($perPage);
        return response()->json($items);
    }

    /**
     * Criar um novo parcelamento.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('create')) { return response()->json(['error' => 'Acesso negado'], 403); }

        // Normaliza payloads legados com chaves como "previsao_turma[]" e "parcelas[3][valor]"
        $input = $this->normalizeLegacyPayload($request->all());
        $courseId = $input['id_curso'] ?? null;

        $validator = Validator::make($input, [
            'id_curso' => 'nullable|integer|exists:cursos,id',
            'nome' => [
                'required', 'string', 'max:200',
                Rule::unique('parcelamentos', 'nome')
                    ->where(function($q) use ($courseId) {
                        if ($courseId !== null) { $q->where('id_curso', (int) $courseId); }
                        $q->where('deletado', '!=', 's')->where('excluido', '!=', 's');
                    })
            ],
            'slug' => 'nullable|string|max:200',
            'ativo' => ['nullable', Rule::in(['s','n'])],
            'qtd_parcelas' => 'nullable|integer|min:1',
            'valor_total' => 'nullable|numeric|min:0',
            'valor_parcela' => 'nullable|numeric|min:0',
            'entrada' => 'nullable|numeric|min:0',
            'desconto' => 'nullable|numeric|min:0',
            'juros_percent' => 'nullable|numeric|min:0',
            'tipo_juros' => 'nullable|string|max:20',
            'metodo_pagamento' => 'nullable|string|max:30',
            'periodicidade' => 'nullable|string|max:20',
            'inicio_vigencia' => 'nullable|date',
            'fim_vigencia' => 'nullable|date|after_or_equal:inicio_vigencia',
            'obs' => 'nullable|string',
            'config' => 'nullable|array',
        ]);
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }
        $validated = $validator->validated();

        // Evitar duplicidade de slug na lixeira
        if (!empty($validated['slug'])) {
            $existsDeleted = Parcelamento::withoutGlobalScope('notDeleted')
                ->where('slug', $validated['slug'])
                ->where(function($q){ $q->where('deletado','s')->orWhere('excluido','s'); })
                ->first();
            if ($existsDeleted) {
                return response()->json([
                    'message' => 'Já existe um parcelamento com este slug na lixeira. Restaure-o ou use outro slug.',
                ], 409);
            }
        }

        // Defaults
        $data = $validated;
        if (!isset($data['ativo'])) { $data['ativo'] = 's'; }
        if (!isset($data['qtd_parcelas'])) { $data['qtd_parcelas'] = 1; }
        if (!isset($data['slug']) || !$data['slug']) {
            $data['slug'] = Str::slug((string)($data['nome'] ?? 'plano'));
        }

        $item = Parcelamento::create($data);
        return response()->json([
            'data' => $item,
            'message' => 'Parcelamento criado com sucesso',
            'status' => 201,
        ], 201);
    }

    /**
     * Exibe um parcelamento.
     */
    public function show(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('view')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $item = Parcelamento::find($id);
        if (!$item) { return response()->json(['error' => 'Registro não encontrado'], 404); }
        return response()->json($item);
    }

    /**
     * Atualiza um parcelamento.
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('edit')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $item = Parcelamento::find($id);
        if (!$item) { return response()->json(['error' => 'Registro não encontrado'], 404); }

        // Normaliza payload legado antes de validar
        $input = $this->normalizeLegacyPayload($request->all());
        $courseId = $input['id_curso'] ?? $item->id_curso;
        $validator = Validator::make($input, [
            'id_curso' => 'nullable|integer|exists:cursos,id',
            'nome' => [
                'sometimes', 'string', 'max:200',
                Rule::unique('parcelamentos', 'nome')
                    ->ignore($id, 'id')
                    ->where(function($q) use ($courseId) {
                        if ($courseId !== null) { $q->where('id_curso', (int) $courseId); }
                        $q->where('deletado', '!=', 's')->where('excluido', '!=', 's');
                    })
            ],
            'slug' => 'sometimes|string|max:200',
            'ativo' => ['sometimes', Rule::in(['s','n'])],
            'qtd_parcelas' => 'sometimes|integer|min:1',
            'valor_total' => 'nullable|numeric|min:0',
            'valor_parcela' => 'nullable|numeric|min:0',
            'entrada' => 'nullable|numeric|min:0',
            'desconto' => 'nullable|numeric|min:0',
            'juros_percent' => 'nullable|numeric|min:0',
            'tipo_juros' => 'nullable|string|max:20',
            'metodo_pagamento' => 'nullable|string|max:30',
            'periodicidade' => 'nullable|string|max:20',
            'inicio_vigencia' => 'nullable|date',
            'fim_vigencia' => 'nullable|date|after_or_equal:inicio_vigencia',
            'obs' => 'nullable|string',
            'config' => 'nullable|array',
        ]);
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }
        $validated = $validator->validated();

        $item->update($validated);
        return response()->json([
            'data' => $item->fresh(),
            'message' => 'Parcelamento atualizado com sucesso'
        ], 200);
    }

    /**
     * Normaliza payloads legados para o formato aceito pelo endpoint de parcelamentos.
     *
     * Ex.:
     * - "previsao_turma[]" -> mapeado para config.previsao_turma (array)
     * - "parcelas[3][parcela]", "parcelas[3][valor]" -> mapeado para config.parcelas[3]
     * - "config[tx2][0][name_label]" -> mapeado para config.tx2[0].name_label
     * - "valor" (string moeda) -> mapeado para config.valor (string)
     * - "tipo_curso", "id", "atualizado" -> mapeados para config.* para não conflitar com colunas nativas
     *
     * @param array $data Entrada original do request
     * @return array Dados normalizados prontos para validação
     */
    private function normalizeLegacyPayload(array $data): array
    {
        $out = [];

        // Suporte a payloads encapsulados em "data": descompacta e mescla
        if (array_key_exists('data', $data)) {
            $inner = [];
            if (is_array($data['data'])) {
                $inner = $data['data'];
            } elseif (is_string($data['data']) && $data['data'] !== '') {
                $decoded = json_decode($data['data'], true);
                $inner = is_array($decoded) ? $decoded : [];
            }
            if (!empty($inner)) {
                // Mesclar dados internos para que as chaves sejam validadas normalmente
                $data = array_merge($data, $inner);
            }
        }

        // Copiar e decodificar campos básicos quando presentes
        foreach (['id_curso', 'nome', 'obs', 'ativo', 'slug'] as $key) {
            if (array_key_exists($key, $data)) {
                $out[$key] = $this->decodeLegacyString($data[$key]);
            }
        }

        // Base do config: se já vier em $data, preservar e mesclar
        $config = [];
        if (array_key_exists('config', $data)) {
            if (is_array($data['config'])) {
                $config = $data['config'];
            } elseif (is_string($data['config']) && $data['config'] !== '') {
                $decoded = json_decode($data['config'], true);
                $config = is_array($decoded) ? $decoded : [];
            }
        }

        // previsao_turma[] (array)
        if (array_key_exists('previsao_turma[]', $data) && is_array($data['previsao_turma[]'])) {
            $config['previsao_turma'] = array_values(array_map(function ($v) {
                $v = $this->decodeLegacyString($v);
                return is_numeric($v) ? (int) $v : $v;
            }, $data['previsao_turma[]']));
        }

        // valor em string (ex.: "600,00") — guardar em config sem interpretar
        if (array_key_exists('valor', $data)) {
            $config['valor'] = $this->decodeLegacyString($data['valor']);
        }

        // Mapear tipo_curso, id, atualizado para config
        foreach (['tipo_curso', 'id', 'atualizado'] as $meta) {
            if (array_key_exists($meta, $data)) {
                $config[$meta] = $this->decodeLegacyString($data[$meta]);
            }
        }

        // Coletar chaves no formato parcelas[3][campo] e mesclar com config.parcelas existente
        foreach ($data as $k => $v) {
            if (preg_match('/^parcelas\[(\d+)\]\[(\w+)\]$/', (string) $k, $m)) {
                $idx = $m[1];
                $field = $m[2];
                $existing = $config['parcelas'][$idx] ?? [];
                $existing[$field] = $this->decodeLegacyString($v);
                $config['parcelas'][$idx] = $existing;
            }
        }

        // Coletar chaves no formato config[grupo][idx][campo] e mesclar
        foreach ($data as $k => $v) {
            if (preg_match('/^config\[(\w+)\]\[(\d+)\]\[(\w+)\]$/', (string) $k, $m)) {
                $group = $m[1];
                $idx = (int) $m[2];
                $field = $m[3];
                if (!isset($config[$group]) || !is_array($config[$group])) {
                    $config[$group] = [];
                }
                if (!isset($config[$group][$idx]) || !is_array($config[$group][$idx])) {
                    $config[$group][$idx] = [];
                }
                $config[$group][$idx][$field] = $this->decodeLegacyString($v);
            }
        }

        // Atribuir config mesclado
        if (!empty($config)) {
            $out['config'] = $config;
        }

        // Mesclar, garantindo que o 'config' mesclado prevaleça
        return array_merge($data, $out);
    }

    /**
     * Decodifica strings legadas substituindo '+' por espaço.
     * Mantém tipos para valores não-strings.
     *
     * @param mixed $value Valor a decodificar
     * @return mixed Valor decodificado
     */
    private function decodeLegacyString($value)
    {
        if (is_string($value)) {
            return str_replace('+', ' ', $value);
        }
        return $value;
    }

    /**
     * Move para lixeira (soft delete via flags).
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('delete')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $item = Parcelamento::find($id);
        if (!$item) { return response()->json(['error' => 'Registro não encontrado'], 404); }

        $item->update([
            'excluido' => 's',
            'deletado' => 's',
            'reg_deletado' => [
                'data' => now()->toDateTimeString(),
                'user_id' => $user->id,
            ],
            'excluido_por' => (string) $user->id,
            'deletado_por' => (string) $user->id,
        ]);

        return response()->json(['message' => 'Registro movido para lixeira com sucesso'], 200);
    }

    /**
     * Lista itens na lixeira.
     */
    public function trash(Request $request)
    {
        $user = $request->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('view')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $perPage = (int) $request->input('per_page', 15);
        $query = Parcelamento::withoutGlobalScope('notDeleted')
            ->where(function($q){ $q->where('deletado','s')->orWhere('excluido','s'); });

        if ($request->filled('id_curso')) { $query->where('id_curso', (int)$request->input('id_curso')); }
        if ($search = $request->string('q')->toString()) {
            $query->where('nome', 'like', "%{$search}%");
        }

        $items = $query->orderByDesc('updated_at')->paginate($perPage);
        return response()->json($items);
    }

    /**
     * Restaura da lixeira.
     */
    public function restore(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('delete')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $item = Parcelamento::withoutGlobalScope('notDeleted')
            ->where('id', $id)
            ->where(function($q){ $q->where('deletado','s')->orWhere('excluido','s'); })
            ->first();

        if (!$item) { return response()->json(['error' => 'Registro não encontrado na lixeira'], 404); }

        $item->update([
            'excluido' => 'n',
            'deletado' => 'n',
            'reg_excluido' => null,
            'reg_deletado' => null,
            'excluido_por' => null,
            'deletado_por' => null,
        ]);

        return response()->json(['message' => 'Registro restaurado com sucesso', 'data' => $item->fresh()], 200);
    }

    /**
     * Exclusão permanente de um item que está na lixeira.
     */
    public function forceDelete(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) { return response()->json(['error' => 'Acesso negado'], 403); }
        if (!$this->permissionService->isHasPermission('delete')) { return response()->json(['error' => 'Acesso negado'], 403); }

        $item = Parcelamento::withoutGlobalScope('notDeleted')
            ->where('id', $id)
            ->where(function($q){ $q->where('deletado','s')->orWhere('excluido','s'); })
            ->first();

        if (!$item) { return response()->json(['error' => 'Registro não encontrado na lixeira'], 404); }

        $item->delete();
        return response()->json(['message' => 'Registro excluído permanentemente com sucesso'], 200);
    }
}
