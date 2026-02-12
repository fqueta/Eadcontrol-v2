<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\TrackingEvent;
use App\Models\DashboardMetric;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;
use App\Models\Curso;
use App\Models\Activity;
use Illuminate\Support\Facades\DB;

class TrackingEventController extends Controller
{
    /**
     * Retorna uma lista paginada de eventos de tracking
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        // Inicializar query builder
        $query = TrackingEvent::query();

        // Aplicar filtro por event_type se fornecido
        if ($request->filled('event_type')) {
            $eventType = $request->input('event_type');

            // Validar se o event_type é válido
            if (in_array($eventType, ['view', 'whatsapp_contact'])) {
                $query->byEventType($eventType);
            }
        }

        // Ordenar por created_at em ordem decrescente
        $query->latest();

        // Aplicar paginação (15 registros por página por padrão)
        $perPage = $request->input('per_page', 15);
        $trackingEvents = $query->paginate($perPage);

        // Formatar os dados conforme especificado
        $formattedData = $trackingEvents->map(function ($event) {
            return [
                'id' => $event->id,
                'event_type' => $event->event_type,
                'phone' => $event->phone,
                'url' => $event->url,
                'ip_address' => $event->ip_address,
                'created_at' => $event->created_at->format('Y-m-d H:i:s'),
            ];
        });

        // Retornar resposta JSON no formato especificado
        return response()->json([
            'data' => $formattedData,
            'meta' => [
                'total' => $trackingEvents->total(),
                'per_page' => $trackingEvents->perPage(),
                'current_page' => $trackingEvents->currentPage(),
                'last_page' => $trackingEvents->lastPage(),
                'from' => $trackingEvents->firstItem(),
                'to' => $trackingEvents->lastItem(),
            ]
        ]);
    }

    /**
     * Armazena um novo evento de tracking
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'event_type' => 'required|in:view,whatsapp_contact',
            'phone' => 'nullable|string|max:20',
            'url' => 'nullable|string|max:500',
            'ip_address' => 'nullable|ip',
            'user_id' => 'nullable|string',
            'resource_type' => 'nullable|string',
            'resource_id' => 'nullable|numeric',
            'metadata' => 'nullable|array',
        ]);

        $trackingEvent = TrackingEvent::create($validated);

        return response()->json([
            'message' => 'Evento de tracking criado com sucesso',
            'data' => $trackingEvent
        ], 201);
    }

    /**
     * Registra um contato do WhatsApp automaticamente
     * Recebe apenas o telefone e define event_type como 'whatsapp_contact'
     * Verifica se o telefone já foi registrado para evitar duplicatas
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function whatsappContact(Request $request): JsonResponse
    {
        // dd($request->all());
        $validated = $request->validate([
            'phone' => 'required|string|max:20',
            'url' => 'nullable|string|max:500',
        ]);
        $campaignId = 'whatsapp_contact';
        // Verificar se já existe um registro com este telefone
        $existingContact = TrackingEvent::where('event_type', $campaignId)
            ->where('phone', $validated['phone'])
            ->first();

        if ($existingContact) {
            return response()->json([
                'success' => false,
                'message' => 'Este telefone já foi registrado anteriormente',
                'data' => [
                    'id' => $existingContact->id,
                    'event_type' => $existingContact->event_type,
                    'phone' => $existingContact->phone,
                    'url' => $existingContact->url,
                    'ip_address' => $existingContact->ip_address,
                    'created_at' => $existingContact->created_at->format('Y-m-d H:i:s'),
                ]
            ], 409); // 409 Conflict
        }

        // Automaticamente definir event_type como 'whatsapp_contact'
        $trackingData = [
            'event_type' => 'whatsapp_contact',
            'phone' => $validated['phone'],
            'url' => $validated['url'] ?? null,
            'ip_address' => $request->ip(), // Capturar IP automaticamente
        ];

        $trackingEvent = TrackingEvent::create($trackingData);

        // Incrementar contador bot_conversations na tabela dashboard_metrics
        $today = Carbon::today()->format('Y-m-d');


        // Buscar ou criar registro de métrica para hoje
        $dashboardMetric = DashboardMetric::firstOrCreate(
            [
                'period' => $today,
                'campaign_id' => $campaignId,
            ],
            [
                'user_id' => null,
                'investment' => 0,
                'visitors' => 0,
                'bot_conversations' => 0,
                'human_conversations' => 0,
                'proposals' => 0,
                'closed_deals' => 0,
                'meta' => null,
                'token' => null,
            ]
        );

        // Incrementar o contador de bot_conversations
        $dashboardMetric->increment('bot_conversations');

        return response()->json([
            'success' => true,
            'message' => 'Contato WhatsApp registrado com sucesso',
            'data' => [
                'id' => $trackingEvent->id,
                'event_type' => $trackingEvent->event_type,
                'phone' => $trackingEvent->phone,
                'url' => $trackingEvent->url,
                'ip_address' => $trackingEvent->ip_address,
                'created_at' => $trackingEvent->created_at->format('Y-m-d H:i:s'),
            ],
            'metrics' => [
                'bot_conversations_count' => $dashboardMetric->bot_conversations,
                'period' => $dashboardMetric->period,
                'campaign_id' => $dashboardMetric->campaign_id,
            ]
        ], 201);
    }

    /**
     * Retorna estatísticas para o dashboard de analytics
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function dashboardStats(Request $request): JsonResponse
    {
        // Período de análise (padrão: últimos 30 dias)
        $days = $request->input('days', 30);
        $startDate = Carbon::now()->subDays($days);

        // 1. Visão Geral
        $totalViews = TrackingEvent::where('event_type', 'view')
            ->where('created_at', '>=', $startDate)
            ->count();

        $activeUsers = TrackingEvent::where('event_type', 'view')
            ->where('created_at', '>=', $startDate)
            ->whereNotNull('user_id')
            ->distinct('user_id')
            ->count('user_id');

        // 2. Cursos mais acessados
        // Considerando resource_type = 'App\Models\Curso' ou 'course' (dependendo de como o frontend enviar)
        // O ideal é padronizar. Vamos assumir App\Models\Curso se for polymorphic padrão.
        $topCourses = TrackingEvent::where('event_type', 'view')
            ->where('resource_type', 'like', '%Curso') // Pega App\Models\Curso
            ->where('created_at', '>=', $startDate)
            ->select('resource_id', DB::raw('count(*) as total'))
            ->groupBy('resource_id')
            ->orderByDesc('total')
            ->limit(5)
            ->with('resource:id,nome,titulo') // Eager load básico se possível, mas morph pode ser chato.
            // Alternativa: fazer join ou buscar nomes depois.
            // Como é morph, o with('resource') funciona se o mapeamento estiver certo.
            ->get()
            ->map(function ($item) {
                // Tenta carregar o recurso se o eager load falhar ou precisar de tratamento
                $course = Curso::find($item->resource_id);
                return [
                    'id' => $item->resource_id,
                    'title' => $course ? ($course->titulo ?? $course->nome) : 'Curso #' . $item->resource_id,
                    'views' => $item->total
                ];
            });

        // 3. Atividades mais vistas
        $topActivities = TrackingEvent::where('event_type', 'view')
            ->where('resource_type', 'like', '%Activity')
            ->where('created_at', '>=', $startDate)
            ->select('resource_id', DB::raw('count(*) as total'))
            ->groupBy('resource_id')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(function ($item) {
                $activity = Activity::find($item->resource_id);
                return [
                    'id' => $item->resource_id,
                    'title' => $activity ? ($activity->post_title ?? 'Atividade Sem Título') : 'Atividade #' . $item->resource_id,
                    'type' => $activity ? ($activity->post_mime_type ?? 'unknown') : 'unknown',
                    'views' => $item->total
                ];
            });

        // 4. Gráfico de visualizações por dia
        $viewsByDay = TrackingEvent::where('event_type', 'view')
            ->where('created_at', '>=', $startDate)
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as count'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // 5. Últimos acessos dos usuários
        $usersAccess = TrackingEvent::select('user_id', DB::raw('MAX(created_at) as last_access'))
            ->where('event_type', 'view')
            ->whereNotNull('user_id')
            ->groupBy('user_id')
            ->orderByDesc('last_access')
            ->limit(50)
            ->with('user:id,name,email')
            ->get()
            ->map(function ($item) {
                return [
                    'user_id' => $item->user_id,
                    'name' => $item->user ? $item->user->name : 'Usuário Removido',
                    'email' => $item->user ? $item->user->email : null,
                    'last_access' => $item->last_access, // Já é datetime string ou Carbon se cast
                    // Se precisar formatar no backend: Carbon::parse($item->last_access)->format('d/m/Y H:i')
                ];
            });

        return response()->json([
            'overview' => [
                'total_views' => $totalViews,
                'active_users' => $activeUsers,
            ],
            'top_courses' => $topCourses,
            'top_activities' => $topActivities,
            'views_chart' => $viewsByDay,
            'users_access' => $usersAccess,
        ]);
    }
}
