<?php

namespace App\Services;

use App\Models\Curso;
use App\Models\Module;
use App\Models\Activity;
use Illuminate\Support\Str;
use App\Services\Qlib;

class CourseService
{
    /**
     * Normaliza e sanitiza dados do curso.
     * Reuse logic from CursoController.
     */
    public function sanitizeCursoData(array $data): array
    {
        // Mapear aliases
        if (array_key_exists('descricao_curso', $data)) {
            $data['descricao'] = $data['descricao_curso'];
            unset($data['descricao_curso']);
        }
        if (array_key_exists('observacoes', $data)) {
            $data['obs'] = $data['observacoes'];
            unset($data['observacoes']);
        }
        if (array_key_exists('aeronaves', $data)) {
            unset($data['aeronaves']);
        }

        // Inteiros silentes
        if (isset($data['duracao'])) {
            $data['duracao'] = is_numeric($data['duracao']) ? (int) $data['duracao'] : 0;
        }

        if (array_key_exists('parcelas', $data)) {
            if ($data['parcelas'] === '' || $data['parcelas'] === null) {
                unset($data['parcelas']);
            } elseif (is_numeric($data['parcelas'])) {
                $data['parcelas'] = (int) $data['parcelas'];
            }
        }

        // Decimais
        foreach (['inscricao', 'valor', 'valor_parcela'] as $field) {
            if (array_key_exists($field, $data)) {
                if ($data[$field] === '' || $data[$field] === null) {
                    $data[$field] = null;
                } else {
                    $data[$field] = $this->parseDecimalBR($data[$field]);
                }
            }
        }

        // Cover Image logic
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
            unset($data['imagem_url'], $data['imagem_file_id'], $data['imagem_titulo']);
        }

