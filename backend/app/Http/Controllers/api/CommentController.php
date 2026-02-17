<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\Curso;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use App\Models\Option;
// Removido import duplicado de Curso para evitar FatalError

class CommentController extends Controller
{
    /**
     * getGlobalMaxDepth
     * pt-BR: Retorna profundidade máxima global configurada em options (url='comments.max_depth'),
     *        com fallback para 3 quando inválida ou ausente.
     * en-US: Returns global max depth configured in options (url='comments.max_depth'),
     *        falling back to 3 when invalid or missing.
     */
    protected function getGlobalMaxDepth(): int
    {
        $raw = Option::where('url', 'comments.max_depth')->value('value');
        if (is_string($raw)) {
            $raw = trim($raw);
        }
        $n = is_numeric($raw) ? (int) $raw : 4;
        return $n > 0 ? $n : 4;
    }

    /**
     * getMaxDepthForTarget
     * pt-BR: Retorna profundidade máxima permitida de respostas para um alvo específico.
     *        Cursos podem definir em config['comments_max_depth']; caso contrário usa opção global.
     * en-US: Returns max allowed reply depth for a specific target.
     *        Courses may define config['comments_max_depth']; otherwise use global option.
     */
    protected function getMaxDepthForTarget(string $typeClass, int $targetId): int
    {
        if ($typeClass === Curso::class) {
            $curso = Curso::find($targetId);
            if ($curso && is_array($curso->config ?? null)) {
                $val = $curso->config['comments_max_depth'] ?? null;
                if (is_numeric($val)) {
                    $n = (int) $val;
                    if ($n > 0) return $n;
                }
            }
        }
        return $this->getGlobalMaxDepth();
    }

    /**
     * computeDepth
     * pt-BR: Calcula a profundidade atual de um comentário percorrendo a cadeia de pais.
     *        Comentário raiz possui profundidade 0; cada nível de resposta incrementa +1.
     * en-US: Computes current comment depth by walking up the parent chain.
     *        Root comment has depth 0; each reply level increments by +1.
     */
    protected function computeDepth(Comment $comment): int
    {
        $depth = 0;
        $seen = 0;
        $current = $comment;
        while ($current && $current->parent_id) {
            $seen++;
            if ($seen > 50) break; // safety against pathological cycles
            $parent = Comment::find($current->parent_id);
            if (!$parent) break;
            $depth++;
            $current = $parent;
        }
        return $depth;
    }
    /**
     * indexForCourse
     * PT: Lista comentários aprovados para um curso.
     * EN: List approved comments for a course.
     */
    /**
     * buildTree
     * PT: Constrói uma árvore hierárquica a partir de uma lista plana de comentários.
     * EN: Builds a hierarchical tree from a flat list of comments.
     */
    protected function buildTree($comments, $parentId = null)
    {
        $branch = [];
        foreach ($comments as $comment) {
            if ($comment->parent_id == $parentId) {
                $children = $this->buildTree($comments, $comment->id);
                $branch[] = [
                    'id' => $comment->id,
                    'parent_id' => $comment->parent_id,
                    'user_id' => $comment->user_id,
                    'user_name' => optional($comment->user)->name,
                    'body' => $comment->body,
                    'rating' => $comment->rating,
                    'created_at' => optional($comment->created_at)->toISOString(),
                    'replies' => $children,
                ];
            }
        }
        return $branch;
    }

    public function indexForCourse(int $courseId)
    {
        $comments = Comment::where('commentable_type', Curso::class)
            ->where('commentable_id', $courseId)
            ->where('status', 'approved')
            ->orderBy('created_at', 'asc')
            ->get();

        $data = $this->buildTree($comments);

        return response()->json(['data' => $data], 200);
    }

    /**
     * indexForActivity
     * PT: Lista comentários aprovados para uma atividade.
     * EN: List approved comments for an activity.
     */
    public function indexForActivity(int $activityId)
    {
        $comments = Comment::where('commentable_type', Activity::class)
            ->where('commentable_id', $activityId)
            ->where('status', 'approved')
            ->orderBy('created_at', 'asc')
            ->get();

        $data = $this->buildTree($comments);

        return response()->json(['data' => $data], 200);
    }

