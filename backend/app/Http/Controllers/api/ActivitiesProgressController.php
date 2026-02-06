<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\ActivityProgress;
use App\Models\Activity;
use App\Models\Curso;
use App\Models\Matricula;
use App\Models\Module; // Para resolver título e atividades por módulo legado (post_parent)
use App\Models\User; // Para obter o nome do aluno
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class ActivitiesProgressController extends Controller
{
    /**
     * Salva a posição de vídeo de uma atividade para a matrícula do aluno.
     * EN: Save the video position (in seconds) of an activity for a student's enrollment.
     */
    public function saveVideoPosition(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $payload = [
            'activity_id' => $request->input('activity_id'),
            'course_id' => $request->input('course_id'),
            'id_matricula' => $request->input('id_matricula'),
            'module_id' => $request->input('module_id'),
            'seconds' => $request->input('seconds'),
            'config' => $request->input('config'),
        ];

        $validator = Validator::make($payload, [
            'activity_id' => ['required', 'integer'],
            'course_id' => ['required', 'integer'],
            'id_matricula' => ['required', 'integer'],
            'module_id' => ['nullable', 'integer'],
            'seconds' => ['required', 'integer', 'min:0'],
            'config' => ['nullable', 'array'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        // Normaliza config caso venha como string JSON.
        // EN: Normalize config if it comes as a JSON string.
        if (isset($data['config']) && is_string($data['config'])) {
            $decoded = json_decode($data['config'], true);
            $data['config'] = is_array($decoded) ? $decoded : null;
        }

        // Garantir que a matrícula pertence ao usuário autenticado (proteção para clientes).
        // EN: Ensure the enrollment belongs to the authenticated user (client protection).
        $matricula = Matricula::select('id', 'id_cliente')->find($data['id_matricula']);
        if (!$matricula) {
            return response()->json(['error' => 'Matrícula não encontrada'], 404);
        }
        // Se for cliente, valida vínculo; admins/atendentes passam.
        if ((int)($user->permission_id ?? 0) === 7 && (string)$matricula->id_cliente !== (string)$user->id) {
            return response()->json(['error' => 'Acesso negado: matrícula não pertence ao usuário'], 403);
        }

        // Upsert por (activity_id, id_matricula) preservando o config existente.
        // EN: Upsert by (activity_id, id_matricula) while preserving existing config.
        $progress = ActivityProgress::firstOrNew([
            'activity_id' => $data['activity_id'],
            'id_matricula' => $data['id_matricula'],
        ]);

        $progress->course_id = $data['course_id'];
        $progress->module_id = $data['module_id'] ?? null;
        $progress->seconds = $data['seconds'];

        $existingConfig = is_array($progress->config) ? $progress->config : [];
        $incomingConfig = (array)($data['config'] ?? []);
        $progress->config = array_merge($existingConfig, $incomingConfig);

        $progress->save();

        return response()->json([
            'message' => 'Progresso salvo com sucesso',
            'progress' => $progress,
        ], 201);
    }

    /**
     * Obtém a posição de vídeo salva para uma atividade e matrícula.
     * EN: Get the saved video position for an activity and enrollment.
     */
    public function getVideoPosition(Request $request, $activity_id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), [
            'id_matricula' => ['required', 'integer'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        $idMatricula = (int) $validator->validated()['id_matricula'];
        $activityId = (int) $activity_id;

        $matricula = Matricula::select('id', 'id_cliente')->find($idMatricula);
        if (!$matricula) {
            return response()->json(['error' => 'Matrícula não encontrada'], 404);
        }
        if ((int)($user->permission_id ?? 0) === 7 && (string)$matricula->id_cliente !== (string)$user->id) {
            return response()->json(['error' => 'Acesso negado: matrícula não pertence ao usuário'], 403);
        }

        $progress = ActivityProgress::where('activity_id', $activityId)
            ->where('id_matricula', $idMatricula)
            ->first();

        return response()->json([
            'activity_id' => $activityId,
            'id_matricula' => $idMatricula,
            'seconds' => (int)($progress->seconds ?? 0),
            'exists' => (bool)$progress,
            'config' => $progress ? (array)($progress->config ?? []) : [],
        ], 200);
    }

    /**
     * Obtém a posição de vídeo via query params (activity_id, id_matricula, course_id).
     * EN: Get video position via query parameters (activity_id, id_matricula, course_id).
     */
    public function getVideoPositionByQuery(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->query(), [
            'activity_id' => ['required', 'integer'],
            'id_matricula' => ['required', 'integer'],
            'course_id' => ['nullable', 'integer'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        $activityId = (int) $data['activity_id'];
        $idMatricula = (int) $data['id_matricula'];
        $courseId = isset($data['course_id']) ? (int)$data['course_id'] : null;

        $matricula = Matricula::select('id', 'id_cliente')->find($idMatricula);
        if (!$matricula) {
            return response()->json(['error' => 'Matrícula não encontrada'], 404);
        }
        if ((int)($user->permission_id ?? 0) === 7 && (string)$matricula->id_cliente !== (string)$user->id) {
            return response()->json(['error' => 'Acesso negado: matrícula não pertence ao usuário'], 403);
        }

        $query = ActivityProgress::where('activity_id', $activityId)
            ->where('id_matricula', $idMatricula);
        if ($courseId !== null) {
            $query->where('course_id', $courseId);
        }
        $progress = $query->first();

        return response()->json([
            'activity_id' => $activityId,
            'id_matricula' => $idMatricula,
            'seconds' => (int)($progress->seconds ?? 0),
            'exists' => (bool)$progress,
            'config' => $progress ? (array)($progress->config ?? []) : [],
        ], 200);
    }

    /**
     * Marca atividade como concluída para uma matrícula.
     * EN: Mark an activity as completed for an enrollment.
     */
    public function complete(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $payload = [
            'activity_id' => $request->input('activity_id'),
            'id_matricula' => $request->input('id_matricula'),
            'course_id' => $request->input('course_id'),
            'module_id' => $request->input('module_id'),
            // PT: Ignorar 'seconds' quando nulo ou vazio; manter como null para validação
            // EN: Ignore 'seconds' when null or empty; keep as null for validation
            'seconds' => $request->has('seconds') ? $request->input('seconds') : null,
            'config' => $request->input('config'),   // opcional
        ];
        if ($payload['seconds'] === '' || $payload['seconds'] === null) {
            $payload['seconds'] = null;
        }

        $validator = Validator::make($payload, [
            'activity_id' => ['required', 'integer'],
            'id_matricula' => ['required', 'integer'],
            'course_id' => ['nullable', 'integer'],
            'module_id' => ['nullable', 'integer'],
            'seconds' => ['nullable', 'integer', 'min:0'],
            'config' => ['nullable', 'array'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        // Normaliza config string JSON.
        if (isset($data['config']) && is_string($data['config'])) {
            $decoded = json_decode($data['config'], true);
            $data['config'] = is_array($decoded) ? $decoded : null;
        }

        $matricula = Matricula::select('id', 'id_cliente')->find($data['id_matricula']);
        if (!$matricula) {
            return response()->json(['error' => 'Matrícula não encontrada'], 404);
        }
        if ((int)($user->permission_id ?? 0) === 7 && (string)$matricula->id_cliente !== (string)$user->id) {
            return response()->json(['error' => 'Acesso negado: matrícula não pertence ao usuário'], 403);
        }

        // Upsert progresso e marca como concluído
        $progress = ActivityProgress::firstOrNew([
            'activity_id' => $data['activity_id'],
            'id_matricula' => $data['id_matricula'],
        ]);

        if (isset($data['course_id'])) {
            $progress->course_id = $data['course_id'];
        }
        if (isset($data['module_id'])) {
            $progress->module_id = $data['module_id'];
        }
        // Atualiza segundos apenas se informado, não vazio e maior que zero.
        // EN: Update seconds only if provided, non-empty, and greater than zero.
        if (array_key_exists('seconds', $data) && $data['seconds'] !== null && $data['seconds'] !== '') {
            $providedSeconds = (int) $data['seconds'];
            if ($providedSeconds > 0) {
                $progress->seconds = $providedSeconds;
            }
        }

        // Atualiza o status de conclusão na coluna dedicada
        // EN: Update completion status on the dedicated column
        $progress->completed = true;

        // Remove qualquer sinalizador 'completed' prévio da config e mantém completed_at
        // EN: Remove any prior 'completed' flag from config and keep completed_at
        $existingConfig = is_array($progress->config) ? $progress->config : [];
        unset($existingConfig['completed']);
        $newConfig = array_merge($existingConfig, (array)($data['config'] ?? []), [
            'completed_at' => now()->toISOString(true),
        ]);
        $progress->config = $newConfig;

        $progress->save();

        return response()->json([
            'message' => 'Atividade marcada como concluída',
            'progress' => $progress,
        ], 200);
    }

    /**
     * Desmarca a atividade como concluída para uma matrícula.
     * EN: Unmark activity as completed for an enrollment.
     */
    public function incomplete(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $payload = [
            'activity_id' => $request->input('activity_id'),
            'id_matricula' => $request->input('id_matricula'),
            'seconds' => $request->input('seconds'), // opcional para ajustar tempo
            'config' => $request->input('config'),   // opcional
        ];

        $validator = Validator::make($payload, [
            'activity_id' => ['required', 'integer'],
            'id_matricula' => ['required', 'integer'],
            'seconds' => ['nullable', 'integer', 'min:0'],
            'config' => ['nullable', 'array'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        if (isset($data['config']) && is_string($data['config'])) {
            $decoded = json_decode($data['config'], true);
            $data['config'] = is_array($decoded) ? $decoded : null;
        }

        $matricula = Matricula::select('id', 'id_cliente')->find($data['id_matricula']);
        if (!$matricula) {
            return response()->json(['error' => 'Matrícula não encontrada'], 404);
        }
        if ((int)($user->permission_id ?? 0) === 7 && (string)$matricula->id_cliente !== (string)$user->id) {
            return response()->json(['error' => 'Acesso negado: matrícula não pertence ao usuário'], 403);
        }

        $progress = ActivityProgress::firstOrNew([
            'activity_id' => $data['activity_id'],
            'id_matricula' => $data['id_matricula'],
        ]);

        if (isset($data['seconds'])) {
            $progress->seconds = $data['seconds'];
        }

        // Atualiza o status de conclusão na coluna dedicada
        // EN: Update completion status on the dedicated column
        $progress->completed = false;

        $existingConfig = is_array($progress->config) ? $progress->config : [];
        // Remove sinalizadores de conclusão e aplica config adicional
        unset($existingConfig['completed'], $existingConfig['completed_at']);
        $newConfig = array_merge($existingConfig, (array)($data['config'] ?? []));
        $progress->config = $newConfig;

        $progress->save();

        return response()->json([
            'message' => 'Atividade desmarcada como concluída',
            'progress' => $progress,
        ], 200);
    }

    /**
     * Lista todo o progresso do aluno no curso e informa a próxima atividade válida.
     * EN: Lists all progress of the student in the course and informs the next valid activity.
     */
    public function getCourseProgress(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->query(), [
            'course_id' => ['required', 'integer'],
            'id_matricula' => ['required', 'integer'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        $courseId = (int) $data['course_id'];
        $idMatricula = (int) $data['id_matricula'];

        $matricula = Matricula::select('id', 'id_cliente')->find($idMatricula);
        if (!$matricula) {
            return response()->json(['error' => 'Matrícula não encontrada'], 404);
        }
        if ((int)($user->permission_id ?? 0) === 7 && (string)$matricula->id_cliente !== (string)$user->id) {
            return response()->json(['error' => 'Acesso negado: matrícula não pertence ao usuário'], 403);
        }

        // Lista todo o progresso para o curso e matrícula (ordem por updated_at desc)
        // EN: List all progress for the course and enrollment (order by updated_at desc)
        $progresses = ActivityProgress::where('course_id', $courseId)
            ->where('id_matricula', $idMatricula)
            ->orderByDesc('updated_at')
            ->get();

        $items = [];
        $lastCompletedActivityId = null;
        foreach ($progresses as $p) {
            $cfg = is_array($p->config) ? $p->config : [];
            $completed = (bool)($p->completed ?? false);
            $items[] = [
                'activity_id' => $p->activity_id,
                'module_id' => $p->module_id,
                'seconds' => (int)($p->seconds ?? 0),
                'completed' => $completed,
                'updated_at' => optional($p->updated_at)->toISOString(),
                'config' => $cfg,
            ];
            if ($lastCompletedActivityId === null && $completed === true) {
                $lastCompletedActivityId = $p->activity_id;
            }
        }

        // Determina a próxima atividade válida do curso para a matrícula, baseada no último concluído
        // EN: Determine the next valid activity for the enrollment, based on the last completed
        $nextActivityId = null;
        $course = Curso::select('id', 'modulos')->find($courseId);
        if ($course && is_array($course->modulos)) {
            $orderedActivityIds = [];
            foreach ($course->modulos as $module) {
                if (is_array($module) && isset($module['aviao']) && is_array($module['aviao'])) {
                    foreach ($module['aviao'] as $aid) {
                        $id = is_numeric($aid) ? (int)$aid : null;
                        if ($id !== null) {
                            $orderedActivityIds[] = $id;
                        }
                    }
                }
            }

            if (!empty($orderedActivityIds)) {
                $currentActivityId = $lastCompletedActivityId;
                if ($currentActivityId !== null) {
                    $pos = array_search((int)$currentActivityId, $orderedActivityIds, true);
                    if ($pos !== false) {
                        for ($i = $pos + 1; $i < count($orderedActivityIds); $i++) {
                            $candidate = $orderedActivityIds[$i];
                            if (Activity::find($candidate)) {
                                $nextActivityId = $candidate;
                                break;
                            }
                        }
                    }
                }
                if ($nextActivityId === null) {
                    foreach ($orderedActivityIds as $candidate) {
                        if (Activity::find($candidate)) {
                            $nextActivityId = $candidate;
                            break;
                        }
                    }
                }
            }
        }

        return response()->json([
            'course_id' => $courseId,
            'id_matricula' => $idMatricula,
            'exists' => count($items) > 0,
            'total' => count($items),
            'items' => $items,
            'last_completed_activity_id' => $lastCompletedActivityId,
            'next_activity_id' => $nextActivityId,
        ], 200);
    }

    /**
     * Retorna o currículo completo do curso da matrícula com progresso por atividade.
     * Inclui indicador de retomada (needs_resume) para atividades iniciadas e não concluídas.
     * EN: Returns the full course curriculum of the enrollment with per-activity progress.
     * Adds a resume indicator (needs_resume) for activities started but not completed.
     */
    public function getCourseCurriculumWithProgress(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->query(), [
            'id_matricula' => ['required', 'integer'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        $idMatricula = (int) $data['id_matricula'];

        // Busca matrícula e valida acesso
        // EN: Fetch enrollment and validate access
        $matricula = Matricula::select('id', 'id_cliente', 'id_curso')->find($idMatricula);
        if (!$matricula) {
            return response()->json(['error' => 'Matrícula não encontrada'], 404);
        }
        if ((int)($user->permission_id ?? 0) === 7 && (string)$matricula->id_cliente !== (string)$user->id) {
            return response()->json(['error' => 'Acesso negado: matrícula não pertence ao usuário'], 403);
        }

        // Busca curso e seu currículo (modulos)
        // EN: Fetch course and its curriculum (modules)
        $course = Curso::select('id', 'titulo', 'modulos')->find((int)$matricula->id_curso);
        if (!$course) {
            return response()->json(['error' => 'Curso não encontrado para a matrícula'], 404);
        }

        $modules = is_array($course->modulos) ? $course->modulos : [];

        // Buscar nome do aluno pela relação id_cliente -> users.id
        // EN: Resolve student name from enrollment's client ID
        $student = null;
        $studentName = null;
        if (!empty($matricula->id_cliente)) {
            $student = User::select('id','name')->find($matricula->id_cliente);
            $studentName = $student ? (string)$student->name : null;
        }

        // Coleta IDs de atividades diretamente da estrutura 'modulos.atividades' e também dá suporte a 'aviao' e legado 'idItem'.
        // EN: Collect activity IDs from 'modulos.atividades' while supporting 'aviao' lists and legacy 'idItem'.
        $activityIds = [];
        $moduleActivitiesMap = [];
        $moduleIndexTmp = 0;
        foreach ($modules as $module) {
            $moduleIndexTmp++;
            $idsForModule = [];
            if (!is_array($module)) {
                $moduleActivitiesMap[$moduleIndexTmp] = [];
                continue;
            }
            // Preferir atividades como objetos conforme estrutura salva
            if (isset($module['atividades']) && is_array($module['atividades'])) {
                foreach ($module['atividades'] as $act) {
                    $raw = is_array($act) ? ($act['activity_id'] ?? $act['id'] ?? null) : null;
                    $id = is_numeric($raw) ? (int)$raw : null;
                    if ($id !== null) {
                        $idsForModule[] = $id;
                    }
                }
            }
            // Suporte ao formato 'aviao' (array de IDs)
            if (empty($idsForModule) && isset($module['aviao']) && is_array($module['aviao'])) {
                foreach ($module['aviao'] as $aid) {
                    $id = is_numeric($aid) ? (int)$aid : null;
                    if ($id !== null) {
                        $idsForModule[] = $id;
                    }
                }
            }
            // Formato legado: buscar por post_parent utilizando 'idItem'
            if (empty($idsForModule) && isset($module['idItem']) && is_numeric($module['idItem'])) {
                $modulePostId = (int)$module['idItem'];
                $children = Activity::where('post_parent', $modulePostId)->pluck('ID')->all();
                foreach ($children as $cid) {
                    $idsForModule[] = (int)$cid;
                }
            }

            $idsForModule = array_values(array_unique($idsForModule));
            $moduleActivitiesMap[$moduleIndexTmp] = $idsForModule;
            $activityIds = array_merge($activityIds, $idsForModule);
        }
        $activityIds = array_values(array_unique($activityIds));

        // Carrega atividades e progresso do aluno em massa
        // EN: Bulk-load activities and student's progress
        $activities = [];
        if (!empty($activityIds)) {
            $activities = Activity::whereIn('ID', $activityIds)->get()->keyBy('ID');
        }

        $progressByActivity = [];
        if (!empty($activityIds)) {
            $progressByActivity = ActivityProgress::where('id_matricula', $idMatricula)
                ->whereIn('activity_id', $activityIds)
                ->orderByDesc('updated_at')
                ->get()
                ->keyBy('activity_id');
        }

        // Monta currículo com metadados de módulo conforme estrutura salva e progresso por atividade
        // EN: Build curriculum using saved module structure and per-activity progress
        $curriculum = [];
        $moduleIndex = 0;
        foreach ($modules as $module) {
            if (!is_array($module)) {
                continue;
            }
            $moduleIndex++;
            // Resolver metadados do módulo conforme estrutura salva
            $moduleId = isset($module['module_id']) && is_numeric($module['module_id']) ? (int)$module['module_id'] : null;
            if ($moduleId === null && isset($module['idItem']) && is_numeric($module['idItem'])) {
                $moduleId = (int)$module['idItem'];
            }
            $moduleTitle = $module['title'] ?? ($module['titulo'] ?? ($module['nome'] ?? null));
            if ($moduleTitle === null && isset($moduleId)) {
                $modPost = Module::select('ID','post_title')->find($moduleId);
                if ($modPost) {
                    $moduleTitle = (string)$modPost->post_title;
                }
            }
            // Não alterar a estrutura: começar do JSON original do módulo
            $moduleOut = $module;

            // Construir atividades com base na estrutura salva
            $atividadesOut = [];
            if (isset($module['atividades']) && is_array($module['atividades'])) {
                foreach ($module['atividades'] as $act) {
                    if (!is_array($act)) {
                        continue;
                    }
                    $rawId = $act['activity_id'] ?? $act['id'] ?? null;
                    $activityId = is_numeric($rawId) ? (int)$rawId : null;
                    if ($activityId === null) {
                        continue;
                    }
                    $p = $progressByActivity[$activityId] ?? null;
                    $cfg = $p && is_array($p->config) ? $p->config : [];
                    // Detecta provedor de vídeo (YouTube/Vimeo) quando aplicável
                    $typeActivities = $act['type_activities'] ?? null;
                    // PT: Enriquecer 'content' quando ausente, buscando da Activity (guid/post_content)
                    // EN: Enrich 'content' when missing, fetching from Activity (guid/post_content)
                    $activity = $activities[$activityId] ?? null;
                    $contentUrl = $act['content'] ?? null;
                    if ((!is_string($contentUrl) || !Str::startsWith($contentUrl, ['http://', 'https://'])) && $activity) {
                        $candidate = null;
                        if (!empty($activity->guid) && is_string($activity->guid)) {
                            $candidate = $activity->guid;
                        } elseif (!empty($activity->post_content) && is_string($activity->post_content)) {
                            $candidate = $activity->post_content;
                        }
                        if (is_string($candidate) && Str::startsWith($candidate, ['http://', 'https://'])) {
                            $contentUrl = $candidate;
                        }
                    }
                    $isVideo = (is_string($typeActivities) && strtolower($typeActivities) === 'video')
                        || (is_string($contentUrl) && (Str::contains($contentUrl, 'youtube.com') || Str::contains($contentUrl, 'youtu.be') || Str::contains($contentUrl, 'vimeo.com')));
                    $videoProvider = null;
                    if ($isVideo) {
                        if (is_string($contentUrl) && (Str::contains($contentUrl, 'youtube.com') || Str::contains($contentUrl, 'youtu.be'))) {
                            $videoProvider = 'youtube';
                        } elseif (is_string($contentUrl) && Str::contains($contentUrl, 'vimeo.com')) {
                            $videoProvider = 'vimeo';
                        }
                    }

                    // PT: Carregar questões do quiz se for atividade do tipo quiz
                    // EN: Load quiz questions if activity type is quiz
                    $quizQuestions = null;
                    $quizConfig = null;
                    if ($typeActivities === 'quiz' && $activity) {
                        // Reutilizar lógica de carregamento de questões (manual aqui para evitar dependência circular com CursoController)
                        $qs = $activity->questions()->with('options')->orderBy('activity_questions.ordem')->get();
                        $quizQuestions = $qs->map(function($q) {
                            return [
                                'id' => $q->id,
                                'tipo_pergunta' => $q->tipo_pergunta,
                                'enunciado' => $q->enunciado,
                                'explicacao' => $q->explicacao,
                                'pontos' => $q->pontos,
                                'resposta_correta' => $q->tipo_pergunta === 'verdadeiro_falso' 
                                    ? ($q->options->where('correta', 's')->first()?->texto === 'verdadeiro' ? 'verdadeiro' : 'falso')
                                    : null,
                                'opcoes' => $q->options->map(function($o) {
                                    return [
                                        'id' => $o->id,
                                        'texto' => $o->texto,
                                        'correta' => $o->correta === 's'
                                    ];
                                })->toArray()
                            ];
                        })->toArray();
                        
                        // Sincronizar quiz_config se presente
                        if (!isset($act['quiz_config']) && isset($activity->config['quiz_config'])) {
                            $quizConfig = $activity->config['quiz_config'];
                        } else {
                            $quizConfig = $act['quiz_config'] ?? null;
                        }
                    }

                    $atividadesOut[] = [
                        'activity_id' => $activityId,
                        'title' => $act['title'] ?? (($activities[$activityId] ?? null)?->post_title),
                        'name' => $act['name'] ?? null,
                        'description' => $act['description'] ?? null,
                        'content' => $contentUrl,
                        'duration' => $act['duration'] ?? null, // solicitado
                        'type_duration' => $act['type_duration'] ?? null,
                        'type_activities' => $act['type_activities'] ?? null,
                        'quiz_questions' => $quizQuestions, // Added
                        'quiz_config' => $quizConfig,       // Added
                        'video_provider' => $videoProvider,
                        'active' => $act['active'] ?? null,
                        'id' => $act['id'] ?? $activityId,
                        // progresso
                        'exists_progress' => (bool)$p,
                        'seconds' => $p ? (int)($p->seconds ?? 0) : 0,
                        'completed' => $p ? (bool)($p->completed ?? false) : false,
                        // PT: Sinaliza atividades iniciadas e não concluídas (retomar)
                        // EN: Flag started but incomplete activities (needs resume)
                        'needs_resume' => $p ? ((int)($p->seconds ?? 0) > 0 && !(bool)($p->completed ?? false)) : false,
                        'completed_at' => $p && isset($cfg['completed_at']) ? $cfg['completed_at'] : null,
                        'updated_at' => $p ? optional($p->updated_at)->toISOString() : null,
                        'config' => $cfg,
                    ];
                }
            } else {
                // Fallback: construir a partir de 'aviao' ou dos IDs já coletados
                $idsInModule = $moduleActivitiesMap[$moduleIndex] ?? [];
                foreach ($idsInModule as $aid) {
                    $activityId = is_numeric($aid) ? (int)$aid : null;
                    if ($activityId === null) {
                        continue;
                    }
                    $activity = $activities[$activityId] ?? null;
                    if (!$activity) {
                        continue;
                    }
                    $p = $progressByActivity[$activityId] ?? null;
                    $cfg = $p && is_array($p->config) ? $p->config : [];
                    // Detecta provedor de vídeo com base em guid ou post_content
                    $contentSrc = null;
                    if (!empty($activity->guid) && is_string($activity->guid)) {
                        $contentSrc = $activity->guid;
                    } elseif (!empty($activity->post_content) && is_string($activity->post_content)) {
                        $contentSrc = $activity->post_content;
                    }
                    $videoProvider = null;
                    if (is_string($contentSrc)) {
                        if (Str::contains($contentSrc, 'youtube.com') || Str::contains($contentSrc, 'youtu.be')) {
                            $videoProvider = 'youtube';
                        } elseif (Str::contains($contentSrc, 'vimeo.com')) {
                            $videoProvider = 'vimeo';
                        }
                    }

                     // PT: Carregar questões do quiz se for atividade do tipo quiz (fallback loop)
                     $quizQuestions = null;
                     $quizConfig = null;
                     $typeActivities = $activity->config['type_activities'] ?? null; // Try to infer from activity config
                     if ($typeActivities === 'quiz') {
                         $qs = $activity->questions()->with('options')->orderBy('activity_questions.ordem')->get();
                         $quizQuestions = $qs->map(function($q) {
                             return [
                                 'id' => $q->id,
                                 'tipo_pergunta' => $q->tipo_pergunta,
                                 'enunciado' => $q->enunciado,
                                 'explicacao' => $q->explicacao,
                                 'pontos' => $q->pontos,
                                 'resposta_correta' => $q->tipo_pergunta === 'verdadeiro_falso' 
                                     ? ($q->options->where('correta', 's')->first()?->texto === 'verdadeiro' ? 'verdadeiro' : 'falso')
                                     : null,
                                 'opcoes' => $q->options->map(function($o) {
                                     return [
                                         'id' => $o->id,
                                         'texto' => $o->texto,
                                         'correta' => $o->correta === 's'
                                     ];
                                 })->toArray()
                             ];
                         })->toArray();
                         $quizConfig = $activity->config['quiz_config'] ?? null;
                     }

                    $atividadesOut[] = [
                        'activity_id' => $activityId,
                        'title' => $activity->post_title,
                        'duration' => null,
                        'type_duration' => null,
                        'type_activities' => $typeActivities,
                        'quiz_questions' => $quizQuestions, // Added
                        'quiz_config' => $quizConfig,       // Added
                        'video_provider' => $videoProvider,
                        'active' => null,
                        'id' => $activityId,
                        'exists_progress' => (bool)$p,
                        'seconds' => $p ? (int)($p->seconds ?? 0) : 0,
                        'completed' => $p ? (bool)($p->completed ?? false) : false,
                        // PT: Sinaliza atividades iniciadas e não concluídas (retomar)
                        // EN: Flag started but incomplete activities (needs resume)
                        'needs_resume' => $p ? ((int)($p->seconds ?? 0) > 0 && !(bool)($p->completed ?? false)) : false,
                        'completed_at' => $p && isset($cfg['completed_at']) ? $cfg['completed_at'] : null,
                        'updated_at' => $p ? optional($p->updated_at)->toISOString() : null,
                        'config' => $cfg,
                    ];
                }
            }

            // Publicar apenas em 'atividades' para manter a estrutura solicitada
            $moduleOut['atividades'] = $atividadesOut;

            // Respeitar a ordem original dos módulos
            $curriculum[] = $moduleOut;
        }

        return response()->json([
            'course_id' => (int)$course->id,
            'course_title' => (string)$course->titulo,
            'id_matricula' => $idMatricula,
            'student_name' => $studentName,
            'modules_total' => count($curriculum),
            'curriculum' => $curriculum,
        ], 200);
    }

    /**
     * Retorna as notas/desempenho dos alunos no curso (para admin).
     * EN: Returns students' grades/performance in the course (for admin).
     */
    public function getCourseGrades(Request $request, $course_id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        // Permitir apenas admins ou instrutores (ex: permission_id != 7 ou algo assim)
        // Adjust permission check as needed. Assuming clients (7) cannot see this.
        if ((int)($user->permission_id ?? 0) === 7) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        // Buscar todo o progresso do curso que tenha 'score' no config
        $grades = ActivityProgress::where('course_id', $course_id)
            ->with(['matricula.student:id,name,email', 'activity:id,post_title'])
            ->get()
            ->filter(function($p) {
                // Filtra apenas registros que tenham pontuação definida
                return isset($p->config['score']);
            })
            ->map(function($p) {
                return [
                    'id' => $p->id,
                    'student_id' => $p->matricula->student->id ?? null,
                    'student_name' => $p->matricula->student->name ?? 'Aluno Removido',
                    'student_email' => $p->matricula->student->email ?? '',
                    'activity_id' => $p->activity_id,
                    'activity_title' => $p->activity->post_title ?? 'Atividade Removida',
                    'score' => $p->config['score'],
                    'completed_at' => $p->updated_at,
                ];
            })
            ->values(); // Resetar índices do array

        return response()->json($grades);
    }
}