        return $data;
    }

    /**
     * Processa e salva módulos e atividades.
     * Includes robust type checking to prevent Array to string errors.
     */
    public function upsertModulesAndActivities(array $modulesPayload, Curso $curso, string $authorId): array
    {
        $result = [];
        // dd($modulesPayload);
        foreach ($modulesPayload as $mod) {
            if (!is_array($mod)) { continue; }
            $moduleId = isset($mod['module_id']) && is_numeric($mod['module_id']) ? (int) $mod['module_id'] : null;

            // Safe value extraction
            $title = is_string($mod['title'] ?? '') ? ($mod['title'] ?? '') : ($mod['name'] ?? '');
            if (is_array($title)) $title = json_encode($title);

            $description = is_string($mod['description'] ?? '') ? ($mod['description'] ?? '') : '';
            if (is_array($description)) $description = '';

            $content = is_string($mod['content'] ?? '') ? ($mod['content'] ?? '') : json_encode($mod['content'] ?? '');

            // Check if module already exists by config->ID_antigo
            $existingModule = null;
            if ($moduleId) {
                $existingModule = Module::withoutGlobalScope('modulesOnly') // Just in case, though usually not needed if post_type is set
                    ->where('post_parent', $curso->id)
                    ->where('guid', $moduleId)
                    ->first();
            }
            // dd($existingModule);
            // Use existing local ID if found
            $localModuleId = $existingModule ? $existingModule->ID : null;
            // dd($localModuleId);
            $mappedModule = [
                'post_title' => $title,
                'post_excerpt' => $description,
                'post_content' => $content,
                'post_status' => $this->get_status($this->normalizeActiveFlag($mod['active'] ?? 's')),
                'post_parent' => (int) $curso->id,
                'config' => [
                    'tipo_duracao' => $mod['tipo_duracao'] ?? $mod['type_duration'] ?? null,
                    'duration' => is_scalar($mod['duration'] ?? null) ? $mod['duration'] : null,
                    'ID_antigo' => (string)$moduleId,
                ],
                'post_type' => 'modules',
                'token' => Qlib::token(),
                'post_author' => $authorId,
                'comment_status' => 'closed',
                'ping_status' => 'closed',
                'menu_order' => 0,
                'guid' => $moduleId,
                'to_ping' => 's',
                'excluido' => 'n',
                'deletado' => 'n',
            ];
            
            // Name/Slug generation
            $nameBase = $mod['name'] ?? $mod['title'] ?? '';
            if (is_array($nameBase)) $nameBase = $title; // Fallback
            if (!empty($nameBase) && is_string($nameBase)) {
                $mappedModule['post_name'] = (new Module())->generateSlug($nameBase);
            }

            // Upsert Module
            $moduleModel = null;
            if ($localModuleId) {
                $moduleModel = Module::updateOrCreate(['ID' => $localModuleId], $mappedModule);
            } else {
                $moduleModel = Module::create($mappedModule);
            }
            $moduleId = (int) $moduleModel->ID;

            // Process Activities
            $activitiesPayload = is_array($mod['atividades'] ?? null) ? $mod['atividades'] : (is_array($mod['activities'] ?? null) ? $mod['activities'] : (is_array($mod['items'] ?? null) ? $mod['items'] : []));
            $activitiesResult = [];

            foreach ($activitiesPayload as $act) {
                if (!is_array($act)) { continue; }
                // $activityExternalId = isset($act['id']) && is_numeric($act['id']) ? (int) $act['id'] : null;
                // if(!$activityExternalId){
                    $activityExternalId = $act['id_antigo'] ?? null;
                // }
                
                // Lookup existing Activity
                $existingActivity = null;
                if ($activityExternalId) {
                    $existingActivity = Activity::withoutGlobalScope('activitiesOnly')
                        ->where('post_parent', $moduleId)
                        ->where('guid', $activityExternalId)
                        ->first();
                }
                $localActivityId = $existingActivity ? $existingActivity->ID : null;
                
                $actTitle = is_string($act['title'] ?? '') ? ($act['title'] ?? '') : ($act['name'] ?? '');
                if (is_array($actTitle)) $actTitle = json_encode($actTitle);
                
                $actDesc = is_string($act['description'] ?? '') ? ($act['description'] ?? '') : '';
                if (is_array($actDesc)) $actDesc = '';
                
                $actContent = is_string($act['content'] ?? '') ? ($act['content'] ?? '') : json_encode($act['content'] ?? '');
                
                $mappedActivity = [
                    'post_title' => $actTitle,
                    'post_excerpt' => $actDesc,
                    'post_content' => $actContent,
                    'post_status' => $this->get_status($this->normalizeActiveFlag($act['active'] ?? 's')),
                    'post_parent' => $moduleId,
                    'config' => [
                        'type_activities' => is_string($act['type_activities'] ?? '') ? $act['type_activities'] : null,
                        'type_duration' => is_string($act['type_duration'] ?? '') ? $act['type_duration'] : null,
                        'duration' => is_scalar($act['duration'] ?? null) ? $act['duration'] : null,
                        'ID_antigo' => (string)$activityExternalId,
                    ],
                    'post_type' => 'activities',
                    'token' => Qlib::token(),
                    'post_author' => $authorId,
                    'comment_status' => 'closed',
                    'ping_status' => 'closed',
                    'menu_order' => 0,
                    'guid' => $activityExternalId,
                    'to_ping' => 's',
                    'excluido' => 'n',
                    'deletado' => 'n',
                ];
                // dd($mappedActivity);

                $actNameBase = $act['name'] ?? $act['title'] ?? '';
                if(is_array($actNameBase)) $actNameBase = $actTitle;
                if (!empty($actNameBase) && is_string($actNameBase)) {
                    $mappedActivity['post_name'] = (new Activity())->generateSlug($actNameBase);
                }
                // dd($mappedActivity,$localActivityId);
                $activityModel = null;
                if ($localActivityId) {
                    $activityModel = Activity::updateOrCreate(['ID' => $localActivityId], $mappedActivity);
                } else {
                    $activityModel = Activity::create($mappedActivity);
                }
                $activityId = (int) $activityModel->ID;

                $activitiesResult[] = array_merge($act, [ 'id' => $activityId ]);
            }
            // Save Template in Module Config
            try {
                $template = $this->buildActivityTemplate($activitiesPayload);
                $existingConfig = is_array($moduleModel->config ?? null) ? $moduleModel->config : [];
                $moduleModel->config = array_merge($existingConfig, [ 'atividades_template' => $template ]);
                $moduleModel->save();
            } catch (\Throwable $e) {}

            $result[] = array_merge($mod, [
                'module_id' => $moduleId,
                'atividades' => $activitiesResult,
            ]);
        }
        return $result;
    }

    public function parseDecimalBR($value)
    {
        if (is_array($value)) return 0;
        if (!$value) return 0;
        if (is_string($value)) {
            $value = str_replace('.', '', $value);
            $value = str_replace(',', '.', $value);
            return (float) $value;
        }
        return $value;
    }

    public function normalizeActiveFlag($value)
    {
        if (is_array($value)) $value = $value[0] ?? 'n';
        $v = is_string($value) ? strtolower(trim($value)) : $value;
        if ($v === 's' || $v === '1' || $v === 1 || $v === 'true' || $v === true) return true;
        if ($v === 'n' || $v === '0' || $v === 0 || $v === 'false' || $v === false) return false;
        return true;
    }

    public function get_status($active): string
    {
        return $active ? 'publish' : 'draft';
    }

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
}
