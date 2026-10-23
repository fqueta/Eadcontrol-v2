<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\WhatsappInstance;
use App\Services\PermissionService;
use App\Services\Whatsapp\WhatsappAdminNotifier;
use App\Services\Whatsapp\WhatsappNotificationSettings;
use App\Services\Whatsapp\WhatsappService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;

/**
 * WhatsappController
 * pt-BR: Conexões (instâncias) do Evolution GO no tenant.
 * en-US: Evolution GO connections (instances) for the tenant.
 */
class WhatsappController extends Controller
{
    protected PermissionService $permissionService;
    protected WhatsappService $whatsappService;

    public function __construct(WhatsappService $whatsappService)
    {
        $this->permissionService = new PermissionService();
        $this->whatsappService = $whatsappService;
    }

    /**
     * Lista as instâncias do tenant, com o agente vinculado.
     */
    public function index(Request $request)
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $instances = WhatsappInstance::query()
            ->with(['agents' => fn ($query) => $query->orderByDesc('is_active')->orderByDesc('id')])
            ->withCount([
                'conversations as open_conversations_count' => fn ($query) => $query->whereIn('status', ['active', 'transferred']),
            ])
            ->orderByDesc('created_at')
            ->get()
            ->each(function (WhatsappInstance $instance) {
                $instance->append('display_name');
            });

