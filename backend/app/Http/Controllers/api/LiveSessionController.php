<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\LiveSession;
use App\Services\PermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * LiveSessionController — CRUD de sessões ao vivo.
 * pt-BR: Gerencia agendamento de aulas ao vivo por curso e turma.
 * en-US: Manages live class scheduling per course and class group.
 */
class LiveSessionController extends Controller
{
    protected PermissionService $permissionService;

    public function __construct()
    {
        $this->permissionService = new PermissionService();
    }

    /**
     * rules — Regras de validação compartilhadas.
     * en-US: Shared validation rules.
     */
    private function rules(bool $update = false): array
    {
        $required = $update ? 'sometimes|required' : 'required';
        return [
            'id_curso'          => 'nullable|integer',
            'id_turma'          => 'nullable|integer',
            'titulo'            => "{$required}|string|max:255",
            'link'              => 'nullable|string|max:500|url',
            'duracao_minutos'   => 'nullable|integer|min:1|max:1440',
            'inicio'            => "{$required}|date",
            'fim'               => 'nullable|date|after_or_equal:inicio',
            'descricao'         => 'nullable|string',
            'status'            => 'nullable|in:agendado,ao_vivo,encerrado,cancelado',
            'cor'               => 'nullable|string|max:20',
            'config'            => 'nullable|array',
        ];
    }

    /**
     * mapSession — Serializa LiveSession para a API.
     * en-US: Serializes a LiveSession record for the API response.
     */
    private function mapSession(LiveSession $s): array
    {
        return [
            'id'               => $s->id,
            'id_curso'         => $s->id_curso,
            'id_turma'         => $s->id_turma,
            'titulo'           => $s->titulo,
            'link'             => $s->link,
            'duracao_minutos'  => $s->duracao_minutos,
            'inicio'           => $s->inicio?->toIso8601String(),
            'fim'              => $s->fim?->toIso8601String(),
            'descricao'        => $s->descricao,
            'status'           => $s->status,
            'cor'              => $s->cor ?? '#6366f1',
            'config'           => $s->config,
            'criado_por'       => $s->criado_por,
            'absent_user_ids'  => $s->relationLoaded('absences') ? $s->absences->pluck('user_id')->toArray() : [],
            'created_at'       => $s->created_at?->toIso8601String(),
            'updated_at'       => $s->updated_at?->toIso8601String(),
        ];
    }

    /**
     * index — Lista sessões com filtros.
     * en-US: List live sessions with optional filters.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Acesso negado'], 403);

        $perPage  = (int) $request->input('per_page', 50);
        $query    = LiveSession::with('absences')->orderBy('inicio', 'asc');

        if ($idCurso = $request->get('id_curso')) {
            $query->where('id_curso', $idCurso);
        }
        if ($idTurma = $request->get('id_turma')) {
            $query->where('id_turma', $idTurma);
        }
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        // Filtro por mês/ano para o calendário
        if ($mes = $request->get('mes')) {
            $query->whereMonth('inicio', $mes);
        }
        if ($ano = $request->get('ano')) {
            $query->whereYear('inicio', $ano);
        }
        // Filtro por intervalo de datas
        if ($de = $request->get('de')) {
            $query->where('inicio', '>=', $de);
        }
        if ($ate = $request->get('ate')) {
            $query->where('inicio', '<=', $ate);
        }

        $items = $query->paginate($perPage);
        $items->getCollection()->transform(fn($s) => $this->mapSession($s));

        return response()->json($items);
    }

    /**
     * store — Cria uma nova sessão ao vivo.
     * en-US: Create a new live session.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Acesso negado'], 403);

        $validator = Validator::make($request->all(), $this->rules());
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        $data['criado_por'] = $user->id;
        $data['status']     = $data['status'] ?? 'agendado';

        $session = LiveSession::create($data);

        return response()->json([
            'data'    => $this->mapSession($session),
            'message' => 'Sessão ao vivo criada com sucesso',
        ], 201);
    }

    /**
     * show — Exibe uma sessão específica.
     * en-US: Show a specific live session.
     */
    public function show(string $id)
    {
        $user = request()->user();
        if (!$user) return response()->json(['error' => 'Acesso negado'], 403);

        $session = LiveSession::with('absences')->findOrFail($id);
        return response()->json($this->mapSession($session));
    }