    /**
     * store
     * PT: Cria um novo comentário (status pendente) para curso ou atividade.
     * EN: Create a new comment (pending status) for course or activity.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Não autenticado'], 401);
        }

        $validator = Validator::make($request->all(), [
            'target_type' => 'required|string|in:course,activity',
            'target_id' => 'required|integer',
            'body' => 'required|string|min:2',
            /**
             * rating
             * PT: Avaliação obrigatória entre 1 e 5 (estrelas) apenas para comentários raiz.
             *     Para respostas (quando `parent_id` é informado), a avaliação não é exigida.
             * EN: Required rating between 1 and 5 (stars) only for root comments.
             *     For replies (when `parent_id` is provided), rating is not required.
             */
            // PT: Permite `null` quando presente (respostas podem enviar `rating: null`).
            // EN: Allows `null` when present (replies may send `rating: null`).
            'rating' => 'nullable|integer|min:1|max:5|required_without:parent_id',
            /**
             * parent_id
             * PT: ID do comentário pai para respostas; opcional e deve existir.
             * EN: Parent comment ID for replies; optional and must exist.
             */
            'parent_id' => 'nullable|integer|exists:comments,id',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $typeClass = $data['target_type'] === 'course' ? Curso::class : Activity::class;

        // pt-BR: Se houver parent_id, validar limite de profundidade configurado.
        // en-US: If parent_id is provided, validate configured max depth limit.
        $parentId = $data['parent_id'] ?? null;
        if ($parentId) {
            $parent = Comment::findOrFail((int) $parentId);
            $maxDepth = $this->getMaxDepthForTarget($typeClass, (int) $data['target_id']);
            $parentDepth = $this->computeDepth($parent);
            if (($parentDepth + 1) > $maxDepth) {
                return response()->json([
                    'errors' => [
                        'parent_id' => ["Limite de profundidade de respostas atingido (máx: {$maxDepth})."],
                    ],
                ], 422);
            }
        }

        $comment = Comment::create([
            'commentable_type' => $typeClass,
            'commentable_id' => (int) $data['target_id'],
            // PT: Salva como string para suportar UUID.
            // EN: Save as string to support UUID.
            'user_id' => (string) $user->id,
            'body' => (string) $data['body'],
            'rating' => $data['rating'] ?? null,
            'status' => 'pending',
            // PT/EN: Se houver parent_id, persistir como resposta.
            'parent_id' => $parentId ?? null,
        ]);

