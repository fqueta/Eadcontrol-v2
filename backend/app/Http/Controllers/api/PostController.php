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
    private function sanitizeInput($input)
    {
        if (is_array($input)) {
            $sanitized = [];
            foreach ($input as $key => $value) {
                $sanitized[$key] = $this->sanitizeInput($value);
            }
            return $sanitized;
        } elseif (is_string($input)) {
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
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

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
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
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
            'post_type'     => ['nullable', Rule::in(['post', 'page', 'attachment', 'revision', 'nav_menu_item'])],
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
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

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
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

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
            'post_type'     => ['nullable', Rule::in(['post', 'page', 'attachment', 'revision', 'nav_menu_item'])],
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
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

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
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

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
        if (!$this->permissionService->isHasPermission('delete')) {
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

        $post->forceDelete();

        return response()->json([
            'message' => 'Post excluído permanentemente'
        ], 200);
    }
}
