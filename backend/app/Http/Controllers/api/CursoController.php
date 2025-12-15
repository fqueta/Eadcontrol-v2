<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCursoRequest;
use App\Http\Requests\UpdateCursoRequest;
use App\Models\Curso;
use App\Models\Module;
use App\Models\Activity;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CursoController extends Controller
{
    /**
     * Serviço de permissões.
     */
    protected PermissionService $permissionService;

    /**
     * Construtor: inicializa serviço de permissões.
     */
    public function __construct()
    {
        $this->permissionService = new PermissionService();
    }

    /**
     * PT: Aplica o template de atividades de um módulo fonte em um módulo alvo.
     * EN: Apply activities template from a source module to a target module.
     *
     * Request params:
     * - source_module_id: ID (int) do módulo que contém o template em config.
     * - overwrite: bool opcional. Se true, remove atividades existentes do alvo.
     *
     * Path param:
     * - {id}: ID (int) do módulo alvo que receberá as atividades.
     *
     * Retorna JSON com contagem criada e lista de atividades.
     */
    public function applyModuleTemplate(Request $request, int $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        // Validação simples do input
        $request->validate([
            'source_module_id' => ['required','integer'],
            'overwrite' => ['nullable','boolean'],
        ]);
        $sourceId = (int) $request->integer('source_module_id');
        $overwrite = filter_var($request->input('overwrite', false), FILTER_VALIDATE_BOOLEAN);

        // Carregar módulos fonte e alvo
        $targetModule = Module::find($id);
        if (!$targetModule) {
            return response()->json(['error' => 'Módulo alvo não encontrado'], 404);
        }
        $sourceModule = Module::find($sourceId);
        if (!$sourceModule) {
            return response()->json(['error' => 'Módulo fonte não encontrado'], 404);
        }

        // Obter template das atividades do módulo fonte. Fallback: extrair do banco.
        $template = [];
        $srcConf = is_array($sourceModule->config ?? null) ? $sourceModule->config : [];
        if (is_array($srcConf['atividades_template'] ?? null) && !empty($srcConf['atividades_template'])) {
            $template = $srcConf['atividades_template'];
        } else {
            $template = $this->buildActivityTemplateFromDb((int) $sourceModule->ID);
        }
        if (empty($template)) {
            return response()->json(['error' => 'Template de atividades não encontrado no módulo fonte'], 422);
        }

        // Opcional: apagar atividades existentes do módulo alvo antes de aplicar
        if ($overwrite) {
            Activity::where('post_parent', (int) $targetModule->ID)->get()->each(function ($act) {
                $act->delete();
            });
        }

        // Criar atividades a partir do template
        $created = [];
        foreach ($template as $act) {
            if (!is_array($act)) { continue; }
            $mappedActivity = [
                'post_title' => $act['title'] ?? '',
                'post_excerpt' => $act['description'] ?? '',
                'post_content' => is_string($act['content'] ?? '') ? ($act['content'] ?? '') : json_encode($act['content'] ?? ''),
                'post_status' => $this->get_status($this->normalizeActiveFlag($act['active'] ?? 's')),
                'post_parent' => (int) $targetModule->ID,
                'config' => [
                    'type_activities' => $act['config']['type_activities'] ?? ($act['type_activities'] ?? null),
                    'type_duration' => $act['config']['type_duration'] ?? ($act['type_duration'] ?? null),
                    'duration' => $act['config']['duration'] ?? ($act['duration'] ?? null),
                ],
                'post_type' => 'activities',
                'token' => Qlib::token(),
                'post_author' => (string) $user->id,
                'comment_status' => 'closed',
                'ping_status' => 'closed',
                'menu_order' => 0,
                'to_ping' => 's',
                'excluido' => 'n',
                'deletado' => 'n',
            ];
            if (!empty($act['name'] ?? '')) {
                $mappedActivity['post_name'] = (new Activity())->generateSlug($act['name']);
            } elseif (!empty($act['title'] ?? '')) {
                $mappedActivity['post_name'] = (new Activity())->generateSlug($act['title']);
            }
            $activityModel = Activity::create($mappedActivity);
            $created[] = [
                'id' => (int) $activityModel->ID,
                'title' => $mappedActivity['post_title'],
                'name' => $mappedActivity['post_name'] ?? null,
            ];
        }

        return response()->json([
            'message' => 'Template aplicado com sucesso',
            'target_module_id' => (int) $targetModule->ID,
            'created_count' => count($created),
            'activities' => $created,
        ], 200);
    }

    /**
     * PT: Extrai do banco um template baseado nas atividades de um módulo.
     * EN: Build a template from existing activities in the database.
     */
    private function buildActivityTemplateFromDb(int $moduleId): array
    {
        $items = Activity::where('post_parent', $moduleId)->get();
        $template = [];
        foreach ($items as $it) {
            $template[] = [
                'name' => $it->post_name,
                'title' => $it->post_title,
                'description' => $it->post_excerpt,
                'content' => $it->post_content,
                'active' => $it->post_status === 'publish',
                'config' => is_array($it->config) ? $it->config : [],
            ];
        }
        return $template;
    }
    /**
     * Lista cursos com paginação e filtros simples.
     * Exige autenticação e permissão de visualização.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $perPage = (int) $request->input('per_page', 15);
        // Permitir incluir itens da lixeira quando include_trashed=true
        $includeTrashed = filter_var($request->input('include_trashed', false), FILTER_VALIDATE_BOOLEAN);
        $query = $includeTrashed
            ? Curso::withoutGlobalScope('notDeleted')
            : Curso::query();

        // Filtro por nome/título
        if ($search = $request->string('q')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('nome', 'like', "%{$search}%")
                  ->orWhere('titulo', 'like', "%{$search}%");
            });
        }

        // Filtro por categoria
        if ($request->filled('categoria')) {
            $query->where('categoria', $request->string('categoria')->toString());
        }

        // Filtro por ativo
        if ($request->filled('ativo')) {
            $v = strtolower($request->string('ativo')->toString());
            if (in_array($v, ['s','n'])) {
                $query->where('ativo', $v);
            }
        }

        $cursos = $query->orderByDesc('updated_at')->paginate($perPage);
        return response()->json($cursos);
    }

    /**
     * Lista pública de cursos sem autenticação.
     * EN: Public listing of courses without authentication.
     *
     * Regras:
     * - Inclui apenas cursos com ativo='s' e publicar='s'.
     * - Exclui itens na lixeira pelo escopo global do modelo.
     * - Suporta query params: per_page, q (busca), categoria.
     */
    /**
     * pt-BR: Lista cursos públicos ativos e não excluídos.
     *        Filtros: `ativo` = 's' e `excluido` = 'n'.
     *        Aceita parâmetros de busca `q` ou `search` e `categoria`.
     *
     * en-US: Lists public courses that are active and not excluded.
     *        Filters: `ativo` = 's' and `excluido` = 'n'.
     *        Accepts search params `q` or `search` and `categoria`.
     */
    public function publicIndex(Request $request)
    {
        $perPage = (int) $request->input('per_page', 15);

        // pt-BR: Exibir apenas cursos ativos e não excluídos (excluido='n'), conforme requisito.
        // en-US: Show only active and non-excluded courses (excluido='n'), per requirement.
        $query = Curso::query()
            ->where('ativo', 's')
            ->where('excluido', 'n');

        // Busca por nome/título
        $search = $request->string('q')->toString() ?: $request->string('search')->toString();
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('nome', 'like', "%{$search}%")
                  ->orWhere('titulo', 'like', "%{$search}%");
            });
        }

        // Filtro por categoria
        if ($request->filled('categoria')) {
            $query->where('categoria', $request->string('categoria')->toString());
        }

        $cursos = $query->orderByDesc('updated_at')->paginate($perPage);
        return response()->json($cursos, 200);
    }

    /**
     * PT: Exibe publicamente um curso por ID, sem autenticação.
     * EN: Publicly show a course by ID without authentication.
     *
     * Regras:
     * - Retorna apenas se `ativo='s'` e `publicar='s'`.
     * - Considera escopo global que oculta itens da lixeira.
     */
    public function publicShowById(Request $request, int $id)
    {
        $curso = Curso::query()
            ->where('id', $id)
            ->where('ativo', 's')
            ->where('publicar', 's')
            ->first();

        if (!$curso) {
            return response()->json(['error' => 'Curso não encontrado'], 404);
        }

        return response()->json($curso, 200);
    }

    /**
     * PT: Exibe publicamente um curso por slug, sem autenticação.
     * EN: Publicly show a course by slug without authentication.
     *
     * Convenção:
     * - Primeiro tenta correspondência exata em `slug`.
     * - Fallback legado: tenta `campo_bus`.
     * - Fallback final: busca candidatos por `nome`/`titulo` e compara `Str::slug()` em PHP.
     */
    public function publicShowBySlug(Request $request, string $slug)
    {
        $normalized = Str::slug($slug);

        // 1) Correspondência direta via coluna 'slug'
        $curso = Curso::query()
            ->where('ativo', 's')
            // ->where('publicar', 's')
            ->where('slug', $normalized)
            ->first();
        // Disponibiliza os monudos apenas para quem tem permissão de visualização ou para quem está matriculado no curso
        // $user = $request->user();
        // if (!$this->permissionService->isHasPermission('view') && !$this->enrollmentService->isEnrolled($user->ID, $curso->ID)) {
        //     return response()->json(['error' => 'Acesso negado'], 403);
        // }

        if ($curso) {
            return response()->json($curso, 200);
        }

        // 2) Fallback legado: tentar 'campo_bus'
        $cursoCampoBus = Curso::query()
            ->where('ativo', 's')
            // ->where('publicar', 's')
            ->where('campo_bus', $normalized)
            ->first();

        if ($cursoCampoBus) {
            return response()->json($cursoCampoBus, 200);
        }

        // 3) Fallback: buscar candidatos por nome/título e comparar slug em PHP
        $likeTerm = str_replace(['-', '_'], ' ', $slug);
        $candidatos = Curso::query()
            ->where('ativo', 's')
            ->where('publicar', 's')
            ->where(function ($q) use ($likeTerm) {
                $q->where('nome', 'like', "%{$likeTerm}%")
                  ->orWhere('titulo', 'like', "%{$likeTerm}%");
            })
            ->orderByDesc('updated_at')
            ->limit(20)
            ->get();

        foreach ($candidatos as $c) {
            $base = $c->titulo ?: $c->nome ?: '';
            if ($base !== '' && Str::slug($base) === $normalized) {
                return response()->json($c, 200);
            }
        }

        return response()->json(['error' => 'Curso não encontrado'], 404);
    }
    /**
     * Criar (ou atualizar por id) um curso.
     * Aceita payload validado em StoreCursoRequest e garante permissões.
     * Se houver 'id' numérico, usa updateOrCreate.
     */
    public function store(StoreCursoRequest $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        // dd($request->all());
        $data = $request->validated();

        // Definir defaults similares ao AeronaveController
        if (!isset($data['autor']) || $data['autor'] === null || $data['autor'] === '') {
            $data['autor'] = (string) $user->id;
        }
        if (!isset($data['token']) || $data['token'] === null || $data['token'] === '') {
            $data['token'] = Qlib::token();
        }
        if (!isset($data['ativo'])) {
            $data['ativo'] = 's';
        }
        if (!isset($data['publicar'])) {
            $data['publicar'] = 'n';
        }

        // Normaliza numéricos e campos vazios do payload
        $data = $this->sanitizeCursoData($data);

        // Slug: gerar automaticamente quando não fornecido
        // EN: Slug: auto-generate when not provided
        $baseForSlug = $data['slug'] ?? ($data['titulo'] ?? $data['nome'] ?? 'curso');
        // PT: Em criação, não há registro a ignorar
        // EN: On create, no record to ignore
        $data['slug'] = (new Curso())->generateSlug($baseForSlug, null);
        // Compatibilidade: preencher campo_bus com slug quando vazio
        if (empty($data['campo_bus'] ?? '')) {
            $data['campo_bus'] = $data['slug'];
        }
        // dd($data);
        // Se vier id numérico, usa updateOrCreate para evitar duplicidade; caso contrário cria
        if (isset($data['id']) && is_numeric($data['id'])) {
            $id = (int) $data['id'];
            unset($data['id']);
            $curso = Curso::updateOrCreate(['id' => $id], $data);
        } else {
            $curso = Curso::create($data);
        }

        // Upsert de módulos e atividades, quando presentes
        $modulesPayload = $request->validated()['modulos'] ?? null;
        if (is_array($modulesPayload) && !empty($modulesPayload)) {
            $upsertResult = $this->upsertModulesAndActivities($modulesPayload, $curso, (string) $user->id);
            // Atualiza representação dos módulos dentro do curso com IDs recém-criados/atualizados
            $curso->modulos = $upsertResult;
            $curso->save();
        }

        return response()->json([
            'data' => $curso->fresh(),
            'message' => isset($id) ? 'Curso atualizado com sucesso' : 'Curso criado com sucesso',
            'status' => 201,
        ], 201);
    }

    /**
     * Exibir um curso específico.
     * Exige autenticação e permissão de visualização.
     */
    public function show(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $curso = Curso::find($id);
        //se não encontar o curso pelo id, tenta buscar pelo slug
        if (!$curso) {
            $curso = Curso::where('slug', $id)->first();
        }
        if (!$curso) {
            return response()->json(['error' => 'Curso não encontrado'], 404);
        }

        return response()->json($curso);
    }

    /**
     * Atualizar um curso específico.
     * Exige autenticação e permissão de edição.
     */
    public function update(UpdateCursoRequest $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $curso = Curso::find($id);
        if (!$curso) {
            return response()->json(['error' => 'Curso não encontrado'], 404);
        }

        $data = $request->validated();
        $data = $this->sanitizeCursoData($data);

        // Atualizar slug se fornecido no payload; caso contrário manter o atual
        if (array_key_exists('slug', $data)) {
            $baseForSlug = $data['slug'] ?? ($data['titulo'] ?? $data['nome'] ?? $curso->slug ?? 'curso');
            // PT: Em update, ignora o próprio curso para evitar colisão falsa
            // EN: On update, ignore current course to avoid false collision
            $data['slug'] = (new Curso())->generateSlug($baseForSlug, (int) $curso->id);
            if (empty($data['campo_bus'] ?? '')) {
                $data['campo_bus'] = $data['slug'];
            }
        }
        // dd($data);
        $curso->update($data);

        // Upsert de módulos/atividades quando enviados no update
        $modulesPayload = $data['modulos'] ?? null;
        if (is_array($modulesPayload) && !empty($modulesPayload)) {
$upsertResult = $this->upsertModulesAndActivities($modulesPayload, $curso, (string) $user->id);
            $curso->modulos = $upsertResult;
            $curso->save();
        }

        return response()->json([
            'data' => $curso->fresh(),
            'message' => 'Curso atualizado com sucesso',
        ], 200);
    }

    /**
     * Normaliza valores monetários e remove campos vazios do payload de curso.
     * EN: Normalize monetary values and remove empty fields from curso payload.
     *
     * - Converte strings decimais no formato brasileiro ("1.234,56") para ponto ("1234.56").
     * - Converte duracao e parcelas em inteiros quando aplicável.
     * - Remove 'parcelas' quando vazio para deixar o default do banco aplicar.
     * - Converte strings vazias em null para campos decimais.
     *
     * @param array $data Dados validados do request.
     * @return array Dados normalizados prontos para persistência.
     */
    protected function sanitizeCursoData(array $data): array
    {
        // Mapear aliases de payload para colunas reais
        // EN: Map payload aliases to actual DB columns
        if (array_key_exists('descricao_curso', $data)) {
            $data['descricao'] = $data['descricao_curso'];
            unset($data['descricao_curso']);
        }
        if (array_key_exists('observacoes', $data)) {
            $data['obs'] = $data['observacoes'];
            unset($data['observacoes']);
        }
        // Remover campo descontinuado
        if (array_key_exists('aeronaves', $data)) {
            unset($data['aeronaves']);
        }

        // Duracao e parcelas como inteiros
        if (isset($data['duracao'])) {
            $data['duracao'] = is_numeric($data['duracao']) ? (int) $data['duracao'] : 0;
        }

        if (array_key_exists('parcelas', $data)) {
            if ($data['parcelas'] === '' || $data['parcelas'] === null) {
                // Remover para permitir default do banco
                unset($data['parcelas']);
            } elseif (is_numeric($data['parcelas'])) {
                $data['parcelas'] = (int) $data['parcelas'];
            }
        }

        // Campos decimais: inscricao, valor, valor_parcela
        foreach (['inscricao', 'valor', 'valor_parcela'] as $field) {
            if (array_key_exists($field, $data)) {
                if ($data[$field] === '' || $data[$field] === null) {
                    $data[$field] = null;
                } else {
                    $data[$field] = $this->parseDecimalBR($data[$field]);
                }
            }
        }

        /**
         * Cover image normalization
         * pt-BR: Move campos de imagem de capa (top-level) para `config.cover`.
         * en-US: Move top-level cover image fields into `config.cover`.
         */
        if (
            array_key_exists('imagem_url', $data) ||
            array_key_exists('imagem_file_id', $data) ||
            array_key_exists('imagem_titulo', $data)
        ) {
            $cfg = is_array($data['config'] ?? null) ? $data['config'] : [];
            $cover = is_array($cfg['cover'] ?? null) ? $cfg['cover'] : [];
            $cover = array_merge($cover, [
                'url' => $data['imagem_url'] ?? ($cover['url'] ?? null),
                'file_id' => $data['imagem_file_id'] ?? ($cover['file_id'] ?? null),
                'title' => $data['imagem_titulo'] ?? ($cover['title'] ?? null),
            ]);
            $cfg['cover'] = $cover;
            $data['config'] = $cfg;
            // Remove campos top-level para evitar inconsistências
            unset($data['imagem_url'], $data['imagem_file_id'], $data['imagem_titulo']);
        }

        return $data;
    }

    /**
     * Converte um número decimal brasileiro (com vírgula) para padrão com ponto.
     * EN: Convert Brazilian decimal string (comma) to dot-separated string.
     *
     * Exemplos:
     * - "0,00" => "0.00"
     * - "1.234,56" => "1234.56"
     * - "1000" => "1000"
     *
     * @param string|int|float $value Valor de entrada.
     * @return string Valor em string com ponto como separador decimal.
     */
    protected function parseDecimalBR($value): string
    {
        if (is_numeric($value)) {
            return (string) $value;
        }
        // Remover separadores de milhar e trocar vírgula por ponto
        $normalized = str_replace(['.', ','], ['', '.'], (string) $value);
        // Garantir duas casas quando há parte decimal
        if (preg_match('/^\d+\.\d+$/', $normalized)) {
            return $normalized;
        }
        // Sem parte decimal, retorna como está
        return $normalized;
    }

    /**
     * PT: Converte flag de ativo do payload ('s','n', true/false, '1','0') em boolean.
     * EN: Normalize payload active flag ('s','n', true/false, '1','0') to boolean.
     */
    private function normalizeActiveFlag($value): bool
    {
        if (is_bool($value)) return $value;
        $v = is_string($value) ? strtolower(trim($value)) : $value;
        if ($v === 's' || $v === '1' || $v === 1) return true;
        if ($v === 'n' || $v === '0' || $v === 0) return false;
        if ($v === 'true') return true;
        if ($v === 'false') return false;
        // default para ativo
        return true;
    }

    /**
     * PT: Converte boolean em post_status (publish/draft).
     * EN: Convert boolean to post_status (publish/draft).
     */
    private function get_status($active): string
    {
        return $active ? 'publish' : 'draft';
    }

    /**
     * PT: Upsert de módulos e suas atividades vinculadas a um curso.
     * EN: Upsert modules and their activities linked to a course.
     *
     * - Usa `module_id` para atualizar módulos existentes e evita duplicação.
     * - Para atividades, usa `id` quando presente para atualizar.
     * - Sempre define `post_parent` do módulo para o ID do curso e das atividades para o ID do módulo.
     * - Retorna o array de módulos atualizado com `module_id` e `id` das atividades preenchidos.
     *
     * @param array $modulesPayload Lista de módulos do payload.
     * @param Curso $curso Curso alvo.
     * @param string $authorId Autor (usuário autenticado, UUID como string).
     * @return array Estrutura de módulos para persistir em `cursos.modulos`.
     */
    private function upsertModulesAndActivities(array $modulesPayload, Curso $curso, string $authorId): array
    {
        $result = [];

        foreach ($modulesPayload as $mod) {
            if (!is_array($mod)) { continue; }
            $moduleId = isset($mod['module_id']) && is_numeric($mod['module_id']) ? (int) $mod['module_id'] : null;

            $mappedModule = [
                'post_title' => $mod['title'] ?? '',
                'post_excerpt' => $mod['description'] ?? '',
                'post_content' => is_string($mod['content'] ?? '') ? ($mod['content'] ?? '') : json_encode($mod['content'] ?? ''),
                'post_status' => $this->get_status($this->normalizeActiveFlag($mod['active'] ?? 's')),
                'post_parent' => (int) $curso->id,
                'config' => [
                    'tipo_duracao' => $mod['tipo_duracao'] ?? null,
                    'duration' => $mod['duration'] ?? null,
                ],
                'post_type' => 'modules',
                'token' => Qlib::token(),
                'post_author' => $authorId,
                'comment_status' => 'closed',
                'ping_status' => 'closed',
                'menu_order' => 0,
                'to_ping' => 's',
                'excluido' => 'n',
                'deletado' => 'n',
            ];
            // slug opcional
            if (!empty($mod['name'] ?? '')) {
                $mappedModule['post_name'] = (new Module())->generateSlug($mod['name']);
            } elseif (!empty($mod['title'] ?? '')) {
                $mappedModule['post_name'] = (new Module())->generateSlug($mod['title']);
            }

            // Upsert módulo
            $moduleModel = null;
            if ($moduleId) {
                $moduleModel = Module::updateOrCreate(['ID' => $moduleId], $mappedModule);
                $moduleId = (int) $moduleModel->ID;
            } else {
                $moduleModel = Module::create($mappedModule);
                $moduleId = (int) $moduleModel->ID;
            }

            // Processar atividades ou activities
            // dump($mod);
            $activitiesPayload = is_array($mod['atividades'] ?? null) ? $mod['atividades'] : (is_array($mod['activities'] ?? null) ? $mod['activities'] : []);
            $activitiesResult = [];
            // dd($activitiesPayload);
            foreach ($activitiesPayload as $act) {
                if (!is_array($act)) { continue; }
                $activityId = isset($act['id']) && is_numeric($act['id']) ? (int) $act['id'] : null;
                if(!$activityId){
                    $activityId = isset($act['activity_id']) && is_numeric($act['activity_id']) ? (int) $act['activity_id'] : $activityId;
                }

                $mappedActivity = [
                    'post_title' => $act['title'] ?? '',
                    'post_excerpt' => $act['description'] ?? '',
                    'post_content' => is_string($act['content'] ?? '') ? ($act['content'] ?? '') : json_encode($act['content'] ?? ''),
                    'post_status' => $this->get_status($this->normalizeActiveFlag($act['active'] ?? 's')),
                    'post_parent' => $moduleId,
                    'config' => [
                        'type_activities' => $act['type_activities'] ?? null,
                        'type_duration' => $act['type_duration'] ?? null,
                        'duration' => $act['duration'] ?? null,
                    ],
                    'post_type' => 'activities',
                    'token' => Qlib::token(),
                    'post_author' => $authorId,
                    'comment_status' => 'closed',
                    'ping_status' => 'closed',
                    'menu_order' => 0,
                    'to_ping' => 's',
                    'excluido' => 'n',
                    'deletado' => 'n',
                ];
                if (!empty($act['name'] ?? '')) {
                    $mappedActivity['post_name'] = (new Activity())->generateSlug($act['name']);
                } elseif (!empty($act['title'] ?? '')) {
                    $mappedActivity['post_name'] = (new Activity())->generateSlug($act['title']);
                }

                // Upsert atividade
                $activityModel = null;
                if ($activityId) {
                    $activityModel = Activity::updateOrCreate(['ID' => $activityId], $mappedActivity);
                    $activityId = (int) $activityModel->ID;
                } else {
                    $activityModel = Activity::create($mappedActivity);
                    $activityId = (int) $activityModel->ID;
                }

                // Monta retorno da atividade com ID
                $activitiesResult[] = array_merge($act, [ 'id' => $activityId ]);
            }

            // Salvar estrutura reutilizável das atividades dentro do módulo (template)
            // EN: Persist reusable activities structure inside module config for future reuse
            try {
                $template = $this->buildActivityTemplate($activitiesPayload);
                $existingConfig = is_array($moduleModel->config ?? null) ? $moduleModel->config : [];
                $moduleModel->config = array_merge($existingConfig, [ 'atividades_template' => $template ]);
                $moduleModel->save();
            } catch (\Throwable $e) {
                // Silencioso: não bloquear a gravação do curso por falha no template
            }

            // Módulo com module_id preenchido e atividades ajustadas
            $result[] = array_merge($mod, [
                'module_id' => $moduleId,
                'atividades' => $activitiesResult,
            ]);
        }

        return $result;
    }

    /**
     * PT: Constrói um template reutilizável a partir do payload das atividades de um módulo.
     *     Remove campos voláteis (id, status runtime) e mantém estrutura essencial.
     * EN: Build a reusable template from module activities' payload,
     *     removing volatile fields and preserving the essential structure.
     */
    private function buildActivityTemplate(array $activitiesPayload): array
    {
        $template = [];
        foreach ($activitiesPayload as $act) {
            if (!is_array($act)) { continue; }
            $template[] = [
                'name' => $act['name'] ?? null,
                'title' => $act['title'] ?? null,
                'description' => $act['description'] ?? null,
                'content' => $act['content'] ?? null,
                'active' => $this->normalizeActiveFlag($act['active'] ?? 's'),
                'config' => [
                    'type_activities' => $act['type_activities'] ?? null,
                    'type_duration' => $act['type_duration'] ?? null,
                    'duration' => $act['duration'] ?? null,
                ],
            ];
        }
        return $template;
    }

    /**
     * Excluir um curso pelo id.
     * Exige autenticação e permissão de exclusão.
     *
     * Comportamento:
     * - Por padrão, marca o curso como excluído (lixeira) sem remover do banco.
     * - Se for passado `force=true` na query, executa exclusão permanente.
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

        $curso = Curso::find($id);
        if (!$curso) {
            return response()->json(['error' => 'Curso não encontrado'], 404);
        }

        // Se a query tiver force=true, exclui definitivamente
        $force = filter_var($request->input('force', false), FILTER_VALIDATE_BOOLEAN);
        if ($force) {
            $curso->delete();
            return response()->json([
                'message' => 'Curso excluído permanentemente',
            ], 200);
        }

        // Caso contrário, marca como excluído (lixeira)
        $registro = [
            'por' => (string) $user->id,
            'ip' => $request->ip(),
            'data' => now()->toISOString(),
        ];
        $curso->update([
            'excluido' => 's',
            'deletado' => 's',
            'excluido_por' => (string) $user->id,
            'deletado_por' => (string) $user->id,
            'reg_excluido' => $registro,
            'reg_deletado' => $registro,
        ]);

        return response()->json([
            'message' => 'Curso movido para a lixeira',
            'data' => $curso->fresh(),
        ], 200);
    }

    /**
     * Listar cursos na lixeira (marcados como excluídos/deletados).
     */
    public function trash(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $perPage = (int) $request->input('per_page', 15);
        $query = Curso::withoutGlobalScope('notDeleted')
            ->where(function($q) {
                $q->where('deletado', 's')->orWhere('excluido', 's');
            });

        if ($search = $request->string('q')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('nome', 'like', "%{$search}%")
                  ->orWhere('titulo', 'like', "%{$search}%");
            });
        }

        $cursos = $query->orderByDesc('updated_at')->paginate($perPage);
        return response()->json($cursos);
    }

    /**
     * Restaurar curso da lixeira.
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

        $curso = Curso::withoutGlobalScope('notDeleted')
            ->where('id', $id)
            ->where(function($q) {
                $q->where('deletado', 's')->orWhere('excluido', 's');
            })
            ->first();

        if (!$curso) {
            return response()->json(['error' => 'Curso não encontrado na lixeira'], 404);
        }

        $curso->update([
            'excluido' => 'n',
            'deletado' => 'n',
            'reg_excluido' => null,
            'reg_deletado' => null,
            'excluido_por' => null,
            'deletado_por' => null,
        ]);

        return response()->json([
            'message' => 'Curso restaurado com sucesso',
            'data' => $curso->fresh(),
        ], 200);
    }

    /**
     * Exclusão permanente de um curso que está na lixeira.
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

        $curso = Curso::withoutGlobalScope('notDeleted')
            ->where('id', $id)
            ->where(function($q) {
                $q->where('deletado', 's')->orWhere('excluido', 's');
            })
            ->first();

        if (!$curso) {
            return response()->json(['error' => 'Curso não encontrado na lixeira'], 404);
        }

        $curso->delete();

        return response()->json([
            'message' => 'Curso excluído permanentemente com sucesso',
        ], 200);
    }
}
