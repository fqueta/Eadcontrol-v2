<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\TrackingEvent;
use App\Models\DashboardMetric;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

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
        ]);

        $trackingEvent = TrackingEvent::create($validated);

        return response()->json([
            'message' => 'Evento de tracking criado com sucesso',
            'data' => [
                'id' => $trackingEvent->id,
                'event_type' => $trackingEvent->event_type,
                'phone' => $trackingEvent->phone,
                'url' => $trackingEvent->url,
                'ip_address' => $trackingEvent->ip_address,
                'created_at' => $trackingEvent->created_at->format('Y-m-d H:i:s'),
            ]
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
}
