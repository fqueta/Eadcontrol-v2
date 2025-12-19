<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\Curso;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * InviteController
 * pt-BR: Gerencia links de convite (CRUD básico: listar, criar, mostrar).
 * en-US: Manages invite links (basic CRUD: list, create, show).
 */
class InviteController extends Controller
{
    /**
     * index
     * pt-BR: Lista convites com campos normalizados.
     * en-US: Lists invites with normalized fields.
     */
    public function index(Request $request)
    {
        $invites = Post::query()
            ->ofType('convites')
            ->orderByDesc('ID')
            ->paginate((int) $request->input('per_page', 15));

        $frontendBase = rtrim((string) config('app.frontend_url'), '/');

        $data = $invites->getCollection()->map(function (Post $p) use ($frontendBase) {
            $cfg = (array) ($p->config ?? []);
            $courseId = (int) ($p->post_parent ?? 0);
            $token = (string) ($p->token ?? '');
            $slug = (string) ($p->post_name ?? '');
            // Use o slug do curso selecionado para construir o link
            // Fallback: token/slug do convite ou ID do curso
            $courseSlug = null;
            if ($courseId > 0) {
                $course = Curso::find($courseId);
                if ($course) {
                    $courseSlug = (string) ($course->slug ?: $course->token ?: Str::slug(($course->titulo ?: $course->nome ?: '')));
                }
            }
            $finalSlug = $courseSlug ?: $slug ?: (string) $courseId;
            $link = $frontendBase ? $frontendBase . '/cursos/' . $finalSlug . '/inscricao/' . $token : null;

            return [
                'id' => $p->ID,
                'nome' => $p->post_title,
                // Retorna slug do curso para coerência do frontend
                'slug' => $courseSlug ?: $slug,
                'link' => $link,
                'total_convites' => (int) ($cfg['total_convites'] ?? 0),
                'convites_usados' => (int) ($cfg['convites_usados'] ?? 0),
                'validade' => (string) ($cfg['validade'] ?? ''),
                'criado_em' => optional($p->created_at)->toDateTimeString(),
                'id_curso' => $courseId,
                'token' => $token,
            ];
        })->toArray();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $invites->currentPage(),
                'last_page' => $invites->lastPage(),
                'per_page' => $invites->perPage(),
                'total' => $invites->total(),
            ],
        ]);
    }

    /**
     * store
     * pt-BR: Cria um novo convite e retorna o registro normalizado.
     * en-US: Creates a new invite and returns the normalized record.
     */
    public function store(Request $request)
    {
        $payload = [
            'nome' => $request->input('nome'),
            'id_curso' => $request->input('id_curso'),
            'total_convites' => $request->input('total_convites'),
            'validade' => $request->input('validade'),
        ];
        $validator = \Illuminate\Support\Facades\Validator::make($payload, [
            'nome' => ['required','string','max:255'],
            'id_curso' => ['required','integer','min:1'],
            'total_convites' => ['required','integer','min:1'],
            'validade' => ['nullable','date'],
        ]);
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        $nome = trim((string) $payload['nome']);
        $slug = Str::slug($nome);
        // Garantir slug único
        $count = Post::where('post_name', $slug)->count();
        if ($count > 0) {
            $slug .= '-' . ($count + 1);
        }
        $token = Str::random(32);
        $cfg = [
            'total_convites' => (int) $payload['total_convites'],
            'convites_usados' => 0,
            'validade' => $payload['validade'] ? date('Y-m-d', strtotime((string) $payload['validade'])) : null,
        ];

        $invite = new Post();
        $invite->post_title = $nome;
        $invite->post_name = $slug;
        $invite->post_type = 'convites';
        $invite->post_status = 'publish';
        $invite->post_parent = (int) $payload['id_curso'];
        $invite->token = $token;
        $invite->config = $cfg;
        $invite->save();

        $frontendBase = rtrim((string) config('app.frontend_url'), '/');
        $courseId = (int) ($invite->post_parent ?? 0);
        // Slug do curso selecionado para compor o link
        $courseSlug = null;
        if ($courseId > 0) {
            $course = Curso::find($courseId);
            if ($course) {
                $courseSlug = (string) ($course->slug ?: $course->token ?: Str::slug(($course->titulo ?: $course->nome ?: '')));
            }
        }
        $finalSlug = $courseSlug ?: (string) $courseId;
        $link = $frontendBase ? $frontendBase . '/cursos/' . $finalSlug . '/inscricao/' . $token : null;

        return response()->json([
            'id' => $invite->ID,
            'nome' => $invite->post_title,
            // Também retornamos o slug do curso para o frontend
            'slug' => $courseSlug ?: $invite->post_name,
            'link' => $link,
            'total_convites' => (int) ($invite->config['total_convites'] ?? 0),
            'convites_usados' => (int) ($invite->config['convites_usados'] ?? 0),
            'validade' => (string) ($invite->config['validade'] ?? ''),
            'criado_em' => optional($invite->created_at)->toDateTimeString(),
            'id_curso' => $courseId,
            'token' => $token,
        ], 201);
    }

    /**
     * show
     * pt-BR: Exibe um convite específico com link montado.
     * en-US: Shows a specific invite with built link.
     */
    public function show(int $id)
    {
        $p = Post::query()->ofType('convites')->where('ID', $id)->first();
        if (!$p) {
            return response()->json(['message' => 'Convite não encontrado'], 404);
        }
        $frontendBase = rtrim((string) config('app.frontend_url'), '/');
        $cfg = (array) ($p->config ?? []);
        $courseId = (int) ($p->post_parent ?? 0);
        $token = (string) ($p->token ?? '');
        // Slug do curso selecionado
        $courseSlug = null;
        if ($courseId > 0) {
            $course = Curso::find($courseId);
            if ($course) {
                $courseSlug = (string) ($course->slug ?: $course->token ?: Str::slug(($course->titulo ?: $course->nome ?: '')));
            }
        }
        $finalSlug = $courseSlug ?: (string) $courseId;
        $link = $frontendBase ? $frontendBase . '/cursos/' . $finalSlug . '/inscricao/' . $token : null;

        return response()->json([
            'id' => $p->ID,
            'nome' => $p->post_title,
            'slug' => $courseSlug ?: (string) ($p->post_name ?? ''),
            'link' => $link,
            'total_convites' => (int) ($cfg['total_convites'] ?? 0),
            'convites_usados' => (int) ($cfg['convites_usados'] ?? 0),
            'validade' => (string) ($cfg['validade'] ?? ''),
            'criado_em' => optional($p->created_at)->toDateTimeString(),
            'id_curso' => $courseId,
            'token' => $token,
        ], 200);
    }

    /**
     * update
     * pt-BR: Atualiza um convite existente e retorna o registro normalizado.
     * en-US: Updates an existing invite and returns the normalized record.
     */
    public function update(Request $request, int $id)
    {
        $invite = Post::query()->ofType('convites')->where('ID', $id)->first();
        if (!$invite) {
            return response()->json(['message' => 'Convite não encontrado'], 404);
        }

        $payload = [
            'nome' => $request->input('nome'),
            'id_curso' => $request->input('id_curso'),
            'total_convites' => $request->input('total_convites'),
            'validade' => $request->input('validade'),
        ];
        $validator = Validator::make($payload, [
            'nome' => ['nullable','string','max:255'],
            'id_curso' => ['nullable','integer','min:1'],
            'total_convites' => ['nullable','integer','min:1'],
            'validade' => ['nullable','date'],
        ]);
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Atualiza campos básicos
        if (!is_null($payload['nome'])) {
            $invite->post_title = trim((string) $payload['nome']);
            // Mantém um slug único para o convite (não usado no link do curso)
            $slug = Str::slug($invite->post_title);
            $count = Post::where('post_name', $slug)->where('ID', '!=', $invite->ID)->count();
            if ($count > 0) {
                $slug .= '-' . ($count + 1);
            }
            $invite->post_name = $slug;
        }
        if (!is_null($payload['id_curso'])) {
            $invite->post_parent = (int) $payload['id_curso'];
        }
        if (!is_null($payload['total_convites']) || !is_null($payload['validade'])) {
            $cfg = (array) ($invite->config ?? []);
            if (!is_null($payload['total_convites'])) {
                $cfg['total_convites'] = (int) $payload['total_convites'];
            }
            if (!is_null($payload['validade'])) {
                $cfg['validade'] = $payload['validade'] ? date('Y-m-d', strtotime((string) $payload['validade'])) : null;
            }
            $invite->config = $cfg;
        }
        $invite->save();

        // Monta link com slug do curso
        $frontendBase = rtrim((string) config('app.frontend_url'), '/');
        $courseId = (int) ($invite->post_parent ?? 0);
        $courseSlug = null;
        if ($courseId > 0) {
            $course = Curso::find($courseId);
            if ($course) {
                $courseSlug = (string) ($course->slug ?: $course->token ?: Str::slug(($course->titulo ?: $course->nome ?: '')));
            }
        }
        $finalSlug = $courseSlug ?: (string) $courseId;
        $token = (string) ($invite->token ?? '');
        $link = $frontendBase ? $frontendBase . '/cursos/' . $finalSlug . '/inscricao/' . $token : null;

        return response()->json([
            'id' => $invite->ID,
            'nome' => $invite->post_title,
            'slug' => $courseSlug ?: $invite->post_name,
            'link' => $link,
            'total_convites' => (int) ($invite->config['total_convites'] ?? 0),
            'convites_usados' => (int) ($invite->config['convites_usados'] ?? 0),
            'validade' => (string) ($invite->config['validade'] ?? ''),
            'criado_em' => optional($invite->created_at)->toDateTimeString(),
            'id_curso' => $courseId,
            'token' => $token,
        ], 200);
    }

    /**
     * destroy
     * pt-BR: Exclui (soft delete) um convite.
     * en-US: Deletes (soft) an invite.
     */
    public function destroy(int $id)
    {
        $invite = Post::query()->ofType('convites')->where('ID', $id)->first();
        if (!$invite) {
            return response()->json(['message' => 'Convite não encontrado'], 404);
        }
        // Soft delete customizado compatível com modelo Post
        if ($invite->deletado === 's' || $invite->excluido === 's') {
            return response()->json(['message' => 'Convite já excluído'], 400);
        }
        $user = request()->user();
        $invite->update([
            'excluido'     => 's',
            'deletado'     => 's',
            'reg_deletado' => json_encode([
                'data' => now()->toDateTimeString(),
                'user_id' => $user ? $user->id : null,
            ]),
        ]);
        return response()->json(['message' => 'Convite excluído com sucesso'], 200);
    }
}