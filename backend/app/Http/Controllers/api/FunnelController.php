<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Funnel;
use Illuminate\Support\Facades\Schema;
use App\Http\Controllers\api\StageController;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

/**
 * Controller for managing sales/service funnels
 */
class FunnelController extends Controller
{
    /**
     * Display a listing of funnels with optional filtering
     */
    public function index(Request $request): JsonResponse
    {
        $query = Funnel::query();

        // Filter by active status if provided
        if ($request->has('isActive')) {
            $isActive = filter_var($request->isActive, FILTER_VALIDATE_BOOLEAN);
            $query->where('isActive', $isActive);
        }

        // Search by name if provided
        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Ordenar por 'order' se a coluna existir; caso contrário, por 'name'
        if (Schema::hasColumn('funnels', 'order')) {
            $query->orderBy('order');
        }
        $funnels = $query->orderBy('name')->get();
        $ret['data'] = $funnels;
        $ret['total'] = $funnels->count();
        return response()->json($ret);
    }

    /**
     * Store a newly created funnel in storage
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
                'isActive' => 'nullable|boolean',
                'settings' => 'nullable|array',
                'settings.autoAdvance' => 'nullable|boolean',
                'settings.notifyOnStageChange' => 'nullable|boolean',
                'settings.requireApproval' => 'nullable|boolean',
                'settings.place' => 'nullable|string',
                'order' => 'nullable|integer',
            ]);

            // Set default values
            $validated['color'] = $validated['color'] ?? '#3b82f6';
            $validated['isActive'] = $validated['isActive'] ?? true;

            // Merge settings with defaults
            if (isset($validated['settings'])) {
                $validated['settings'] = array_merge(
                    Funnel::getDefaultSettings(),
                    $validated['settings']
                );
            }

            $funnel = Funnel::create($validated);

            return response()->json($funnel, 201);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Dados de validação inválidos',
                'errors' => $e->errors()
            ], 422);
        }
    }

    /**
     * Display the specified funnel
     */
    public function show(string $id): JsonResponse
    {
        $funnel = Funnel::find($id);

        if (!$funnel) {
            return response()->json([
                'message' => 'Funil não encontrado'
            ], 404);
        }

        return response()->json($funnel);
    }

    /**
     * Update the specified funnel in storage
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $funnel = Funnel::find($id);

        if (!$funnel) {
            return response()->json([
                'message' => 'Funil não encontrado'
            ], 404);
        }

        try {
            $validated = $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'description' => 'nullable|string',
                'color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
                'isActive' => 'nullable|boolean',
                'settings' => 'nullable|array',
                'settings.autoAdvance' => 'nullable|boolean',
                'settings.notifyOnStageChange' => 'nullable|boolean',
                'settings.requireApproval' => 'nullable|boolean',
                'settings.place' => 'nullable|string',
                'order' => 'nullable|integer',
            ]);

            // Merge settings with existing ones if provided
            if (isset($validated['settings'])) {
                $currentSettings = $funnel->getSettingsWithDefaults();
                $validated['settings'] = array_merge($currentSettings, $validated['settings']);
            }

            $funnel->update($validated);

            return response()->json($funnel);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Dados de validação inválidos',
                'errors' => $e->errors()
            ], 422);
        }
    }

    /**
     * Remove the specified funnel from storage
     */
    public function destroy(string $id): JsonResponse
    {
        $funnel = Funnel::find($id);

        if (!$funnel) {
            return response()->json([
                'message' => 'Funil não encontrado'
            ], 404);
        }

        $funnel->delete();

        return response()->json([
            'message' => 'Funil excluído com sucesso'
        ]);
    }

    /**
     * Toggle the active status of a funnel
     */
    public function toggleActive(string $id): JsonResponse
    {
        $funnel = Funnel::find($id);

        if (!$funnel) {
            return response()->json([
                'message' => 'Funil não encontrado'
            ], 404);
        }

        $funnel->update(['isActive' => !$funnel->isActive]);

        return response()->json([
            'message' => 'Status do funil atualizado com sucesso',
            'funnel' => $funnel
        ]);
    }

