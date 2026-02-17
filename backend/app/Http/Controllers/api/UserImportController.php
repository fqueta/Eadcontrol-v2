<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\User;
use App\Models\Curso;
use App\Models\Activity;
use App\Models\Comment;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;
use Carbon\Carbon;

class UserImportController extends Controller
{
    private array $pendingParentLinks = [];
    private ?string $defaultPasswordHash = null;
    /**
     * Import users or courses from JSON payload/URL.
     */
    public function import(Request $request)
    {
        ini_set('memory_limit', '512M');
        set_time_limit(300);
        try {

        $data = $request->input('data');
        $url = $request->input('url');
        $type = $request->input('type', 'users');

        // Fetch from URL if provided
        if ($url) {
            try {
                $response = Http::timeout(120)->get($url);
                if ($response->successful()) {
                    $json = $response->json();
                    
                    // Handle wrapped response (standard: { data: [...] })
                    if (isset($json['data'])) {
                        $data = $json['data'];
                        // Wrapper might return a single object in 'data' or array
                        // Eduma export usually returns array in data.
                    } elseif (isset($json['id']) || isset($json['name']) || isset($json['title'])) {
                        // Single object at root
                        $data = [$json];
                    } else {
                        // Direct array
                        $data = $json;
                    }
                    
                    // Ensure wrapping if single object found inside data
                    if (isset($data['id']) && !isset($data[0])) {
                         $data = [$data];
                    }

                } else {
                    return response()->json([
                        'success' => false,
                        'message' => 'Failed to fetch data from URL. Status: ' . $response->status()
                    ], 400);
                }
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error fetching URL: ' . $e->getMessage()
                ], 500);
            }
        }

        if (!is_array($data)) {
            Log::error("Import: Invalid data format", ['data_type' => gettype($data)]);
            return response()->json([
                'success' => false,
                'message' => 'Invalid data format. Expected array of items.'
            ], 400);
        }

        Log::info("Import: Starting import", ['count' => count($data), 'type' => $type, 'first_item_keys' => array_keys($data[0] ?? [])]);

        $stats = [
            'imported' => 0,
            'updated' => 0,
            'exists' => 0,
            'skipped' => 0,
            'errors' => []
        ];

        foreach ($data as $index => $row) {
            try {
                $result = false;
                if ($type == 'courses') {
                    $result = $this->importCourse($row);
                } elseif ($type == 'comments') {
                    $result = $this->importComment($row);
                } elseif ($type == 'enrollments') {
                    $result = $this->importEnrollment($row);
                } else {
                    $result = $this->importUser($row);
                }
                
                Log::info("Import Item [$index] Result: $result");

                if ($result === 'created') $stats['imported']++;
                elseif ($result === 'updated') $stats['updated']++;
                elseif ($result === 'exists') $stats['exists']++;
                elseif ($result === 'skipped') $stats['skipped']++;

            } catch (\Exception $e) {
                Log::error("Import Error ($type) at index $index: " . $e->getMessage());
                $stats['errors'][] = [
                    'item' => $row['id'] ?? $row['email'] ?? 'unknown',
                    'error' => $e->getMessage()
                ];
            }
        }

