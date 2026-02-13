<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\ContentType;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ContentTypeController extends Controller
{
    protected PermissionService $permissionService;
    protected string $post_type;

    public function __construct()
    {
        $this->permissionService = new PermissionService();
        $this->post_type = 'tipo_conteudo';
    }

    private function sanitizeInput($data)
    {
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                $data[$key] = strip_tags($value);
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

        $query = ContentType::query()->orderBy($order_by, $order);

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
        if ($request->filled('kind')) {
            $query->where('guid', $request->input('kind'));
        }
        if ($request->filled('active')) {
            $status = $this->get_status($request->boolean('active'));
            $query->where('post_status', $status);
        }

        $items = $query->paginate($perPage);
        $items->getCollection()->transform(function ($item) {
            return $this->map_item($item);
        });

        return response()->json($items);
    }

    public function map_item($item)
    {
        if(is_array($item)){
            $item = (object)$item;
        }
        $config = is_array($item->config) ? $item->config : (is_string($item->config) ? json_decode($item->config, true) ?? [] : []);
        return [
            'id' => $item->ID,
            'name' => $item->post_title,
            'description' => $item->post_content,
            'slug' => $item->post_name,
            'active' => $this->decode_status($item->post_status),
            'kind' => $item->guid,
            'config' => $config,
            'created_at' => $item->created_at,
            'updated_at' => $item->updated_at,
        ];
    }

    public function array_filder_validate()
    {
        return [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'active' => 'boolean',
            'kind' => 'required|string|max:100',
            'config' => 'array',
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

        $existing = ContentType::withoutGlobalScope('notDeleted')
            ->where('post_title', $validated['name'])
            ->where(function($query) {
                $query->where('excluido', 's')->orWhere('deletado', 's');
            })
            ->first();
        if ($existing) {
            return response()->json([
                'message' => 'Já existe um tipo de conteúdo com este nome na lixeira.',
                'error' => 'duplicate_name'
            ], 409);
        }

        $mappedData = [
            'post_title' => $validated['name'],
            'post_content' => $validated['description'] ?? '',
            'post_status' => $this->get_status($validated['active'] ?? true),
            'guid' => $validated['kind'],
        ];
        if (isset($validated['config']) && is_array($validated['config'])) {
            $mappedData['config'] = $validated['config'];
        }
        $mappedData['post_name'] = (new ContentType())->generateSlug($validated['name']);
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

        $obj = ContentType::create($mappedData);
        $responseData = $this->map_item($obj);

        return response()->json([
            'data' => $responseData,
            'message' => 'Tipo de conteúdo criado com sucesso',
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

        $obj = ContentType::findOrFail($id);
        $responseData = $this->map_item($obj);

        return response()->json([
            'data' => $responseData,
            'message' => 'Tipo de conteúdo encontrado com sucesso',
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
        $toUpdate = ContentType::findOrFail($id);

        $mappedData = [];
        if (isset($validated['name'])) {
            $mappedData['post_title'] = $validated['name'];
            $mappedData['post_name'] = $toUpdate->generateSlug($validated['name']);
        }
        if (isset($validated['description'])) {
            $mappedData['post_content'] = $validated['description'];
        }
        if (isset($validated['active'])) {
            $mappedData['post_status'] = $this->get_status($validated['active']);
        }
        if (isset($validated['kind'])) {
            $mappedData['guid'] = $validated['kind'];
        }
        $config = is_array($toUpdate->config) ? $toUpdate->config : (is_string($toUpdate->config) ? json_decode($toUpdate->config, true) ?? [] : []);
        if (isset($validated['config'])) {
            $config = array_merge($config ?? [], $validated['config'] ?? []);
        }
        if (!empty($config)) {
            $mappedData['config'] = $config;
        }

        $mappedData = $this->sanitizeInput($mappedData);
        $mappedData['post_type'] = $this->post_type;
        $toUpdate->update($mappedData);
        $responseData = $this->map_item($toUpdate);

        return response()->json([
            'exec' => true,
            'data' => $responseData,
            'message' => 'Tipo de conteúdo atualizado com sucesso',
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

        $obj = ContentType::find($id);
        if (!$obj) {
            return response()->json([
                'message' => 'Tipo de conteúdo não encontrado',
                'status' => 404,
            ], 404);
        }
        if($obj->post_type != $this->post_type){
            return response()->json([
                'message' => 'Tipo de conteúdo não encontrado ou tipo inválido',
                'status' => 404,
            ], 404);
        }
        if($obj->excluido == 's'){
            return response()->json([
                'message' => 'Tipo de conteúdo já excluído',
                'status' => 400,
            ], 400);
        }
        $obj->update([
            'excluido' => 's',
            'reg_excluido' => json_encode([
                'excluido_por' => $user->id,
                'excluido_em' => now()->toDateTimeString(),
                'motivo' => 'Exclusão via API'
            ])
        ]);

        return response()->json([
            'exec' => true,
            'message' => 'Tipo de conteúdo excluído com sucesso',
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

        $items = ContentType::withoutGlobalScope('notDeleted')
            ->where(function($query) {
                $query->where('excluido', 's')->orWhere('deletado', 's');
            })
            ->orderBy($order_by, $order)
            ->paginate($perPage);

        $items->getCollection()->transform(function ($item) {
            return $this->map_item($item);
        });

        return response()->json($items);
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

        $obj = ContentType::withoutGlobalScope('notDeleted')
            ->where('ID', $id)
            ->where(function($query) {
                $query->where('excluido', 's')->orWhere('deletado', 's');
            })
            ->first();

        if (!$obj) {
            return response()->json([
                'message' => 'Tipo de conteúdo não encontrado na lixeira',
                'status' => 404,
            ], 404);
        }

        $obj->update([
            'excluido' => 'n',
            'deletado' => 'n',
            'reg_excluido' => null,
            'reg_deletado' => null,
        ]);

        return response()->json([
            'message' => 'Tipo de conteúdo restaurado com sucesso'
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

        $obj = ContentType::withoutGlobalScope('notDeleted')
            ->where('ID', $id)
            ->where(function($query) {
                $query->where('excluido', 's')->orWhere('deletado', 's');
            })
            ->first();

        if (!$obj) {
            return response()->json(['error' => 'Tipo de conteúdo não encontrado na lixeira'], 404);
        }

        $obj->forceDelete();

        return response()->json([
            'message' => 'Tipo de conteúdo excluído permanentemente'
        ], 200);
    }
}