    /**
     * update — Atualiza uma sessão.
     * en-US: Update a live session.
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Acesso negado'], 403);

        $session = LiveSession::findOrFail($id);

        $validator = Validator::make($request->all(), $this->rules(update: true));
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $session->update($validator->validated());

        return response()->json([
            'data'    => $this->mapSession($session->fresh()),
            'message' => 'Sessão atualizada com sucesso',
        ]);
    }

    /**
     * destroy — Remove uma sessão.
     * en-US: Delete a live session.
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        if (!$user) return response()->json(['error' => 'Acesso negado'], 403);

        $session = LiveSession::findOrFail($id);
        $session->delete();

        return response()->json(['message' => 'Sessão excluída com sucesso']);
    }

    /**
     * clone — Clona aulas de uma turma para outra reajustando as datas.
     * en-US: Clone sessions from one class group to another shifting dates.
     */
    public function clone(Request $request)
    {
        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Acesso negado'], 403);

        $validator = Validator::make($request->all(), [
            'from_turma_id' => 'required|integer',
            'to_turma_id'   => 'required|integer|different:from_turma_id',
            'base_date'     => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $fromTurmaId = $validator->validated()['from_turma_id'];
        $toTurmaId   = $validator->validated()['to_turma_id'];
        $baseDateStr = $validator->validated()['base_date'];

        $originalSessions = LiveSession::where('id_turma', $fromTurmaId)->orderBy('inicio', 'asc')->get();

        if ($originalSessions->isEmpty()) {
            return response()->json([
                'message' => 'Nenhuma atividade encontrada na turma de origem.',
            ], 404);
        }

        $firstSessionDate = $originalSessions->first()->inicio;
        $baseDate = \Carbon\Carbon::parse($baseDateStr)->startOfDay();
        $originalFirstDate = $firstSessionDate->copy()->startOfDay();

        $diffInDays = $baseDate->diffInDays($originalFirstDate, false);
        // Se a $baseDate for maior, $diffInDays será negativo (ou vice-versa).
        // diffInDays(B, false) retorna B - A.
        // Queremos adicionar dias à original para chegar na base.
        // Se A (base) = 10, B (original) = 5. A - B = +5.
        // Vamos inverter a ordem para facilitar:
        $diffInDays = $originalFirstDate->diffInDays($baseDate, false);

        $clonedCount = 0;

        foreach ($originalSessions as $session) {
            $newInicio = $session->inicio->copy()->addDays($diffInDays);
            $newFim = $session->fim ? $session->fim->copy()->addDays($diffInDays) : null;

            LiveSession::create([
                'id_curso'        => $session->id_curso,
                'id_turma'        => $toTurmaId,
                'titulo'          => $session->titulo,
                'descricao'       => $session->descricao,
                'duracao_minutos' => $session->duracao_minutos,
                'inicio'          => $newInicio,
                'fim'             => $newFim,
                'cor'             => $session->cor,
                'config'          => $session->config,
                'status'          => 'agendado', // Reseta o status
                'link'            => null,       // Reseta o link
                'criado_por'      => $user->id,
            ]);
            $clonedCount++;
        }

        return response()->json([
            'message' => "{$clonedCount} atividades clonadas com sucesso.",
        ]);
    }

    /**
     * syncAbsences — Sincroniza a lista de alunos que faltaram.
     * en-US: Synchronize the list of absent students.
     */
    public function syncAbsences(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Acesso negado'], 403);

        $session = LiveSession::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'absent_user_ids'   => 'present|array',
            'absent_user_ids.*' => 'string|max:36',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $absentIds = $validator->validated()['absent_user_ids'];

        // Remove absences not in list
        $session->absences()->whereNotIn('user_id', $absentIds)->delete();

        // Add new absences
        $existingAbsences = $session->absences()->pluck('user_id')->toArray();
        $toAdd = array_diff($absentIds, $existingAbsences);

        $newAbsences = [];
        foreach ($toAdd as $userId) {
            $newAbsences[] = [
                'live_session_id' => $session->id,
                'user_id'         => $userId,
                'created_at'      => now(),
                'updated_at'      => now(),
            ];
        }

        if (count($newAbsences) > 0) {
            \App\Models\LiveSessionAbsence::insert($newAbsences);
        }

        return response()->json([
            'message' => 'Lista de presença atualizada com sucesso',
            'data'    => $this->mapSession($session->fresh(['absences'])),
        ]);
    }

    /**
     * attendanceReport — Relatório de frequência da turma.
     * en-US: Class attendance report.
     */
    public function attendanceReport(Request $request)
    {
        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Acesso negado'], 403);

        $validator = Validator::make($request->all(), [
            'id_curso' => 'required|integer',
            'id_turma' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $idCurso = $validator->validated()['id_curso'];
        $idTurma = $validator->validated()['id_turma'];

        $sessions = LiveSession::where('id_curso', $idCurso)
            ->where('id_turma', $idTurma)
            ->orderBy('inicio', 'asc')
            ->get();

        $totalSessions = $sessions->count();
        $totalMinutes = $sessions->sum('duracao_minutos');

        $matriculas = \App\Models\Matricula::with('student')
            ->where('id_turma', $idTurma)
            ->get();

        $sessionIds = $sessions->pluck('id')->toArray();
        $absences = \App\Models\LiveSessionAbsence::whereIn('live_session_id', $sessionIds)
            ->get()
            ->groupBy('user_id');

        $studentsReport = [];

        foreach ($matriculas as $matricula) {
            if (!$matricula->student) continue;

            $userId = $matricula->student->id;
            $userAbsences = $absences->get($userId) ?? collect([]);

            $absentSessionIds = $userAbsences->pluck('live_session_id')->toArray();
            $attendedSessions = $totalSessions - count($absentSessionIds);
            $percentage = $totalSessions > 0 ? round(($attendedSessions / $totalSessions) * 100, 1) : 0;

            $absentDetails = $sessions->filter(fn($s) => in_array($s->id, $absentSessionIds))->map(fn($s) => [
                'id' => $s->id,
                'titulo' => $s->titulo,
                'inicio' => $s->inicio->toIso8601String(),
            ])->values();

            $studentsReport[] = [
                'id' => $userId,
                'nome' => $matricula->student->nome ?? $matricula->student->name ?? 'Sem Nome',
                'email' => $matricula->student->email,
                'presencas' => $attendedSessions,
                'faltas' => count($absentSessionIds),
                'percentual' => $percentage,
                'aulas_faltadas' => $absentDetails,
            ];
        }

        usort($studentsReport, fn($a, $b) => strcmp($a['nome'], $b['nome']));

        $curso = \App\Models\Curso::find($idCurso);
        $turma = \App\Models\Turma::find($idTurma);

        return response()->json([
            'curso' => $curso ? $curso->nome : 'Curso Desconhecido',
            'turma' => $turma ? $turma->nome : 'Turma Desconhecida',
            'total_aulas' => $totalSessions,
            'total_minutos' => $totalMinutes,
            'alunos' => $studentsReport,
        ]);
    }
}