            if ($type === 'comments' && !empty($this->pendingParentLinks)) {
                $this->reconcilePendingParentLinks();
            }
            return response()->json([
                'success' => true,
                'message' => "Import process finished for $type.",
                'details' => $stats
            ], 200, ['Content-Type' => 'application/json']);
        } catch (\Throwable $e) {
            \Log::error('Import fatal error: '.$e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'success' => false,
                'message' => 'Erro inesperado na importação: '.$e->getMessage(),
            ], 500);
        }
    }

    private function importEnrollment($row)
    {
        $row = $this->sanitizeInput($row);
        $legacyId = $row['id_antigo'] ?? null;
        $userEmail = $row['user_email'] ?? null;
        $courseIdWp = $row['course_id_wp'] ?? null;
        $statusRaw = strtolower(trim((string)($row['status'] ?? '')));
        $startAtRaw = $row['start_at'] ?? null;
        $endAtRaw = $row['end_at'] ?? null;
        if (!$userEmail || !$courseIdWp) {
            return 'skipped';
        }
        $user = User::where('email', $userEmail)->first();
        if (!$user) {
            return 'skipped';
        }
        $course = $this->findCourseByExternalId($courseIdWp);
        if (!$course) {
            return 'skipped';
        }
        $statusAndSit = $this->mapEnrollmentStatusAndSituation($statusRaw, $startAtRaw);
        $status = $statusAndSit[0];
        $situacaoId = $statusAndSit[1];
        $existing = null;
        if ($legacyId) {
            $existing = \App\Models\Matricula::where('id_cliente', (string)$user->id)
                ->where('id_curso', (int)$course->id)
                ->where('config->ID_antigo', (string)$legacyId)
                ->first();
        } else {
            $existing = \App\Models\Matricula::where('id_cliente', (string)$user->id)
                ->where('id_curso', (int)$course->id)
                ->first();
        }
        $config = [
            'ID_antigo' => $legacyId ? (string)$legacyId : null,
            'order_id_wp' => $row['order_id_wp'] ?? null,
            'course_id_wp' => (string)$courseIdWp,
            'source' => 'eduma',
        ];
        $coursePriceRaw = $course->valor ?? null;
        if ($coursePriceRaw === null || $coursePriceRaw === '' || !is_numeric(str_replace(',', '.', (string)$coursePriceRaw))) {
            $coursePriceRaw = $course->inscricao ?? null;
        }
        $coursePrice = null;
        if ($coursePriceRaw !== null && $coursePriceRaw !== '') {
            $coursePrice = (float) str_replace(',', '.', (string)$coursePriceRaw);
        }
        $attributes = [
            'id_cliente' => (string)$user->id,
            'id_curso' => (int)$course->id,
            'id_turma' => 0,
            'status' => $status,
            'ativo' => $status === 'p' ? 'n' : 's',
            'situacao_id' => $situacaoId,
            'config' => $config,
            'subtotal' => $coursePrice,
            'total' => $coursePrice,
        ];
        $startAt = null;
        $endAt = null;
        try { if (is_string($startAtRaw)) $startAt = \Carbon\Carbon::parse($startAtRaw); } catch (\Throwable $e) {}
        try { if (is_string($endAtRaw)) $endAt = \Carbon\Carbon::parse($endAtRaw); } catch (\Throwable $e) {}
        if ($existing) {
            $existing->fill($attributes);
            if ($startAt) $existing->data = $startAt;
            if ($endAt) $existing->validade_acesso = $endAt;
            $existing->save();
            return 'updated';
        } else {
            $mat = new \App\Models\Matricula($attributes);
            if ($startAt) $mat->data = $startAt;
            if ($endAt) $mat->validade_acesso = $endAt;
            $mat->save();
            return 'created';
        }
    }

    private function importComment($row)
    {
        $row = $this->sanitizeInput($row);
        $postType = $row['post_type'] ?? null;
        $legacyId = $row['id_antigo'] ?? null;
        $postIdWp = $row['post_id_wp'] ?? null;
        $authorEmail = $row['author_email'] ?? null;
        $authorName = $row['author_name'] ?? null;
        $content = $row['content'] ?? '';
        $parentLegacyId = $row['parent_id_wp'] ?? null;
        $createdAtRaw = $row['created_at'] ?? null;
        $createdAt = null;
        if (is_string($createdAtRaw)) {
            try { $createdAt = Carbon::parse($createdAtRaw); } catch (\Throwable $e) {}
        }
        if (!$postType || !$postIdWp || !$authorEmail || !$content) {
            return 'skipped';
        }
        
        $typeClass = null;
        $targetId = null;
        if ($postType === 'lp_lesson') {
            $activity = $this->findActivityByExternalId($postIdWp);
            if (!$activity) { return 'skipped'; }
            $typeClass = Activity::class;
            $targetId = (int)$activity->ID;
        } elseif ($postType === 'lp_course') {
            $course = $this->findCourseByExternalId($postIdWp);
            if (!$course) { return 'skipped'; }
            $typeClass = Curso::class;
            $targetId = (int)$course->id;
        } else {
            return 'skipped';
        }
        $user = User::where('email', $authorEmail)->first();
        if (!$user) {
            return 'skipped';
        }
        $existing = null;
        if ($legacyId) {
            $existing = Comment::where('commentable_type', $typeClass)
                ->where('commentable_id', $targetId)
                ->where('meta->id_antigo', (string)$legacyId)
                ->first();
        }
        $parent = null;
        if ($parentLegacyId) {
            $parent = Comment::where('meta->id_antigo', (string)$parentLegacyId)->first();
        }
        $meta = [
            'id_antigo' => $legacyId ? (string)$legacyId : null,
            'post_id_wp' => (string)$postIdWp,
            'post_type' => (string)$postType,
            'parent_id_wp' => $parentLegacyId ? (string)$parentLegacyId : null,
            'author_email' => $authorEmail,
            'author_name' => $authorName,
            'source' => 'eduma',
        ];
        $attributes = [
            'commentable_type' => $typeClass,
            'commentable_id' => $targetId,
            'user_id' => (string)$user->id,
            'body' => $content,
            'status' => 'approved',
            'parent_id' => $parent?->id,
            'rating' => $this->inferRating($content, (bool)$parentLegacyId),
            'meta' => $meta,
        ];
        if ($existing) {
            $existing->update($attributes);
            if ($createdAt) {
                $existing->created_at = $createdAt;
                $existing->save();
            }
            if (!$parent && $parentLegacyId) {
                $this->pendingParentLinks[] = [
                    'comment_id' => $existing->id,
                    'type_class' => $typeClass,
                    'target_id' => $targetId,
                    'parent_legacy_id' => (string)$parentLegacyId,
                ];
            }
            return 'updated';
        } else {
            $comment = new Comment($attributes);
            if ($createdAt) {
                $comment->created_at = $createdAt;
            }
            $comment->save();
            if (!$parent && $parentLegacyId) {
                $this->pendingParentLinks[] = [
                    'comment_id' => $comment->id,
                    'type_class' => $typeClass,
                    'target_id' => $targetId,
                    'parent_legacy_id' => (string)$parentLegacyId,
                ];
            }
            return 'created';
        }
    }

    private function findActivityByExternalId($externalId)
    {
        if (!$externalId) return null;
        $externalId = (string)$externalId;
        $byConfig = Activity::where('post_type', 'activities')
            ->where('config->ID_antigo', $externalId)
            ->first();
        if ($byConfig) return $byConfig;
        $byGuid = Activity::where('post_type', 'activities')
            ->where('guid', $externalId)
            ->first();
        return $byGuid;
    }
    
    private function findCourseByExternalId($externalId)
    {
        if (!$externalId) return null;
        $externalId = (string)$externalId;
        $byConfig = Curso::where('config->ID_antigo', $externalId)->first();
        if ($byConfig) return $byConfig;
        $bySlug = Curso::where('slug', $externalId)->first();
        return $bySlug;
    }
    
    private function inferRating(string $text, bool $isReply): ?int
    {
        if ($isReply) return null;
        $t = mb_strtolower($text ?? '');
        $negStrong = ['ruim','péssim','péssimo','pessim','pessimo','horrív','horrivel','terrív','terrivel','odiei','reclama','erro grave','falha grave'];
        foreach ($negStrong as $k) { if (str_contains($t, $k)) return 2; }
        $negModerate = ['porém','porem','perem','mas ','mas,','não gostei','nao gostei','infelizmente','problema','falha','bug','duvida','dúvida','nao '];
        foreach ($negModerate as $k) { if (str_contains($t, $k)) return 4; }
        return 5;
    }
    
    private function mapEnrollmentStatusAndSituation(string $statusRaw, $startAtRaw): array
    {
        $statusRaw = strtolower(trim($statusRaw));
        $idMap = [
            'interessado' => 16,
            'interested' => 16,
            'enrolled' => 17,
            'active' => 19,
            'in_progress' => 19,
            'completed' => 20,
            'complete' => 20,
            'cancelled' => 24,
            'canceled' => 24,
            'rescinded' => 23,
            'rescisao' => 23,
            'blacklist' => 21,
            'black_list' => 21,
            'realocar' => 18,
            'sequence' => 22,
        ];
        if ($statusRaw === 'enrolled' && is_string($startAtRaw) && trim($startAtRaw) !== '') {
            $idMap['enrolled'] = 19;
        }
        $situacaoId = $idMap[$statusRaw] ?? null;
        if ($situacaoId === null) {
            $titleFallback = [
                'interessado' => 'Interessado',
                'interested' => 'Interessado',
                'enrolled' => 'Matriculado',
                'active' => 'Cursando',
                'in_progress' => 'Cursando',
                'completed' => 'Cursos Concluído',
                'complete' => 'Cursos Concluído',
                'cancelled' => 'Contrato cancelado',
                'canceled' => 'Contrato cancelado',
                'rescinded' => 'Rescisão de contrato',
                'rescisao' => 'Rescisão de contrato',
                'blacklist' => 'Black List',
                'black_list' => 'Black List',
                'realocar' => 'Realocar',
                'sequence' => 'Sequencia LTVL',
            ][$statusRaw] ?? null;
            $situacaoId = $this->getSituacaoIdByTitle($titleFallback);
        }
        $status = 'a';
        if ($statusRaw === 'completed' || $statusRaw === 'complete') $status = 'g';
        elseif ($statusRaw === 'cancelled' || $statusRaw === 'canceled') $status = 'p';
        else $status = 'a';
        return [$status, $situacaoId];
    }
    
    private function getSituacaoIdByTitle(?string $title): ?int
    {
        if (!$title) {
            $default = (int) (Qlib::qoption('default_proposal_situacao_id') ?? 0);
            return $default > 0 ? $default : null;
        }
        $row = \App\Models\EnrollmentSituation::whereRaw('LOWER(post_title) = ?', [mb_strtolower($title)])
            ->select('ID')
            ->first();
        if ($row) return (int) $row->ID;
        $default = (int) (Qlib::qoption('default_proposal_situacao_id') ?? 0);
        return $default > 0 ? $default : null;
    }
    
    private function reconcilePendingParentLinks()
    {
        foreach ($this->pendingParentLinks as $link) {
            $parent = Comment::where('commentable_type', $link['type_class'])
                ->where('commentable_id', $link['target_id'])
                ->where('meta->id_antigo', $link['parent_legacy_id'])
                ->first();
            if ($parent) {
                Comment::where('id', $link['comment_id'])
                    ->update(['parent_id' => $parent->id]);
            }
        }
        $this->pendingParentLinks = [];
    }

    private function importUser($row)
    {
        $row = $this->sanitizeInput($row);
        $email = $row['email'] ?? null;
        $cpf = $row['cpf'] ?? null;
        $cnpj = $row['cnpj'] ?? null;

        if (empty($email) && empty($cpf) && empty($cnpj)) {
            return 'skipped';
        }

        $query = User::query();
        $query->where(function($q) use ($email, $cpf, $cnpj) {
            if ($email) $q->where('email', $email);
            if ($cpf) $q->orWhere('cpf', $cpf);
            if ($cnpj) $q->orWhere('cnpj', $cnpj);
        });

        $existingUser = $query->first();

        $attributes = [
            'name' => $row['name'] ?? '',
            'email' => $email,
            'cpf' => $cpf,
            'cnpj' => $cnpj,
            'tipo_pessoa' => $row['tipo_pessoa'] ?? 'pf',
            'genero' => $row['genero'] ?? 'ni',
            'status' => $row['status'] ?? 'actived',
            'ativo' => ($row['status'] ?? '') === 'actived' ? 's' : 'n',
            'config' => $row['config'] ?? [],
        ];

        if (empty($attributes['cpf'])) $attributes['cpf'] = null;
        if (empty($attributes['cnpj'])) $attributes['cnpj'] = null;
        if (empty($attributes['email'])) $attributes['email'] = null;

        if (is_array($attributes['config'])) {
            $attributes['config'] = json_encode($attributes['config']);
        }

        if ($this->defaultPasswordHash === null) {
            $this->defaultPass16rdHash = Hash::make('mudar12@3');
        }
        $attributes['password'] = $this->defaultPasswordHash;

        if ($existingUser) {
            $existingUser->update($attributes);
            return 'updated';
        } else {
            $attributes['token'] = Qlib::token();
            // password já definido com hash padrão
            Client::create($attributes);
            return 'created';
        }
    }

    /**
     * Import a single Course
     */
    /**
     * Import a single Course
     */
    private function importCourse($row)
    {
        $courseService = new \App\Services\CourseService();
        // Sanitize data using the same logic as CursoController via Service
        
        $wp_id = $row['ID_antigo'] ?? null;
        $title = $row['nome'] ?? $row['title'] ?? '';
        if (empty($title)) return 'skipped';
        
        // Check availability
        $existing = null;
        $slug = (string)$row['slug'];
        if ($slug) {
            $existing = Curso::where("nome",'=', $title)->first();
        }
        // if($existing){
        //     return 'exists';   
        // }
        $config = $row['config'] ?? [];
        $config['ID_antigo'] = (string)$wp_id;
        $config['origin_url'] = $row['origin_url'] ?? null;
        // Prepare initial attributes for Sanitization/Creation
        $attributes = [
            'nome' => $title,
            'titulo' => $title,
            'descricao' => $row['descricao_curso'] ?? $row['description'] ?? '',
            'ativo' => isset($row['status']) && $row['status'] === 'publish' ? 's' : 'n',
            'publicar' => isset($row['status']) && $row['status'] === 'publish' ? 's' : 'n',
            'valor' => $row['valor'] ?? $row['sale_price'] ?? 0,
            'inscricao' => $row['inscricao'] ?? 0,
            'modulos' => $row['modulos'] ?? [],
            'slug' => $row['slug'],
            'config' => $config,
        ];
        // if($title=='Comunicação Suplementar Alternativa na Prática'){
        //     dd($attributes);
        // }
        // Sanitize
        $attributes = $courseService->sanitizeCursoData($attributes);

        // Handle Slug generation if needed
        if (!$existing) {
             $courseModel = new Curso();
             $attributes['slug'] = $courseModel->generateSlug($title);
        }

        // Merge config if existing
        if ($existing) {
             $currentConfig = $existing->config ? (is_array($existing->config) ? $existing->config : json_decode($existing->config, true)) : [];
             $attributes['config'] = array_merge($currentConfig ?? [], $attributes['config']);
        }
        $attributes['config'] = json_encode($attributes['config']);
        
        // Clean modulos from attributes before create/update
        $modulesPayload = $attributes['modulos'] ?? [];
        // unset($attributes['modulos']);

        $curso = null;
        $status = '';
        if ($existing) {
            $existing->update($attributes);
            $curso = $existing;
            $status = 'updated';
        } else {
            $attributes['token'] = Qlib::token();
            $curso = Curso::create($attributes);
            $status = 'created';
        }

        // Upsert Modules and Activities using Service
        if (is_array($modulesPayload) && !empty($modulesPayload)) {
            $authorId = (string) (auth()->id() ?? 0);
            
            $upsertResult = $courseService->upsertModulesAndActivities($modulesPayload, $curso, $authorId);
            $curso->modulos = $upsertResult;
            $curso->save();
        }

        return $status;
    }

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
}

