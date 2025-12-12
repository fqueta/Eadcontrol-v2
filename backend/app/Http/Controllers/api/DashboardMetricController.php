<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DashboardMetric;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class DashboardMetricController extends Controller
{
    protected PermissionService $permissionService;
    public $routeName;
    public $sec;
    protected $token_api_aeroclube;
    protected $url_api_aeroclube;
    public function __construct(PermissionService $permissionService)
    {
        $this->routeName = request()->route()->getName();
        $this->permissionService = $permissionService;
        $this->sec = request()->segment(3);
        $this->token_api_aeroclube = '1|m48U0c4zZbE0MBJNQo4QsAGN8vFE669gFbe5EgKD95fdd6e5';
        $this->url_api_aeroclube = Qlib::qoption('url_api_aeroclube');
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
        ]);
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
            'ano' => 'required|integer|min:2020|max:2030',
            'numero' => 'required|integer|min:1|max:53',
            'tipo' => 'required|string|in:semana,mes,ano'
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
            $response = Http::timeout(30)
                ->withToken($this->token_api_aeroclube)
                ->get($this->url_api_aeroclube, [
                    'ano' => $validated['ano'],
                    'numero' => $validated['numero'],
                    'tipo' => $validated['tipo']
                ]);

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
}
