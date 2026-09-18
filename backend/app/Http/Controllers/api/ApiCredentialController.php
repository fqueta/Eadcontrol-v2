<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\ApiCredential;
use App\Models\ApiCredentialMeta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ApiCredentialController extends Controller
{
    /**
     * Valida se o usuário pertence ao Grupo 1 (Master / Superadmin).
     */
    protected function checkGroup1Access(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        $permissionId = (int) ($user->permission_id ?? 0);
        if ($permissionId !== 1) {
            return response()->json([
                'message' => 'Acesso negado. Apenas administradores do Grupo 1 podem gerenciar credenciais de integrações.',
                'permission_id' => $permissionId,
            ], 403);
        }

        return null;
    }

    /**
     * Busca credencial diretamente pelo slug para uso no painel.
     */
    public function getBySlug(Request $request, string $slug)
    {
        if ($deny = $this->checkGroup1Access($request)) {
            return $deny;
        }

        $credential = ApiCredential::with('metas')->where('slug', $slug)->first();
        if (!$credential) {
            return response()->json(['message' => 'Credencial não encontrada', 'exists' => false], 404);
        }

        // Não expor senha/segredos reais por completo no GET
        $config = $credential->config ?? [];
        if (isset($config['pass'])) $config['pass'] = '';
        if (isset($config['secret_access_key'])) $config['secret_access_key'] = '';
        $credential->config = $config;

        return response()->json([
            'exists' => true,
            'data' => $credential,
        ]);
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        if ($deny = $this->checkGroup1Access($request)) {
            return $deny;
        }

        $query = ApiCredential::query();

        if ($request->has('name')) {
            $query->where('name', 'like', '%' . $request->input('name') . '%');
        }

        if ($request->has('slug')) {
            $query->where('slug', $request->input('slug'));
        }

        $perPage = $request->input('per_page', 15);
        $credentials = $query->paginate($perPage);

        return response()->json($credentials);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        if ($deny = $this->checkGroup1Access($request)) {
            return $deny;
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:api_credentials,slug',
            'active' => 'boolean',
            'config' => 'nullable|array',
            'meta' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->only(['name', 'active', 'config']);
        $data['slug'] = $request->input('slug') ?: Str::slug($data['name']);

        // Encrypt password if present
        if (isset($data['config']['pass']) && !empty($data['config']['pass'])) {
            $data['config']['pass'] = Crypt::encryptString($data['config']['pass']);
        }

        DB::beginTransaction();
        try {
            $credential = ApiCredential::create($data);

            if ($request->has('meta')) {
                $providedKeys = [];
                $metas = $request->input('meta');
                
                // If meta is null or empty array, we might want to clear all metas?
                // The current logic only processes if array is provided.
                if (is_array($metas)) {
                    foreach ($metas as $meta) {
                        if (isset($meta['key']) && isset($meta['value'])) {
                            $credential->updateMeta($meta['key'], $meta['value']);
                            $providedKeys[] = $meta['key'];
                        }
                    }
                }

                // Remove metas not in the provided list
                // If providedKeys is empty, it means all metas should be deleted if 'meta' was present but empty
                $credential->metas()->whereNotIn('key', $providedKeys)->delete();
            }

            DB::commit();

            return response()->json([
                'message' => 'Credential created successfully',
                'data' => $credential->load('metas'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error creating credential', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, $id)
    {
        if ($deny = $this->checkGroup1Access($request)) {
            return $deny;
        }

        $credential = ApiCredential::with('metas')->find($id);

        if (!$credential) {
            return response()->json(['message' => 'Credential not found'], 404);
        }

        if ($credential) {
             $config = $credential->config;
             if (isset($config['pass'])) {
                 $config['pass'] = ''; // Return empty so it's not exposed
             }
             if (isset($config['secret_access_key'])) {
                 $config['secret_access_key'] = '';
             }
             $credential->config = $config;
        }

        return response()->json($credential);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        if ($deny = $this->checkGroup1Access($request)) {
            return $deny;
        }

        $credential = ApiCredential::find($id);

        if (!$credential) {
            return response()->json(['message' => 'Credential not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:255',
            'slug' => 'string|max:255|unique:api_credentials,slug,' . $id,
            'active' => 'boolean',
            'config' => 'nullable|array',
            'meta' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->only(['name', 'slug', 'active', 'config']);
        
        // Handle config update merging and password encryption
        if (isset($data['config'])) {
            $currentConfig = $credential->config ?? [];
            
            // If pass is provided, encrypt it. If it's empty/null, keep existing or remove?
            // Usually if not sent, we keep existing. If sent as empty, we might clear it.
            // Assumption: If 'pass' is sent and not empty, update it. If sent as null/empty, ignore or clear?
            // Let's assume if it's sent, we process it.
            if (isset($data['config']['pass'])) {
                 if (!empty($data['config']['pass'])) {
                     $data['config']['pass'] = Crypt::encryptString($data['config']['pass']);
                 } else {
                     unset($data['config']['pass']); 
                 }
            }

            if (isset($data['config']['secret_access_key'])) {
                 if (!empty($data['config']['secret_access_key'])) {
                     $data['config']['secret_access_key'] = Crypt::encryptString($data['config']['secret_access_key']);
                 } else {
                     unset($data['config']['secret_access_key']);
                 }
            }

            if (isset($data['config']['access_token'])) {
                 if (!empty($data['config']['access_token'])) {
                     $data['config']['access_token'] = Crypt::encryptString($data['config']['access_token']);
                 } else {
                     unset($data['config']['access_token']);
                 }
            }
            
            // Merge with existing config to ensure we don't lose other keys if partial config sent
            // But if full config sent, we replace.
            // Let's assume full config or at least we should be careful. 
            // Better: merge new config keys into existing.
            $data['config'] = array_merge($currentConfig, $data['config']);
        }

        DB::beginTransaction();
        try {
            $credential->update($data);

            if ($request->has('meta')) {
                // Sync metas: update existing, create new, delete missing?
                // Or just update/create provided?
                // Requirement: "atualiza campos e metas; remove metas ausentes" -> So sync logic.
                
                $providedKeys = [];
                foreach ($request->input('meta') as $meta) {
                    if (isset($meta['key']) && isset($meta['value'])) {
                        $credential->updateMeta($meta['key'], $meta['value']);
                        $providedKeys[] = $meta['key'];
                    }
                }
                
                // Remove metas not in the provided list
                $credential->metas()->whereNotIn('key', $providedKeys)->delete();
            }

            DB::commit();

            return response()->json([
                'message' => 'Credential updated successfully',
                'data' => $credential->load('metas'),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error updating credential', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $credential = ApiCredential::find($id);

        if (!$credential) {
            return response()->json(['message' => 'Credential not found'], 404);
        }

        $credential->delete();

        return response()->json(['message' => 'Credential deleted successfully']);
    }

    /**
     * Display a listing of trashed resources.
     */
    public function trash()
    {
        $credentials = ApiCredential::onlyTrashed()->paginate(15);
        return response()->json($credentials);
    }

    /**
     * Restore the specified resource from storage.
     */
    public function restore($id)
    {
        $credential = ApiCredential::onlyTrashed()->find($id);

        if (!$credential) {
            return response()->json(['message' => 'Credential not found in trash'], 404);
        }

        $credential->restore();

        return response()->json(['message' => 'Credential restored successfully']);
    }

    /**
     * Permanently remove the specified resource from storage.
     */
    public function forceDelete($id)
    {
        $credential = ApiCredential::onlyTrashed()->find($id);

        if (!$credential) {
            return response()->json(['message' => 'Credential not found in trash'], 404);
        }

        $credential->forceDelete();

        return response()->json(['message' => 'Credential permanently deleted']);
    }

    /**
     * Utility method to get credential by slug internally or externally.
     * Decrypts password for usage.
     *
     * @param string $slug
     * @return ApiCredential|null
     */
    public static function get($slug)
    {
        $credential = ApiCredential::where('slug', $slug)->with('metas')->first();

        if ($credential && is_array($credential->config)) {
            $config = $credential->config;
            $encryptedKeys = ['pass', 'secret_access_key', 'access_token'];
            foreach ($encryptedKeys as $k) {
                if (isset($config[$k]) && !empty($config[$k])) {
                    try {
                        $config[$k] = Crypt::decryptString($config[$k]);
                    } catch (\Exception $e) {
                        // Mantém como está se não foi possível descriptografar (ex: já em texto plano antigo)
                    }
                }
            }
            $credential->config = $config;
        }

        return $credential;
    }
}
