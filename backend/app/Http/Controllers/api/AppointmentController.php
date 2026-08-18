<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Service;
use App\Models\ServiceOrder;
use App\Models\ServiceOrderItem;
use App\Services\PermissionService;
use App\Services\Salon\AppointmentService;
use App\Services\Salon\AppointmentStateMachine;
use App\Services\Qlib;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * AppointmentController
 * pt-BR: Agendamentos do salão — painel administrativo e agendamento público.
 */
class AppointmentController extends Controller
{
    protected $permissionService;
    protected $appointmentService;

    public function __construct()
    {
        $this->permissionService = new PermissionService;
        $this->appointmentService = new AppointmentService;
    }

    /**
     * Lista agendamentos com filtros (calendário).
     */
    public function index(Request $request)
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $query = Appointment::query()->with(['client', 'assignedUser', 'service']);

        // pt-BR: Perfis acima de "Auxiliar Administrativo" (id > 3) enxergam apenas a própria agenda.
        // en-US: Profiles above "Auxiliar Administrativo" (id > 3) only see their own agenda.
        $this->applyOwnAgendaScope($query);

        if ($request->has('from') && $request->from) {
            $query->where('start_at', '>=', Carbon::parse($request->from)->startOfDay());
        }
        if ($request->has('to') && $request->to) {
            $query->where('start_at', '<=', Carbon::parse($request->to)->endOfDay());
        }
        if ($request->has('assigned_to') && $request->assigned_to) {
            $query->where('assigned_to', $request->assigned_to);
        }
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }
        if ($request->has('source') && $request->source) {
            $query->where('source', $request->source);
        }
        if ($request->has('client_id') && $request->client_id) {
            $query->where('client_id', $request->client_id);
        }
        if ($request->has('search') && $request->search) {
            $term = $request->search;
            $query->where(function ($q) use ($term) {
                $q->where('client_name', 'like', "%{$term}%")
                    ->orWhere('client_email', 'like', "%{$term}%")
                    ->orWhere('client_phone', 'like', "%{$term}%")
                    ->orWhere('title', 'like', "%{$term}%");
            });
        }

        $query->orderBy('start_at');

        $appointments = $query->get();

        return response()->json([
            'data' => $appointments->map(fn (Appointment $a) => $this->appointmentService->transform($a)),
        ]);
    }

    /**
     * Detalha um agendamento.
     */
    public function show(Request $request, string $id)
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $appointment = Appointment::find($id);
        if (!$appointment) {
            return response()->json(['message' => 'Agendamento não encontrado'], 404);
        }

        $this->assertOwnAgenda($appointment);

        $appointment->load(['client', 'assignedUser', 'service']);

        return response()->json([
            'data' => $this->appointmentService->transform($appointment),
        ]);
    }

    /**
     * Cria um agendamento pelo painel administrativo.
     */
    public function store(Request $request)
    {
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), $this->rules());
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $this->normalize($validator->validated());
        $generateOs = (bool) ($request->boolean('generateServiceOrder') || $request->boolean('generate_service_order'));

        // pt-BR: Perfis restritos só agendam para si mesmos.
        $user = $request->user();
        if ($user && (int) $user->permission_id > 3) {
            $data['assigned_to'] = $user->id;
        }

        $conflicts = $this->appointmentService->findConflicts($data);
        if ($conflicts->isNotEmpty()) {
            $first = $conflicts->first();

            return response()->json([
                'message' => 'Conflito de horário: já existe um agendamento neste intervalo.',
                'errors' => ['conflict' => [
                    'Conflito com "' . ($first->title ?? 'Agendamento') . '" das '
                    . $first->start_at?->format('H:i') . ' às ' . $first->end_at?->format('H:i') . ' para este profissional.',
                ]],
            ], 409);
        }

        $data['source'] = $data['source'] ?? 'admin';

        try {
            DB::beginTransaction();

            $appointment = Appointment::create($data);

            // Gera uma Ordem de Serviço vinculada quando solicitado e há cliente cadastrado.
            if ($generateOs && $appointment->client_id) {
                $this->createServiceOrderFromAppointment($appointment);
            }

            DB::commit();

            $appointment->load(['client', 'assignedUser', 'service']);

            return response()->json([
                'data' => $this->appointmentService->transform($appointment),
                'message' => 'Agendamento criado com sucesso',
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Erro ao criar agendamento: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Atualiza um agendamento.
     */
    public function update(Request $request, string $id)
    {
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $appointment = Appointment::find($id);
        if (!$appointment) {
            return response()->json(['message' => 'Agendamento não encontrado'], 404);
        }

        $this->assertOwnAgenda($appointment);

        $validator = Validator::make($request->all(), $this->rules(true));
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $this->normalize($validator->validated(), $appointment);
        $generateOs = (bool) ($request->boolean('generateServiceOrder') || $request->boolean('generate_service_order'));

        // pt-BR: Perfis restritos não podem transferir agendamento para outro profissional.
        $user = $request->user();
        if ($user && (int) $user->permission_id > 3) {
            $data['assigned_to'] = $user->id;
        }

        $conflicts = $this->appointmentService->findConflicts($data, $appointment->id);
        if ($conflicts->isNotEmpty()) {
            $first = $conflicts->first();

            return response()->json([
                'message' => 'Conflito de horário: já existe um agendamento neste intervalo.',
                'errors' => ['conflict' => [
                    'Conflito com "' . ($first->title ?? 'Agendamento') . '" das '
                    . $first->start_at?->format('H:i') . ' às ' . $first->end_at?->format('H:i') . ' para este profissional.',
                ]],
            ], 409);
        }

        try {
            DB::beginTransaction();

            $appointment->update($data);

            // Gera uma Ordem de Serviço vinculada quando solicitado e há cliente cadastrado.
            if ($generateOs && $appointment->client_id) {
                $this->createServiceOrderFromAppointment($appointment);
            }

            DB::commit();

            $appointment->load(['client', 'assignedUser', 'service']);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Erro ao atualizar agendamento: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'data' => $this->appointmentService->transform($appointment),
            'message' => 'Agendamento atualizado com sucesso',
        ]);
    }

    /**
     * Transição de status (validada pela state machine).
     */
    public function updateStatus(Request $request, string $id)
    {
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:' . implode(',', Appointment::STATUSES),
        ]);
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        $appointment = Appointment::find($id);
        if (!$appointment) {
            return response()->json(['message' => 'Agendamento não encontrado'], 404);
        }

        $this->assertOwnAgenda($appointment);

        try {
            AppointmentStateMachine::assertTransition($appointment, $request->status);

            DB::transaction(function () use ($appointment, $request) {
                $appointment->update(['status' => $request->status]);

                // Quando o agendamento é concluído, baixa os produtos do serviço (se houver).
                if ($request->status === 'concluido') {
                    // Opcional: reutilizar fluxo de ordem de serviço aqui no futuro.
                }
            });

            return response()->json([
                'data' => $this->appointmentService->transform($appointment->refresh()),
                'message' => 'Status atualizado com sucesso',
            ]);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erro ao atualizar status: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Exclui (soft delete) um agendamento.
     */
    public function destroy(Request $request, string $id)
    {
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $appointment = Appointment::find($id);
        if (!$appointment) {
            return response()->json(['message' => 'Agendamento não encontrado'], 404);
        }

        $this->assertOwnAgenda($appointment);

        $appointment->delete();

        return response()->json(['message' => 'Agendamento excluído com sucesso']);
    }

    /**
     * Horários disponíveis para o painel (autenticado).
     */
    public function availableSlots(Request $request)
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        return $this->buildSlotsResponse($request);
    }

    /**
     * Horários disponíveis (público — página de agendamento do cliente).
     */
    public function publicSlots(Request $request)
    {
        return $this->buildSlotsResponse($request);
    }

    /**
     * Profissionais disponíveis para agendamento público.
     * pt-BR: Retorna todos os profissionais (não-clientes). O campo `public`
     * indica se a agenda está liberada para o agendamento público genérico
     * (config.agenda_publica === 's'); links personalizados funcionam para todos.
     */
    public function publicProfessionals(Request $request)
    {
        $clientePermissionId = Qlib::qoption('permission_client_id');

        $users = \App\Models\User::query()
            ->where('permission_id', '!=', $clientePermissionId)
            ->where(function ($q) {
                $q->whereNull('deletado')->orWhere('deletado', '!=', 's');
            })
            ->where(function ($q) {
                $q->whereNull('excluido')->orWhere('excluido', '!=', 's');
            })
            ->orderBy('name')
            ->get(['id', 'name', 'config'])
            ->values();

        return response()->json([
            'data' => $users->map(function (\App\Models\User $u) {
                $config = is_array($u->config) ? $u->config : [];
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'public' => ($config['agenda_publica'] ?? null) === 's',
                ];
            }),
        ]);
    }

    /**
     * Serviços disponíveis para agendamento público.
     * pt-BR: Retorna apenas serviços com agenda pública liberada
     * (config->agendaPublica === 's'); serviços antigos sem a flag continuam públicos.
     */
    public function publicServices(Request $request)
    {
        $services = Service::where('post_status', 'publish')
            ->orderBy('post_title', 'asc')
            ->get()
            ->filter(function (Service $service) {
                return ($service->config['agendaPublica'] ?? 's') === 's';
            })
            ->values();

        return response()->json([
            'data' => $services->map(function (Service $service) {
                return [
                    'id' => $service->ID,
                    'name' => $service->post_title,
                    'description' => $service->post_content,
                    'price' => $service->post_value1,
                    'duration' => AppointmentService::serviceDuration($service),
                ];
            }),
        ]);
    }

    /**
     * Cria agendamento pelo link público do cliente.
     */
    public function publicStore(Request $request)
    {
        $validator = Validator::make($request->all(), $this->publicRules());
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $data = $this->normalize($validated);

        $conflicts = $this->appointmentService->findConflicts($data);
        if ($conflicts->isNotEmpty()) {
            return response()->json([
                'message' => 'Este horário acabou de ser reservado. Escolha outro.',
                'errors' => ['conflict' => ['Horário indisponível.']],
            ], 409);
        }

        $data['source'] = 'client';
        $data['status'] = 'agendado';
        $data['token'] = Qlib::token();

        try {
            $appointment = Appointment::create($data);

            return response()->json([
                'data' => $this->appointmentService->transform($appointment),
                'message' => 'Solicitação de agendamento enviada. Aguarde a confirmação.',
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erro ao enviar agendamento: ' . $e->getMessage()], 500);
        }
    }

    /**
     * pt-BR: Restringe a query aos agendamentos do próprio usuário quando o perfil
     * é maior que "Auxiliar Administrativo" (permission_id > 3).
     * en-US: Restricts the query to the user's own appointments when the profile
     * is above "Auxiliar Administrativo" (permission_id > 3).
     */
    protected function applyOwnAgendaScope($query, ?\App\Models\User $user = null): void
    {
        $user = $user ?? request()->user();
        if ($user && (int) $user->permission_id > 3) {
            $query->where('assigned_to', $user->id);
        }
    }

    /**
     * pt-BR: Impede perfis restritos (permission_id > 3) de acessar agendamentos
     * que não sejam os seus. Lança 403 em caso de acesso a registro alheio.
     * en-US: Prevents restricted profiles (permission_id > 3) from accessing
     * appointments that are not their own. Throws 403 otherwise.
     */
    protected function assertOwnAgenda(?Appointment $appointment): void
    {
        $user = request()->user();
        if (!$user || (int) $user->permission_id <= 3) {
            return;
        }

        if (!$appointment || (string) $appointment->assigned_to !== (string) $user->id) {
            abort(403, 'Acesso negado');
        }
    }

    /**
     * Regras de validação comum (painel).
     */
    protected function rules(bool $partial = false): array
    {
        $base = [
            'title' => 'nullable|string|max:255',
            'clientId' => 'nullable|string|max:255',
            'serviceId' => 'nullable|integer',
            'assignedTo' => 'nullable|string|max:255',
            'start' => 'sometimes|required|date',
            'duration' => 'nullable|integer|min:5|max:1440',
            'status' => 'nullable|in:' . implode(',', Appointment::STATUSES),
            'clientName' => 'nullable|string|max:255',
            'clientPhone' => 'nullable|string|max:40',
            'clientEmail' => 'nullable|email|max:255',
            'color' => 'nullable|string|max:20',
            'notes' => 'nullable|string',
            'generateServiceOrder' => 'boolean',
        ];

        foreach ($base as $key => $rule) {
            if ($partial) {
                $base[$key] = 'sometimes|' . $rule;
            }
        }

        return $base;
    }

    protected function publicRules(): array
    {
        return [
            'serviceId' => 'nullable|integer',
            'assignedTo' => 'nullable|string|max:255',
            'start' => 'required|date|after:' . now()->subHour()->toDateTimeString(),
            'duration' => 'nullable|integer|min:5|max:1440',
            'clientName' => 'required|string|max:255',
            'clientPhone' => 'required|string|max:40',
            'clientEmail' => 'nullable|email|max:255',
            'notes' => 'nullable|string|max:2000',
        ];
    }

    /**
     * Normaliza campos camelCase e calcula end_at a partir da duração.
     */
    protected function normalize(array $data, ?Appointment $current = null): array
    {
        $out = [
            'title' => $data['title'] ?? ($current?->title ?? null),
            'client_id' => $data['clientId'] ?? $data['client_id'] ?? ($current?->client_id ?? null),
            'service_id' => $data['serviceId'] ?? $data['service_id'] ?? ($current?->service_id ?? null),
            'assigned_to' => $data['assignedTo'] ?? $data['assigned_to'] ?? ($current?->assigned_to ?? null),
            'status' => $data['status'] ?? ($current?->status ?? 'agendado'),
            'client_name' => $data['clientName'] ?? $data['client_name'] ?? ($current?->client_name ?? null),
            'client_phone' => $data['clientPhone'] ?? $data['client_phone'] ?? ($current?->client_phone ?? null),
            'client_email' => $data['clientEmail'] ?? $data['client_email'] ?? ($current?->client_email ?? null),
            'color' => $data['color'] ?? ($current?->color ?? '#8b5cf6'),
            'notes' => $data['notes'] ?? ($current?->notes ?? null),
        ];

        $start = isset($data['start']) ? Carbon::parse($data['start']) : ($current?->start_at ?? now());
        $out['start_at'] = $start;

        $service = null;
        if (!empty($out['service_id'])) {
            $service = Service::find($out['service_id']);
            if ($service) {
                $out['title'] = $out['title'] ?? $service->post_title;
            }
        }

        $duration = (int) ($data['duration'] ?? ($current?->duration_minutes ?? AppointmentService::serviceDuration($service)));
        $out['duration_minutes'] = $duration;
        $out['end_at'] = $start->copy()->addMinutes($duration);

        return $out;
    }

    /**
     * Monta a resposta de horários disponíveis.
     */
    protected function buildSlotsResponse(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'date' => 'required|date',
            'assignedTo' => 'nullable|string|max:255',
            'serviceId' => 'nullable|integer',
            'duration' => 'nullable|integer|min:5|max:1440',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        $date = $request->date;
        $service = Service::find($request->serviceId);
        $duration = $request->duration
            ? (int) $request->duration
            : AppointmentService::serviceDuration($service);

        $slots = $this->appointmentService->availableSlots(
            $date,
            $duration,
            $request->assignedTo ?: null,
            [
                'open_hour' => (int) ($request->open_hour ?? 9),
                'close_hour' => (int) ($request->close_hour ?? 18),
                'step_minutes' => (int) ($request->step_minutes ?? 30),
            ]
        );

        return response()->json([
            'data' => $slots,
            'duration' => $duration,
        ]);
    }

    /**
     * Cria uma Ordem de Serviço (doc_type 'os') a partir de um agendamento.
     * pt-BR: Usada quando o painel solicita gerar OS ao salvar o agendamento.
     *
     * @return ServiceOrder
     */
    protected function createServiceOrderFromAppointment(Appointment $appointment): ServiceOrder
    {
        $service = $appointment->service;
        $title = $appointment->title ?? ($service?->post_title ?? 'Agendamento #' . $appointment->id);

        $order = ServiceOrder::create([
            'doc_type' => 'os',
            'title' => $title,
            'token' => Qlib::token(),
            'assigned_to' => $appointment->assigned_to,
            'client_id' => $appointment->client_id,
            'appointment_id' => $appointment->id,
            'status' => 'agendado',
            'priority' => 'medium',
            'estimated_start_date' => $appointment->start_at?->toDateString(),
            'notes' => $appointment->notes,
        ]);

        if (!empty($appointment->service_id) && $service) {
            $price = $service->post_value1 ?? 0;

            ServiceOrderItem::create([
                'service_order_id' => $order->id,
                'item_type' => 'service',
                'item_id' => $service->ID,
                'quantity' => 1,
                'unit_price' => $price,
                'total_price' => $price,
            ]);
        }

        $order->calculateTotalAmount();

        $appointment->update(['service_order_id' => $order->id]);

        return $order;
    }
}