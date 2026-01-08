<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\User;
use App\Models\Curso;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class UserImportController extends Controller
{
    /**
     * Import users or courses from JSON payload/URL.
     */
    public function import(Request $request)
    {
        ini_set('memory_limit', '512M');
        set_time_limit(300);

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

        return response()->json([
            'success' => true,
            'message' => "Import process finished for $type.",
            'details' => $stats
        ]);
    }

    /**
     * Import a single User/Client
     */
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

        if (!empty($row['password'])) {
            $attributes['password'] = $row['password'];
        }

        if ($existingUser) {
            if (empty($attributes['password'])) {
                unset($attributes['password']);
            }
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
            'valor' => $row['price'] ?? $row['sale_price'] ?? 0,
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

