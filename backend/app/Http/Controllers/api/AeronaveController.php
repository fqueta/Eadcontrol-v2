<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Aeronave;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AeronaveController extends Controller
{
    protected PermissionService $permissionService;

    /**
     * Construtor do controller, inicializa serviço de permissões
     */
    public function __construct()
    {
        $this->permissionService = new PermissionService();
    }

    /**
     * Listar aeronaves com filtros e paginação
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $perPage = (int) $request->input('per_page', 10);
        // Ordenação padrão por updated_at (timestamps habilitados)
        $orderBy = $request->input('order_by', 'updated_at');
        $order = $request->input('order', 'desc');

        $query = Aeronave::query()->orderBy($orderBy, $order);

        // Filtros
        if ($search = $request->input('search')) {
            $query->where(function($q) use ($search) {
                $q->where('nome', 'like', "%{$search}%")
                  ->orWhere('codigo', 'like', "%{$search}%");
            });
        }
        if ($request->filled('nome')) {
            $query->where('nome', 'like', '%' . $request->input('nome') . '%');
        }
        if ($request->filled('codigo')) {
            $query->where('codigo', 'like', '%' . $request->input('codigo') . '%');
        }
        if ($request->filled('ativo')) {
            $query->where('ativo', $request->input('ativo') === 's' ? 's' : 'n');
        }
        if ($request->filled('publicar')) {
            $query->where('publicar', $request->input('publicar') === 's' ? 's' : 'n');
        }

        $aeronaves = $query->paginate($perPage);
        return response()->json($aeronaves);
    }

    /**
     * Retornar uma aeronave específica
     */
    public function show(Request $request, int $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $aeronave = Aeronave::find($id);
        if (!$aeronave) {
            return response()->json(['error' => 'Aeronave não encontrada'], 404);
        }

        return response()->json($aeronave);
    }

    /**
     * Criar uma nova aeronave
     *
     * Aceita campos compostos em JSON (pacotes, config, sociedade) e
     * normaliza valores monetários em formato brasileiro para salvar
     * em `hora_rescisao` como decimal.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), [
            'nome'           => 'required|string|max:300',
            'codigo'         => 'nullable|string|max:12',
            'tipo'           => 'nullable|string',
            'pacotes'        => 'nullable|array',
            'ficha'          => 'nullable|string',
            'url'            => 'nullable|string',
            'meta_descricao' => 'nullable|string',
            'obs'            => 'nullable|string',
            'config'         => 'nullable|array',
            'hora_rescisao'  => 'nullable',
            'ordenar'        => 'nullable|integer',
            'descricao'      => 'nullable|string',
            'ativo'          => 'nullable|in:n,s',
            'publicar'       => 'nullable|in:n,s',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        // Normalizar hora_rescisao (ex.: "900,00" ou "R$ 900,00")
        $horaRescisao = null;
        if (array_key_exists('hora_rescisao', $validated)) {
            $hr = $validated['hora_rescisao'];
            if ($hr !== null && $hr !== '') {
                $horaRescisao = is_numeric($hr) ? (float) $hr : Qlib::precoBanco((string) $hr);
            }
        }

        // Montar dados conforme estrutura
        $data = [
            'nome'           => $validated['nome'],
            'codigo'         => $validated['codigo'],
            'tipo'           => $validated['tipo'] ?? null,
            // Arrays/JSON: deixar como array; Eloquent + casts cuidam do encode
            'pacotes'        => $validated['pacotes'] ?? null,
            // Garantir que autor seja persistido como string
            'autor'          => (string) $user->id,
            'token'          => Qlib::token(),
            'ativo'          => $validated['ativo'] ?? 's',
            'publicar'       => $validated['publicar'] ?? 'n',
            'ficha'          => $validated['ficha'] ?? '',
            'url'            => $validated['url'] ?? '',
            'meta_descricao' => $validated['meta_descricao'] ?? '',
            'obs'            => $validated['obs'] ?? '',
            'config'         => $validated['config'] ?? null,
            'hora_rescisao'  => $horaRescisao,
            'ordenar'        => $validated['ordenar'] ?? 0,
            'excluido'       => 'n',
            'excluido_por'   => '',
            'deletado'       => 'n',
            'deletado_por'   => '',
            'descricao'      => $validated['descricao'] ?? '',
            'reg_excluido'   => '',
            'reg_deletado'   => '',
        ];

        $aeronave = Aeronave::create($data);

        return response()->json([
            'data' => $aeronave,
            'message' => 'Aeronave criada com sucesso',
            'status' => 201,
        ], 201);
    }

    /**
     * Atualizar uma aeronave específica
     *
     * Mantém arrays/JSON em campos pacotes/config/sociedade e
     * normaliza `hora_rescisao` recebido como moeda brasileira.
     */
    public function update(Request $request, int $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $aeronave = Aeronave::find($id);
        if (!$aeronave) {
            return response()->json(['error' => 'Aeronave não encontrada'], 404);
        }

        $validator = Validator::make($request->all(), [
            'nome'           => 'sometimes|required|string|max:300',
            'codigo'         => 'sometimes|string|max:12',
            'tipo'           => 'nullable|string',
            'pacotes'        => 'nullable|array',
            'ficha'          => 'nullable|string',
            'url'            => 'nullable|string',
            'meta_descricao' => 'nullable|string',
            'obs'            => 'nullable|string',
            'config'         => 'nullable|array',
            'hora_rescisao'  => 'nullable',
            'ordenar'        => 'nullable|integer',
            'descricao'      => 'nullable|string',
            'ativo'          => 'nullable|in:n,s',
            'publicar'       => 'nullable|in:n,s',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        $updateData = [];
        foreach ([
            'nome','codigo','tipo','pacotes','ficha','url','meta_descricao','obs','ordenar','descricao','ativo','publicar'
        ] as $field) {
            if (array_key_exists($field, $validated)) {
                $updateData[$field] = $validated[$field];
            }
        }

        // Arrays/JSON: deixar como array; Eloquent + casts cuidam do encode
        if (array_key_exists('config', $validated)) {
            $updateData['config'] = $validated['config'];
        }
        // sociedade removido do schema
        // Normalizar hora_rescisao quando enviado
        if (array_key_exists('hora_rescisao', $validated)) {
            $hr = $validated['hora_rescisao'];
            if ($hr !== null && $hr !== '') {
                $updateData['hora_rescisao'] = is_numeric($hr) ? (float) $hr : Qlib::precoBanco((string) $hr);
            } else {
                $updateData['hora_rescisao'] = null;
            }
        }

        $updateData['atualizado'] = now()->toDateTimeString();

        $aeronave->update($updateData);

        return response()->json([
            'data' => $aeronave,
            'message' => 'Aeronave atualizada com sucesso',
        ], 200);
    }

    /**
     * Marcar aeronave como deletada (soft delete)
     */
    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $aeronave = Aeronave::find($id);
        if (!$aeronave) {
            return response()->json(['error' => 'Aeronave não encontrada'], 404);
        }

        $aeronave->update([
            'excluido'     => 's',
            'deletado'     => 's',
            'excluido_por' => (string)$user->id,
            'deletado_por' => (string)$user->id,
            'reg_excluido' => json_encode([
                'data' => now()->toDateTimeString(),
                'user_id' => $user->id,
            ]),
            'reg_deletado' => json_encode([
                'data' => now()->toDateTimeString(),
                'user_id' => $user->id,
            ]),
        ]);

        return response()->json([
            'message' => 'Aeronave marcada como deletada com sucesso',
        ], 200);
    }

    /**
     * Listar itens na lixeira (excluídos/deletados)
     */
    public function trash(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $perPage = (int) $request->input('per_page', 10);

        $items = Aeronave::withoutGlobalScope('notDeleted')
            ->where(function($q) {
                $q->where('deletado', 's')->orWhere('excluido', 's');
            })
            ->orderBy('atualizado', 'desc')
            ->paginate($perPage);

        return response()->json($items);
    }

    /**
     * Restaurar uma aeronave da lixeira
     */
    public function restore(Request $request, int $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $aeronave = Aeronave::withoutGlobalScope('notDeleted')
            ->where('id', $id)
            ->where(function($q) {
                $q->where('deletado', 's')->orWhere('excluido', 's');
            })
            ->first();

        if (!$aeronave) {
            return response()->json(['error' => 'Aeronave não encontrada na lixeira'], 404);
        }

        $aeronave->update([
            'excluido'     => 'n',
            'deletado'     => 'n',
            'reg_excluido' => '',
            'reg_deletado' => '',
        ]);

        return response()->json([
            'message' => 'Aeronave restaurada com sucesso',
        ], 200);
    }
}