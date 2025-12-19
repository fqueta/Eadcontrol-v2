<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Option;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class OptionController extends Controller
{
    protected $permissionService;
    public $routeName;
    public $sec;

    public function __construct()
    {
        $this->routeName = request()->route()->getName();
        $this->permissionService = new PermissionService();
        $this->sec = request()->segment(4);
    }

    /**
     * Public: Expose branding and institutional identity options
     * pt-BR: Endpoint público que retorna apenas dados dos cards
     *        "Identidade Institucional" e "Branding & Imagens".
     * en-US: Public endpoint that returns only the data from
     *        "Institutional Identity" and "Branding & Images" cards.
     *
     * Returns JSON in the shape:
     * {
     *   "data": {
     *     "app_logo_url": "...",
     *     "app_favicon_url": "...",
     *     "app_social_image_url": "...",
     *     "app_institution_name": "...",
     *     "app_institution_slogan": "...",
     *     "app_institution_description": "...",
     *     "app_institution_url": "..."
     *   }
     * }
     */
    public function publicBranding(Request $request)
    {
        // Whitelisted keys to expose publicly
        $allowedKeys = [
            'app_logo_url',
            'app_favicon_url',
            'app_social_image_url',
            'app_institution_name',
            'app_institution_slogan',
            'app_institution_description',
            'app_institution_url',
        ];

        // Fetch options for allowed keys only
        $options = Option::query()
            ->whereIn('url', $allowedKeys)
            ->where(function($q) {
                $q->whereNull('deletado')->orWhere('deletado', '!=', 's');
            })
            ->where(function($q) {
                $q->whereNull('excluido')->orWhere('excluido', '!=', 's');
            })
            ->get(['url', 'value']);

        $data = [];
        foreach ($options as $opt) {
            // Ensure string values, decode arrays if stored as JSON
            $val = $opt->value;
            if (is_string($val)) {
                // try decode, else keep original
                $decoded = json_decode($val, true);
                $val = (json_last_error() === JSON_ERROR_NONE) ? $decoded : $val;
            }
            $data[$opt->url] = $val;
        }

        // Minimal fallbacks: app name for institution if missing
        if (!array_key_exists('app_institution_name', $data) || empty($data['app_institution_name'])) {
            $data['app_institution_name'] = config('app.name');
        }

        return response()->json(['data' => $data]);
    }

    /**
     * Listar todas as opções
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


        $perPage = $request->input('per_page', 100);
        $order_by = $request->input('order_by', 'created_at');
        $order = $request->input('order', 'desc');

        $query = Option::query()->orderBy($order_by, $order);

        // Não exibir registros marcados como deletados ou excluídos
        $query->where(function($q) {
            $q->whereNull('deletado')->orWhere('deletado', '!=', 's');
        });
        $query->where(function($q) {
            $q->whereNull('excluido')->orWhere('excluido', '!=', 's');
        });

        if ($request->filled('name')) {
            $query->where('name', 'like', '%' . $request->input('name') . '%');
        }
        if ($request->filled('url')) {
            $query->where('url', 'like', '%' . $request->input('url') . '%');
        }

        $options = $query->paginate($perPage);
        if($this->sec=='all'){
            $ret = $options;
        }else{
            $ret = $this->AdvancedInputSettings($options);
        }

        return response()->json(['data'=>$ret]);
    }
    /**
     * Metodo para expor dados para a api
     */
    public function AdvancedInputSettings($options=[]){
        $ret = [];
        if(is_object($options)){
            foreach($options as $key => $value){
                if(isset($value['url']) && !empty($value['url']) && ($url = $value['url'])){
                    $ret[$url] = $value['value'];
                }
            }
            // dd($options,$ret);
        }
        return $ret;
    }

    /**
     * Sanitiza os dados de entrada
     */
    private function sanitizeInput($data)
    {
        if (is_array($data)) {
            foreach ($data as $key => $value) {
                if (is_array($value)) {
                    $data[$key] = $this->sanitizeInput($value);
                } elseif (is_string($value)) {
                    $data[$key] = trim($value);
                }
            }
        } elseif (is_string($data)) {
            $data = trim($data);
        }
        return $data;
    }

    /**
     * Criar uma nova opção
     */
    public function store(Request $request)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if(!$request->filled('name') && $request->filled('url')){
            $request->merge([
                'name' => $request->get('url'),
            ]);
        }
        // Verificar se o nome já existe na lixeira
        if ($request->filled('name')) {
            $existingOption = Option::withoutGlobalScope('active')
                ->where('url', $request->url)
                ->where(function($q) {
                    $q->where('deletado', 's')->orWhere('excluido', 's');
                })
                ->first();

            if ($existingOption) {
                return response()->json([
                    'message' => 'Esta opção já está em nossa base de dados, verifique na lixeira.',
                    'errors'  => ['name' => ['Opção com este nome está na lixeira']],
                ], 422);
            }
        }

        $validator = Validator::make($request->all(), [
            'name'  => 'required|string|max:255|unique:options,name',
            'url'   => 'nullable|string|max:255',
            'value' => 'nullable',
            'ativo' => ['nullable', Rule::in(['s','n'])],
            'obs'   => 'nullable|string',
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
        $validated['token'] = Qlib::token();
        $validated['ativo'] = isset($validated['ativo']) ? $validated['ativo'] : 's';

        // Converter value para JSON se for array
        if (isset($validated['value']) && is_array($validated['value'])) {
            $validated['value'] = json_encode($validated['value']);
        }

        // $option = Option::create($validated);
        $option = Option::updateOrInsert(
            [
                'name' => $validated['name'],
            ],
            [
                'url'      => $validated['url'],
                'value'     => $validated['value'],
                'ativo'     => $validated['ativo'],
                'obs'     => $validated['obs'],
                'created_at'      => now(),
                'updated_at'      => now(),
            ]
        );
        $ret['data'] = $option;
        $ret['message'] = 'Opção criada com sucesso';
        $ret['status'] = 201;

        return response()->json($ret, 201);
    }
    public function fast_update_all(Request $request)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $option = null;
        // dd($request->all());
        foreach($request->all() as $key => $value){
            if(!empty($key) && !empty($value)){
                if(is_bool($value)){
                    $value = (string)$value;
                }
                $data_salv = [
                    'name' => ucwords(str_replace('_',' ',$key)),
                    'url' => $key,
                    'value' => $value,
                    'ativo' => 's',
                    'excluido' => 'n',
                    'deletado' => 'n',
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ];
                // dd($data_salv);
                // $option[$key] = Option::updateOrInsert(
                //     [
                //         'value' => $value,
                //     ],
                //     $data_salv
                // );
                $option[$key] = Qlib::update_tab('options', $data_salv, "WHERE url = '$key'");
            }
        }
        // dd($option);
        // dd($validated);
        // $option = Option::create($validated);
        $ret['data'] = $option;
        $ret['message'] = 'Opções atualizadas com sucesso';
        $ret['status'] = 201;

        return response()->json($ret, 201);
    }

    /**
     * Exibir uma opção específica
     */
    public function show(Request $request, string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        dd($id);
        $option = Option::findOrFail($id);

        // Converter value para array
        if (is_string($option->value)) {
            $option->value = json_decode($option->value, true) ?? [];
        }

        return response()->json($option);
    }

    /**
     * Atualizar uma opção específica
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

        $optionToUpdate = Option::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name'  => ['sometimes', 'required', 'string', 'max:255', Rule::unique('options', 'name')->ignore($optionToUpdate->id)],
            'url'   => 'nullable|string|max:255',
            'value' => 'nullable',
            'ativo' => ['nullable', Rule::in(['s','n'])],
            'obs'   => 'nullable|string',
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

        // Tratar value se fornecido
        if (isset($validated['value']) && is_array($validated['value'])) {
            $validated['value'] = json_encode($validated['value']);
        }

        $optionToUpdate->update($validated);

        // Converter value para array na resposta
        if (is_string($optionToUpdate->value)) {
            $optionToUpdate->value = json_decode($optionToUpdate->value, true) ?? [];
        }

        $ret['data'] = $optionToUpdate;
        $ret['message'] = 'Opção atualizada com sucesso';
        $ret['status'] = 200;

        return response()->json($ret);
    }

    /**
     * Mover opção para a lixeira
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $option = Option::findOrFail($id);

        // Mover para lixeira em vez de excluir permanentemente
        $option->update([
            'deletado' => 's',
            'reg_deletado' => json_encode([
                'usuario' => $user->id,
                'nome' => $user->name,
                'created_at' => now(),
            ])
        ]);

        return response()->json([
            'message' => 'Opção movida para a lixeira com sucesso',
            'status' => 200
        ]);
    }

    /**
     * Listar opções na lixeira
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

        $query = Option::withoutGlobalScope('active')
            ->where('deletado', 's')
            ->orderBy($order_by, $order);

        if ($request->filled('name')) {
            $query->where('name', 'like', '%' . $request->input('name') . '%');
        }
        if ($request->filled('url')) {
            $query->where('url', 'like', '%' . $request->input('url') . '%');
        }

        $options = $query->paginate($perPage);

        // Converter value para array em cada opção
        $options->getCollection()->transform(function ($option) {
            if (is_string($option->value)) {
                $valueArr = json_decode($option->value, true) ?? [];
                array_walk($valueArr, function (&$value) {
                    if (is_null($value)) {
                        $value = (string)'';
                    }
                });
                $option->value = $valueArr;
            }
            return $option;
        });

        return response()->json($options);
    }

    /**
     * Restaurar opção da lixeira
     */
    public function restore(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $option = Option::withoutGlobalScope('active')
            ->where('id', $id)
            ->where('deletado', 's')
            ->firstOrFail();

        $option->update([
            'deletado' => 'n',
            'reg_deletado' => null
        ]);

        return response()->json([
            'message' => 'Opção restaurada com sucesso',
            'status' => 200
        ]);
    }

    /**
     * Excluir opção permanentemente
     */
    public function forceDelete(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $option = Option::withoutGlobalScope('active')
            ->where('id', $id)
            ->firstOrFail();

        $option->delete();

        return response()->json([
            'message' => 'Opção excluída permanentemente',
            'status' => 200
        ]);
    }
}
