<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Page;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PageController extends Controller
{
    protected PermissionService $permissionService;
    protected string $post_type;

    public function __construct()
    {
        $this->permissionService = new PermissionService();
        $this->post_type = 'page';
    }

    private function sanitizeInput($data)
    {
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                if ($key === 'post_content') {
                    $data[$key] = trim($value);
                } else {
                    $data[$key] = strip_tags(trim($value));
                }
            }
        }
        return $data;
    }

    private function get_status($active)
    {
        return $active ? 'publish' : 'draft';
    }

    private function decode_status($post_status)
    {
        return $post_status === 'publish';
    }

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

        $query = Page::query()->orderBy($order_by, $order);

        if($search = $request->get('search')){
            $query->where('post_title', 'like', '%' . $search . '%');
            $query->orWhere('post_content', 'like', '%' . $search . '%');
            $query->orWhere('post_excerpt', 'like', '%' . $search . '%');
        }
        if ($request->filled('name')) {
            $query->where('post_title', 'like', '%' . $request->input('name') . '%');
        }
        if ($request->filled('slug')) {
            $query->where('post_name', 'like', '%' . $request->input('slug') . '%');
        }
        if ($request->filled('active')) {
            $status = $this->get_status($request->boolean('active'));
            $query->where('post_status', $status);
        }

        $pages = $query->paginate($perPage);
        $pages->getCollection()->transform(function ($item) {
            return $this->map_page($item);
        });

        return response()->json($pages);
    }

    public function map_page($page)
    {
        if(is_array($page)){
            $page = (object)$page;
        }
        $config = is_array($page->config) ? $page->config : (is_string($page->config) ? json_decode($page->config, true) ?? [] : []);
        return [
            'id' => $page->ID,
            'title' => $page->post_title,
            'content' => $page->post_content,
            'slug' => $page->post_name,
            'active' => $this->decode_status($page->post_status),
            'metaTitle' => $config['metaTitle'] ?? null,
            'metaDescription' => $config['metaDescription'] ?? null,
            'created_at' => $page->created_at,
            'updated_at' => $page->updated_at,
        ];
    }

    public function array_filder_validate()
    {
        return [
            'name' => 'required|string|max:255',
            'content' => 'nullable|string',
            'active' => 'boolean',
            'metaTitle' => 'nullable|string|max:255',
            'metaDescription' => 'nullable|string',
        ];
    }

    public function store(Request $request)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), $this->array_filder_validate());
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        $existing = Page::withoutGlobalScope('notDeleted')
            ->where('post_title', $validated['name'])
            ->where(function($query) {
                $query->where('excluido', 's')->orWhere('deletado', 's');
            })
            ->first();
        if ($existing) {
            return response()->json([
                'message' => 'Já existe uma página com este título na lixeira.',
                'error' => 'duplicate_name'
            ], 409);
        }

        $mappedData = [
            'post_title' => $validated['name'],
            'post_content' => $validated['content'] ?? '',
            'post_status' => $this->get_status($validated['active'] ?? true),
        ];
        $config = [];
        if (isset($validated['metaTitle'])) {
            $config['metaTitle'] = $validated['metaTitle'];
        }
        if (isset($validated['metaDescription'])) {
            $config['metaDescription'] = $validated['metaDescription'];
        }
        if (!empty($config)) {
            $mappedData['config'] = $config;
        }
        $mappedData['post_name'] = (new Page())->generateSlug($validated['name']);
        $mappedData = $this->sanitizeInput($mappedData);
        $mappedData['token'] = Qlib::token();
        $mappedData['post_author'] = $user->id;
        $mappedData['comment_status'] = 'closed';
        $mappedData['ping_status'] = 'closed';
        $mappedData['post_type'] = $this->post_type;
        $mappedData['menu_order'] = 0;
        $mappedData['to_ping'] = 's';
        $mappedData['excluido'] = 'n';
        $mappedData['deletado'] = 'n';

        $page = Page::create($mappedData);
        $responseData = $this->map_page($page);

        return response()->json([
            'data' => $responseData,
            'message' => 'Página criada com sucesso',
            'status' => 201,
        ], 201);
    }

    public function show(string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $page = Page::findOrFail($id);
        $responseData = $this->map_page($page);

        return response()->json([
            'data' => $responseData,
            'message' => 'Página encontrada com sucesso',
            'status' => 200,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), $this->array_filder_validate());
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $pageToUpdate = Page::findOrFail($id);

        $mappedData = [];
        if (isset($validated['name'])) {
            $mappedData['post_title'] = $validated['name'];
            $mappedData['post_name'] = $pageToUpdate->generateSlug($validated['name']);
        }
        if (isset($validated['content'])) {
            $mappedData['post_content'] = $validated['content'];
        }
        if (isset($validated['active'])) {
            $mappedData['post_status'] = $this->get_status($validated['active']);
        }
        $config = is_array($pageToUpdate->config) ? $pageToUpdate->config : (is_string($pageToUpdate->config) ? json_decode($pageToUpdate->config, true) ?? [] : []);
        if (isset($validated['metaTitle'])) {
            $config['metaTitle'] = $validated['metaTitle'];
        }
        if (isset($validated['metaDescription'])) {
            $config['metaDescription'] = $validated['metaDescription'];
        }
        if (!empty($config)) {
            $mappedData['config'] = $config;
        }

        $mappedData = $this->sanitizeInput($mappedData);
        $mappedData['post_type'] = $this->post_type;
        $pageToUpdate->update($mappedData);
        $responseData = $this->map_page($pageToUpdate);

        return response()->json([
            'exec' => true,
            'data' => $responseData,
            'message' => 'Página atualizada com sucesso',
            'status' => 200,
        ]);
    }

    public function destroy(string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $pageToDelete = Page::find($id);
        if (!$pageToDelete) {
            return response()->json([
                'message' => 'Página não encontrada',
                'status' => 404,
            ], 404);
        }
        if($pageToDelete->post_type != $this->post_type){
            return response()->json([
                'message' => 'Página não encontrada ou tipo inválido',
                'status' => 404,
            ], 404);
        }
        if($pageToDelete->excluido == 's'){
            return response()->json([
                'message' => 'Página já excluída',
                'status' => 400,
            ], 400);
        }
        $pageToDelete->update([
            'excluido' => 's',
            'reg_excluido' => json_encode([
                'excluido_por' => $user->id,
                'excluido_em' => now()->toDateTimeString(),
                'motivo' => 'Exclusão via API'
            ])
        ]);

        return response()->json([
            'exec' => true,
            'message' => 'Página excluída com sucesso',
            'status' => 200,
        ]);
    }

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
        $order_by = $request->input('order_by', 'updated_at');
        $order = $request->input('order', 'desc');

        $pages = Page::withoutGlobalScope('notDeleted')
            ->where(function($query) {
                $query->where('excluido', 's')->orWhere('deletado', 's');
            })
            ->orderBy($order_by, $order)
            ->paginate($perPage);

        $pages->getCollection()->transform(function ($item) {
            return $this->map_page($item);
        });

        return response()->json($pages);
    }

    public function restore(string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $page = Page::withoutGlobalScope('notDeleted')
            ->where('ID', $id)
            ->where(function($query) {
                $query->where('excluido', 's')->orWhere('deletado', 's');
            })
            ->first();

        if (!$page) {
            return response()->json([
                'message' => 'Página não encontrada na lixeira',
                'status' => 404,
            ], 404);
        }

        $page->update([
            'excluido' => 'n',
            'deletado' => 'n',
            'reg_excluido' => null,
            'reg_deletado' => null,
        ]);

        return response()->json([
            'message' => 'Página restaurada com sucesso'
        ], 200);
    }

    public function forceDelete(string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $page = Page::withoutGlobalScope('notDeleted')
            ->where('ID', $id)
            ->where(function($query) {
                $query->where('excluido', 's')->orWhere('deletado', 's');
            })
            ->first();

        if (!$page) {
            return response()->json(['error' => 'Página não encontrada na lixeira'], 404);
        }

        $page->forceDelete();

        return response()->json([
            'message' => 'Página excluída permanentemente'
        ], 200);
    }

    public function publicShowBySlug(string $slug)
    {
        $page = Page::published()->where('post_name', $slug)->first();
        if (!$page) {
            return response()->json(['message' => 'Página não encontrada'], 404);
        }
        $responseData = $this->map_page($page);
        return response()->json([
            'data' => $responseData,
            'status' => 200,
        ], 200);
    }
}
