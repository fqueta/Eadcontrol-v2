<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\AiConversation;
use App\Models\WhatsappInstance;
use App\Services\PermissionService;
use App\Services\Whatsapp\ChatInboxService;
use App\Services\Whatsapp\WhatsappService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * ChatInboxController
 * pt-BR: Inbox unificado estilo WhatsApp Web para atendimento humano e IA.
 * en-US: Unified WhatsApp-Web-like inbox for human and AI support.
 */
class ChatInboxController extends Controller
{
    protected PermissionService $permissionService;
    protected ChatInboxService $inbox;
    protected WhatsappService $whatsappService;

    public function __construct(ChatInboxService $inbox, WhatsappService $whatsappService)
    {
        $this->permissionService = new PermissionService();
        $this->inbox = $inbox;
        $this->whatsappService = $whatsappService;
    }

    /**
     * Lista as conversas do inbox.
     */
    public function index(Request $request)
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $data = $this->inbox->listInbox([
            'instance_id' => $request->query('instance_id'),
            'status'      => $request->query('status', 'active'),
            'q'           => $request->query('q'),
            'per_page'    => $request->integer('per_page', 0) ?: null,
        ]);

        if ($data instanceof \Illuminate\Contracts\Pagination\LengthAwarePaginator) {
            return response()->json($data);
        }

        return response()->json(['data' => $data]);
    }

    /**
     * Mensagens da conversa.
     */
    public function messages(Request $request, string $id)
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $conversation = $this->inbox->resolveConversation($id);

        $this->inbox->markRead($conversation);

        $messages = $this->inbox->getMessages(
            $conversation,
            max(10, min(200, $request->integer('per_page', 50)))
        );

        return response()->json([
            'data'         => $messages->items(),
            'conversation' => $conversation->fresh()->load(['whatsappInstance', 'agent']),
            'meta'         => [
                'current_page' => $messages->currentPage(),
                'last_page'    => $messages->lastPage(),
                'total'        => $messages->total(),
                'ai_paused'    => $conversation->isAiPaused(),
            ],
        ]);
    }

    /**
     * Envia mensagem de texto como atendente humano.
     */
    public function send(Request $request, string $id)
    {
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), [
            'message' => 'required|string|max:4000',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Erro de validação', 'errors' => $validator->errors()], 422);
        }

        $conversation = $this->inbox->resolveConversation($id);

        $message = $this->inbox->sendAsHuman(
            $conversation,
            $request->user()?->id,
            (string) $request->input('message')
        );

        return response()->json([
            'message' => 'Mensagem enviada.',
            'data'    => $message,
        ]);
    }

    /**
     * Envia mídia (imagem, áudio, vídeo ou documento) como atendente humano.
     */
    public function sendMedia(Request $request, string $id)
    {
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), [
            'file'    => 'required|file|max:25600', // 25 MB
            'message' => 'nullable|string|max:1200',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Erro de validação', 'errors' => $validator->errors()], 422);
        }

        $file = $request->file('file');
        $mime = (string) $file->getMimeType();

        $type = match (true) {
            str_starts_with($mime, 'image/') => 'image',
            str_starts_with($mime, 'audio/') => 'audio',
            str_starts_with($mime, 'video/') => 'video',
            default                          => 'document',
        };

        $extension = $file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'bin';
        $path = 'chat-media/out/' . Str::uuid() . '.' . strtolower($extension);
        Storage::disk('public')->put($path, file_get_contents($file->getRealPath()));

        $media = [
            'path' => $path,
            'url'  => $this->whatsappService->publicUrl($path),
            'type' => $type,
            'mime' => $mime,
            'size' => (int) $file->getSize(),
            'name' => $file->getClientOriginalName(),
        ];

        $conversation = $this->inbox->resolveConversation($id);

        $message = $this->inbox->sendAsHuman(
            $conversation,
            $request->user()?->id,
            (string) $request->input('message', ''),
            $media
        );

        return response()->json([
            'message' => 'Mídia enviada.',
            'data'    => $message,
        ]);
    }

    /**
     * Inicia uma nova conversa a partir de um número.
     */
    public function start(Request $request)
    {
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), [
            'whatsapp_instance_id' => 'required|integer|exists:whatsapp_instances,id',
            'phone'                => 'required|string|min:10|max:20',
            'message'              => 'required|string|max:4000',
            'contact_name'         => 'nullable|string|max:180',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Erro de validação', 'errors' => $validator->errors()], 422);
        }

        $instance = $this->inbox->resolveInstance($request->input('whatsapp_instance_id'));

        try {
            $conversation = $this->inbox->startConversation(
                $instance,
                (string) $request->input('phone'),
                (string) $request->input('message'),
                $request->input('contact_name')
            );
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }

        return response()->json([
            'message'    => 'Conversa iniciada.',
            'data'       => $conversation,
            'conversation' => $conversation,
        ], 201);
    }

    /**
     * Arquiva/encerra a conversa.
     */
    public function close(string $id)
    {
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $conversation = $this->inbox->resolveConversation($id);

        $this->inbox->closeConversation($conversation);

        return response()->json([
            'message' => 'Conversa encerrada.',
            'data'    => $conversation->fresh(),
        ]);
    }

    /**
     * Pausa/retoma a IA na conversa (assumindo o atendimento humano).
     */
    public function toggleAi(Request $request, string $id)
    {
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $conversation = $this->inbox->resolveConversation($id);

        $paused = $request->boolean('paused', !$conversation->isAiPaused());

        $conversation->pauseAi($paused);

        if (!$paused) {
            // Retomar a IA devolve a conversa para a fila ativa.
            $conversation->update(['status' => 'active']);
        }

        return response()->json([
            'message'  => $paused ? 'Atendimento humano ativado (IA pausada).' : 'IA reativada nesta conversa.',
            'ai_paused' => $paused,
            'data'     => $conversation->fresh(),
        ]);
    }

    /**
     * Instâncias conectadas para o seletor do inbox.
     */
    public function instances()
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $instances = WhatsappInstance::query()
            ->orderByDesc('created_at')
            ->get(['id', 'display_name', 'instance_name', 'phone_number', 'status', 'provider']);

        return response()->json(['data' => $instances]);
    }

    /**
     * Contadores do inbox (badge do menu).
     */
    public function stats()
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        return response()->json([
            'data' => [
                'open'        => AiConversation::query()->whereIn('status', ['active', 'transferred'])->count(),
                'waiting'     => AiConversation::query()->where('status', 'transferred')->count(),
                'closed'      => AiConversation::query()->where('status', 'closed')->count(),
                'instances'   => WhatsappInstance::query()->where('status', 'connected')->count(),
            ],
        ]);
    }
}
