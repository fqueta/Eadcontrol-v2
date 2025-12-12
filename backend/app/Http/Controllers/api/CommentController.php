<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\Curso;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class CommentController extends Controller
{
    /**
     * indexForCourse
     * PT: Lista comentários aprovados para um curso.
     * EN: List approved comments for a course.
     */
    public function indexForCourse(int $courseId)
    {
        $comments = Comment::where('commentable_type', Curso::class)
            ->where('commentable_id', $courseId)
            ->where('status', 'approved')
            ->orderByDesc('created_at')
            ->get();

        $data = $comments->map(function (Comment $c) {
            return [
                'id' => $c->id,
                'user_id' => $c->user_id,
                'user_name' => optional($c->user)->name,
                'body' => $c->body,
                'rating' => $c->rating,
                'created_at' => optional($c->created_at)->toISOString(),
            ];
        });

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
            ->orderByDesc('created_at')
            ->get();

        $data = $comments->map(function (Comment $c) {
            return [
                'id' => $c->id,
                'user_id' => $c->user_id,
                'user_name' => optional($c->user)->name,
                'body' => $c->body,
                'rating' => $c->rating,
                'created_at' => optional($c->created_at)->toISOString(),
            ];
        });

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
             * PT: Avaliação obrigatória entre 1 e 5 (estrelas).
             * EN: Required rating between 1 and 5 (stars).
             */
            'rating' => 'required|integer|min:1|max:5',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $typeClass = $data['target_type'] === 'course' ? Curso::class : Activity::class;

        $comment = Comment::create([
            'commentable_type' => $typeClass,
            'commentable_id' => (int) $data['target_id'],
            // PT: Salva como string para suportar UUID.
            // EN: Save as string to support UUID.
            'user_id' => (string) $user->id,
            'body' => (string) $data['body'],
            'rating' => $data['rating'] ?? null,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Comentário enviado para moderação',
            'data' => [
                'id' => $comment->id,
                'status' => $comment->status,
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