        return response()->json([
            'message' => 'Comentário enviado para moderação',
            'data' => [
                'id' => $comment->id,
                'status' => $comment->status,
                'parent_id' => $comment->parent_id,
            ],
        ], 201);
    }

    /**
     * reply
     * PT: Cria uma resposta de moderador para um comentário existente. A resposta é aprovada automaticamente.
     * EN: Creates a moderator reply to an existing comment. The reply is automatically approved.
     */
    public function reply(Request $request, int $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Não autenticado'], 401);
        }

        // PT: Validação básica do corpo da resposta.
        // EN: Basic validation for reply body.
        $validator = Validator::make($request->all(), [
            'body' => 'required|string|min:2|max:500',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // PT: Carrega comentário pai e replica alvo.
        // EN: Load parent comment and replicate target.
        $parent = Comment::findOrFail($id);

        // pt-BR: Validar profundidade máxima antes de publicar resposta.
        // en-US: Validate max depth before publishing reply.
        $maxDepth = $this->getMaxDepthForTarget($parent->commentable_type, (int) $parent->commentable_id);
        $parentDepth = $this->computeDepth($parent);
        if (($parentDepth + 1) > $maxDepth) {
            return response()->json([
                'errors' => [
                    'parent_id' => ["Limite de profundidade de respostas atingido (máx: {$maxDepth})."],
                ],
            ], 422);
        }

        $reply = Comment::create([
            'commentable_type' => $parent->commentable_type,
            'commentable_id' => $parent->commentable_id,
            'user_id' => (string) $user->id,
            'body' => (string) $validator->validated()['body'],
            'rating' => null,
            'status' => 'approved',
            'parent_id' => $parent->id,
        ]);

        return response()->json([
            'message' => 'Resposta publicada',
            'data' => [
                'id' => $reply->id,
                'parent_id' => $parent->id,
                'status' => $reply->status,
            ],
        ], 201);
    }

    /**
     * adminIndex
     * PT: Lista comentários para moderação, com filtro opcional de status.
     * EN: List comments for moderation with optional status filter.
     */
    public function adminIndex(Request $request)
    {
        $status = $request->query('status');
        $q = Comment::query()->with(['user:id,name']);
        if ($status) {
            $q->where('status', $status);
        }
        $comments = $q->orderByDesc('created_at')->paginate(20);

        /**
         * Mapear itens para incluir campos amigáveis ao frontend.
         * PT: Adiciona `user_name` (nome completo do autor) e normaliza os campos retornados.
         * EN: Add `user_name` (author full name) and normalize returned fields for the frontend.
         */
        $comments->getCollection()->transform(function (Comment $c) {
            return [
                'id' => $c->id,
                'parent_id' => $c->parent_id,
                'commentable_type' => $c->commentable_type,
                'commentable_id' => $c->commentable_id,
                'user_id' => $c->user_id,
                // PT: Nome do usuário; `name` é o campo principal no modelo User.
                // EN: User display name; `name` is primary field in User model.
                'user_name' => optional($c->user)->name,
                'body' => $c->body,
                'rating' => $c->rating,
                'status' => $c->status,
                'created_at' => optional($c->created_at)->toISOString(),
            ];
        });

        return response()->json($comments, 200);
    }

    /**
     * repliesByParent
     * PT: Lista respostas de um comentário pai específico, com filtros opcionais.
     *     Aceita `status` (approved|pending|rejected|all) e paginação (`perPage`).
     * EN: List replies of a specific parent comment, with optional filters.
     *     Accepts `status` (approved|pending|rejected|all) and pagination (`perPage`).
     */
    public function repliesByParent(Request $request, int $id)
    {
        // Carrega o comentário pai; 404 caso inexistente.
        $parent = Comment::findOrFail($id);

        // Filtro de status: default 'approved'; 'all' retorna todos.
        $status = $request->query('status', 'approved');
        $perPage = max(1, (int) $request->query('perPage', 20));

        $q = $parent->replies()->with(['user:id,name'])->orderBy('created_at', 'asc');
        if ($status !== 'all') {
            $q->where('status', $status);
        }

        $replies = $q->paginate($perPage);

        // Normaliza saída com campos amigáveis ao frontend.
        $replies->getCollection()->transform(function (Comment $r) use ($parent) {
            return [
                'id' => $r->id,
                'parent_id' => $parent->id,
                'user_id' => $r->user_id,
                'user_name' => optional($r->user)->name,
                'body' => $r->body,
                'status' => $r->status,
                'created_at' => optional($r->created_at)->toISOString(),
            ];
        });

        return response()->json($replies, 200);
    }

    /**
     * approve
     * PT: Aprova um comentário.
     * EN: Approve a comment.
     */
    public function approve(int $id)
    {
        $comment = Comment::findOrFail($id);
        $comment->status = 'approved';
        $comment->save();
        return response()->json(['message' => 'Comentário aprovado'], 200);
    }

    /**
     * reject
     * PT: Rejeita um comentário.
     * EN: Reject a comment.
     */
    public function reject(int $id)
    {
        $comment = Comment::findOrFail($id);
        $comment->status = 'rejected';
        $comment->save();
        return response()->json(['message' => 'Comentário rejeitado'], 200);
    }

    /**
     * destroy
     * PT: Remove um comentário.
     * EN: Delete a comment.
     */
    public function destroy(int $id)
    {
        $comment = Comment::findOrFail($id);
        $comment->delete();
        return response()->json(['message' => 'Comentário removido'], 200);
    }
}
