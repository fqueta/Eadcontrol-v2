<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AircraftAttendance;
use App\Models\Aircraft;
use App\Models\ServiceOrder;
use App\Models\User;
use App\Models\Stage;
use App\Enums\AttendanceStatus;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Controller para gerenciar atendimentos de aeronaves
 */
class AircraftAttendanceController extends Controller
{
    /**
     * Lista todos os atendimentos com filtros e paginação
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = AircraftAttendance::with([
                'aircraft:ID,post_title',
                'serviceOrder:id,title,status',
                'client:id,name,email',
                'assignedTo:id,name,email',
                'currentStage:id,name,color'
            ]);

            // Filtros
            if ($request->filled('status')) {
                $query->byStatus(AttendanceStatus::from($request->status));
            }

            if ($request->filled('priority')) {
                $query->byPriority($request->priority);
            }

            if ($request->filled('aircraft_id')) {
                $query->byAircraft($request->aircraft_id);
            }

            if ($request->filled('client_id')) {
                $query->byClient($request->client_id);
            }

            if ($request->filled('assigned_to')) {
                $query->byAssignedTo($request->assigned_to);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhere('client_name', 'like', "%{$search}%");
                });
            }

            // Ordenação
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');

            if ($sortBy === 'priority') {
                $query->orderByPriority();
            } else {
                $query->orderBy($sortBy, $sortOrder);
            }

            // Paginação
            $perPage = $request->get('per_page', 15);
            $attendances = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $attendances,
                'message' => 'Atendimentos listados com sucesso'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar atendimentos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Exibe um atendimento específico
     */
    public function show(int $id): JsonResponse
    {
        try {
            $attendance = AircraftAttendance::with([
                'aircraft:ID,post_title,post_content,config',
                'serviceOrder:id,title,description,status,priority',
                'client:id,name,email,config',
                'assignedTo:id,name,email',
                'createdBy:id,name,email',
                'updatedBy:id,name,email',
                'currentStage:id,name,description,color',
                'trackingEvents' => function($query) {
                    $query->orderBy('created_at', 'desc')->limit(10);
                }
            ])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $attendance,
                'message' => 'Atendimento encontrado com sucesso'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar atendimento: ' . $e->getMessage()
            ], 404);
        }
    }

    /**
     * Cria um novo atendimento
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                // Campos obrigatórios
                'aircraft_id' => 'required|exists:posts,ID',
                'service_order_id' => 'required|exists:service_orders,id',
                'title' => 'required|string|max:255',
                'status' => ['required', Rule::in(array_column(AttendanceStatus::cases(), 'value'))],
                'priority' => 'required|in:low,medium,high,urgent',
                'started_at' => 'required|date',
                'client_id' => 'required|exists:users,id',
                'client_name' => 'required|string|max:255',
                
                // Campos opcionais
                'description' => 'nullable|string',
                'current_funnel_id' => 'nullable|integer',
                'current_funnel_name' => 'nullable|string|max:255',
                'current_stage_id' => 'nullable|exists:stages,id',
                'current_stage_name' => 'nullable|string|max:255',
                'completed_at' => 'nullable|date',
                'estimated_completion' => 'nullable|date',
                'assigned_to' => 'nullable|exists:users,id',
                'assigned_to_name' => 'nullable|string|max:255',
                'notes' => 'nullable|string',
                'internal_notes' => 'nullable|string',
                'service_summary' => 'nullable|array',
            ]);

            // Adicionar informações do usuário autenticado
            $validated['created_by'] = Auth::id();
            $validated['updated_by'] = Auth::id();

            // Buscar informações adicionais se não fornecidas
            if (!isset($validated['client_name']) && isset($validated['client_id'])) {
                $client = User::find($validated['client_id']);
                $validated['client_name'] = $client ? $client->name : '';
            }

            if (!isset($validated['assigned_to_name']) && isset($validated['assigned_to'])) {
                $assignedUser = User::find($validated['assigned_to']);
                $validated['assigned_to_name'] = $assignedUser ? $assignedUser->name : '';
            }

            if (!isset($validated['current_stage_name']) && isset($validated['current_stage_id'])) {
                $stage = Stage::find($validated['current_stage_id']);
                $validated['current_stage_name'] = $stage ? $stage->name : '';
            }

            $attendance = AircraftAttendance::create($validated);

            // Carregar relacionamentos para retorno
            $attendance->load([
                'aircraft:ID,post_title',
                'serviceOrder:id,title,status',
                'client:id,name,email',
                'assignedTo:id,name,email'
            ]);

            return response()->json([
                'success' => true,
                'data' => $attendance,
                'message' => 'Atendimento criado com sucesso'
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Dados inválidos',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar atendimento: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Atualiza um atendimento existente
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $attendance = AircraftAttendance::findOrFail($id);

            $validated = $request->validate([
                // Campos obrigatórios (opcionais na atualização)
                'aircraft_id' => 'sometimes|exists:posts,ID',
                'service_order_id' => 'sometimes|exists:service_orders,id',
                'title' => 'sometimes|string|max:255',
                'status' => ['sometimes', Rule::in(array_column(AttendanceStatus::cases(), 'value'))],
                'priority' => 'sometimes|in:low,medium,high,urgent',
                'started_at' => 'sometimes|date',
                'client_id' => 'sometimes|exists:users,id',
                'client_name' => 'sometimes|string|max:255',
                
                // Campos opcionais
                'description' => 'nullable|string',
                'current_funnel_id' => 'nullable|integer',
                'current_funnel_name' => 'nullable|string|max:255',
                'current_stage_id' => 'nullable|exists:stages,id',
                'current_stage_name' => 'nullable|string|max:255',
                'completed_at' => 'nullable|date',
                'estimated_completion' => 'nullable|date',
                'assigned_to' => 'nullable|exists:users,id',
                'assigned_to_name' => 'nullable|string|max:255',
                'notes' => 'nullable|string',
                'internal_notes' => 'nullable|string',
                'service_summary' => 'nullable|array',
            ]);

            // Atualizar informações do usuário
            $validated['updated_by'] = Auth::id();

            // Atualizar nomes se IDs foram alterados
            if (isset($validated['client_id']) && !isset($validated['client_name'])) {
                $client = User::find($validated['client_id']);
                $validated['client_name'] = $client ? $client->name : '';
            }

            if (isset($validated['assigned_to']) && !isset($validated['assigned_to_name'])) {
                $assignedUser = User::find($validated['assigned_to']);
                $validated['assigned_to_name'] = $assignedUser ? $assignedUser->name : '';
            }

            if (isset($validated['current_stage_id']) && !isset($validated['current_stage_name'])) {
                $stage = Stage::find($validated['current_stage_id']);
                $validated['current_stage_name'] = $stage ? $stage->name : '';
            }

            $attendance->update($validated);

            // Recalcular duração se status foi alterado para concluído
            if (isset($validated['status']) && $validated['status'] === AttendanceStatus::COMPLETED->value) {
                $attendance->calculateDuration();
            }

            // Carregar relacionamentos para retorno
            $attendance->load([
                'aircraft:ID,post_title',
                'serviceOrder:id,title,status',
                'client:id,name,email',
                'assignedTo:id,name,email'
            ]);

            return response()->json([
                'success' => true,
                'data' => $attendance,
                'message' => 'Atendimento atualizado com sucesso'
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Dados inválidos',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar atendimento: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove um atendimento
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $attendance = AircraftAttendance::findOrFail($id);
            $attendance->delete();

            return response()->json([
                'success' => true,
                'message' => 'Atendimento removido com sucesso'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao remover atendimento: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Marca um atendimento como concluído
     */
    public function complete(int $id): JsonResponse
    {
        try {
            $attendance = AircraftAttendance::findOrFail($id);
            $attendance->markAsCompleted();

            return response()->json([
                'success' => true,
                'data' => $attendance->fresh(),
                'message' => 'Atendimento marcado como concluído'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao concluir atendimento: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Marca um atendimento como cancelado
     */
    public function cancel(int $id): JsonResponse
    {
        try {
            $attendance = AircraftAttendance::findOrFail($id);
            $attendance->markAsCancelled();

            return response()->json([
                'success' => true,
                'data' => $attendance->fresh(),
                'message' => 'Atendimento cancelado'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao cancelar atendimento: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Inicia um atendimento
     */
    public function start(int $id): JsonResponse
    {
        try {
            $attendance = AircraftAttendance::findOrFail($id);
            $attendance->start();

            return response()->json([
                'success' => true,
                'data' => $attendance->fresh(),
                'message' => 'Atendimento iniciado'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao iniciar atendimento: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Coloca um atendimento em espera
     */
    public function hold(int $id): JsonResponse
    {
        try {
            $attendance = AircraftAttendance::findOrFail($id);
            $attendance->putOnHold();

            return response()->json([
                'success' => true,
                'data' => $attendance->fresh(),
                'message' => 'Atendimento colocado em espera'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao colocar atendimento em espera: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Retorna estatísticas dos atendimentos
     */
    public function stats(): JsonResponse
    {
        try {
            $stats = [
                'total' => AircraftAttendance::count(),
                'by_status' => [],
                'by_priority' => [],
                'active' => AircraftAttendance::active()->count(),
                'finished' => AircraftAttendance::finished()->count(),
                'avg_duration' => AircraftAttendance::whereNotNull('total_duration_minutes')
                    ->avg('total_duration_minutes'),
            ];

            // Estatísticas por status
            foreach (AttendanceStatus::cases() as $status) {
                $stats['by_status'][$status->value] = AircraftAttendance::byStatus($status)->count();
            }

            // Estatísticas por prioridade
            $priorities = ['low', 'medium', 'high', 'urgent'];
            foreach ($priorities as $priority) {
                $stats['by_priority'][$priority] = AircraftAttendance::byPriority($priority)->count();
            }

            return response()->json([
                'success' => true,
                'data' => $stats,
                'message' => 'Estatísticas obtidas com sucesso'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter estatísticas: ' . $e->getMessage()
            ], 500);
        }
    }
}