<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CursoCategoria;
use App\Services\PermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CursoCategoriaController extends Controller
{
    protected PermissionService $permissionService;

    public function __construct()
    {
        $this->permissionService = new PermissionService();
    }

    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $perPage = $request->input('per_page', 50);
        $search = $request->input('search');

        $query = CursoCategoria::query()->orderBy('nome');

        if ($search) {
            $query->where('nome', 'like', "%{$search}%");
        }

        $categorias = $query->paginate($perPage);
        return response()->json($categorias);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $request->validate([
            'nome' => 'required|string|max:100',
        ]);

        $slug = Str::slug($request->input('nome'));

        $categoria = CursoCategoria::create([
            'nome' => $request->input('nome'),
            'slug' => $slug,
        ]);

        return response()->json(['data' => $categoria, 'message' => 'Categoria criada com sucesso'], 201);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $categoria = CursoCategoria::findOrFail($id);
        return response()->json(['data' => $categoria]);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $request->validate([
            'nome' => 'required|string|max:100',
        ]);

        $categoria = CursoCategoria::findOrFail($id);
        $categoria->update([
            'nome' => $request->input('nome'),
            'slug' => Str::slug($request->input('nome')),
        ]);

        return response()->json(['data' => $categoria, 'message' => 'Categoria atualizada com sucesso']);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $categoria = CursoCategoria::findOrFail($id);
        $categoria->delete();

        return response()->json(['message' => 'Categoria excluída com sucesso']);
    }
}
