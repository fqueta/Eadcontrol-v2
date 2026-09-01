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
            'app_primary_color',
            'app_primary_text_color',
            'app_secondary_color',
            'app_secondary_text_color',
            'app_hover_color',
            'app_gradient_to_color',
            'app_top_menu',
            'app_dark_mode_default',
            'app_whatsapp',
            'app_theme',
            'app_font_family',
            'app_layout_style',
            'app_header_transparent',
            // Home hero title (banner principal)
            'home_hero_title',
            'home_hero_image_url',
            'home_hero_images',
            'home_hero_show_overlay',
            'home_hero_show_texts',
            'home_hero_show_logo',
            'home_hero_show_button',
            'home_hero_autoplay_interval',
            'home_feature_1_title',
            'home_feature_1_desc',
            'home_feature_2_title',
            'home_feature_2_desc',
            'home_feature_3_title',
            'home_feature_3_desc',
            'home_feature_4_title',
            'home_feature_4_desc',
            'featured_courses_config',
            'featured_products_config',
            'pillars_config',
            'cta_config',
            'footer_config',
            'app_footer_logo_url',
            // SEO home overrides (tenant-specific)
            'seo_home_title',
            'seo_home_description',
            'seo_home_keywords',
            'seo_og_image_url',
            'seo_canonical_domain',
            'seo_robots',
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


        $perPage = $request->input('per_page', $this->sec == 'all' ? 2000 : 100);
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
        foreach($request->all() as $key => $value){
            if(!empty($key) && $value !== null){
                if(is_bool($value)){
                    $value = (string)$value;
                }
                
                $option[$key] = Option::updateOrCreate(
                    ['url' => $key],
                    [
                        'name' => ucwords(str_replace('_',' ',$key)),
                        'value' => $value,
                        'ativo' => 's',
                        'excluido' => 'n',
                        'deletado' => 'n',
                        'token' => Qlib::token(), // Qlib::token() should generate a new token if needed, or we can check if it exists
                    ]
                );
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

    /**
     * Preview de metadados para crawlers/bots (WhatsApp, Facebook, Telegram, etc.)
     * pt-BR: Retorna o index.html da SPA com as tags <title> e <meta> injetadas
     *        dinamicamente conforme o tenant e a rota original (como detalhes de cursos).
     */
    public function crawlerPreview(Request $request)
    {
        // 1. Obter a URL de origem solicitada
        $rawUrl = $request->query('url') ?? $request->fullUrl();
        $parsedUrl = parse_url($rawUrl);
        $path = $parsedUrl['path'] ?? '/';

        // 2. Buscar o template HTML do frontend (com cache se o driver suportar)
        $templateHtml = null;
        try {
            $templateHtml = cache()->remember('frontend_index_html', 1800, function() {
                try {
                    $context = stream_context_create([
                        'http' => ['timeout' => 3.0]
                    ]);
                    return @file_get_contents('http://frontend/index.html', false, $context);
                } catch (\Exception $e) {
                    return null;
                }
            });
        } catch (\BadMethodCallException $e) {
            // Se o driver de cache não suportar tags/remember (ex: driver 'file' local com tenancy)
            try {
                $context = stream_context_create([
                    'http' => ['timeout' => 3.0]
                ]);
                $templateHtml = @file_get_contents('http://frontend/index.html', false, $context);
            } catch (\Exception $ex) {
                $templateHtml = null;
            }
        }

        if (!$templateHtml) {
            $localPaths = [
                base_path('../frontend/index.html'),
                base_path('../frontend/dist/index.html'),
                public_path('index.html')
            ];
            foreach ($localPaths as $pathToCheck) {
                if (file_exists($pathToCheck)) {
                    $templateHtml = file_get_contents($pathToCheck);
                    break;
                }
            }
        }

        if (!$templateHtml) {
            return response('Service temporarily unavailable', 503);
        }

        // Metadados padrão (fallback)
        $branding = [
            'title' => 'Incluireeducar - Controle de EAD',
            'description' => 'Plataforma de controle de ead',
            'image' => 'https://api-educar.eadcontrol.com.br/tenancy/assets/file-storage/ExO8vhdToezIjc9ImVHx7tJyAYI65BZ5V6sVW2Mu.png',
            'keywords' => '',
            'robots' => 'index, follow',
            'canonical' => '',
            'siteName' => 'Ead Control',
        ];

        // Canonical base from original URL (tenant-aware: preserve host)
        $scheme = $parsedUrl['scheme'] ?? (request()->isSecure() ? 'https' : 'https');
        $host = $parsedUrl['host'] ?? request()->getHost();
        $canonicalBase = $scheme . '://' . $host;
        // Normalize path for canonical (keep trailing / for home, otherwise trim? keep as is)
        $canonicalUrl = $canonicalBase . $path;
        // Strip query/hash for canonical
        $canonicalUrl = strtok($canonicalUrl, '?');
        $canonicalUrl = strtok($canonicalUrl, '#');

        // Carregar opções do tenant (inclui seo_* overrides)
        $allowedKeys = [
            'app_institution_name',
            'app_institution_slogan',
            'app_institution_description',
            'app_social_image_url',
            'app_logo_url',
            'app_favicon_url',
            'seo_home_title',
            'seo_home_description',
            'seo_home_keywords',
            'seo_og_image_url',
            'seo_canonical_domain',
            'seo_robots',
        ];

        $options = Option::query()
            ->whereIn('url', $allowedKeys)
            ->where(function($q) {
                $q->whereNull('deletado')->orWhere('deletado', '!=', 's');
            })
            ->where(function($q) {
                $q->whereNull('excluido')->orWhere('excluido', '!=', 's');
            })
            ->get(['url', 'value'])
            ->pluck('value', 'url')
            ->toArray();

        $instName = $options['app_institution_name'] ?? config('app.name');
        $slogan = $options['app_institution_slogan'] ?? null;

        // seo overrides have priority for home
        $seoTitle = trim($options['seo_home_title'] ?? '');
        $seoDesc = trim($options['seo_home_description'] ?? '');
        $seoKeywords = trim($options['seo_home_keywords'] ?? '');
        $seoOgImage = trim($options['seo_og_image_url'] ?? '');
        $seoCanonicalDomain = trim($options['seo_canonical_domain'] ?? '');
        $seoRobots = trim($options['seo_robots'] ?? '');

        if ($seoCanonicalDomain) {
            $cleanDomain = preg_replace('/^https?:\/\//i', '', $seoCanonicalDomain);
            $cleanDomain = rtrim($cleanDomain, '/');
            $canonicalUrl = $scheme . '://' . $cleanDomain . $path;
            $canonicalUrl = strtok($canonicalUrl, '?');
        }

        $branding['siteName'] = $instName ?: 'Ead Control';
        $branding['canonical'] = $canonicalUrl;
        $branding['keywords'] = $seoKeywords;
        $branding['robots'] = $seoRobots ?: 'index, follow';
        // og image priority: seoOgImage > social > logo
        if (!empty($seoOgImage)) {
            $branding['image'] = $seoOgImage;
        }

        if ($seoTitle) {
            $branding['title'] = $seoTitle;
        } elseif ($instName) {
            $branding['title'] = $slogan ? "{$instName} — {$slogan}" : $instName;
        }
        if ($seoDesc) {
            $branding['description'] = $seoDesc;
        } elseif (!empty($options['app_institution_description'])) {
            $branding['description'] = $options['app_institution_description'];
        }
        if (empty($seoOgImage)) {
            if (!empty($options['app_social_image_url'])) {
                $branding['image'] = $options['app_social_image_url'];
            } elseif (!empty($options['app_logo_url'])) {
                $branding['image'] = $options['app_logo_url'];
            }
        }

        // 3. Verificar rotas específicas (curso, produto, página)
        $normalizedPath = trim($path, '/');
        $course = null;
        $product = null;
        $pageData = null;

        if (preg_match('/^(?:cursos|courses)(?:\/by-slug)?\/([^\/]+)$/i', $normalizedPath, $matches)) {
            $slugOrId = $matches[1];
            if (is_numeric($slugOrId)) {
                $course = \App\Models\Curso::find($slugOrId);
            } else {
                $course = \App\Models\Curso::where('slug', $slugOrId)
                    ->orWhere('campo_bus', $slugOrId)
                    ->first();
            }
        } elseif (preg_match('/^(?:produtos|products)(?:\/by-slug)?\/([^\/]+)$/i', $normalizedPath, $matches)) {
            $slugOrId = $matches[1];
            if (is_numeric($slugOrId)) {
                $product = \App\Models\Product::withoutGlobalScope('productsOnly')->where('ID', $slugOrId)->first();
            } else {
                $product = \App\Models\Product::where('post_name', $slugOrId)->first();
            }
        } elseif (preg_match('/^pagina\/([^\/]+)$/i', $normalizedPath, $matches)) {
            $slug = $matches[1];
            $pageData = \App\Models\Page::where('slug', $slug)->first();
            if (!$pageData && isset($matches[1])) {
                // fallback: try Option page?
            }
        }

        if ($course) {
            $branding['title'] = ($course->titulo ?: $course->nome) . " | " . ($options['app_institution_name'] ?? config('app.name'));
            if ($course->descricao) {
                $branding['description'] = \Illuminate\Support\Str::limit(strip_tags($course->descricao), 200);
            }
            if (isset($course->config['cover']['url'])) {
                $branding['image'] = $course->config['cover']['url'];
            }
        } elseif ($product) {
            $pTitle = $product->post_title ?: $product->name ?: 'Produto';
            $branding['title'] = $pTitle . " | " . ($options['app_institution_name'] ?? config('app.name'));
            if ($product->post_content) {
                $branding['description'] = \Illuminate\Support\Str::limit(strip_tags($product->post_content), 200);
            }
            $img = $product->config['image_url'] ?? $product->config['cover']['url'] ?? null;
            if ($img) $branding['image'] = $img;
        } elseif ($pageData) {
            $cfg = is_string($pageData->config) ? json_decode($pageData->config, true) : ($pageData->config ?? []);
            $metaTitle = $cfg['metaTitle'] ?? $pageData->title ?? null;
            $metaDesc = $cfg['metaDescription'] ?? null;
            if ($metaTitle) $branding['title'] = $metaTitle . " | " . ($options['app_institution_name'] ?? config('app.name'));
            if ($metaDesc) $branding['description'] = \Illuminate\Support\Str::limit(strip_tags($metaDesc), 200);
        }

        // 4. Injetar metadados no HTML
        $html = preg_replace('/<title id="app-title">.*?<\/title>/is', "<title id=\"app-title\">" . e($branding['title']) . "</title>", $templateHtml);
        $html = preg_replace('/<meta id="app-description" name="description" content="[^"]*"/is', '<meta id="app-description" name="description" content="' . e($branding['description']) . '"', $html);
        $html = preg_replace('/<meta property="og:title" content="[^"]*"/is', '<meta property="og:title" content="' . e($branding['title']) . '"', $html);
        $html = preg_replace('/<meta property="og:description" content="[^"]*"/is', '<meta property="og:description" content="' . e($branding['description']) . '"', $html);

        // twitter:title / description
        if (strpos($html, 'name="twitter:title"') !== false) {
            $html = preg_replace('/<meta name="twitter:title" content="[^"]*"/is', '<meta name="twitter:title" content="' . e($branding['title']) . '"', $html);
        } else {
            $html = preg_replace('/<\/head>/i', '<meta name="twitter:title" content="' . e($branding['title']) . '" />' . "\n</head>", $html, 1);
        }
        if (strpos($html, 'name="twitter:description"') !== false) {
            $html = preg_replace('/<meta name="twitter:description" content="[^"]*"/is', '<meta name="twitter:description" content="' . e($branding['description']) . '"', $html);
        } else {
            $html = preg_replace('/<\/head>/i', '<meta name="twitter:description" content="' . e($branding['description']) . '" />' . "\n</head>", $html, 1);
        }
        // og:url + canonical
        if (strpos($html, 'id="app-og-url"') !== false) {
            $html = preg_replace('/<meta id="app-og-url" property="og:url" content="[^"]*"/is', '<meta id="app-og-url" property="og:url" content="' . e($branding['canonical']) . '"', $html);
        } elseif (strpos($html, 'property="og:url"') !== false) {
            $html = preg_replace('/<meta property="og:url" content="[^"]*"/is', '<meta property="og:url" content="' . e($branding['canonical']) . '"', $html);
        } else {
            $html = preg_replace('/<\/head>/i', '<meta id="app-og-url" property="og:url" content="' . e($branding['canonical']) . '" />' . "\n</head>", $html, 1);
        }
        if (strpos($html, 'id="app-canonical"') !== false) {
            $html = preg_replace('/<link id="app-canonical" rel="canonical" href="[^"]*"/is', '<link id="app-canonical" rel="canonical" href="' . e($branding['canonical']) . '"', $html);
        } elseif (strpos($html, 'rel="canonical"') !== false) {
            $html = preg_replace('/<link rel="canonical" href="[^"]*"/is', '<link rel="canonical" href="' . e($branding['canonical']) . '"', $html);
        } else {
            $html = preg_replace('/<\/head>/i', '<link id="app-canonical" rel="canonical" href="' . e($branding['canonical']) . '" />' . "\n</head>", $html, 1);
        }
        // og:site_name + locale
        if (strpos($html, 'property="og:site_name"') !== false) {
            $html = preg_replace('/<meta property="og:site_name" content="[^"]*"/is', '<meta property="og:site_name" content="' . e($branding['siteName']) . '"', $html);
        } else {
            $html = preg_replace('/<\/head>/i', '<meta property="og:site_name" content="' . e($branding['siteName']) . '" />' . "\n</head>", $html, 1);
        }
        if (strpos($html, 'property="og:locale"') === false) {
            $html = preg_replace('/<\/head>/i', '<meta property="og:locale" content="pt_BR" />' . "\n</head>", $html, 1);
        }
        // robots + keywords
        if (strpos($html, 'name="robots"') !== false) {
            $html = preg_replace('/<meta name="robots" content="[^"]*"/is', '<meta name="robots" content="' . e($branding['robots']) . '"', $html);
        } else {
            $html = preg_replace('/<\/head>/i', '<meta name="robots" content="' . e($branding['robots']) . '" />' . "\n</head>", $html, 1);
        }
        if (!empty($branding['keywords'])) {
            if (strpos($html, 'name="keywords"') !== false) {
                $html = preg_replace('/<meta name="keywords" content="[^"]*"/is', '<meta name="keywords" content="' . e($branding['keywords']) . '"', $html);
            } else {
                $html = preg_replace('/<\/head>/i', '<meta name="keywords" content="' . e($branding['keywords']) . '" />' . "\n</head>", $html, 1);
            }
        }

        if (strpos($html, 'id="app-og-image"') !== false) {
            $html = preg_replace('/<meta id="app-og-image" property="og:image" content="[^"]*"/is', '<meta id="app-og-image" property="og:image" content="' . e($branding['image']) . '"', $html);
        }
        if (strpos($html, 'id="app-twitter-image"') !== false) {
            $html = preg_replace('/<meta id="app-twitter-image" name="twitter:image" content="[^"]*"/is', '<meta id="app-twitter-image" name="twitter:image" content="' . e($branding['image']) . '"', $html);
        }
        // Ensure og:image:width/height present
        if (strpos($html, 'og:image:width') === false) {
            $html = preg_replace('/<\/head>/i', '<meta property="og:image:width" content="1200" />' . "\n<meta property=\"og:image:height\" content=\"630\" />\n</head>", $html, 1);
        }

        // 5. Injetar conteúdo SEO no body para home (/) — visível para bots mas hidden via css
        if ($normalizedPath === '' || $normalizedPath === 'home') {
            $seoBody = '';
            // Build minimal accessible content: h1 + description + featured courses/products
            $seoBody .= '<div id="seo-content" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;">';
            $seoBody .= '<h1>' . e($branding['title']) . '</h1>';
            $seoBody .= '<p>' . e($branding['description']) . '</p>';
            // Featured courses (ativos, publicados e destaque)
            try {
                $featuredCourses = \App\Models\Curso::where('destaque', 's')->where('ativo', 's')->where('publicar', 's')->limit(6)->get(['titulo','nome','slug','descricao','config']);
                if ($featuredCourses->count() > 0) {
                    $seoBody .= '<h2>Cursos em Destaque</h2><ul>';
                    foreach ($featuredCourses as $fc) {
                        $ctitle = $fc->titulo ?: $fc->nome;
                        $cslug = $fc->slug ?: $fc->id;
                        $seoBody .= '<li><a href="' . e($canonicalBase . '/cursos/' . $cslug) . '">' . e($ctitle) . '</a>';
                        if ($fc->descricao) $seoBody .= ' - ' . e(\Illuminate\Support\Str::limit(strip_tags($fc->descricao), 120));
                        $seoBody .= '</li>';
                    }
                    $seoBody .= '</ul>';
                }
            } catch (\Throwable $e) {}
            try {
                $featuredProducts = \App\Models\Product::where('post_status', 'publish')->limit(6)->get(['post_title','post_name','post_content']);
                if ($featuredProducts->count() > 0) {
                    $seoBody .= '<h2>Produtos em Destaque</h2><ul>';
                    foreach ($featuredProducts as $fp) {
                        $ptitle = $fp->post_title ?: 'Produto';
                        $pslug = $fp->post_name ?: $fp->ID;
                        $seoBody .= '<li><a href="' . e($canonicalBase . '/produtos/' . $pslug) . '">' . e($ptitle) . '</a></li>';
                    }
                    $seoBody .= '</ul>';
                }
            } catch (\Throwable $e) {}
            // JSON-LD for home
            $origin = $canonicalBase;
            $logo = $options['app_logo_url'] ?? '';
            $jsonLd = [
                [
                    "@context" => "https://schema.org",
                    "@type" => "Organization",
                    "name" => $branding['siteName'],
                    "url" => $origin,
                    "logo" => $logo,
                    "description" => $branding['description'],
                ],
                [
                    "@context" => "https://schema.org",
                    "@type" => "WebSite",
                    "name" => $branding['siteName'],
                    "url" => $origin,
                    "inLanguage" => "pt-BR",
                    "description" => $branding['description'],
                    "potentialAction" => [
                        "@type" => "SearchAction",
                        "target" => $origin . "/cursos?q={search_term_string}",
                        "query-input" => "required name=search_term_string"
                    ]
                ],
                [
                    "@context" => "https://schema.org",
                    "@type" => "BreadcrumbList",
                    "itemListElement" => [
                        ["@type"=>"ListItem","position"=>1,"name"=>"Início","item"=>$origin."/"],
                        ["@type"=>"ListItem","position"=>2,"name"=>"Cursos","item"=>$origin."/cursos"],
                        ["@type"=>"ListItem","position"=>3,"name"=>"Produtos","item"=>$origin."/produtos"],
                    ]
                ]
            ];
            $seoBody .= '<script type="application/ld+json">' . json_encode($jsonLd, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE) . '</script>';
            $seoBody .= '</div>';
            // Inject after <body> tag
            $html = preg_replace('/<body([^>]*)>/i', '<body$1>' . $seoBody, $html, 1);
        }

        return response($html)->header('Content-Type', 'text/html');
    }
}
