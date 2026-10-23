<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Jobs\IndexKnowledgeBase;
use App\Models\AiAgent;
use App\Models\AiKnowledgeBase;
use App\Models\WhatsappInstance;
use App\Services\Ai\AiAgentService;
use App\Services\Ai\LlmProviderFactory;
use App\Services\PermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

/**
 * AiAgentController
 * pt-BR: CRUD dos agentes de atendimento, base de conhecimento (RAG) e testes.
 */
class AiAgentController extends Controller
{
    protected PermissionService $permissionService;
    protected AiAgentService $agentService;

    public function __construct(AiAgentService $agentService)
    {
        $this->permissionService = new PermissionService();
        $this->agentService = $agentService;
    }

    public function index()
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $agents = AiAgent::query()
            ->with(['instance:id,display_name,instance_name,status,phone_number'])
            ->withCount([
                'knowledgeBases',
                'conversations',
                'conversations as open_conversations_count' => fn ($query) => $query->whereIn('status', ['active', 'transferred']),
            ])
            ->orderByDesc('id')
            ->get();

        return response()->json(['data' => $agents]);
    }

    public function show(string $id)
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $agent = AiAgent::query()
            ->with(['instance', 'knowledgeBases' => fn ($query) => $query->orderByDesc('id')])
            ->findOrFail($id);

        return response()->json(['data' => $agent]);
    }

    public function store(Request $request)
    {
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), $this->rules());

        if ($validator->fails()) {
            return response()->json(['message' => 'Erro de validação', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        $agent = AiAgent::create([
            'whatsapp_instance_id' => $data['whatsapp_instance_id'] ?? null,
            'name'                 => $data['name'],
            'llm_provider'         => $data['llm_provider'] ?? config('ai.default_provider', 'openai'),
            'llm_model'            => $data['llm_model'] ?? null,
            'system_prompt'        => $data['system_prompt'] ?? null,
            'welcome_message'      => $data['welcome_message'] ?? null,
            'is_active'            => (bool) ($data['is_active'] ?? true),
            'temperature'          => $data['temperature'] ?? 0.7,
            'max_tokens'           => $data['max_tokens'] ?? 600,
            'settings'             => $this->normalizeSettings($data['settings'] ?? []),
        ]);

        if (!empty($data['knowledge_content'])) {
            $base = AiKnowledgeBase::create([
                'ai_agent_id' => $agent->id,
                'name'        => $data['knowledge_name'] ?? 'Base de conhecimento principal',
                'type'        => 'text',
                'content'     => $data['knowledge_content'],
                'is_active'   => true,
            ]);

            IndexKnowledgeBase::dispatch($base->id);
        }

        return response()->json([
            'message' => 'Agente criado.',
            'data'    => $agent->fresh()->load(['instance', 'knowledgeBases']),
        ], 201);
    }

    public function update(Request $request, string $id)
    {
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $agent = AiAgent::query()->findOrFail($id);

        $validator = Validator::make($request->all(), $this->rules(true));

        if ($validator->fails()) {
            return response()->json(['message' => 'Erro de validação', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        $agent->update([
            'whatsapp_instance_id' => array_key_exists('whatsapp_instance_id', $data)
                ? $data['whatsapp_instance_id']
                : $agent->whatsapp_instance_id,
            'name'          => $data['name'] ?? $agent->name,
            'llm_provider'  => $data['llm_provider'] ?? $agent->llm_provider,
            'llm_model'     => $data['llm_model'] ?? $agent->llm_model,
            'system_prompt' => $data['system_prompt'] ?? $agent->system_prompt,
            'welcome_message' => $data['welcome_message'] ?? $agent->welcome_message,
            'is_active'     => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : $agent->is_active,
            'temperature'   => $data['temperature'] ?? $agent->temperature,
            'max_tokens'    => $data['max_tokens'] ?? $agent->max_tokens,
            'settings'      => array_key_exists('settings', $data)
                ? $this->normalizeSettings($data['settings'])
                : $agent->settings,
        ]);

        return response()->json([
            'message' => 'Agente atualizado.',
            'data'    => $agent->fresh()->load(['instance', 'knowledgeBases']),
        ]);
    }

    public function destroy(string $id)
    {
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $agent = AiAgent::query()->findOrFail($id);
        $agent->delete();

        return response()->json(['message' => 'Agente removido.']);
    }

    /**
     * Testa o agente sem enviar nada pelo WhatsApp.
     */
    public function test(Request $request, string $id)
    {
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), [
            'message' => 'required|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Erro de validação', 'errors' => $validator->errors()], 422);
        }

        $agent = AiAgent::query()->findOrFail($id);

        try {
            $result = $this->agentService->testAgent($agent, (string) $request->input('message'));
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Falha ao consultar o provedor de IA: ' . $e->getMessage(),
            ], 502);
        }

        return response()->json([
            'message' => 'Resposta gerada.',
            'data'    => $result,
        ]);
    }

    /**
     * Sincroniza o catálogo de cursos/produtos para a base RAG do agente.
     */
    public function syncCatalog(string $id)
    {
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $agent = AiAgent::query()->findOrFail($id);

        try {
            $base = $this->agentService->syncCatalog($agent);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Falha ao sincronizar catálogo: ' . $e->getMessage()], 502);
        }

        return response()->json([
            'message' => 'Catálogo sincronizado e indexado.',
            'data'    => $base,
        ]);
    }

    /**
     * Providers/modelos disponíveis e se estão configurados no tenant.
     */
    public function providers()
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        return response()->json([
            'data' => LlmProviderFactory::availableProviders(),
        ]);
    }

    /**
     * Instâncias disponíveis para vincular ao agente.
     */
    public function instances()
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        return response()->json([
            'data' => WhatsappInstance::query()
                ->orderByDesc('created_at')
                ->get(['id', 'display_name', 'instance_name', 'phone_number', 'status']),
        ]);
    }

    // ─── Base de conhecimento ──────────────────────────────────────────────

    public function knowledgeIndex(string $id)
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $agent = AiAgent::query()->findOrFail($id);

        $bases = $agent->knowledgeBases()
            ->withCount('chunks')
            ->orderByDesc('id')
            ->get();

        return response()->json(['data' => $bases]);
    }

    public function knowledgeStore(Request $request, string $id)
    {
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name'    => 'required|string|max:150',
            'type'    => ['nullable', Rule::in(['text', 'faq', 'url', 'catalog'])],
            'content' => 'required|string|max:200000',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Erro de validação', 'errors' => $validator->errors()], 422);
        }

        $agent = AiAgent::query()->findOrFail($id);

        $base = AiKnowledgeBase::create([
            'ai_agent_id' => $agent->id,
            'name'        => $request->input('name'),
            'type'        => $request->input('type', 'text'),
            'content'     => $request->input('content'),
            'is_active'   => $request->boolean('is_active', true),
        ]);

        IndexKnowledgeBase::dispatch($base->id);

        return response()->json([
            'message' => 'Base criada. A indexação (embeddings) foi iniciada em segundo plano.',
            'data'    => $base->fresh(),
        ], 201);
    }

    public function knowledgeUpdate(Request $request, string $knowledgeBaseId)
    {
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name'      => 'sometimes|required|string|max:150',
            'type'      => ['sometimes', 'required', Rule::in(['text', 'faq', 'url', 'catalog'])],
            'content'   => 'sometimes|required|string|max:200000',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Erro de validação', 'errors' => $validator->errors()], 422);
        }

        $base = AiKnowledgeBase::query()->findOrFail($knowledgeBaseId);

        $base->update($request->only(['name', 'type', 'content', 'is_active']));

        if ($request->has('content')) {
            IndexKnowledgeBase::dispatch($base->id);
        }

        return response()->json([
            'message' => 'Base atualizada.',
            'data'    => $base->fresh(),
        ]);
    }

    public function knowledgeDestroy(string $knowledgeBaseId)
    {
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $base = AiKnowledgeBase::query()->findOrFail($knowledgeBaseId);
        $base->delete();

        return response()->json(['message' => 'Base removida.']);
    }

    public function knowledgeReindex(string $knowledgeBaseId)
    {
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $base = AiKnowledgeBase::query()->findOrFail($knowledgeBaseId);

        $base->update(['embeddings_status' => 'processing', 'embeddings_error' => null]);

        IndexKnowledgeBase::dispatch($base->id);

        return response()->json([
            'message' => 'Reindexação iniciada em segundo plano.',
            'data'    => $base->fresh(),
        ]);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────

    private function rules(bool $updating = false): array
    {
        $required = $updating ? 'sometimes' : 'required';

        return [
            'name'                 => [$required, 'string', 'max:120'],
            'whatsapp_instance_id' => ['nullable', 'integer', 'exists:whatsapp_instances,id'],
            'llm_provider'         => ['nullable', Rule::in(['openai', 'deepseek', 'gemini', 'claude'])],
            'llm_model'            => ['nullable', 'string', 'max:100'],
            'system_prompt'        => ['nullable', 'string', 'max:20000'],
            'welcome_message'      => ['nullable', 'string', 'max:2000'],
            'is_active'            => ['nullable', 'boolean'],
            'temperature'          => ['nullable', 'numeric', 'min:0', 'max:1'],
            'max_tokens'           => ['nullable', 'integer', 'min:64', 'max:8192'],
            'settings'             => ['nullable', 'array'],
            'knowledge_name'       => ['nullable', 'string', 'max:150'],
            'knowledge_content'    => ['nullable', 'string', 'max:200000'],
        ];
    }

    /**
     * Normaliza settings conhecidos e descarta chaves desconhecidas.
     */
    private function normalizeSettings(array $settings): array
    {
        $allowed = [
            'business_hours',
            'transfer_keywords',
            'handoff_message',
            'offline_message',
            'use_catalog',
            'catalog_courses_limit',
            'catalog_products_limit',
        ];

        $normalized = array_intersect_key($settings, array_flip($allowed));

        if (isset($normalized['transfer_keywords']) && is_string($normalized['transfer_keywords'])) {
            $normalized['transfer_keywords'] = array_values(array_filter(array_map(
                'trim',
                preg_split('/[,;\n]/', $normalized['transfer_keywords']) ?: []
            )));
        }

        if (isset($normalized['use_catalog'])) {
            $normalized['use_catalog'] = (bool) $normalized['use_catalog'];
        }

        return $normalized;
    }
}
