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
                    // pt-BR: Mapeia conexões locais do WSL para o host Windows
                    // en-US: Maps local WSL connections to the Windows host gateway
                    if (str_contains($url, 'hair-api-old.localhost')) {
                        $gateway = trim(shell_exec("ip route show | grep default | awk '{print $3}'"));
                        if ($gateway) {
                            $targetUrl = str_replace('hair-api-old.localhost', $gateway, $url);
                            $response = Http::withHeaders(['Host' => 'hair-api-old.localhost'])->timeout(120)->get($targetUrl);
                        } else {
                            $response = Http::timeout(120)->get($url);
                        }
                    } else {
                        $response = Http::timeout(120)->get($url);
                    }
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
            $existingInvoicesMap = []; // Key: ID_antigo or id
            $existingTurmasMap = []; // Key: ID_antigo or id

            // 1. Users Map (Used by Users, Enrollments, Comments)
            if (in_array($type, ['users', 'enrollments', 'comments'])) {
                 $emails = [];
                 $cpfs = [];
                 $cnpjs = [];
                 $clientIds = [];
                 foreach ($data as $row) {
                      $r = $this->sanitizeInput($row);
                      if (!empty($r['email']) || !empty($r['user_email']) || !empty($r['author_email'])) {
                         $emails[] = $r['email'] ?? $r['user_email'] ?? $r['author_email'];
                      }
                      if (!empty($r['cpf'])) $cpfs[] = $r['cpf'];
                      if (!empty($r['cnpj'])) $cnpjs[] = $r['cnpj'];
                      if (!empty($r['id_cliente'])) $clientIds[] = (string)$r['id_cliente'];
                      if (!empty($r['id_antigo'])) $clientIds[] = (string)$r['id_antigo'];
                      if (!empty($r['id']) && $type === 'users') $clientIds[] = (string)$r['id'];
                 }
                 
                 if (!empty($emails) || !empty($cpfs) || !empty($cnpjs) || !empty($clientIds)) {
                      $users = User::query()->where(function($q) use ($emails, $cpfs, $cnpjs, $clientIds) {
                          if (!empty($emails)) $q->whereIn('email', array_unique($emails));
                          if (!empty($cpfs)) $q->orWhereIn('cpf', array_unique($cpfs));
                          if (!empty($cnpjs)) $q->orWhereIn('cnpj', array_unique($cnpjs));
                          if (!empty($clientIds)) {
                              $q->orWhereIn('config->ID_antigo', array_unique($clientIds));
                              $q->orWhereIn('id', array_unique($clientIds));
                          }
                      })->get();

                      foreach ($users as $u) {
                          if ($u->email) $existingUsersMap['email'][$u->email] = $u;
                          if ($u->cpf) $existingUsersMap['cpf'][$u->cpf] = $u;
                          if ($u->cnpj) $existingUsersMap['cnpj'][$u->cnpj] = $u;
                          
                          $uConfig = $u->config;
                          if (is_string($uConfig)) $uConfig = json_decode($uConfig, true);
                          $legacyId = $uConfig['ID_antigo'] ?? null;
                          if ($legacyId) {
                              $existingUsersMap['id_antigo'][(string)$legacyId] = $u;
                          }
                          $existingUsersMap['id'][(string)$u->id] = $u;
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
                $userIds = [];
                if (isset($existingUsersMap['email'])) {
                    foreach ($existingUsersMap['email'] as $u) $userIds[] = $u->id;
                }
                if (isset($existingUsersMap['id_antigo'])) {
                    foreach ($existingUsersMap['id_antigo'] as $u) $userIds[] = $u->id;
                }
                $userIds = array_unique($userIds);

                $enrollmentLegacyIds = [];
                foreach ($data as $row) {
                    $r = $this->sanitizeInput($row);
                    $lid = $r['id_antigo'] ?? $r['id'] ?? null;
                    if ($lid) $enrollmentLegacyIds[] = (string)$lid;
                }

                $enrollments = \App\Models\Matricula::where(function($q) use ($userIds, $enrollmentLegacyIds) {
                    if (!empty($userIds)) {
                        $q->whereIn('id_cliente', $userIds);
                    }
                    if (!empty($enrollmentLegacyIds)) {
                        $q->orWhereIn('config->ID_antigo', $enrollmentLegacyIds);
                    }
                })->get();

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

            // 6. Invoices Map (Used by Invoices)
            if ($type === 'invoices') {
                 $invoiceLegacyIds = [];
                 foreach ($data as $row) {
                     $r = $this->sanitizeInput($row);
                     if (!empty($r['id'])) $invoiceLegacyIds[] = (string)$r['id'];
                 }
                 
                 if (!empty($invoiceLegacyIds)) {
                      $invoices = \App\Models\FinancialAccount::withoutGlobalScopes()
                          ->where(function($q) use ($invoiceLegacyIds) {
                              $q->whereIn('config->ID_antigo', array_unique($invoiceLegacyIds))
                                ->orWhereIn('id', array_unique($invoiceLegacyIds));
                          })->get();
                          
                      foreach ($invoices as $inv) {
                           $existingInvoicesMap['id'][(string)$inv->id] = $inv;
                           $invConfig = $inv->config;
                           if (is_string($invConfig)) $invConfig = json_decode($invConfig, true);
                           $legacyId = $invConfig['ID_antigo'] ?? null;
                           if ($legacyId) {
                                $existingInvoicesMap['id_antigo'][(string)$legacyId] = $inv;
                           }
                      }
                 }
            }

            // 7. Turmas Map (Used by Turmas)
            if ($type === 'turmas') {
                 $turmaLegacyIds = [];
                 $courseLegacyIds = [];
                 foreach ($data as $row) {
                     $r = $this->sanitizeInput($row);
                     if (!empty($r['id'])) $turmaLegacyIds[] = (string)$r['id'];
                     if (!empty($r['id_curso'])) $courseLegacyIds[] = (string)$r['id_curso'];
                 }
                 
                 if (!empty($turmaLegacyIds)) {
                      $turmas = \App\Models\Turma::where(function($q) use ($turmaLegacyIds) {
                          $q->whereIn('config->ID_antigo', array_unique($turmaLegacyIds))
                            ->orWhereIn('id', array_unique($turmaLegacyIds));
                      })->get();
                      
                      foreach ($turmas as $t) {
                           $existingTurmasMap['id'][(string)$t->id] = $t;
                           $tConfig = $t->config;
                           if (is_string($tConfig)) $tConfig = json_decode($tConfig, true);
                           $legacyId = $tConfig['ID_antigo'] ?? null;
                           if ($legacyId) {
                                $existingTurmasMap['id_antigo'][(string)$legacyId] = $t;
                           }
                      }
                 }
                 
                 // Also load courses for resolution of id_curso
                 if (!empty($courseLegacyIds)) {
                      $courses = \App\Models\Curso::whereIn('config->ID_antigo', array_unique($courseLegacyIds))
                          ->orWhereIn('id', array_unique($courseLegacyIds))
                          ->get();
                      foreach ($courses as $c) {
                           $existingCoursesMap['id_antigo'][(string)($c->config['ID_antigo'] ?? '')] = $c;
                           $existingCoursesMap['id'][(string)$c->id] = $c;
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
                    } elseif ($type == 'invoices') {
                        $result = $this->importInvoice($row, $existingInvoicesMap);
                    } elseif ($type == 'turmas') {
                        $result = $this->importTurma($row, $existingCoursesMap, $existingTurmasMap);
                    } else {
                        $result = $this->importUser($row, $existingUsersMap);
                    }
                    
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
        
        // 1. Resolve Legacy/External ID of the enrollment itself
        $legacyId = $row['id_antigo'] ?? $row['id'] ?? null;
        
        // 2. Resolve User/Client
        $user = null;
        $userEmail = $row['user_email'] ?? $row['email'] ?? null;
        $id_cliente = $row['id_cliente'] ?? null;
        
        if ($userEmail) {
            if (isset($existingUsersMap['email'][$userEmail])) {
                $user = $existingUsersMap['email'][$userEmail];
            } else {
                $user = User::where('email', $userEmail)->first();
            }
        } elseif ($id_cliente) {
            if (isset($existingUsersMap['id_antigo'][(string)$id_cliente])) {
                $user = $existingUsersMap['id_antigo'][(string)$id_cliente];
            } elseif (isset($existingUsersMap['id'][(string)$id_cliente])) {
                $user = $existingUsersMap['id'][(string)$id_cliente];
            } else {
                $user = User::where('config->ID_antigo', (string)$id_cliente)->first();
                if (!$user) {
                    $user = User::find($id_cliente);
                }
            }
        }
        
        if (!$user) {
            Log::warning("ImportEnrollment: skipped because user could not be resolved", [
                'id_cliente' => $id_cliente,
                'user_email' => $userEmail,
                'row_id' => $legacyId
            ]);
            return 'skipped';
        }
        
        // 3. Resolve Course
        $course = null;
        $courseIdWp = $row['course_id_wp'] ?? null;
        $id_curso = $row['id_curso'] ?? null;
        
        if ($courseIdWp) {
            $course = $this->findCourseByExternalId($courseIdWp, $existingCoursesMap);
        } elseif ($id_curso) {
            if (isset($existingCoursesMap['id_antigo'][(string)$id_curso])) {
                $course = $existingCoursesMap['id_antigo'][(string)$id_curso];
            } elseif (isset($existingCoursesMap['id'][(string)$id_curso])) {
                $course = $existingCoursesMap['id'][(string)$id_curso];
            } else {
                $course = $this->findCourseByExternalId($id_curso, $existingCoursesMap);
                if (!$course) {
                    $course = Curso::find($id_curso);
                }
            }
        }
        
        if (!$course) {
            Log::warning("ImportEnrollment: skipped because course could not be resolved", [
                'id_curso' => $id_curso,
                'course_id_wp' => $courseIdWp,
                'row_id' => $legacyId
            ]);
            return 'skipped';
        }

        // 4. Resolve Status and Situation
        $statusRaw = strtolower(trim((string)($row['status'] ?? '')));
        $startAtRaw = $row['start_at'] ?? $row['created_at'] ?? $row['criado_em'] ?? null;
        $endAtRaw = $row['end_at'] ?? null;
        
        $status = 'a';
        $situacaoId = null;
        
        if ($statusRaw) {
            $statusAndSit = $this->mapEnrollmentStatusAndSituation($statusRaw, $startAtRaw);
            $status = $statusAndSit[0];
            $situacaoId = $statusAndSit[1];
        } else {
            $ativoVal = $row['ativo'] ?? null;
            $situacaoIdLegacy = $row['situacao_id'] ?? null;
            
            if ($ativoVal === 'n' || $ativoVal === '0' || $ativoVal === false) {
                $status = 'p'; // Inativo / Pendente
                $situacaoId = 24; // Contrato cancelado
            } else {
                $status = 'a'; // Ativo
                $situacaoId = 17; // Matriculado
            }
            
            if ($situacaoIdLegacy && is_numeric($situacaoIdLegacy)) {
                $exists = \App\Models\EnrollmentSituation::where('id', (int)$situacaoIdLegacy)->exists();
                if ($exists) {
                    $situacaoId = (int)$situacaoIdLegacy;
                }
            }
            
            if ($situacaoId === null) {
                $default = (int) (Qlib::qoption('default_proposal_situacao_id') ?? 0);
                if ($default > 0) {
                    $situacaoId = $default;
                }
            }
        }
        
        // 5. Resolve Turma
        $id_turma = 0;
        $row_id_turma = $row['id_turma'] ?? null;
        if ($row_id_turma && $row_id_turma != '0') {
            $turmaObj = \App\Models\Turma::where('config->ID_antigo', (string)$row_id_turma)->first();
            if (!$turmaObj) {
                $turmaObj = \App\Models\Turma::find($row_id_turma);
            }
            if ($turmaObj) {
                $id_turma = $turmaObj->id;
            }
        }

        // 6. Resolve Existing Enrollment
        $existing = null;
        if ($legacyId && isset($existingEnrollmentsMap['id_antigo'][(string)$legacyId])) {
            $existing = $existingEnrollmentsMap['id_antigo'][(string)$legacyId];
        }
        if (!$existing) {
             $key = $user->id . ':' . $course->id;
             if (isset($existingEnrollmentsMap['composite'][$key])) {
                  $existing = $existingEnrollmentsMap['composite'][$key];
             }
        }
        if (!$existing) {
            if ($legacyId) {
                $existing = \App\Models\Matricula::where('config->ID_antigo', (string)$legacyId)->first();
            }
            if (!$existing) {
                $existing = \App\Models\Matricula::where('id_cliente', (string)$user->id)
                    ->where('id_curso', (int)$course->id)
                    ->first();
            }
        }

        $config = [
            'ID_antigo' => $legacyId ? (string)$legacyId : null,
            'order_id_wp' => $row['order_id_wp'] ?? $row['id'] ?? null,
            'course_id_wp' => (string)($courseIdWp ?? $id_curso),
            'source' => 'external',
        ];
        
        $coursePrice = null;
        if (isset($row['total']) && is_numeric($row['total'])) {
            $coursePrice = (float)$row['total'];
        } else {
            $coursePriceRaw = $course->valor ?? null;
            if ($coursePriceRaw === null || $coursePriceRaw === '' || !is_numeric(str_replace(',', '.', (string)$coursePriceRaw))) {
                $coursePriceRaw = $course->inscricao ?? null;
            }
            if ($coursePriceRaw !== null && $coursePriceRaw !== '') {
                $coursePrice = (float) str_replace(',', '.', (string)$coursePriceRaw);
            }
        }
        
        $attributes = [
            'id_cliente' => (string)$user->id,
            'id_curso' => (int)$course->id,
            'id_turma' => $id_turma,
            'status' => $status,
            'ativo' => $status === 'p' ? 'n' : 's',
            'situacao_id' => $situacaoId,
            'config' => $config,
            'subtotal' => $coursePrice,
            'total' => $coursePrice,
            'desconto' => isset($row['desconto']) && is_numeric($row['desconto']) ? (float)$row['desconto'] : 0.00,
            'inscricao' => isset($row['inscricao']) && is_numeric($row['inscricao']) ? (float)$row['inscricao'] : 0.00,
            'obs' => $row['obs'] ?? '',
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
            Log::info("ImportEnrollment: updated enrollment", ['id' => $existing->id, 'legacy_id' => $legacyId]);
            return 'updated';
        } else {
            $attributes['token'] = Qlib::token();
            $mat = new \App\Models\Matricula($attributes);
            if ($startAt) $mat->data = $startAt;
            else $mat->data = \Carbon\Carbon::now();
            if ($endAt) $mat->validade_acesso = $endAt;
            $mat->save();
            Log::info("ImportEnrollment: created new enrollment", ['id' => $mat->id, 'legacy_id' => $legacyId]);
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
        $legacyId = $row['id'] ?? $row['id_antigo'] ?? null;

        if (empty($email) && empty($cpf) && empty($cnpj) && empty($legacyId)) {
            return 'skipped';
        }

        // Try to find in map first
        $existingUser = null;
        
        if ($legacyId && isset($existingUsersMap['id_antigo'][(string)$legacyId])) {
            $existingUser = $existingUsersMap['id_antigo'][(string)$legacyId];
        } elseif ($email && isset($existingUsersMap['email'][$email])) {
            $existingUser = $existingUsersMap['email'][$email];
        } elseif ($cpf && isset($existingUsersMap['cpf'][$cpf])) {
             $existingUser = $existingUsersMap['cpf'][$cpf];
        } elseif ($cnpj && isset($existingUsersMap['cnpj'][$cnpj])) {
             $existingUser = $existingUsersMap['cnpj'][$cnpj];
        }

        // Fallback to query if map not provided or empty (legacy behavior support)
        if (!$existingUser && empty($existingUsersMap)) {
            if ($legacyId) {
                $existingUser = User::where('config->ID_antigo', (string)$legacyId)->first();
            }
            if (!$existingUser) {
                $query = User::query();
                $query->where(function($q) use ($email, $cpf, $cnpj) {
                    if ($email) $q->where('email', $email);
                    if ($cpf) $q->orWhere('cpf', $cpf);
                    if ($cnpj) $q->orWhere('cnpj', $cnpj);
                });
                $existingUser = $query->first();
            }
        }

        // Extract name
        $nome = $row['nome'] ?? '';
        $sobrenome = $row['sobrenome'] ?? '';
        $name = trim($nome . ' ' . $sobrenome);
        if (empty($name)) {
            $name = $row['name'] ?? '';
        }

        // Status mapping
        $ativoVal = $row['ativo'] ?? null;
        $status = 'actived';
        if ($ativoVal === 'n' || $ativoVal === '0' || $ativoVal === false || (isset($row['status']) && $row['status'] === 'inactive')) {
            $status = 'inactive';
        }

        // Config mapping
        $config = is_array($row['config'] ?? null) ? $row['config'] : [];
        if ($legacyId) {
            $config['ID_antigo'] = (string)$legacyId;
        }
        if (isset($row['celular'])) {
            $config['celular'] = $row['celular'];
        }
        if (isset($row['telefone'])) {
            $config['telefone_residencial'] = $row['telefone'];
        }
        if (isset($row['endereco'])) {
            $config['endereco'] = $row['endereco'];
            $config['numero'] = $row['numero'] ?? '';
            $config['bairro'] = $row['bairro'] ?? '';
            $config['cidade'] = $row['cidade'] ?? '';
            $config['uf'] = $row['uf'] ?? '';
            $config['cep'] = $row['cep'] ?? '';
        }
        if (isset($row['data_nascimento'])) {
            $config['nascimento'] = $row['data_nascimento'];
        }
        if (isset($row['profissao'])) {
            $config['profissao'] = $row['profissao'];
        }

        $attributes = [
            'name' => $name,
            'email' => $email,
            'cpf' => $cpf,
            'cnpj' => $cnpj,
            'tipo_pessoa' => $row['tipo_pessoa'] ?? 'pf',
            'genero' => $row['genero'] ?? 'ni',
            'status' => $status,
            'ativo' => $status === 'actived' ? 's' : 'n',
            'config' => json_encode($config),
        ];

        if (empty($attributes['cpf'])) $attributes['cpf'] = null;
        if (empty($attributes['cnpj'])) $attributes['cnpj'] = null;
        if (empty($attributes['email'])) $attributes['email'] = null;

        if ($this->defaultPasswordHash === null) {
            $this->defaultPasswordHash = Hash::make('mudar12@3');
        }
        $attributes['password'] = $this->defaultPasswordHash;

        if ($existingUser) {
            $existingUser->update($attributes);
            return 'updated';
        } else {
            $attributes['token'] = Qlib::token();
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

    private function importInvoice($row, $existingInvoicesMap = [])
    {
        $row = $this->sanitizeInput($row);
        $legacyId = $row['id'] ?? null;
        $matriculaIdLegacy = $row['matricula_id'] ?? null;
        $idClienteLegacy = $row['id_cliente'] ?? null;
        $valorRaw = $row['valor'] ?? null;
        $vencimentoRaw = $row['vencimento'] ?? null;
        $pagoRaw = $row['pago'] ?? null; // 'Sim' or 'Não'
        $dataPagamentoRaw = $row['data_pagamento'] ?? null;
        $descricao = $row['descricao'] ?? '';

        if (!$legacyId) {
            return 'skipped';
        }

        // 1. Resolve Enrollment/Matricula
        $enrollment = null;
        if ($matriculaIdLegacy) {
            $enrollment = \App\Models\Matricula::where('config->ID_antigo', (string)$matriculaIdLegacy)->first();
            if (!$enrollment) {
                // Try direct primary key lookup if they share same database IDs
                $enrollment = \App\Models\Matricula::find($matriculaIdLegacy);
            }
        }

        // 2. Resolve Client/User
        $client = null;
        if ($enrollment) {
            $client = $enrollment->student;
        }
        if (!$client && $idClienteLegacy) {
            $client = \App\Models\User::where('config->ID_antigo', (string)$idClienteLegacy)->first();
            if (!$client) {
                $client = \App\Models\User::find($idClienteLegacy);
            }
        }

        // 3. Status mapping
        $status = 'pending';
        if (is_string($pagoRaw)) {
            $pagoClean = strtolower(trim($pagoRaw));
            if ($pagoClean === 'sim' || $pagoClean === 's' || $pagoClean === '1') {
                $status = 'paid';
            }
        }

        // 4. Dates mapping
        $dueDate = null;
        if ($vencimentoRaw) {
            try { $dueDate = \Carbon\Carbon::parse($vencimentoRaw)->format('Y-m-d'); } catch (\Throwable $e) {}
        }
        
        $paymentDate = null;
        if ($dataPagamentoRaw && !str_starts_with($dataPagamentoRaw, '-0001')) {
            try { $paymentDate = \Carbon\Carbon::parse($dataPagamentoRaw)->format('Y-m-d'); } catch (\Throwable $e) {}
        }

        $amount = (float)($valorRaw ?? 0.00);

        // 5. Config mapping
        $config = [
            'ID_antigo' => (string)$legacyId,
            'matricula_id' => $enrollment ? $enrollment->id : null,
            'matricula_id_antigo' => $matriculaIdLegacy ? (string)$matriculaIdLegacy : null,
            'ref_compra' => $row['ref_compra'] ?? null,
            'local' => $row['local'] ?? null,
            'categoria' => $row['categoria'] ?? null,
            'source' => 'external',
        ];

        // 6. Check existing invoice
        $existing = null;
        if (isset($existingInvoicesMap['id_antigo'][(string)$legacyId])) {
            $existing = $existingInvoicesMap['id_antigo'][(string)$legacyId];
        } else {
            $existing = \App\Models\FinancialAccount::withoutGlobalScopes()
                ->where('config->ID_antigo', (string)$legacyId)
                ->first();
        }

        $attributes = [
            'amount' => $amount,
            'type' => 'receivable', // Contas a receber
            'customer_name' => $row['cliente_nome'] ?? ($client ? $client->name : ''),
            'client_id' => $client ? $client->id : null,
            'description' => strip_tags($descricao),
            'due_date' => $dueDate,
            'status' => $status,
            'paid_amount' => $status === 'paid' ? $amount : 0.00,
            'payment_date' => $paymentDate,
            'config' => $config,
        ];

        if ($existing) {
            $existing->update($attributes);
            Log::info("ImportInvoice: updated invoice", ['id' => $existing->id, 'legacy_id' => $legacyId]);
            return 'updated';
        } else {
            $attributes['token'] = Qlib::token();
            $newInvoice = \App\Models\FinancialAccount::create($attributes);
            Log::info("ImportInvoice: created new invoice", ['id' => $newInvoice->id, 'legacy_id' => $legacyId]);
            return 'created';
        }
    }

    private function importTurma($row, $existingCoursesMap = [], $existingTurmasMap = [])
    {
        $row = $this->sanitizeInput($row);
        $legacyId = $row['id'] ?? null;
        $idCursoLegacy = $row['id_curso'] ?? null;
        $nome = $row['nome'] ?? null;
        $inicioRaw = $row['inicio'] ?? null;
        $fimRaw = $row['fim'] ?? null;
        $maxAlunos = (int)($row['max_alunos'] ?? 0);
        $ativo = filter_var($row['ativo'] ?? true, FILTER_VALIDATE_BOOLEAN);

        if (!$legacyId || !$nome) {
            return 'skipped';
        }

        // 1. Resolve Course
        $course = null;
        if ($idCursoLegacy) {
            if (isset($existingCoursesMap['id_antigo'][(string)$idCursoLegacy])) {
                $course = $existingCoursesMap['id_antigo'][(string)$idCursoLegacy];
            } else {
                $course = \App\Models\Curso::where('config->ID_antigo', (string)$idCursoLegacy)->first();
                if (!$course) {
                    $course = \App\Models\Curso::find($idCursoLegacy);
                }
            }
        }

        if (!$course) {
            Log::warning("ImportTurma: skipped class legacy ID {$legacyId} because linked course legacy ID {$idCursoLegacy} was not found.");
            return 'skipped';
        }

        // 2. Parse Dates helper
        $parseDate = function($val) {
            if (empty($val)) return null;
            try {
                if (str_contains($val, '/')) {
                    return \Carbon\Carbon::createFromFormat('d/m/Y', $val)->format('Y-m-d');
                }
                return \Carbon\Carbon::parse($val)->format('Y-m-d');
            } catch (\Throwable $e) {
                return null;
            }
        };

        $inicio = $parseDate($inicioRaw);
        $fim = $parseDate($fimRaw);

        // 3. Config mapping
        $config = [
            'ID_antigo' => (string)$legacyId,
            'curso_nome' => $row['curso'] ?? null,
            'matriculados_legacy' => $row['matriculados'] ?? 0,
            'source' => 'external',
        ];

        // 4. Check existing class
        $existing = null;
        if (isset($existingTurmasMap['id_antigo'][(string)$legacyId])) {
            $existing = $existingTurmasMap['id_antigo'][(string)$legacyId];
        } else {
            $existing = \App\Models\Turma::where('config->ID_antigo', (string)$legacyId)->first();
        }

        $attributes = [
            'id_curso' => $course->id,
            'nome' => $nome,
            'inicio' => $inicio,
            'fim' => $fim,
            'max_alunos' => $maxAlunos,
            'ativo' => $ativo ? 's' : 'n',
            'config' => $config,
        ];

        if ($existing) {
            $existing->update($attributes);
            Log::info("ImportTurma: updated class", ['id' => $existing->id, 'legacy_id' => $legacyId]);
            return 'updated';
        } else {
            $attributes['token'] = Qlib::token();
            $newTurma = \App\Models\Turma::create($attributes);
            Log::info("ImportTurma: created new class", ['id' => $newTurma->id, 'legacy_id' => $legacyId]);
            return 'created';
        }
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

