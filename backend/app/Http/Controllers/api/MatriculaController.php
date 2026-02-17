<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Curso;
use App\Models\Matricula;
use App\Models\Parcelamento;
use App\Models\Turma;
use App\Models\User;
use App\Services\PermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use App\Services\Qlib;
// Import removido: Str não é mais necessário

class MatriculaController extends Controller
{
    protected PermissionService $permissionService;
    public $default_funil_vendas_id;
    public $default_etapa_vendas_id;
    public $default_proposal_situacao_id;

    public function __construct()
    {
        $this->permissionService = new PermissionService();
        $this->default_funil_vendas_id = Qlib::qoption('default_funil_vendas_id');
        $this->default_etapa_vendas_id = Qlib::qoption('default_etapa_vendas_id');
        $this->default_proposal_situacao_id = Qlib::qoption('default_proposal_situacao_id');
    }
    //metodo para verificar se um usuario é cliente ou administrador
    private function isClient($user): bool
    {
        if($user['permission_id'] == (new ClientController())->cliente_permission_id){
            return true;
        }else{
            return false;
        }
    }
    /**
     * Lista matriculas com filtros simples e paginação.
     * List enrollments with basic filters and pagination.
     *
     * Filtros suportados via query:
     * - id_cliente, id_curso, id_responsavel, id_consultor, id_turma, status, funnel_id, stage_id|etapa
     * - course (nome ou tipo do curso, parcial), student (nome do usuário, parcial)
     * - search (trecho em descricao)
     *
     * Observação: colunas de filtro da tabela matriculas são sempre qualificadas
     * (ex.: matriculas.id_curso) para evitar ambiguidade em JOINs com cursos/turmas.
     *
     * PT: Suporta listar matrículas com `id_turma = 0` usando LEFT JOIN em turmas.
     * EN: Supports listing enrollments with `id_turma = 0` via LEFT JOIN on turmas.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        // se o usuario não for um cliente valida permissão de view para ver as matriculas de todos os clientes
        if(!$this->isClient($user)){

            if (!$this->permissionService->isHasPermission('view')) {
                return response()->json(['error' => 'Acesso negado'], 403);
            }
        }
        $perPage = (int)($request->input('per_page', 10));
        $orderBy = $request->input('order_by', 'data');
        $order = $request->input('order', 'desc');
        // Qualificar coluna de ordenação para evitar ambiguidade em JOINs
        $orderByQualified = match ($orderBy) {
            'data' => 'matriculas.data',
            'curso_nome' => 'cursos.nome',
            'turma_nome' => 'turmas.nome',
            'cliente_nome' => 'users.name',
            default => $orderBy,
        };

        $query = Matricula::join('cursos', 'matriculas.id_curso', '=', 'cursos.id')
            // LEFT JOIN permite incluir registros com id_turma = 0 (sem turma associada)
            ->leftJoin('turmas', 'matriculas.id_turma', '=', 'turmas.id')
            ->leftJoin('users', 'matriculas.id_cliente', '=', 'users.id')
            ->leftJoin('posts', 'matriculas.situacao_id', '=', 'posts.id')
           ->select('matriculas.*', 'cursos.nome as curso_nome','cursos.tipo as curso_tipo', 'turmas.nome as turma_nome', 'users.name as cliente_nome', 'posts.post_title as situacao','cursos.slug as curso_slug','cursos.config as curso_config')
            ->orderBy($orderByQualified, $order);
        // pt-BR: Reforça o escopo para segurança e acesso universal na área do aluno (public=1).
        // en-US: Reinforce scope for security and universal access in the student area (public=1).
        $isStandardClient = $this->isClient($user);
        $isStudentArea = $request->input('public') === '1';

        if ($isStandardClient || $isStudentArea) {
            $query->where('matriculas.id_cliente', $user->id);
        }
        // Mapear alias de filtro: 'etapa' -> 'stage_id'
        $stageFilter = $request->filled('stage_id')
            ? $request->input('stage_id')
            : ($request->filled('etapa') ? $request->input('etapa') : null);
        // se tiver um filtro do campos situacao então de ser feito um join com a tabela posts e filtra post_name = a situação do filtro
        //converte cursos_config de json para array
        // $query->selectRaw('JSON_UNQUOTE(cursos_config) as curso_config');
        // dd($request->filled('situacao'));
        if ($request->filled('situacao')) {
            // $query->join('posts', 'matriculas.situacao_id', '=', 'posts.id');
            if($request->input('situacao') == 'mat'){
                $query->where('posts.post_name','!=', 'int');
            }else{
                 $query->where('posts.post_name', $request->input('situacao'));
            }
        }
        // Qualificar colunas para evitar ambiguidade: sempre usar prefixo da tabela
        $filterColumnMap = [
            'id_cliente'    => 'matriculas.id_cliente',
            'id_curso'      => 'matriculas.id_curso',
            'id_responsavel'=> 'matriculas.id_responsavel',
            'id_consultor'  => 'matriculas.id_consultor',
            'id_turma'      => 'matriculas.id_turma',
            'situacao_id'   => 'matriculas.situacao_id',
            'status'        => 'matriculas.status',
            'ativo'         => 'matriculas.ativo',
            'funnel_id'     => 'matriculas.funnel_id',
        ];
        foreach ($filterColumnMap as $field => $column) {
            if ($request->filled($field)) {
                $query->where($column, $request->input($field));
            }
        }
        if ($stageFilter !== null) {
            $query->where('matriculas.stage_id', $stageFilter);
        }

        // Filtro genérico por descrição da matrícula, nome do aluno, curso ou ID
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('matriculas.descricao', 'like', "%$search%")
                  ->orWhere('users.name', 'like', "%$search%")
                  ->orWhere('cursos.nome', 'like', "%$search%")
                  ->orWhere('matriculas.id', 'like', "%$search%");
            });
        }

        // Filtro por curso: nome ou tipo (parcial)
        // EN: Filter by course: name or type (partial match)
        if ($request->filled('course')) {
            $courseTerm = trim((string)$request->input('course'));
            if ($courseTerm !== '') {
                $query->where(function($q) use ($courseTerm) {
                    $q->where('cursos.nome', 'like', "%$courseTerm%")
                      ->orWhere('cursos.tipo', 'like', "%$courseTerm%");
                });
            }
        }

        // Filtro por aluno/estudante: nome do usuário (parcial)
        // EN: Filter by student: user name (partial match)
        if ($request->filled('student')) {
            $studentTerm = trim((string)$request->input('student'));
            if ($studentTerm !== '') {
                $query->where('users.name', 'like', "%$studentTerm%");
            }
        }

        $items = $query->paginate($perPage);
        // Anexar metacampos a cada item paginado
        $items->getCollection()->transform(function ($item) {
            $item->meta = $this->getAllMatriculaMeta($item->id);
            //converte curso_config de json para array
            $item->curso_config = json_decode($item->curso_config, true);
            return $item;
        });
        return response()->json($items);
    }
    /**
     * Metodos para o mapeamento de campos de entrada
     */
    private function mapFields(Request $request): array
    {
        $data = $request->all();

        // Mapear alias de campo: 'etapa' -> 'stage_id'
        if (array_key_exists('etapa', $data) && !array_key_exists('stage_id', $data)) {
            $data['stage_id'] = $data['etapa'];
            unset($data['etapa']);
        }

        return $data;
    }
    /**
     * Mapeia campos de saída: 'stage_id' -> 'etapa'
     */
    private function mapOutputFields(array $data): array
    {
        // Mapear alias de campo: 'stage_id' -> 'etapa'
        if (array_key_exists('stage_id', $data) && !array_key_exists('etapa', $data)) {
            $data['etapa'] = $data['stage_id'];
            unset($data['stage_id']);
        }
        //expoe os dados do cadastro do cliente na matrícula
        if(isset($data['id_cliente'])){
            $cliente = User::find($data['id_cliente']);
            $data['cliente'] = $cliente ? $cliente->toArray() : null;
        }
        //expoe os dados do cadastro do curso na matrícula
        if(isset($data['id_curso'])){
            $curso = Curso::find($data['id_curso']);
            $data['curso'] = $curso ? $curso->toArray() : null;
        }
        //expoe os dados do cadastro do responsável na matrícula
        if(isset($data['id_responsavel'])){
            $responsavel = User::find($data['id_responsavel']);
            $data['responsavel'] = $responsavel ? $responsavel->toArray() : null;
        }
        //expoe os dados do cadastro da turma na matrícula
        if(isset($data['id_turma'])){
            $turma = Turma::find($data['id_turma']);
            $data['turma'] = $turma ? $turma->toArray() : null;
        }

        return $data;
    }

