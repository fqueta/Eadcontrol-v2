<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\SaasPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class SaasPlanController extends Controller
{
    /**
     * Lista todos os planos SaaS.
     */
    public function index(Request $request)
    {
        $query = SaasPlan::query();

        if ($request->has('active')) {
            $query->where('active', $request->boolean('active'));
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $query->ordered();

        $perPage = $request->input('per_page', 15);

        if ($request->boolean('all')) {
            return response()->json(['data' => $query->get()]);
        }

        return response()->json($query->paginate($perPage));
    }

    /**
     * Cria um novo plano SaaS.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:mysql.saas_plans,slug',
            'description' => 'nullable|string',
            'price_monthly' => 'required|numeric|min:0',
            'price_yearly' => 'nullable|numeric|min:0',
            'features' => 'nullable|array',
            'usage_pricing' => 'nullable|array',
            'config' => 'nullable|array',
            'active' => 'boolean',
            'is_free' => 'boolean',
            'trial_days' => 'nullable|integer|min:0',
            'sort_order' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->all();
        $data['slug'] = $data['slug'] ?? Str::slug($data['name']);

        $plan = SaasPlan::create($data);

        return response()->json([
            'message' => 'Plano criado com sucesso.',
            'data' => $plan,
        ], 201);
    }

    /**
     * Exibe um plano específico.
     */
    public function show($id)
    {
        $plan = SaasPlan::withCount(['subscriptions as active_subscriptions_count' => function ($q) {
            $q->whereIn('status', ['active', 'trial']);
        }])->find($id);

        if (!$plan) {
            return response()->json(['message' => 'Plano não encontrado.'], 404);
        }

        return response()->json($plan);
    }

    /**
     * Atualiza um plano.
     */
    public function update(Request $request, $id)
    {
        $plan = SaasPlan::find($id);

        if (!$plan) {
            return response()->json(['message' => 'Plano não encontrado.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:255',
            'slug' => 'string|max:255|unique:mysql.saas_plans,slug,' . $id,
            'description' => 'nullable|string',
            'price_monthly' => 'numeric|min:0',
            'price_yearly' => 'nullable|numeric|min:0',
            'features' => 'nullable|array',
            'usage_pricing' => 'nullable|array',
            'config' => 'nullable|array',
            'active' => 'boolean',
            'is_free' => 'boolean',
            'trial_days' => 'nullable|integer|min:0',
            'sort_order' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $plan->update($request->all());

        return response()->json([
            'message' => 'Plano atualizado com sucesso.',
            'data' => $plan,
        ]);
    }

    /**
     * Remove um plano (apenas se não tiver assinaturas ativas).
     */
    public function destroy($id)
    {
        $plan = SaasPlan::find($id);

        if (!$plan) {
            return response()->json(['message' => 'Plano não encontrado.'], 404);
        }

        $activeCount = $plan->subscriptions()->whereIn('status', ['active', 'trial'])->count();
        if ($activeCount > 0) {
            return response()->json([
                'message' => "Não é possível excluir o plano. Existem {$activeCount} assinatura(s) ativa(s).",
            ], 422);
        }

        $plan->delete();

        return response()->json(['message' => 'Plano excluído com sucesso.']);
    }
}
