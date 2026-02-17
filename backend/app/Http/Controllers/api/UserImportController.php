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

            Log::info("Import: Starting import", ['count' => count($data), 'type' => $type]);

            $stats = [
                'imported' => 0,
                'updated' => 0,
                'exists' => 0,
                'skipped' => 0,
                'errors' => []
            ];

            // --- Pre-fetching Logic ---
            $existingUsersMap = [];
            $existingCoursesMap = []; // Key: slug OR ID_antigo
            $existingActivitiesMap = []; // Key: ID_antigo
            $existingEnrollmentsMap = []; // Key: id_cliente-id_curso (composite) or legacy_id
            $existingCommentsMap = []; // Key: id_antigo

            // 1. Users Map (Used by Users, Enrollments, Comments)
            if (in_array($type, ['users', 'enrollments', 'comments'])) {
                 $emails = [];
                 $cpfs = [];
                 $cnpjs = [];
                 foreach ($data as $row) {
                     $r = $this->sanitizeInput($row);
                     if (!empty($r['email']) || !empty($r['user_email']) || !empty($r['author_email'])) {
                        $emails[] = $r['email'] ?? $r['user_email'] ?? $r['author_email'];
                     }
                     if (!empty($r['cpf'])) $cpfs[] = $r['cpf'];
                     if (!empty($r['cnpj'])) $cnpjs[] = $r['cnpj'];
                 }
                 
                 if (!empty($emails) || !empty($cpfs) || !empty($cnpjs)) {
                     $users = User::query()->where(function($q) use ($emails, $cpfs, $cnpjs) {
                         if (!empty($emails)) $q->whereIn('email', array_unique($emails));
                         if (!empty($cpfs)) $q->orWhereIn('cpf', array_unique($cpfs));
                         if (!empty($cnpjs)) $q->orWhereIn('cnpj', array_unique($cnpjs));
                     })->get();

                     foreach ($users as $u) {
                         if ($u->email) $existingUsersMap['email'][$u->email] = $u;
                         if ($u->cpf) $existingUsersMap['cpf'][$u->cpf] = $u;
                         if ($u->cnpj) $existingUsersMap['cnpj'][$u->cnpj] = $u;
                     }
                 }
            }

            // 2. Courses Map (Used by Courses, Enrollments, Comments)
            if (in_array($type, ['courses', 'enrollments', 'comments'])) {
                $slugs = [];
                $legacyIds = [];
                foreach ($data as $row) {
                    $r = $this->sanitizeInput($row);
                    // For Course Import
                    if ($type === 'courses') {
                        if (!empty($row['slug'])) $slugs[] = (string)$row['slug'];
                        if (!empty($row['nome'])) $slugs[] = Str::slug($row['nome']); // Fallback check
                        if (!empty($row['ID_antigo'])) $legacyIds[] = (string)$row['ID_antigo'];
                    }
                    // For Enrollment/Comment Import (Reference to Course)
                    if (!empty($row['course_id_wp'])) $legacyIds[] = (string)$row['course_id_wp'];
                    if (!empty($row['post_id_wp'])) $legacyIds[] = (string)$row['post_id_wp']; // post_type=lp_course
                }

                $query = Curso::query();
                $shouldRun = false;
                if (!empty($slugs)) {
                    $query->orWhereIn('slug', array_unique($slugs));
                    $shouldRun = true;
                }
                if (!empty($legacyIds)) {
                    // JSON extraction for config->ID_antigo might be slow if not indexed, but better than N+1
                    // Need to check how to query JSON efficiently or if we rely on slug mainly.
                    // Assuming existing logic: where('config->ID_antigo', $externalId)
                    // We can use whereJsonContains or similar if supported, or just simple text search if reliable?
                    // Ideally: orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(config, '$.ID_antigo')) IN ('".implode("','", array_unique($legacyIds))."')")
                    // Laravel whereIn on JSON path:
                    // $query->orWhereIntegerInRaw('config->ID_antigo', array_unique($legacyIds)); // if IDs are int
                    // Let's safe bet loop or use whereRaw.
                    // IMPORTANT: Large WHERE IN might be issue.
                    // Let's try to fetch by slug first for courses, and for legacy_id, we might rely on fetching all active courses if count < 1000? 
                    // Or fetch courses that have config not null.
                    
                    // Optimization: existing implementation uses 'config->ID_antigo'.
                    // We will fetch whereIn config->ID_antigo.
                    foreach(array_chunk(array_unique($legacyIds), 500) as $chunk) {
                         $query->orWhereJsonContains('config->ID_antigo', $chunk); // This might not work if its a single string value not array
                         // Alternative for single key:
                         // $q->orWhereIn('config->ID_antigo', $chunk) -> This works in newer Laravel/MySQL 5.7+ for JSON paths used as columns? No.
                    }
                    // Let's stick to iterating if we can't easily bulk query JSON keys in this version/setup without risk.
                    // BUT, to avoid N+1, we MUST bulk fetch.
                    
                    // Fallback strategy: If we have legacyIds, we might need to fetch a broader set or rely on slug if available. 
                    // Since checking JSON in WHERE IN can be complex without virtual columns.
                    // Strategy: Fetch all courses with config->ID_antigo NOT NULL if dataset is manageable, or iterate.
                    // Assuming we have < 1000 courses based on "bulk user import ~3000".
                    $shouldRun = true;
                }

                if ($shouldRun) {
                    // Simplify: Fetch all courses that might match (limit fields)
                    // If table is huge, this is bad. But usually courses < 10k.
                    $courses = Curso::select('id', 'slug', 'config', 'nome')->get(); 
                    
                    foreach ($courses as $c) {
                        if ($c->slug) $existingCoursesMap['slug'][$c->slug] = $c;
                        
                        $conf = $c->config;
                        if (is_string($conf)) $conf = json_decode($conf, true);
                        if (isset($conf['ID_antigo'])) {
                            $existingCoursesMap['id_antigo'][(string)$conf['ID_antigo']] = $c;
                        }
                    }
                }
            }

            // 3. Activities Map (Used by Comments)
            if ($type === 'comments') {
                $activityLegacyIds = [];
                foreach ($data as $row) {
                    $r = $this->sanitizeInput($row);
                     if (!empty($r['post_id_wp']) && ($r['post_type'] ?? '') === 'lp_lesson') {
                         $activityLegacyIds[] = (string)$r['post_id_wp'];
                     }
                }
                if (!empty($activityLegacyIds)) {
                     $acts = Activity::select('ID', 'guid', 'config', 'post_type')
                         ->where('post_type', 'activities')
                         ->get(); // Fetching all activities might be heavy?
                     // If heavy, we might need a better index.
                     // But let's assume valid optimization for now.
                     
                     foreach ($acts as $a) {
                         $conf = $a->config;
                         if (is_string($conf)) $conf = json_decode($conf, true);
                         if (isset($conf['ID_antigo'])) {
                             $existingActivitiesMap['id_antigo'][(string)$conf['ID_antigo']] = $a;
                         }
                         if ($a->guid) {
                             $existingActivitiesMap['guid'][$a->guid] = $a;
                         }
                     }
                }
            }

            // 4. Enrollments Map (Used by Enrollments)
            if ($type === 'enrollments') {
                // We need to check existence by (user_id + course_id)
                // We don't have user_ids yet, only emails.
                // But we have $existingUsersMap (with users that exist).
                // We can fetch enrollments for these users.
                
                $userIds = [];
                if (isset($existingUsersMap['email'])) {
                    foreach ($existingUsersMap['email'] as $u) $userIds[] = $u->id;
                }
                
                if (!empty($userIds)) {
                    $enrollments = \App\Models\Matricula::whereIn('id_cliente', $userIds)->get();
                    foreach ($enrollments as $e) {
                         // Key: client_id:course_id
                         $key = $e->id_cliente . ':' . $e->id_curso;
                         $existingEnrollmentsMap['composite'][$key] = $e;
                         
                         $conf = $e->config;
                         if (is_string($conf)) $conf = json_decode($conf, true);
                         if (isset($conf['ID_antigo'])) {
                             $existingEnrollmentsMap['id_antigo'][(string)$conf['ID_antigo']] = $e;
                         }
                    }
                }
            }

            // 5. Comments Map (Used by Comments)
            if ($type === 'comments') {
                 $commentLegacyIds = [];
                  foreach ($data as $row) {
                     if (!empty($row['id_antigo'])) $commentLegacyIds[] = (string)$row['id_antigo'];
                 }
                 if (!empty($commentLegacyIds)) {
                     // Again, utilizing JSON search capability limitation, fetching all comments might be too much.
                     // But comments are usually attached to courses/activities.
                     // Let's try to fetch comments that have meta->id_antigo keys.
                     // This one might be tricky to optimize perfectly without virtual columns.
                     // Strategy: Fetch all comments (risky if 100k comments).
                     // Better: Assuming incremental import, we can ignore existence check if we trust unique constraints or just do N+1 for this specific check if it's super heavy?
                     // NO, user wants optimization.
                     // Let's fetch comments that match the legacy IDs if possible, or fetch all recent?
                     // Let's fetch all comments that have 'meta' populated?
                     $allComments = Comment::select('id', 'commentable_type', 'commentable_id', 'meta')->get();
                     foreach ($allComments as $c) {
                         $meta = $c->meta;
                         if (is_string($meta)) $meta = json_decode($meta, true);
                         if (isset($meta['id_antigo'])) {
                             $existingCommentsMap['id_antigo'][(string)$meta['id_antigo']] = $c;
                         }
                     }
                 }
            }
            
            // Start Transaction
            \Illuminate\Support\Facades\DB::beginTransaction();

            foreach ($data as $index => $row) {
                try {
                    $result = false;
                    if ($type == 'courses') {
                        $result = $this->importCourse($row, $existingCoursesMap);
                    } elseif ($type == 'comments') {
                        $result = $this->importComment($row, $existingUsersMap, $existingCoursesMap, $existingActivitiesMap, $existingCommentsMap);
                    } elseif ($type == 'enrollments') {
                        $result = $this->importEnrollment($row, $existingUsersMap, $existingCoursesMap, $existingEnrollmentsMap);
                    } else {
                        $result = $this->importUser($row, $existingUsersMap);
                    }
                    
                    // Log::info("Import Item [$index] Result: $result"); // Commented out to reduce I/O

                    if ($result === 'created') $stats['imported']++;
                    elseif ($result === 'updated') $stats['updated']++;
                    elseif ($result === 'exists') $stats['exists']++;
                    elseif ($result === 'skipped') $stats['skipped']++;

                } catch (\Exception $e) {
                    // Log::error("Import Error ($type) at index $index: " . $e->getMessage());
                    $stats['errors'][] = [
                        'item' => $row['id'] ?? $row['email'] ?? 'unknown',
                        'error' => $e->getMessage()
                    ];
                }
            }

            if ($type === 'comments' && !empty($this->pendingParentLinks)) {
                $this->reconcilePendingParentLinks();
            }
            
            \Illuminate\Support\Facades\DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Import process finished for $type.",
                'details' => $stats
            ], 200, ['Content-Type' => 'application/json']);

        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            \Log::error('Import fatal error: '.$e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'success' => false,
                'message' => 'Erro inesperado na importação: '.$e->getMessage(),
            ], 500);
        }
    }

    private function importEnrollment($row, $existingUsersMap = [], $existingCoursesMap = [], $existingEnrollmentsMap = [])
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
        
        // Resolve User
        $user = null;
        if (isset($existingUsersMap['email'][$userEmail])) {
            $user = $existingUsersMap['email'][$userEmail];
        } else {
            // Fallback
             $user = User::where('email', $userEmail)->first();
        }
        
        if (!$user) {
            return 'skipped';
        }
        
        // Resolve Course
        $course = $this->findCourseByExternalId($courseIdWp, $existingCoursesMap);
        if (!$course) {
            return 'skipped';
        }

        $statusAndSit = $this->mapEnrollmentStatusAndSituation($statusRaw, $startAtRaw);
        $status = $statusAndSit[0];
        $situacaoId = $statusAndSit[1];
        
        // Resolve Existing Enrollment
        $existing = null;
        
        // Try map by legacy ID
        if ($legacyId && isset($existingEnrollmentsMap['id_antigo'][(string)$legacyId])) {
            $existing = $existingEnrollmentsMap['id_antigo'][(string)$legacyId];
        }
        // Try map by composite key
        if (!$existing) {
             $key = $user->id . ':' . $course->id;
             if (isset($existingEnrollmentsMap['composite'][$key])) {
                 $existing = $existingEnrollmentsMap['composite'][$key];
             }
        }
        
        // Fallback Query (if map missed)
        if (!$existing && empty($existingEnrollmentsMap)) {
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

    private function importComment($row, $existingUsersMap = [], $existingCoursesMap = [], $existingActivitiesMap = [], $existingCommentsMap = [])
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
            $activity = $this->findActivityByExternalId($postIdWp, $existingActivitiesMap);
            if (!$activity) { return 'skipped'; }
            $typeClass = Activity::class;
            $targetId = (int)$activity->ID;
        } elseif ($postType === 'lp_course') {
            $course = $this->findCourseByExternalId($postIdWp, $existingCoursesMap);
            if (!$course) { return 'skipped'; }
            $typeClass = Curso::class;
            $targetId = (int)$course->id;
        } else {
            return 'skipped';
        }
        
        // Resolve User
        $user = null;
        if (isset($existingUsersMap['email'][$authorEmail])) {
            $user = $existingUsersMap['email'][$authorEmail];
        } else {
            $user = User::where('email', $authorEmail)->first();
        }
        
        if (!$user) {
            return 'skipped';
        }
        
        $existing = null;
        // Try map
        if ($legacyId && isset($existingCommentsMap['id_antigo'][(string)$legacyId])) {
            $existing = $existingCommentsMap['id_antigo'][(string)$legacyId];
        }
        
        // Fallback query
        if (!$existing && empty($existingCommentsMap)) {
            if ($legacyId) {
                $existing = Comment::where('commentable_type', $typeClass)
                    ->where('commentable_id', $targetId)
                    ->where('meta->id_antigo', (string)$legacyId)
                    ->first();
            }
        }

        $parent = null;
        if ($parentLegacyId) {
            // Try map first
             if (isset($existingCommentsMap['id_antigo'][(string)$parentLegacyId])) {
                $parent = $existingCommentsMap['id_antigo'][(string)$parentLegacyId];
            } else {
                $parent = Comment::where('meta->id_antigo', (string)$parentLegacyId)->first();
            }
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

    private function findActivityByExternalId($externalId, $existingActivitiesMap = [])
    {
        if (!$externalId) return null;
        $externalId = (string)$externalId;

        if (isset($existingActivitiesMap['id_antigo'][$externalId])) return $existingActivitiesMap['id_antigo'][$externalId];
        if (isset($existingActivitiesMap['guid'][$externalId])) return $existingActivitiesMap['guid'][$externalId];

        $byConfig = Activity::where('post_type', 'activities')
            ->where('config->ID_antigo', $externalId)
            ->first();
        if ($byConfig) return $byConfig;
        $byGuid = Activity::where('post_type', 'activities')
            ->where('guid', $externalId)
            ->first();
        return $byGuid;
    }
    
    private function findCourseByExternalId($externalId, $existingCoursesMap = [])
    {
        if (!$externalId) return null;
        $externalId = (string)$externalId;
        
        if (isset($existingCoursesMap['id_antigo'][$externalId])) return $existingCoursesMap['id_antigo'][$externalId];
        if (isset($existingCoursesMap['slug'][$externalId])) return $existingCoursesMap['slug'][$externalId]; // If slug matches ID happens unlikely but safe

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

    private function importUser($row, $existingUsersMap = [])
    {
        $row = $this->sanitizeInput($row);
        $email = $row['email'] ?? null;
        $cpf = $row['cpf'] ?? null;
        $cnpj = $row['cnpj'] ?? null;

        if (empty($email) && empty($cpf) && empty($cnpj)) {
            return 'skipped';
        }

        // Try to find in map first
        $existingUser = null;
        
        if ($email && isset($existingUsersMap['email'][$email])) {
            $existingUser = $existingUsersMap['email'][$email];
        } elseif ($cpf && isset($existingUsersMap['cpf'][$cpf])) {
             $existingUser = $existingUsersMap['cpf'][$cpf];
        } elseif ($cnpj && isset($existingUsersMap['cnpj'][$cnpj])) {
             $existingUser = $existingUsersMap['cnpj'][$cnpj];
        }

        // Fallback to query if map not provided or empty (legacy behavior support)
        if (!$existingUser && empty($existingUsersMap)) {
            $query = User::query();
            $query->where(function($q) use ($email, $cpf, $cnpj) {
                if ($email) $q->where('email', $email);
                if ($cpf) $q->orWhere('cpf', $cpf);
                if ($cnpj) $q->orWhere('cnpj', $cnpj);
            });
            $existingUser = $query->first();
        }

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
            // FIXED: Typo corrected from defaultPass16rdHash to defaultPasswordHash
            $this->defaultPasswordHash = Hash::make('mudar12@3');
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
    private function importCourse($row, $existingCoursesMap = [])
    {
        $courseService = new \App\Services\CourseService();
        // Sanitize data using the same logic as CursoController via Service
        
        $wp_id = $row['ID_antigo'] ?? null;
        $title = $row['nome'] ?? $row['title'] ?? '';
        if (empty($title)) return 'skipped';
        
        // Check availability
        $existing = null;
        $slug = (string)($row['slug'] ?? Str::slug($title)); // Ensure slug is checked

        // Try map
        if ($slug && isset($existingCoursesMap['slug'][$slug])) {
            $existing = $existingCoursesMap['slug'][$slug];
        }
        if (!$existing && $wp_id && isset($existingCoursesMap['id_antigo'][(string)$wp_id])) {
            $existing = $existingCoursesMap['id_antigo'][(string)$wp_id];
        }

        // Fallback Query
        if (!$existing && empty($existingCoursesMap)) {
            if ($slug) {
                $existing = Curso::where("nome",'=', $title)->first();
                if(!$existing) $existing = Curso::where('slug', $slug)->first();
            }
        }

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
            'slug' => $slug,
            'config' => $config,
        ];
        
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