    /**
     * Extrai metacampos do request.
     * EN: Extract meta fields from the request.
     *
     * Aceita:
     * - Campo raiz `meta` como array ou JSON string
     * - Chaves avulsas com prefixo `meta_` (ex.: `meta_origem`)
     * Retorna array `meta_key => meta_value`.
     */
    private function extractMetaFromRequest(Request $request): array
    {
        $meta = [];

        // Campo raiz "meta"
        if ($request->has('meta')) {
            $raw = $request->input('meta');
            if (is_array($raw)) {
                $meta = $raw;
            } elseif (is_string($raw) && trim($raw) !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    $meta = $decoded;
                }
            }
        }

        // Prefixo meta_
        foreach ($request->all() as $key => $value) {
            if (is_string($key) && str_starts_with($key, 'meta_')) {
                $cleanKey = substr($key, 5);
                if ($cleanKey === '') {
                    continue;
                }
                $meta[$cleanKey] = $value;
            }
        }

        // Normalizar valores: arrays -> JSON, strings aparadas
        $normalized = [];
        foreach ($meta as $k => $v) {
            $normalized[$k] = is_array($v) ? json_encode($v) : (is_string($v) ? trim($v) : $v);
        }

        return $normalized;
    }

    /**
     * Persiste metacampos para matrícula usando Qlib::update_matriculameta.
     * EN: Persist meta fields for enrollment via Qlib::update_matriculameta.
     */
    private function persistMatriculaMeta(int|string $matriculaId, array $meta): void
    {
        if (!$matriculaId || empty($meta)) {
            return;
        }
        foreach ($meta as $metaKey => $metaValue) {
            if ($metaKey !== null && $metaKey !== '' && $metaValue !== null && $metaValue !== '') {
                Qlib::update_matriculameta($matriculaId, $metaKey, (string) $metaValue);
            }
        }
    }

    /**
     * Carrega todos os metacampos de uma matrícula e retorna como array associativo.
     * EN: Load all meta fields for an enrollment and return as associative array.
     */
    private function getAllMatriculaMeta(int|string $matriculaId): array
    {
        $out = [];
        if (!$matriculaId) {
            return $out;
        }
        $rows = DB::table('matriculameta')
            ->where('matricula_id', $matriculaId)
            ->select('meta_key', 'meta_value')
            ->get();
        foreach ($rows as $row) {
            $val = $row->meta_value;
            $decoded = null;
            if (is_string($val)) {
                $trimmed = trim($val);
                if ($trimmed !== '') {
                    $decoded = json_decode($trimmed, true);
                }
            }
            $out[$row->meta_key] = is_array($decoded) ? $decoded : $val;
        }
        return $out;
    }

    /**
     * Valida dados do cadastro de matrícula (store/update base).
     * Validate enrollment payload (store/update base).
     */
    private function rules(bool $update = false): array
    {
        $base = [
            // IDs devem existir nas tabelas correspondentes.
            // Valida diretamente em users com permission_id = 7.
            'id_cliente' => [$update ? 'sometimes' : 'required', 'uuid', 'exists:users,id,permission_id,7'],
            'id_curso' => [$update ? 'sometimes' : 'required', 'integer', 'exists:cursos,id'],
            'id_responsavel' => ['nullable', 'uuid'],
            'id_consultor' => ['nullable', 'uuid'],
            // Permitir salvar com turma = 0.
            // EN: Allow saving with class (turma) = 0.
            'id_turma' => [
                $update ? 'sometimes' : 'required',
                'integer',
                function ($attribute, $value, $fail) {
                    $intVal = (int) $value;
                    if ($intVal === 0) {
                        return; // 0 é permitido sem validação de existência
                    }
                    if (!\App\Models\Turma::where('id', $intVal)->exists()) {
                        $fail('O campo id turma selecionado é inválido.');
                    }
                },
            ],
            // Situação da matrícula: referência para posts (situacao_matricula)
            'situacao_id' => ['nullable', 'integer', Rule::exists('posts','ID')->where(function($q){ $q->where('post_type','situacao_matricula'); })],
            'descricao' => ['nullable', 'string'],
            // Status da matrícula: 'a' (Atendimento), 'g' (Ganho), 'p' (Perda)
            // EN: Enrollment status: 'a' (Attendance), 'g' (Won), 'p' (Lost)
            'status' => ['nullable', 'string', Rule::in(['a','g','p'])],
            // Ativo: 's' (ativo) ou 'n' (inativo). Opcional no store, às vezes no update.
            'ativo' => [$update ? 'sometimes' : 'nullable', 'string', Rule::in(['s','n'])],
            'config' => ['nullable', 'array'],
            'tags' => ['nullable', 'array'],
            'stage_id' => ['nullable', 'integer', 'exists:stages,id'],
            'funnel_id' => ['nullable', 'integer'],
            'desconto' => ['nullable', 'numeric'],
            'combustivel' => ['nullable', 'numeric'],
            'subtotal' => ['nullable', 'numeric'],
            'total' => ['nullable', 'numeric'],
            'orc'   => ['nullable', 'array'],
            // Parcelamentos vinculados ao curso da matrícula (máximo 2)
            'parcelamento_ids' => ['nullable', 'array', 'max:2'],
            'parcelamento_ids.*' => ['integer', 'exists:parcelamentos,id'],
        ];

        return $base;
    }

    /**
     * Verifica se um valor parece ser um UUID (v4).
     * Checks whether a value looks like a UUID (v4).
     */
    // Função removida: não usamos mais UUID para users.id

    /**
     * Normaliza payload: mapeia aliases (etapa -> stage_id) e sanitiza.
     * Normalize payload: map aliases (etapa -> stage_id) and sanitize values.
     */
    private function normalizePayload(array $data): array
    {
        // alias do campo "funnil_id" -> "funnel_id"
        if (array_key_exists('funnil_id', $data) && !array_key_exists('funnel_id', $data)) {
            $data['funnel_id'] = $data['funnil_id'];
            unset($data['funnil_id']);
        }
        // alias do campo "funell_id" -> "funnel_id" (variação)
        if (array_key_exists('funell_id', $data) && !array_key_exists('funnel_id', $data)) {
            $data['funnel_id'] = $data['funell_id'];
            unset($data['funell_id']);
        }
        // alias "Descricao" -> "descricao"
        if (array_key_exists('Descricao', $data) && !array_key_exists('descricao', $data)) {
            $data['descricao'] = $data['Descricao'];
            unset($data['Descricao']);
        }
        // alias "obs" -> "descricao" quando ausente
        if (array_key_exists('obs', $data) && !array_key_exists('descricao', $data)) {
            $data['descricao'] = $data['obs'];
            unset($data['obs']);
        }
        // alias "etapa" -> "stage_id"
        if (array_key_exists('etapa', $data) && !array_key_exists('stage_id', $data)) {
            $data['stage_id'] = $data['etapa'];
            unset($data['etapa']);
        }
        // strings vazias -> null para campos numéricos e chaveados
        foreach (['status','ativo','stage_id','funnel_id','situacao_id'] as $k) {
            if (array_key_exists($k, $data) && is_string($data[$k]) && trim($data[$k]) === '') {
                $data[$k] = null;
            }
        }
        // normalizar situacao_id: '0' ou vazio -> colocalar id da proposta padrão; caso contrário, inteiro

        if (array_key_exists('situacao_id', $data)) {
            $vs = trim((string)$data['situacao_id']);
            if ($vs === '' || $vs === '0') {
                $data['situacao_id'] = $this->default_proposal_situacao_id;
            } elseif (is_numeric($vs)) {
                $data['situacao_id'] = (int)$vs;
            }
        }
        foreach (['desconto','combustivel','subtotal','total'] as $k) {
            if (array_key_exists($k, $data)) {
                $v = $data[$k];
                if (is_string($v)) {
                    $v = str_replace([','], ['.'], trim($v));
                    $data[$k] = ($v === '' ? null : (float)$v);
                }
            }
        }
        // Normalizar id_responsavel: '0' ou vazio -> null
        if (array_key_exists('id_responsavel', $data)) {
            $vr = trim((string)$data['id_responsavel']);
            if ($vr === '' || $vr === '0') {
                $data['id_responsavel'] = null;
            }
        }
        // Normalizar id_turma: aceitar "0" como inteiro 0
        // EN: Normalize id_turma: accept "0" as integer 0
        if (array_key_exists('id_turma', $data)) {
            $vt = trim((string)$data['id_turma']);
            if ($vt === '0') {
                $data['id_turma'] = 0;
            } elseif ($vt !== '') {
                $data['id_turma'] = (int) $vt;
            }
        }
        // Garantir string aparada para id_cliente
        if (array_key_exists('id_cliente', $data)) {
            $data['id_cliente'] = trim((string)$data['id_cliente']);
        }
        // Consolidar extras em config
        $config = [];
        if (array_key_exists('config', $data)) {
            if (is_array($data['config'])) {
                $config = $data['config'];
            } elseif (is_string($data['config']) && $data['config'] !== '') {
                $decoded = json_decode($data['config'], true);
                $config = is_array($decoded) ? $decoded : [];
            }
        }
        if (array_key_exists('consultor', $data)) {
            $config['consultor'] = $data['consultor'];
            unset($data['consultor']);
        }
        if (array_key_exists('situacao', $data)) {
            $config['situacao'] = $data['situacao'];
            unset($data['situacao']);
        }
        if (array_key_exists('inscricao', $data)) {
            $insc = str_replace([','], ['.'], trim((string)$data['inscricao']));
            $config['inscricao'] = ($insc === '' ? null : (float)$insc);
            unset($data['inscricao']);
        }
        if (array_key_exists('token', $data)) {
            $config['token'] = $data['token'];
            unset($data['token']);
        }
        if (array_key_exists('tag[]', $data)) {
            $tags = $data['tag[]'];
            $config['tags'] = is_array($tags) ? $tags : [$tags];
            unset($data['tag[]']);
        }
        $data['config'] = $config;
        return $data;
    }

    /**
     * Cria uma nova matrícula.
     * Create a new enrollment.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        // Antes do validador: capturar metacampos do payload
        $requestMeta = $this->extractMetaFromRequest($request);

        $input = $this->normalizePayload($request->all());
        $validator = Validator::make($input, $this->rules(false));
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }
        $validated = $validator->validated();

        // Pós-validação removida: validação via regra exists já garante integridade

        $matricula = new Matricula();
        // se o funnel_id não foi informado, usar o default
        if (!array_key_exists('funnel_id', $validated)) {
            $matricula->funnel_id = $this->default_funil_vendas_id;
        }
        // se o stage_id não foi informado, usar o default
        if (!array_key_exists('stage_id', $validated)) {
            $matricula->stage_id = $this->default_etapa_vendas_id;
        }
        // se o situacao_id não foi informado, usar o default
        if (!array_key_exists('situacao_id', $validated)) {
            $matricula->situacao_id = $this->default_proposal_situacao_id;
        }



        $matricula->fill($validated);
        $matricula->save();

        // Vincular parcelamentos do curso (até 2), garantindo compatibilidade com o curso da matrícula
        if (array_key_exists('parcelamento_ids', $validated) && is_array($validated['parcelamento_ids'])) {
            $ids = array_unique(array_filter($validated['parcelamento_ids'], fn($v) => is_numeric($v)));
            if (!empty($ids)) {
                $validIds = Parcelamento::whereIn('id', $ids)
                    ->where('id_curso', $matricula->id_curso)
                    ->where('ativo', 's')
                    ->pluck('id')
                    ->all();
                $matricula->parcelamentos()->sync($validIds);
            }
        }

        // Após criação: persistir metacampos capturados
        if (!empty($requestMeta)) {
            $this->persistMatriculaMeta($matricula->id, $requestMeta);
        }

        return response()->json($matricula, 201);
    }

    /**
     * Mostra uma matrícula.
     * Show single enrollment.
     *
     * PT: Suporta `id_turma = 0` usando LEFT JOIN em turmas.
     * EN: Supports `id_turma = 0` via LEFT JOIN on turmas.
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

        $matricula = Matricula::join('cursos', 'matriculas.id_curso', '=', 'cursos.id')
            // LEFT JOIN permite incluir registros com id_turma = 0 (sem turma associada)
            ->leftJoin('turmas', 'matriculas.id_turma', '=', 'turmas.id')
            ->leftJoin('users', 'matriculas.id_cliente', '=', 'users.id')
            ->leftJoin('users as consultores', 'matriculas.id_consultor', '=', 'consultores.id')
            ->leftJoin('posts', 'matriculas.situacao_id', '=', 'posts.id')
            ->select(
                'matriculas.*', 
                'cursos.nome as curso_nome',
                'cursos.tipo as curso_tipo', 
                'turmas.nome as turma_nome', 
                'users.name as cliente_nome',
                'consultores.name as consultor_nome',
                'posts.post_title as situacao'
            )
            ->findOrFail($id);

        $data = $matricula->toArray();
        $data['meta'] = $this->getAllMatriculaMeta($matricula->id);
        // Expor parcelamentos vinculados via pivot
        $data['parcelamentos'] = Parcelamento::join('matricula_parcelamento', 'parcelamentos.id', '=', 'matricula_parcelamento.parcelamento_id')
            ->where('matricula_parcelamento.matricula_id', $matricula->id)
            ->select('parcelamentos.*')
            ->get()
            ->toArray();
        return response()->json($data);
    }

    /**
     * Atualiza uma matrícula existente.
     * Update an existing enrollment.
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

        $matricula = Matricula::findOrFail($id);
        // Antes do validador: capturar e persistir metacampos
        $requestMeta = $this->extractMetaFromRequest($request);
        if (!empty($requestMeta)) {
            $this->persistMatriculaMeta($matricula->id, $requestMeta);
        }
        $input = $this->normalizePayload($request->all());
        $validator = Validator::make($input, $this->rules(true));
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }
        $validated = $validator->validated();

        // Pós-validação removida: validação via regra exists já garante integridade
        $matricula->fill($validated);

        // Verifica mudança de situação para "Matriculado" (post_name inicia com 'mat') e grava data de início da matrícula
        if ($matricula->isDirty('situacao_id') && !empty($matricula->situacao_id)) {
            $newSituacaoName = DB::table('posts')->where('ID', $matricula->situacao_id)->value('post_name');
            if ($newSituacaoName && \Illuminate\Support\Str::startsWith(strtolower($newSituacaoName), 'mat')) {
                // Grava ou atualiza a data de início da matrícula
                Qlib::update_matriculameta($matricula->id, 'dt_inicio_matricula', now()->format('Y-m-d H:i:s'));
            }
        }

        $matricula->save();

        // Sincronizar parcelamentos do curso, se informados
        if (array_key_exists('parcelamento_ids', $validated) && is_array($validated['parcelamento_ids'])) {
            $ids = array_unique(array_filter($validated['parcelamento_ids'], fn($v) => is_numeric($v)));
            if (!empty($ids)) {
                $validIds = Parcelamento::whereIn('id', $ids)
                    ->where('id_curso', $matricula->id_curso)
                    ->where('ativo', 's')
                    ->pluck('id')
                    ->all();
                $matricula->parcelamentos()->sync($validIds);
            }
        }

        return response()->json($matricula);
    }

    /**
     * Exclui uma matrícula com suporte a lixeira e exclusão permanente.
     * Delete an enrollment, supporting trash (soft delete) and force delete.
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

        $matricula = Matricula::find($id);
        if (!$matricula) {
            return response()->json(['error' => 'Matrícula não encontrada'], 404);
        }

        // Se a query tiver force=true, exclui definitivamente
        $force = filter_var($request->input('force', false), FILTER_VALIDATE_BOOLEAN);
        if ($force) {
            $matricula->delete();
            return response()->json([
                'message' => 'Matrícula excluída permanentemente',
            ], 200);
        }

        // Caso contrário, marca como excluída (lixeira) usando flags customizadas
        $registro = [
            'por' => (string) $user->id,
            'ip' => $request->ip(),
            'data' => now()->toISOString(),
        ];
        $matricula->update([
            'excluido' => 's',
            'deletado' => 's',
            'excluido_por' => (string) $user->id,
            'deletado_por' => (string) $user->id,
            'reg_excluido' => $registro,
            'reg_deletado' => $registro,
        ]);

        return response()->json([
            'message' => 'Matrícula movida para a lixeira',
            'data' => $matricula->fresh(),
        ], 200);
    }
}