        return response()->json([
            'data' => $instances,
            'meta' => [
                'max_instances' => (int) config('whatsapp.evolution_go.max_instances', 0),
                'provider'      => 'evolution-go',
                'configured'    => self::isConfigured(),
            ],
        ]);
    }

    /**
     * Cria a instância localmente e no servidor Evolution GO.
     */
    public function store(Request $request)
    {
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), [
            'display_name' => 'required|string|max:120',
            'phone_number' => 'nullable|string|max:30',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Erro de validação', 'errors' => $validator->errors()], 422);
        }

        $max = (int) config('whatsapp.evolution_go.max_instances', 0);
        if ($max > 0 && WhatsappInstance::query()->count() >= $max) {
            return response()->json([
                'message' => "Limite de {$max} conexões WhatsApp atingido. Remova uma conexão antiga para criar outra.",
            ], 422);
        }

        if (!self::isConfigured()) {
            return response()->json([
                'message' => 'Evolution GO não configurado. Vá em Configurações > Integrações e cadastre a URL e a API key.',
            ], 422);
        }

        $validated = $validator->validated();

        $instance = WhatsappInstance::create([
            'display_name'  => $validated['display_name'],
            'instance_name' => $this->makeInstanceName(),
            'phone_number'  => isset($validated['phone_number']) ? preg_replace('/\D/', '', $validated['phone_number']) : null,
            'status'        => 'disconnected',
            'provider'      => 'evolution-go',
            'settings'      => [],
        ]);

        try {
            $this->whatsappService->createInstance($instance);
        } catch (\Throwable $e) {
            $instance->update(['last_error' => $e->getMessage()]);

            return response()->json([
                'message'  => 'Conexão criada, mas o Evolution GO recusou a criação da instância: ' . $e->getMessage(),
                'instance' => $instance->fresh(),
            ], 502);
        }

        return response()->json([
            'message'  => 'Conexão criada. Escaneie o QR Code para parear o WhatsApp.',
            'instance' => $instance->fresh(),
        ], 201);
    }

    public function show(string $id)
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $instance = WhatsappInstance::query()->findOrFail($id);

        try {
            $this->whatsappService->checkStatus($instance);
            $instance->refresh();
        } catch (\Throwable $e) {
            // Falha de status não impede a exibição do registro.
        }

        return response()->json(['data' => $instance]);
    }

    /**
     * Inicia a conexão e retorna o QR Code.
     */
    public function connect(string $id)
    {
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $instance = WhatsappInstance::query()->findOrFail($id);

        try {
            $data = $this->whatsappService->connectInstance($instance);
        } catch (\RuntimeException $e) {
            $status = $e->getCode() === 429 ? 429 : 502;

            $instance->update(['last_error' => $e->getMessage()]);

            return response()->json(['message' => $e->getMessage()], $status);
        } catch (\Throwable $e) {
            $instance->update(['last_error' => $e->getMessage()]);

            return response()->json([
                'message' => 'Não foi possível conectar ao Evolution GO: ' . $e->getMessage(),
            ], 502);
        }

        return response()->json([
            'message'  => ($data['status'] ?? '') === 'connected'
                ? 'WhatsApp já está conectado.'
                : 'QR Code gerado. Escaneie com o WhatsApp em até 60 segundos.',
            'instance' => $instance->fresh(),
            'qr_code'  => $data['qr_code'] ?? null,
            'status'   => $data['status'] ?? 'connecting',
        ]);
    }

    /**
     * Pareamento por código (telefone).
     */
    public function pair(Request $request, string $id)
    {
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), [
            'phone' => 'required|string|min:10|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Erro de validação', 'errors' => $validator->errors()], 422);
        }

        $instance = WhatsappInstance::query()->findOrFail($id);

        try {
            $data = $this->whatsappService->pair($instance, (string) $request->input('phone'));
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }

        return response()->json([
            'message' => 'Código de pareamento gerado. Informe-o no WhatsApp do celular.',
            'data'    => $data,
        ]);
    }

    /**
     * Status ao vivo da instância.
     */
    public function status(string $id)
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $instance = WhatsappInstance::query()->findOrFail($id);

        $status = $this->whatsappService->checkStatus($instance);

        return response()->json([
            'status'   => $status,
            'instance' => $instance->fresh(),
        ]);
    }

    public function disconnect(string $id)
    {
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $instance = WhatsappInstance::query()->findOrFail($id);

        try {
            $this->whatsappService->disconnectInstance($instance);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }

        return response()->json([
            'message'  => 'WhatsApp desconectado.',
            'instance' => $instance->fresh(),
        ]);
    }

    public function reconnect(string $id)
    {
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $instance = WhatsappInstance::query()->findOrFail($id);

        try {
            $status = $this->whatsappService->reconnectInstance($instance);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }

        return response()->json([
            'status'   => $status,
            'instance' => $instance->fresh(),
        ]);
    }

    public function destroy(string $id)
    {
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $instance = WhatsappInstance::query()->findOrFail($id);

        $this->whatsappService->deleteInstance($instance);

        return response()->json(['message' => 'Conexão removida.']);
    }

    /**
     * Envio avulso de mensagem (teste).
     */
    public function sendMessage(Request $request, string $id)
    {
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), [
            'phone'   => 'required|string|min:10|max:20',
            'message' => 'required|string|max:4000',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Erro de validação', 'errors' => $validator->errors()], 422);
        }

        $instance = WhatsappInstance::query()->findOrFail($id);

        try {
            $responses = $this->whatsappService->sendMessage(
                $instance,
                (string) $request->input('phone'),
                (string) $request->input('message')
            );
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }

        return response()->json([
            'message' => 'Mensagem enviada.',
            'sent'    => count($responses),
        ]);
    }

    /**
     * Ativa/desativa o agente de IA da instância.
     */
    public function toggleAi(Request $request, string $id)
    {
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $instance = WhatsappInstance::query()->findOrFail($id);

        $agent = $instance->agents()->orderByDesc('id')->first();

        if (!$agent) {
            return response()->json([
                'message' => 'Nenhum agente de IA vinculado a esta conexão. Crie um agente em Atendimento > Agentes de IA.',
            ], 422);
        }

        $agent->update(['is_active' => $request->boolean('is_active', !$agent->is_active)]);

        return response()->json([
            'message' => $agent->is_active ? 'Agente de IA ativado.' : 'Agente de IA pausado.',
            'agent'   => $agent->fresh(),
        ]);
    }

    /**
     * Preferências de notificações administrativas via WhatsApp.
     */
    public function notificationSettings()
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $settings = app(WhatsappNotificationSettings::class);

        $instances = WhatsappInstance::query()
            ->orderByRaw("CASE WHEN status = 'connected' THEN 0 ELSE 1 END")
            ->orderBy('id')
            ->get(['id', 'display_name', 'phone_number', 'status'])
            ->each(function (WhatsappInstance $instance) {
                $instance->append('display_name');
            });

        return response()->json([
            'data'      => $settings->get(),
            'instances' => $instances,
            'events'    => collect(WhatsappNotificationSettings::EVENTS)
                ->map(fn ($label, $key) => ['key' => $key, 'label' => $label])
                ->values(),
        ]);
    }

    /**
     * Salva as preferências de notificações administrativas.
     */
    public function updateNotificationSettings(Request $request)
    {
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), [
            'enabled'     => 'nullable|boolean',
            'instance_id' => 'nullable|integer|exists:whatsapp_instances,id',
            'recipients'  => 'nullable|string|max:500',
            'events'      => 'nullable|array',
            'events.*'    => 'string|in:' . implode(',', array_keys(WhatsappNotificationSettings::EVENTS)),
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Erro de validação', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['enabled'] = $request->boolean('enabled');

        $settings = app(WhatsappNotificationSettings::class)->save($data);

        return response()->json([
            'message' => 'Preferências de notificação atualizadas.',
            'data'    => $settings,
        ]);
    }

    /**
     * Envia uma mensagem de teste para validar número e conexão.
     */
    public function testNotification(Request $request)
    {
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), [
            'phone' => 'nullable|string|max:60',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Erro de validação', 'errors' => $validator->errors()], 422);
        }

        try {
            $result = app(WhatsappAdminNotifier::class)
                ->sendTestMessage($request->input('phone'));
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }

        return response()->json([
            'message' => 'Mensagem de teste enviada.',
            'sent'    => $result['sent'],
        ]);
    }

    /**
     * Webhook público do Evolution GO.
     * A tenancy é resolvida pelo domínio (rota do tenant).
     */
    public function webhook(Request $request, string $instanceName)
    {
        try {
            $this->whatsappService->handleWebhook($instanceName, $request->all());
        } catch (\Throwable $e) {
            // Nunca devolve erro ao Evolution GO para evitar reenvios em cascata.
            Log::error('WhatsappController: falha ao processar webhook', [
                'instance' => $instanceName,
                'error'    => $e->getMessage(),
            ]);
        }

        return response()->json(['status' => 'ok']);
    }

    /**
     * Verifica se a integração Evolution GO está configurada no tenant.
     */
    public static function isConfigured(): bool
    {
        $config = WhatsappInstance::evolutionConfig();

        return !empty($config['base_url']) && !empty($config['api_key']);
    }

    /**
     * Gera o nome técnico único da instância no servidor compartilhado.
     */
    private function makeInstanceName(): string
    {
        $prefix = (string) config('whatsapp.evolution_go.instance_prefix', 'ead');

        $tenantKey = 'tenant';
        try {
            $tenantKey = (string) (tenant('id') ?? 'tenant');
        } catch (\Throwable $e) {
            // central/CLI
        }

        $tenantKey = substr(Str::slug($tenantKey, '-') ?: 'tenant', 0, 24);

        do {
            $name = $prefix . '_' . $tenantKey . '_' . Str::lower(Str::random(6));
        } while (WhatsappInstance::query()->where('instance_name', $name)->exists());

        return $name;
    }
}