    /**
     * Listar etapas de um funil específico, ordenadas por `order`.
     *
     * GET /api/v1/funnels/{id}/stages
     * Delegado para StageController::indexForFunnel para manter compatibilidade
     * com o formato de resposta esperado no front-end.
     */
    public function stages(int $id): JsonResponse
    {
        // Delegar para o StageController para reaproveitar a lógica existente
        return app(StageController::class)->indexForFunnel($id);
    }

    /**
     * Reordenar etapas de um funil específico.
     *
     * POST /api/v1/funnels/{id}/stages/reorder
     * Mescla o `funnel_id` da rota no Request e delega para
     * StageController::reorder, reutilizando validação e atualização.
     */
    public function reorderStages(Request $request, int $id): JsonResponse
    {
        // Garantir que usamos o funil fornecido na rota
        $request->merge(['funnel_id' => $id]);

        /**
         * Suporte a payload simplificado com 'ids':
         * Permite enviar apenas a lista de IDs na ordem desejada e
         * mapeia para o formato esperado por StageController::reorder
         * (stages: [{id, order}, ...]).
         */
        if ($request->has('ids') && is_array($request->ids)) {
            $stages = [];
            foreach ($request->ids as $index => $stageId) {
                $stages[] = [
                    'id' => (int) $stageId,
                    'order' => $index + 1,
                ];
            }
            $request->merge(['stages' => $stages]);
        }

        return app(StageController::class)->reorder($request);
    }

    /**
     * Reordenar a lista de funis com base em uma lista de IDs.
     *
     * Endpoint: PUT/POST /api/v1/funnels/reorder
     * Body suportado: { "ids": [2, 3, 1, 4, 5] }
     * - Valida duplicidades
     * - Valida existência dos IDs
     * - Atualiza o campo `order` conforme a posição no array
     */
    public function reorder(Request $request): JsonResponse
    {
        try {
            // Validar presença e formato da lista de IDs
            $validated = $request->validate([
                'ids' => 'required|array|min:1',
                'ids.*' => 'integer|exists:funnels,id',
            ], [
                'ids.required' => 'A lista de IDs é obrigatória',
                'ids.array' => 'A lista de IDs deve ser um array',
                'ids.min' => 'A lista de IDs deve conter ao menos um ID',
                'ids.*.integer' => 'Todos os IDs devem ser números inteiros',
                'ids.*.exists' => 'Um ou mais IDs informados não existem',
            ]);

            $ids = array_map('intval', $validated['ids']);

            // Checar duplicidades
            $counts = array_count_values($ids);
            $duplicates = array_keys(array_filter($counts, fn($c) => $c > 1));
            if (!empty($duplicates)) {
                return response()->json([
                    'error' => 'Dados de validação inválidos',
                    'errors' => [
                        'ids' => ['Há IDs duplicados no payload. Remova duplicidades e tente novamente.'],
                        'duplicateIds' => $duplicates,
                    ]
                ], 422);
            }

            // Validar existência dos IDs (proteção adicional contra conditions race)
            $existingIds = Funnel::whereIn('id', $ids)->pluck('id')->all();
            $missing = array_values(array_diff($ids, $existingIds));
            if (!empty($missing)) {
                return response()->json([
                    'error' => 'Dados de validação inválidos',
                    'errors' => [
                        'ids' => ['Alguns IDs informados não existem.'],
                        'missingIds' => $missing,
                    ]
                ], 422);
            }

            // Aplicar ordenação: primeira posição recebe order=1, e assim por diante
            foreach ($ids as $pos => $funnelId) {
                Funnel::where('id', $funnelId)->update(['order' => $pos + 1]);
            }

            // Retornar lista ordenada
            $funnels = Funnel::orderBy('order')->orderBy('name')->get();
            return response()->json([
                'data' => $funnels,
                'total' => $funnels->count(),
                'message' => 'Funis reordenados com sucesso'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Dados de validação inválidos',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erro ao reordenar funis',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
