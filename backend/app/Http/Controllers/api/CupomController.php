<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Cupom;
use App\Models\Curso;
use App\Models\Matricula;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class CupomController extends Controller
{

    public function index(Request $request)
    {
        $query = Cupom::query()->with('cursos:id,titulo,slug');

        if ($request->filled('search')) {
            $s = $request->input('search');
            $query->where(function ($q) use ($s) {
                $q->where('codigo', 'like', "%{$s}%")
                  ->orWhere('descricao', 'like', "%{$s}%");
            });
        }

        if ($request->filled('ativo')) {
            $query->where('ativo', $request->input('ativo'));
        }

        $perPage = (int) $request->input('per_page', 20);
        return $query->orderBy('id', 'desc')->paginate($perPage);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'codigo' => 'required|string|max:50|unique:cupons,codigo',
            'tipo' => 'required|in:percentual,fixo',
            'valor_desconto' => 'required|numeric|min:0',
            'validade_inicio' => 'nullable|date',
            'validade_fim' => 'nullable|date|after_or_equal:validade_inicio',
            'limite_uso' => 'nullable|integer|min:0',
            'valor_minimo' => 'nullable|numeric|min:0',
            'ativo' => 'required|in:s,n',
            'descricao' => 'nullable|string',
            'cursos_ids' => 'nullable|string|max:500',
            'cursos' => 'nullable|array',
            'cursos.*' => 'integer|exists:cursos,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $cursos = $data['cursos'] ?? null;
        unset($data['cursos'], $data['cursos_ids']);

        $cupom = Cupom::create($data);

        if (is_array($cursos)) {
            $cupom->cursos()->sync($cursos);
        }

        $cupom->load('cursos:id,titulo,slug');

        return response()->json($cupom, 201);
    }

    public function show(string $id)
    {
        return Cupom::with('cursos:id,titulo,slug')->findOrFail($id);
    }

    public function update(Request $request, string $id)
    {
        $cupom = Cupom::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'codigo' => "sometimes|string|max:50|unique:cupons,codigo,{$id}",
            'tipo' => 'sometimes|in:percentual,fixo',
            'valor_desconto' => 'sometimes|numeric|min:0',
            'validade_inicio' => 'nullable|date',
            'validade_fim' => 'nullable|date|after_or_equal:validade_inicio',
            'limite_uso' => 'nullable|integer|min:0',
            'valor_minimo' => 'nullable|numeric|min:0',
            'ativo' => 'sometimes|in:s,n',
            'descricao' => 'nullable|string',
            'cursos_ids' => 'nullable|string|max:500',
            'cursos' => 'nullable|array',
            'cursos.*' => 'integer|exists:cursos,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $cursos = $data['cursos'] ?? null;
        $data['cursos_ids'] = $data['cursos_ids'] ?? $data['cursos'];
        $cupom->update($data);

        if (is_array($cursos)) {
            $cupom->cursos()->sync($cursos);
        }

        $cupom->load('cursos:id,titulo,slug');

        return response()->json($cupom);
    }

    public function destroy(string $id)
    {
        $cupom = Cupom::findOrFail($id);
        $cupom->update(['excluido' => 's']);

        return response()->json(['message' => 'Cupom excluído com sucesso.']);
    }

    public function forceDelete(string $id)
    {
        $cupom = Cupom::withoutGlobalScope('notDeleted')->findOrFail($id);
        $cupom->cursos()->detach();
        $cupom->forceDelete();

        return response()->json(['message' => 'Cupom deletado permanentemente.']);
    }

    public function trash()
    {
        $perPage = (int) request()->input('per_page', 20);

        return Cupom::withoutGlobalScope('notDeleted')
            ->where('excluido', 's')
            ->orderBy('id', 'desc')
            ->paginate($perPage);
    }

    public function restore(string $id)
    {
        $cupom = Cupom::withoutGlobalScope('notDeleted')->findOrFail($id);
        $cupom->update(['excluido' => 'n']);

        return response()->json(['message' => 'Cupom restaurado com sucesso.']);
    }

    public function cursosDisponiveis()
    {
        return Curso::where('ativo', 's')
            ->where(function ($q) {
                $q->whereNull('excluido')->orWhere('excluido', '!=', 's');
            })
            ->orderBy('titulo')
            ->get(['id', 'titulo']);
    }

    /**
     * Retorna as matrículas que utilizaram este cupom.
     */
    public function usages(string $id)
    {
        $cupom = Cupom::findOrFail($id);

        $matriculaIds = DB::table('matriculameta')
            ->where('meta_key', 'cupom_id')
            ->where('meta_value', $id)
            ->pluck('matricula_id');

        $matriculas = Matricula::join('cursos', 'matriculas.id_curso', '=', 'cursos.id')
            ->leftJoin('users', 'matriculas.id_cliente', '=', 'users.id')
            ->leftJoin('posts', 'matriculas.situacao_id', '=', 'posts.id')
            ->whereIn('matriculas.id', $matriculaIds)
            ->select(
                'matriculas.*', 
                'cursos.nome as curso_nome', 
                'users.name as cliente_nome', 
                'users.email as email',
                'posts.post_title as situacao'
            )
            ->orderBy('matriculas.id', 'desc')
            ->get();

        return response()->json($matriculas);
    }
}
