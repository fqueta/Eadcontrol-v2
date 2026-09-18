<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Services\Integrations\IntegrationStrategyFactory;
use App\Services\Media\R2StorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class IntegrationTestController extends Controller
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
                'message' => 'Acesso negado. Apenas administradores do Grupo 1 podem gerenciar ou testar integrações.',
                'permission_id' => $permissionId,
            ], 403);
        }

        return null;
    }

    /**
     * Testa a conexão de um provedor usando o Strategy Pattern.
     */
    public function testConnection(Request $request, string $slug)
    {
        if ($deny = $this->checkGroup1Access($request)) {
            return $deny;
        }

        try {
            $provider = IntegrationStrategyFactory::make($slug);
            $config = $request->input('config', []);

            // Se config não veio completa, tenta mesclar com o que já está salvo no banco
            $saved = ApiCredentialController::get($slug);
            if ($saved && is_array($saved->config)) {
                $config = array_merge($saved->config, array_filter($config, fn($v) => !empty($v)));
            }

            $result = $provider->testConnection($config);

            $status = $result['success'] ? 200 : 422;
            return response()->json($result, $status);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro interno ao testar integração: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Gera uma Presigned URL para upload direto de arquivo de vídeo no R2.
     */
    public function presignR2Upload(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        $validator = Validator::make($request->all(), [
            'filename' => 'required|string|max:255',
            'mime_type' => 'required|string|max:100',
            'folder' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $tenantId = tenancy()->tenant ? tenancy()->tenant->id : 'default';
        $ext = pathinfo($request->input('filename'), PATHINFO_EXTENSION) ?: 'mp4';
        $safeName = Str::uuid()->toString() . '.' . $ext;
        $folder = trim($request->input('folder', 'videos'), '/');
        $path = "{$tenantId}/{$folder}/{$safeName}";

        try {
            $r2Service = new R2StorageService();
            if (!$r2Service->isConfigured()) {
                return response()->json([
                    'message' => 'A integração com o Cloudflare R2 não está configurada neste tenant.',
                ], 422);
            }

            $presignedData = $r2Service->createPresignedUploadUrl(
                $path,
                $request->input('mime_type', 'video/mp4'),
                60 // 60 minutos para upload de vídeos maiores
            );

            return response()->json([
                'success' => true,
                'data' => $presignedData,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Falha ao gerar URL assinada de upload: ' . $e->getMessage(),
            ], 500);
        }
    }
}
