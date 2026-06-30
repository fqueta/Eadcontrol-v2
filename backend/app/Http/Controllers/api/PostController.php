<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class PostController extends Controller
{
    protected PermissionService $permissionService;
    public $routeName;
    public $sec;

    /**
     * Construtor do controlador
     */
    public function __construct(PermissionService $permissionService)
    {
        $this->routeName = request()->route()->getName();
        $this->permissionService = $permissionService;
        $this->sec = request()->segment(3);
    }

    /**
     * Sanitiza os dados recebidos, inclusive arrays como config
     */
    private function sanitizeInput($input, $key = null)
    {
        if (is_array($input)) {
            $sanitized = [];
            foreach ($input as $k => $value) {
                $sanitized[$k] = $this->sanitizeInput($value, $k);
            }
            return $sanitized;
        } elseif (is_string($input)) {
            if ($key === 'post_content') {
                return trim($input);
            }
            return trim(strip_tags($input));
        }
        return $input;
    }

    /**
     * Listar todos os posts
     */
    public function index(Request $request)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        // if (!$this->permissionService->isHasPermission('view')) {
        //     return response()->json(['error' => 'Acesso negado'], 403);
        // }

        $perPage = $request->input('per_page', 10);
        $order_by = $request->input('order_by', 'created_at');
        $order = $request->input('order', 'desc');

        $query = Post::query()->orderBy($order_by, $order);

        // Não exibir registros marcados como deletados ou excluídos
        $query->where(function($q) {
            $q->whereNull('deletado')->orWhere('deletado', '!=', 's');
        });
        $query->where(function($q) {
            $q->whereNull('excluido')->orWhere('excluido', '!=', 's');
        });

        // Filtros opcionais
        if ($request->filled('post_title')) {
            $query->where('post_title', 'like', '%' . $request->input('post_title') . '%');
        }
        if ($request->filled('post_type')) {
            $query->where('post_type', $request->input('post_type'));
        }
        if ($request->filled('post_status')) {
            $query->where('post_status', $request->input('post_status'));
        }
        if ($request->filled('post_author')) {
            $query->where('post_author', $request->input('post_author'));
        }

        $posts = $query->paginate($perPage);

        // Converter config para array em cada post
        $posts->getCollection()->transform(function ($post) {
            if (is_string($post->config)) {
                $configArr = json_decode($post->config, true) ?? [];
                array_walk($configArr, function (&$value) {
                    if (is_null($value)) {
                        $value = (string)'';
                    }
                });
                $post->config = $configArr;
            }
            return $post;
        });

        return response()->json($posts);
    }

    /**
     * Criar um novo post
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        // if (!$this->permissionService->isHasPermission('create')) {
        //     return response()->json(['error' => 'Acesso negado'], 403);
        // }
        // Verifica se já existe post deletado com o mesmo título
        if (!empty($request->post_title)) {
            $postTitleDel = Post::withoutGlobalScope('notDeleted')
                ->where('post_title', $request->post_title)
                ->where(function($q){
                    $q->where('deletado', 's')->orWhere('excluido', 's');
                })->first();
            if ($postTitleDel) {
                return response()->json([
                    'message' => 'Este post já está em nossa base de dados, verifique na lixeira.',
                    'errors'  => ['post_title' => ['Post com este título está na lixeira']],
                ], 422);
            }
        }

        $validator = Validator::make($request->all(), [
            'post_title'    => 'required|string|max:255',
            'post_content'  => 'nullable|string',
            'post_excerpt'  => 'nullable|string',
            'post_status'   => ['nullable', Rule::in(['publish', 'draft', 'private', 'pending'])],
            'comment_status' => ['nullable', Rule::in(['open', 'closed'])],
            'ping_status'   => ['nullable', Rule::in(['open', 'closed'])],
            'post_password' => 'nullable|string|max:255',
            'post_name'     => 'nullable|string|max:200|unique:posts,post_name',
            'to_ping'       => ['nullable', Rule::in(['n', 's'])],
            'pinged'        => 'nullable|string',
            'post_content_filtered' => 'nullable|string',
            'post_parent'   => 'nullable|integer|exists:posts,ID',
            'guid'          => 'nullable|string|max:255',
            'menu_order'    => 'nullable|integer',
            'post_type'     => ['nullable', Rule::in(['post', 'page', 'attachment', 'revision', 'nav_menu_item', 'banner_slide', 'video_tip'])],
            'post_mime_type' => 'nullable|string|max:100',
            'comment_count' => 'nullable|integer',
            'config'        => 'array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        // Sanitização dos dados
        $validated = $this->sanitizeInput($validated);

        // Gerar token único
        $validated['token'] = Qlib::token();

        // Definir autor como usuário logado
        $validated['post_author'] = $user->id;

        // Valores padrão
        $validated['post_status'] = $validated['post_status'] ?? 'draft';
        $validated['comment_status'] = $validated['comment_status'] ?? 'open';
        $validated['ping_status'] = $validated['ping_status'] ?? 'open';
        $validated['post_type'] = $validated['post_type'] ?? 'post';
        $validated['menu_order'] = $validated['menu_order'] ?? 0;
        $validated['comment_count'] = $validated['comment_count'] ?? 0;
        $validated['excluido'] = 'n';
        $validated['deletado'] = 'n';
        // dd($validated);
        // Gerar post_name se não fornecido
        if (empty($validated['post_name'])) {
            $post = new Post();
            $validated['post_name'] = $post->generateSlug($validated['post_title']);
        }

        // Converter config para JSON
        if (isset($validated['config']) && is_array($validated['config'])) {
            $validated['config'] = json_encode($validated['config']);
        }

        $post = Post::create($validated);

        // Converter config de volta para array na resposta
        if (is_string($post->config)) {
            $post->config = json_decode($post->config, true) ?? [];
        }

        return response()->json([
            'data' => $post,
            'message' => 'Post criado com sucesso',
            'status' => 201,
        ], 201);
    }

    /**
     * Exibir um post específico
     */
    public function show(string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        // if (!$this->permissionService->isHasPermission('view')) {
        //     return response()->json(['error' => 'Acesso negado'], 403);
        // }

        $post = Post::findOrFail($id);

        // Converter config para array
        if (is_string($post->config)) {
            $post->config = json_decode($post->config, true) ?? [];
        }

        return response()->json($post, 200);
    }

    /**
     * Atualizar um post
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        // if (!$this->permissionService->isHasPermission('edit')) {
        //     return response()->json(['error' => 'Acesso negado'], 403);
        // }
        $postToUpdate = Post::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'post_title'    => 'sometimes|required|string|max:255',
            'post_content'  => 'nullable|string',
            'post_excerpt'  => 'nullable|string',
            'post_status'   => ['nullable', Rule::in(['publish', 'draft', 'private', 'pending'])],
            'comment_status' => ['nullable', Rule::in(['open', 'closed'])],
            'ping_status'   => ['nullable', Rule::in(['open', 'closed'])],
            'post_password' => 'nullable|string|max:255',
            'post_name'     => ['nullable', 'string', 'max:200', Rule::unique('posts', 'post_name')->ignore($postToUpdate->ID, 'ID')],
            'to_ping'       => ['nullable', Rule::in(['n', 's'])],
            'pinged'        => 'nullable|string',
            'post_content_filtered' => 'nullable|string',
            'post_parent'   => 'nullable|integer|exists:posts,ID',
            'guid'          => 'nullable|string|max:255',
            'menu_order'    => 'nullable|integer',
            'post_type'     => ['nullable', Rule::in(['post', 'page', 'attachment', 'revision', 'nav_menu_item', 'banner_slide', 'video_tip'])],
            'post_mime_type' => 'nullable|string|max:100',
            'comment_count' => 'nullable|integer',
            'config'        => 'array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'exec' => false,
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        // Sanitização dos dados
        $validated = $this->sanitizeInput($validated);

        // Converter config para JSON se for array
        if (isset($validated['config']) && is_array($validated['config'])) {
            $validated['config'] = json_encode($validated['config']);
        }

        $postToUpdate->update($validated);

        // Converter config de volta para array na resposta
        if (is_string($postToUpdate->config)) {
            $postToUpdate->config = json_decode($postToUpdate->config, true) ?? [];
        }

        return response()->json([
            'exec' => true,
            'data' => $postToUpdate,
            'message' => 'Post atualizado com sucesso',
            'status' => 200,
        ]);
    }

    /**
     * Mover post para lixeira (soft delete)
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        // if (!$this->permissionService->isHasPermission('delete')) {
        //     return response()->json(['error' => 'Acesso negado'], 403);
        // }

        $postToDelete = Post::find($id);
        if (!$postToDelete) {
            return response()->json(['error' => 'Post não encontrado'], 404);
        }

        $postToDelete->update([
            'excluido'     => 's',
            'deletado'     => 's',
            'reg_deletado' => json_encode([
                'data' => now()->toDateTimeString(),
                'user_id' => request()->user()->id
            ]),
        ]);

        return response()->json([
            'message' => 'Post marcado como deletado com sucesso'
        ], 200);
    }

    /**
     * Listar posts na lixeira
     */
    public function trash(Request $request)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        // if (!$this->permissionService->isHasPermission('view')) {
        //     return response()->json(['error' => 'Acesso negado'], 403);
        // }

        $perPage = $request->input('per_page', 10);
        $order_by = $request->input('order_by', 'created_at');
        $order = $request->input('order', 'desc');

        $query = Post::withoutGlobalScope('notDeleted')
                    ->where(function($q) {
                        $q->where('deletado', 's')->orWhere('excluido', 's');
                    })
                    ->orderBy($order_by, $order);

        // Filtros opcionais
        if ($request->filled('post_title')) {
            $query->where('post_title', 'like', '%' . $request->input('post_title') . '%');
        }
        if ($request->filled('post_type')) {
            $query->where('post_type', $request->input('post_type'));
        }
        if ($request->filled('post_author')) {
            $query->where('post_author', $request->input('post_author'));
        }

        $posts = $query->paginate($perPage);

        // Converter config para array em cada post
        $posts->getCollection()->transform(function ($post) {
            if (is_string($post->config)) {
                $post->config = json_decode($post->config, true) ?? [];
            }
            return $post;
        });

        return response()->json($posts);
    }

    /**
     * Restaurar post da lixeira
     */
    public function restore(string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $post = Post::withoutGlobalScope('notDeleted')
                   ->where('ID', $id)
                   ->where(function($q) {
                       $q->where('deletado', 's')->orWhere('excluido', 's');
                   })
                   ->first();

        if (!$post) {
            return response()->json(['error' => 'Post não encontrado na lixeira'], 404);
        }

        $post->update([
            'excluido' => 'n',
            'deletado' => 'n',
            'reg_excluido' => null,
            'reg_deletado' => null,
        ]);

        return response()->json([
            'message' => 'Post restaurado com sucesso'
        ], 200);
    }

    /**
     * Excluir post permanentemente
     */
    public function forceDelete(string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        // if (!$this->permissionService->isHasPermission('delete')) {
        //     return response()->json(['error' => 'Acesso negado'], 403);
        // }

        $post = Post::withoutGlobalScope('notDeleted')
                   ->where('ID', $id)
                   ->where(function($q) {
                       $q->where('deletado', 's')->orWhere('excluido', 's');
                   })
                   ->first();

        if (!$post) {
            return response()->json(['error' => 'Post não encontrado na lixeira'], 404);
        }

        $post->forceDelete();

        return response()->json([
            'message' => 'Post excluído permanentemente'
        ], 200);
    }

    /**
     * Listar banners públicos (sem autenticação)
     * Retorna posts do tipo 'banner_slide' com status 'publish' em ordem de menu_order
     */
    public function publicBanners(): \Illuminate\Http\JsonResponse
    {
        $banners = Post::query()
            ->where('post_type', 'banner_slide')
            ->where('post_status', 'publish')
            ->where(function ($q) {
                $q->whereNull('deletado')->orWhere('deletado', '!=', 's');
            })
            ->where(function ($q) {
                $q->whereNull('excluido')->orWhere('excluido', '!=', 's');
            })
            ->orderBy('menu_order', 'asc')
            ->get(['ID', 'post_title', 'post_excerpt', 'post_content', 'guid', 'menu_order', 'config'])
            ->map(function ($post) {
                return [
                    'id'         => $post->ID,
                    'title'      => $post->post_title,
                    'subtitle'   => $post->post_excerpt,
                    'content'    => $post->post_content,
                    'image_url'  => $post->guid,
                    'menu_order' => $post->menu_order,
                    'config'     => is_string($post->config)
                        ? (json_decode($post->config, true) ?? [])
                        : ($post->config ?? []),
                ];
            });

        return response()->json(['data' => $banners]);
    }

    /**
     * studentVideoTips
     * pt-BR: Retorna vídeos/dicas publicados para alunos autenticados.
     *        Filtra post_type=video_tip e post_status=publish.
     * en-US: Returns published video tips for authenticated students.
     *        Filters post_type=video_tip and post_status=publish.
     */
    /**
     * studentVideoTips
     * pt-BR: Retorna vídeos/dicas publicados para alunos autenticados.
     *        Filtra post_type=video_tip e post_status=publish.
     * en-US: Returns published video tips for authenticated students.
     *        Filters post_type=video_tip and post_status=publish.
     */
    public function studentVideoTips(Request $request): \Illuminate\Http\JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $perPage = $request->input('per_page', 12);
        $order   = $request->input('order', 'asc');
        $search  = $request->input('search');
        $category = $request->input('category');

        $query = Post::query()
            ->where('post_type', 'video_tip')
            ->where('post_status', 'publish');

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('post_title', 'like', '%' . $search . '%')
                  ->orWhere('post_content', 'like', '%' . $search . '%')
                  ->orWhere('post_excerpt', 'like', '%' . $search . '%');
            });
        }

        if ($category && $category !== 'Todas') {
            $query->where('config->category', $category);
        }

        $tips = $query->orderBy('menu_order', $order)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        $tips->getCollection()->transform(function ($post) {
            $config = is_string($post->config)
                ? (json_decode($post->config, true) ?? [])
                : ($post->config ?? []);

            return [
                'id'          => $post->ID,
                'title'       => $post->post_title,
                'description' => $post->post_content,
                'excerpt'     => $post->post_excerpt,
                'menu_order'  => $post->menu_order,
                'created_at'  => $post->created_at,
                'token'       => $post->token,
                'config'      => $config,
                'video_url'   => $config['video_url'] ?? null,
                'provider'    => $config['provider'] ?? null,
                'video_id'    => $config['video_id'] ?? null,
                'thumbnail'   => $config['thumbnail'] ?? null,
                'embed_url'   => $config['embed_url'] ?? null,
            ];
        });

        return response()->json($tips);
    }

    /**
     * publicShowByToken
     * pt-BR: Exibe um post público via token (usado para compartilhamento de vídeos).
     * en-US: Shows a public post via token (used for video sharing).
     */
    public function publicShowByToken(string $token)
    {
        // Usar Eloquent sem scopes globais para garantir que casts (como config) funcionem
        $post = Post::withoutGlobalScopes()
            ->where('token', trim($token))
            ->where('post_status', 'publish')
            ->where('post_type', 'video_tip')
            ->first();

        if (!$post) {
            return response()->json(['error' => 'Vídeo não encontrado ou indisponível'], 404);
        }

        // Se config for string, decodifica (Eloquent deve fazer isso se estiver em $casts, mas garantimos aqui)
        $config = $post->config;
        if (is_string($config)) {
            $config = json_decode($config, true) ?? [];
        }
        if (!is_array($config)) {
            $config = [];
        }
        
        $tipsData = [
            'id'          => $post->ID,
            'title'       => $post->post_title,
            'description' => $post->post_content,
            'excerpt'     => $post->post_excerpt,
            'token'       => $post->token,
            'created_at'  => $post->created_at,
            'config'      => $config,
        ];

        // Mesclar dados do config no nível principal
        foreach ($config as $key => $value) {
            if (!isset($tipsData[$key])) {
                $tipsData[$key] = $value;
            }
        }

        // Se embed_url estiver vazio, tenta calcular a partir da video_url
        if (empty($tipsData['embed_url']) && !empty($tipsData['video_url'])) {
            $videoUrl = $tipsData['video_url'];
            $embedUrl = '';
            $provider = 'other';

            if (str_contains($videoUrl, 'youtube.com') || str_contains($videoUrl, 'youtu.be')) {
                $provider = 'youtube';
                if (preg_match('/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/', $videoUrl, $matches)) {
                    $embedUrl = "https://www.youtube.com/embed/{$matches[1]}";
                }
            } elseif (str_contains($videoUrl, 'vimeo.com')) {
                $provider = 'vimeo';
                if (preg_match('/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:\w+\/)?|album\/(?:\d+\/)?video\/|video\/|)(\d+)(?:$|\/|\?)/', $videoUrl, $matches)) {
                    $embedUrl = "https://player.vimeo.com/video/{$matches[1]}";
                }
            }

            $tipsData['embed_url'] = $embedUrl;
            $tipsData['provider'] = $provider;
        }

        return response()->json($tipsData, 200);
    }
}
