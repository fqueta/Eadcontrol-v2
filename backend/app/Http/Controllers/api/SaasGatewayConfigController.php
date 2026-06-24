<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\SaasGatewayConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SaasGatewayConfigController extends Controller
{
    public function index()
    {
        $configs = SaasGatewayConfig::orderBy('provider')->get();
        return response()->json($configs);
    }

    public function show($provider)
    {
        $config = SaasGatewayConfig::where('provider', $provider)->first();
        if (!$config) {
            return response()->json(['message' => 'Configuração não encontrada.'], 404);
        }
        return response()->json($config);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'provider' => 'required|string|max:50|unique:mysql.saas_gateway_configs,provider',
            'api_key' => 'nullable|string',
            'environment' => 'nullable|in:sandbox,production',
            'webhook_secret' => 'nullable|string',
            'active' => 'boolean',
            'config' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $config = SaasGatewayConfig::create([
            'provider' => $request->input('provider'),
            'api_key' => $request->input('api_key'),
            'environment' => $request->input('environment', 'sandbox'),
            'webhook_secret' => $request->input('webhook_secret'),
            'active' => $request->boolean('active', false),
            'config' => $request->input('config'),
        ]);

        return response()->json([
            'message' => 'Configuração criada com sucesso.',
            'data' => $config,
        ], 201);
    }

    public function update(Request $request, $provider)
    {
        $config = SaasGatewayConfig::where('provider', $provider)->first();

        if (!$config) {
            return response()->json(['message' => 'Configuração não encontrada.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'api_key' => 'nullable|string',
            'environment' => 'nullable|in:sandbox,production',
            'webhook_secret' => 'nullable|string',
            'active' => 'boolean',
            'config' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($request->has('api_key')) {
            $config->api_key = $request->input('api_key');
        }
        if ($request->has('environment')) {
            $config->environment = $request->input('environment');
        }
        if ($request->has('webhook_secret')) {
            $config->webhook_secret = $request->input('webhook_secret');
        }
        if ($request->has('active')) {
            $config->active = $request->boolean('active');
        }
        if ($request->has('config')) {
            $config->config = array_merge($config->config ?? [], $request->input('config'));
        }

        $config->save();

        return response()->json([
            'message' => 'Configuração atualizada com sucesso.',
            'data' => $config,
        ]);
    }

    public function destroy($provider)
    {
        $config = SaasGatewayConfig::where('provider', $provider)->first();

        if (!$config) {
            return response()->json(['message' => 'Configuração não encontrada.'], 404);
        }

        $config->delete();

        return response()->json(['message' => 'Configuração removida com sucesso.']);
    }
}
