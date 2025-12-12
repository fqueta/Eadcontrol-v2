<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\DashboardMetric;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Env;
use DateTime;

class MetricasController extends Controller
{
    protected PermissionService $permissionService;
    public $routeName;
    public $sec;
    protected $token_api_aeroclube;
    protected $url_api_aeroclube;
    public function __construct()
    {
        $this->routeName = request()->route()->getName();
        $this->permissionService = new PermissionService();
        $this->sec = request()->segment(3);
        $this->token_api_aeroclube = Qlib::qoption('token_api_aeroclube') ?? env('TOKEN_API_AEROCLOUBE','');
        $this->url_api_aeroclube = Qlib::qoption('url_api_aeroclube') ?? env('URL_API_AEROCLOUBE','');
    }
    public function index(Request $request)
    {
        // return DashboardMetric::all();
        $query = DashboardMetric::query();

        if ($request->filled('year')) {
            $query->whereYear('period', $request->year);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('investment', 'like', "%$search%")
                ->orWhere('visitors', 'like', "%$search%")
                ->orWhere('proposals', 'like', "%$search%")
                ->orWhere('closed_deals', 'like', "%$search%");
            });
        }

        return response()->json($query->paginate(10));
    }
    public function filter(Request $request)
    {
        $query = DashboardMetric::query();
        $order_by = $request->input('order_by', 'created_at');
        $order = $request->input('order', 'desc');

        // filtros opcionais
        if ($request->filled('ano')) {
            $query->whereYear('period', $request->ano);
        }
        if ($request->filled('mes')) {
            $query->whereMonth('period', $request->mes);
        }
        if ($request->filled('semana')) {
            $query->whereRaw('WEEK(period, 1) = ?', [$request->semana]); // semana ISO
        }
        if ($request->filled('data_inicio') && $request->filled('data_fim')) {
            $query->whereBetween('period', [$request->data_inicio, $request->data_fim]);
        }

        // registros detalhados filtrados
        $registros = $query->orderBy($order_by,$order)->get();

        // ano alvo (default = ano atual)
        $ano = $request->ano ?? now()->year;
        $conversasPorMes = [];
        // agrupamento por mês
        $porMes = DashboardMetric::selectRaw('MONTH(period) as mes, SUM(visitors) as total_visitors')
            ->whereYear('period', $ano)
            ->groupBy('mes')
            ->orderBy('mes')
            ->get();
        if ($request->filled('data_inicio') && $request->filled('data_fim')) {
            // agrupamento por semana
            $porSemana = DashboardMetric::selectRaw('WEEK(period, 1) as semana, SUM(visitors) as total_visitors')
                // ->whereYear('period', $ano)
                ->whereBetween('period', [$request->data_inicio, $request->data_fim])
                ->groupBy('semana')
                ->orderBy('semana')
                ->get();
            $conversasPorMes = DashboardMetric::selectRaw('WEEK(period, 1) as semana, SUM(human_conversations) as total_human_conversations')
                // ->whereYear('period', $ano)
                ->whereBetween('period', [$request->data_inicio, $request->data_fim])
                ->groupBy('semana')
                ->orderBy('semana')
                ->get();
        }else{
            $porSemana = DashboardMetric::selectRaw('WEEK(period, 1) as semana, SUM(visitors) as total_visitors')
                ->whereYear('period', $ano)
                ->groupBy('semana')
                ->orderBy('semana')
                ->get();
        }
        // agrupamento por ano
        $porAno = DashboardMetric::selectRaw('YEAR(period) as ano, SUM(visitors) as total_visitors')
            ->groupBy('ano')
            ->orderBy('ano')
            ->get();


        // 🔹 Totais agregados com base nos mesmos filtros aplicados
        $agregado = DashboardMetric::query();

        if ($request->filled('ano')) {
            $agregado->whereYear('period', $request->ano);
        }
        if ($request->filled('mes')) {
            $agregado->whereMonth('period', $request->mes);
        }
        if ($request->filled('semana')) {
            $agregado->whereRaw('WEEK(period, 1) = ?', [$request->semana]);
        }
        if ($request->filled('data_inicio') && $request->filled('data_fim')) {
            $agregado->whereBetween('period', [$request->data_inicio, $request->data_fim]);
        }


       $totaisFiltrados = $agregado->selectRaw("
            SUM(bot_conversations) as total_bot_conversations,
            SUM(human_conversations) as total_human_conversations,
            SUM(closed_deals) as total_closed_deals,
            SUM(investment) as total_investment,
            SUM(proposals) as total_proposals,
            SUM(visitors) as total_visitors
        ")->first();

        // Calcular variações percentuais
        $variacoes = $this->calcularVariacoes($request);

        return response()->json([
            'registros' => $registros,
            'agregados' => [
                'visitas'=>[
                   'por_mes' => $porMes,
                   'por_semana' => $porSemana,
                   'por_ano' => $porAno,
                ],
                'conversas'=>[
                   // 'por_mes' => $porMes,
                   'por_semana' => $conversasPorMes,
                   // 'por_ano' => $porAno,
               ]
            ],
            'totais_filtrados' => $totaisFiltrados, // 👈 sempre retorna baseado no filtro aplicado
            'variacoes' => $variacoes
        ]);
    }

    /**
     * Calcula as variações percentuais baseadas nos filtros aplicados
     *
     * @param Request $request
     * @param string|null $dataInicio
     * @param string|null $dataFim
     * @return array
     */
    private function calcularVariacoes(Request $request, $dataInicio = null, $dataFim = null)
    {
        $agregado = DashboardMetric::query();

        // Usar datas específicas se fornecidas, senão usar filtros da request
        if ($dataInicio && $dataFim) {
            $agregado->whereBetween('period', [$dataInicio, $dataFim]);
        } else {
            // Aplicar filtros da request
            if ($request->filled('ano')) {
                $agregado->whereYear('period', $request->ano);
            }
            if ($request->filled('mes')) {
                $agregado->whereMonth('period', $request->mes);
            }
            if ($request->filled('semana')) {
                $agregado->whereRaw('WEEK(period, 1) = ?', [$request->semana]);
            }
            if ($request->filled('data_inicio') && $request->filled('data_fim')) {
                $agregado->whereBetween('period', [$request->data_inicio, $request->data_fim]);
            }
        }

        $totais = $agregado->selectRaw("
            SUM(bot_conversations) as total_bot_conversations,
            SUM(human_conversations) as total_human_conversations,
            SUM(closed_deals) as total_closed_deals,
            SUM(investment) as total_investment,
            SUM(proposals) as total_proposals,
            SUM(visitors) as total_visitors
        ")->first();

        $variacoes = [
            'taxa_fechamento' => 0,
            'cpf' => 0,
            'propostas' => 0,
            'conversas_humanas' => 0,
            'taxa_transbordo' => 0
        ];

        if ($totais) {
            // Taxa de fechamento: (closed_deals / proposals) * 100
            if ($totais->total_proposals > 0) {
                $variacoes['taxa_fechamento'] = round(($totais->total_closed_deals / $totais->total_proposals) * 100, 1);
            }

            // CPF: investment / closed_deals
            if ($totais->total_closed_deals > 0) {
                $variacoes['cpf'] = round($totais->total_investment / $totais->total_closed_deals, 1);
            }

            // Taxa de transbordo: (human_conversations / bot_conversations) * 100
            if ($totais->total_bot_conversations > 0) {
                $variacoes['taxa_transbordo'] = round(($totais->total_human_conversations / $totais->total_bot_conversations) * 100, 1);
            }

            // Porcentagem de propostas (assumindo base de visitors)
            if ($totais->total_visitors > 0) {
                $variacoes['propostas'] = round(($totais->total_proposals / $totais->total_visitors) * 100, 1);
            }

            // Porcentagem de conversas humanas (assumindo base de bot_conversations)
            if ($totais->total_bot_conversations > 0) {
                $variacoes['conversas_humanas'] = round(($totais->total_human_conversations / $totais->total_bot_conversations) * 100, 1);
            }
        }

        return $variacoes;
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if(!$user){
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $validator = Validator::make($request->all(), [
            'period' => 'required|string|max:50',
            'investment' => 'required|numeric',
            'visitors' => 'required|integer',
            'bot_conversations' => 'required|integer',
            'human_conversations' => 'required|integer',
            'proposals' => 'required|integer',
            'closed_deals' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'exec'    => false,
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        // $data = $request->validate();

        $metric = DashboardMetric::create([
            ...$data,
            'user_id' => Auth::id(), // se vinculado ao usuário logado
        ]);

        return response()->json($metric, 201);
    }

    public function show(DashboardMetric $dashboardMetric)
    {
        return $dashboardMetric;
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
        $metric = DashboardMetric::find($id);
        // dd($metric->count());

        if (!$metric->count()) {
            return response()->json(['message' => 'Cadastro não encontrada'], 404);
        }

        $validator = Validator::make($request->all(), [
            'period' => 'sometimes|string|max:50',
            'investment' => 'sometimes|numeric',
            'visitors' => 'sometimes|integer',
            'bot_conversations' => 'sometimes|integer',
            'human_conversations' => 'sometimes|integer',
            'proposals' => 'sometimes|integer',
            'closed_deals' => 'sometimes|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }
        $data = $validator->validated();
        $dashboardMetric = DashboardMetric::where('id',$id)->update($data);

        return response()->json($dashboardMetric,201);
    }

    public function destroy($id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $metric = DashboardMetric::find($id);

        if (!$metric) {
            return response()->json(['message' => 'Cadastro não encontrada'], 404);
        }
        try {
            $dashboardMetric = DashboardMetric::where('id',$id)->delete();
            return response()->json(['exec'=>true,'data'=>$dashboardMetric,'message'=>'Registro deletado com sucesso!!'], 200);
        } catch (\Throwable $th) {
            return response()->json(['message' => 'Erro ao excluir'], 400);
        }
    }
     /**
     * Importa dados da API externa do Aeroclube e salva na tabela dashboard_metrics
     */
    public function importFromAeroclube(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        // Validação dos parâmetros
        $validator = Validator::make($request->all(), [
            'ano' => 'nullable|integer|min:2020|max:2030',
            'inicio' => 'nullable',
            'fim' => 'nullable',
            'numero' => 'nullable|integer|min:1|max:53',
            'tipo' => 'nullable|string|in:semana,mes,ano'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        try {
            // Fazer requisição para a API externa com autenticação
            // dd($this->token_api_aeroclube,$this->url_api_aeroclube);
            if(isset($validated['ano']) && isset($validated['numero']) && isset($validated['tipo'])){
                $response = Http::timeout(30)
                    ->withToken($this->token_api_aeroclube)
                    ->get($this->url_api_aeroclube, [
                        'ano' => $validated['ano'],
                        'numero' => $validated['numero'],
                        'tipo' => $validated['tipo']
                    ]);
            }
            if(isset($validated['inicio']) && isset($validated['fim'])){
                $response = Http::timeout(30)
                    ->withToken($this->token_api_aeroclube)
                    ->get($this->url_api_aeroclube, [
                    'inicio' => $validated['inicio'],
                    'fim' => $validated['fim'],
                ]);
            }

            // dd($response->json());
            if (!$response->successful()) {
                Log::error('Erro na requisição para API do Aeroclube', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return response()->json([
                    'message' => 'Erro ao conectar com a API externa',
                    'status' => $response->status()
                ], 500);
            }
            $data = $response->json();

            // Verificar se a resposta tem a estrutura esperada
            if (!isset($data['data']['detalhado_por_data']) || !is_array($data['data']['detalhado_por_data'])) {
                return response()->json([
                    'message' => 'Formato de dados inválido da API externa'
                ], 422);
            }

            $importedCount = 0;
            $errors = [];

            // Processar cada registro do array detalhado_por_data
            foreach ($data['data']['detalhado_por_data'] as $item) {
                try {
                    // Verificar se já existe um registro para esta data e campaign_id
                    $existingRecord = DashboardMetric::where('period', $item['data'])
                        ->where('campaign_id', 'crm_aeroclube')
                        ->first();

                    $recordData = [
                        'period' => Carbon::parse($item['data'])->format('Y-m-d'),
                        'proposals' => $item['propostas'] ?? 0,
                        'closed_deals' => $item['ganhos'] ?? 0,
                        'human_conversations' => $item['conversas_com_humanos'] ?? 0,
                        'campaign_id' => 'crm_aeroclube',
                        'user_id' => $user->id,
                        'meta' => json_encode([
                            'source' => 'aeroclube_api',
                            'imported_at' => now()->toISOString(),
                            'original_data' => $item
                        ])
                    ];

                    if ($existingRecord) {
                        // Atualizar registro existente
                        $existingRecord->update($recordData);
                    } else {
                        // Criar novo registro
                        DashboardMetric::create($recordData);
                        $importedCount++;
                    }
                } catch (\Exception $e) {
                    $errors[] = [
                        'data' => $item['data'] ?? 'N/A',
                        'error' => $e->getMessage()
                    ];
                    Log::error('Erro ao salvar métrica do Aeroclube', [
                        'item' => $item,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            $response_data = [
                'message' => 'Importação concluída',
                'imported_count' => $importedCount,
                'total_records' => count($data['data']['detalhado_por_data']),
                'periodo_consulta' => $data['data']['periodo_consulta'] ?? null,
                'resumo' => $data['data']['resumo'] ?? null
            ];

            if (!empty($errors)) {
                $response_data['errors'] = $errors;
            }

            return response()->json($response_data, 200);

        } catch (\Exception $e) {
            Log::error('Erro geral na importação do Aeroclube', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Erro interno durante a importação',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    /**
     * Metodo para importar todas as metrica do aeroclube
     * Aeroclube/Interajai/Google Analitcs/Google Ads/Meta ADs
     */
    public function importAllMetrics(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $ret['aeroclube'] = $this->importFromAeroclube($request);
    }
    /**
     * Processar webhooks de métricas
     *
     * @param string|null $endp2
     * @param array $payload
     * @param array $headers
     * @return array
     */
    public function processWebhook(?string $endp2, array $payload, array $headers): array
    {
        switch ($endp2) {
            case 'lp':
                return $this->importLp($payload, $headers);
            default:
                return ['message' => 'Webhook não reconhecido'];
        }
    }
    /**
     * Importa dados de Landing Page com validação e tratamento de erros aprimorados
     *
     * @param array $payload Dados da requisição webhook
     * @return array Resultado da operação
     */
    private function importLp(array $payload, array $headers): array
    {
        try {
            // Validação dos dados obrigatórios
            if (empty($payload['datahora'])) {
                // if(isset($headers['user-agent']) && strpos($headers['user-agent'], 'Aeroclube') !== false){
                //     $payload['datahora'] = date('Y-m-dTH:i:s');
                // }else{
                    return [
                        'success' => false,
                        'message' => 'Campo datahora é obrigatório',
                        'data' => $payload
                    ];
                // }
            }

            if (empty($payload['pagina'])) {
                return [
                    'success' => false,
                    'message' => 'Campo pagina é obrigatório',
                    'data' => $payload
                ];
            }

            // Processamento da data
            $dataHora = explode('T', $payload['datahora']);
            $period = $dataHora[0] ?? null;

            if (!$period || !$this->isValidDate($period)) {
                return [
                    'success' => false,
                    'message' => 'Formato de data inválido',
                    'data' => $payload
                ];
            }

            $lp = trim($payload['pagina']);
            $user = [];

            // Usar transação para garantir consistência
            return DB::transaction(function () use ($period, $lp, $payload, $user) {
                // Buscar ou criar registro existente
                $existingMetric = DashboardMetric::where('period', $period)
                    ->where('campaign_id', $lp)
                    ->first();

                $metaData = [
                    'source' => 'lp',
                    'imported_at' => now()->toISOString(),
                    'original_data' => $payload
                ];

                if ($existingMetric) {
                    // Atualizar registro existente
                    $newVisitors = $existingMetric->visitors + 1;

                    $existingMetric->update([
                        'visitors' => $newVisitors,
                        'proposals' => $payload['propostas'] ?? $existingMetric->proposals,
                        'closed_deals' => $payload['ganhos'] ?? $existingMetric->closed_deals,
                        'meta' => json_encode(array_merge(
                            json_decode($existingMetric->meta ?? '{}', true),
                            $metaData
                        ))
                    ]);

                    // Salvar meta dados do visitante
                    $metaSaved = Qlib::update_metricmeta(
                        $existingMetric->id,
                        'visitor_' . $newVisitors,
                        json_encode($payload)
                    );

                    return [
                        'success' => true,
                        'action' => 'updated',
                        'saved' => $existingMetric->fresh(),
                        'meta' => $metaSaved,
                        'message' => 'Visitante adicionado à LP existente',
                        'data' => $payload
                    ];
                } else {
                    // Criar novo registro
                    $newMetric = DashboardMetric::create([
                        'period' => $period,
                        'proposals' => $payload['propostas'] ?? 0,
                        'closed_deals' => $payload['ganhos'] ?? 0,
                        'campaign_id' => $lp,
                        'visitors' => 1,
                        'user_id' => $user['id'] ?? null,
                        'meta' => json_encode($metaData)
                    ]);

                    // Salvar meta dados do primeiro visitante
                    $metaSaved = Qlib::update_metricmeta(
                        $newMetric->id,
                        'visitor_1',
                        json_encode($payload)
                    );

                    return [
                        'success' => true,
                        'action' => 'created',
                        'saved' => $newMetric,
                        'meta' => $metaSaved,
                        'message' => 'Nova métrica de LP criada',
                        'data' => $payload
                    ];
                }
            });

        } catch (\Exception $e) {
            Log::error('Erro ao importar dados de LP', [
                'payload' => $payload,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'message' => 'Erro interno ao processar dados de LP',
                'error' => $e->getMessage(),
                'data' => $payload
            ];
        }
    }

    /**
     * Valida se uma string é uma data válida no formato Y-m-d
     *
     * @param string $date
     * @return bool
     */
    private function isValidDate(string $date): bool
    {
        $d = DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }
}

