<?php

namespace App\Services\Enrollment;

use App\Models\Matricula;
use App\Models\MatriculaStageLog;
use App\Models\Stage;
use Illuminate\Support\Facades\DB;

class StageActionService
{
    /**
     * Handle stage change applying configured actions for onExit (old stage) and onEnter (new stage).
     * Returns array of executed logs.
     */
    public function handle(Matricula $matricula, ?int $oldStageId, int $newStageId, ?string $actorId = null): array
    {
        $executed = [];

        $oldStage = $oldStageId ? Stage::with('funnel')->find($oldStageId) : null;
        $newStage = Stage::with('funnel')->find($newStageId);

        if (!$newStage) {
            return $executed;
        }

        // 1) onExit do estágio anterior (se houver)
        if ($oldStage) {
            $actionsExit = $this->getActions($oldStage, 'onExit');
            foreach ($actionsExit as $action) {
                $log = $this->executeAction($matricula, $oldStage, $newStage, $action, 'exit', $oldStageId, $newStageId, $actorId);
                if ($log) $executed[] = $log;
            }
        }

        // 2) onEnter do novo estágio
        $actionsEnter = $this->getActions($newStage, 'onEnter');
        foreach ($actionsEnter as $action) {
            $log = $this->executeAction($matricula, $oldStage, $newStage, $action, 'enter', $oldStageId, $newStageId, $actorId);
            if ($log) $executed[] = $log;
        }

        return $executed;
    }

    private function getActions(Stage $stage, string $trigger): array
    {
        $settings = $stage->settings ?? [];
        // ensure defaults merge
        $defaults = Stage::getDefaultSettings();
        $settings = array_merge($defaults, $settings);
        $actions = $settings['actions'][$trigger] ?? [];
        if (!is_array($actions)) return [];
        // filter enabled and sort by order
        $filtered = array_filter($actions, fn($a) => ($a['enabled'] ?? true) && !empty($a['situacao_id']));
        usort($filtered, fn($a,$b)=> ($a['order'] ?? 0) <=> ($b['order'] ?? 0));
        return array_values($filtered);
    }

    private function executeAction(Matricula $matricula, ?Stage $oldStage, Stage $newStage, array $action, string $trigger, ?int $oldStageId, int $newStageId, ?string $actorId): ?array
    {
        $type = $action['type'] ?? 'set_situacao';
        if ($type !== 'set_situacao') return null;

        $targetSituacaoId = (int)($action['situacao_id'] ?? 0);
        if (!$targetSituacaoId) return null;

        // verificar se situação existe e é do tipo situacao_matricula
        $situacaoRow = DB::table('posts')->where('ID', $targetSituacaoId)->where('post_type', 'situacao_matricula')->first();
        if (!$situacaoRow) return null;

        $fromSituacaoId = $matricula->situacao_id ? (int)$matricula->situacao_id : null;
        $fromSituacaoName = null;
        if ($fromSituacaoId) {
            $fromSituacaoName = DB::table('posts')->where('ID', $fromSituacaoId)->value('post_title');
        }
        $toSituacaoName = $situacaoRow->post_title;

        // se já está na situação alvo, apenas loga como skipped (não altera, mas registra para auditoria)
        $isSame = $fromSituacaoId === $targetSituacaoId;

        // determinar estágio/funil para log
        $stageIdForLog = $trigger === 'enter' ? $newStage->id : ($oldStage ? $oldStage->id : $newStage->id);
        $funnelIdForLog = $trigger === 'enter' ? $newStage->funnel_id : ($oldStage ? $oldStage->funnel_id : $newStage->funnel_id);

        // se diferente, efetivamente muda
        if (!$isSame) {
            $matricula->situacao_id = $targetSituacaoId;
            // também grava dt_inicio_matricula se for 'mat*' como antes, mantendo compatibilidade
            // mas agora só se a ação aponta para situação mat*
            $isMat = $situacaoRow->post_name && str_starts_with(strtolower($situacaoRow->post_name), 'mat');
            if ($isMat) {
                try {
                    \App\Services\Qlib::update_matriculameta($matricula->id, 'dt_inicio_matricula', now()->format('Y-m-d H:i:s'));
                } catch (\Throwable $e) {}
            }
        }

        // criar log
        try {
            $log = MatriculaStageLog::create([
                'matricula_id' => $matricula->id,
                'from_stage_id' => $oldStageId,
                'to_stage_id' => $newStageId,
                'funnel_id' => $funnelIdForLog,
                'stage_id' => $stageIdForLog,
                'trigger' => $trigger,
                'from_situacao_id' => $fromSituacaoId,
                'to_situacao_id' => $targetSituacaoId,
                'from_situacao_name' => $fromSituacaoName,
                'to_situacao_name' => $toSituacaoName,
                'actor_id' => $actorId,
                'meta' => [
                    'action_id' => $action['id'] ?? null,
                    'skipped' => $isSame,
                    'stage_name' => $trigger === 'enter' ? $newStage->name : ($oldStage ? $oldStage->name : $newStage->name),
                    'funnel_name' => $trigger === 'enter' ? ($newStage->funnel->name ?? null) : ($oldStage ? ($oldStage->funnel->name ?? null) : ($newStage->funnel->name ?? null)),
                ],
            ]);
            return $log->toArray();
        } catch (\Throwable $e) {
            return null;
        }
    }
}
