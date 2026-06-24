<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SaasTenantController extends Controller
{
    public function index(Request $request)
    {
        $tenants = Tenant::with('domains')
            ->orderBy('name')
            ->get()
            ->map(function ($t) {
                return $this->formatTenant($t);
            });

        return response()->json(['data' => $tenants]);
    }

    public function show($id)
    {
        $tenant = Tenant::with('domains')->find($id);

        if (!$tenant) {
            return response()->json(['message' => 'Tenant não encontrado.'], 404);
        }

        return response()->json($this->formatTenant($tenant));
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id' => 'required|string|max:255',
            'domain' => 'required|string|max:255',
            'name' => 'nullable|string|max:255',
            'email' => 'nullable|email',
            'cpf_cnpj' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Usar conexão central para verificar unicidade
        if (Tenant::find($request->input('id'))) {
            return response()->json(['errors' => ['id' => ['O tenant ID já está em uso.']]], 422);
        }

        if (DB::connection(config('tenancy.database.central_connection'))->table('domains')->where('domain', $request->input('domain'))->exists()) {
            return response()->json(['errors' => ['domain' => ['O domínio já está em uso.']]], 422);
        }

        DB::beginTransaction();
        try {
            $createData = [
                'id' => $request->input('id'),
                'name' => $request->input('name'),
                'ativo' => 's',
            ];

            if ($request->filled('email')) $createData['email'] = $request->input('email');
            if ($request->filled('cpf_cnpj')) $createData['cpf_cnpj'] = preg_replace('/\D/', '', $request->input('cpf_cnpj'));
            if ($request->filled('phone')) $createData['phone'] = $request->input('phone');

            $tenant = Tenant::create($createData);

            $tenant->domains()->create([
                'domain' => $request->input('domain'),
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Tenant criado com sucesso.',
                'data' => $this->formatTenant($tenant),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Erro ao criar tenant: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $tenant = Tenant::with('domains')->find($id);

        if (!$tenant) {
            return response()->json(['message' => 'Tenant não encontrado.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'nullable|string|max:255',
            'email' => 'nullable|email',
            'cpf_cnpj' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:20',
            'domain' => 'nullable|string|max:255',
            'course_badge_position' => 'nullable|in:top-right,top-left,bottom-right,bottom-left,top-center,bottom-center,hidden',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($request->has('domain') && $request->input('domain') !== ($tenant->domains->first()?->domain)) {
            if (DB::connection(config('tenancy.database.central_connection'))->table('domains')->where('domain', $request->input('domain'))->exists()) {
                return response()->json(['errors' => ['domain' => ['O domínio já está em uso.']]], 422);
            }
            $domain = $tenant->domains()->first();
            if ($domain) {
                $domain->domain = $request->input('domain');
                $domain->save();
            } else {
                $tenant->domains()->create(['domain' => $request->input('domain')]);
            }
        }

        if ($request->has('name')) {
            $tenant->name = $request->input('name');
        }
        if ($request->has('email')) {
            $tenant->email = $request->input('email');
        }
        if ($request->has('cpf_cnpj')) {
            $tenant->cpf_cnpj = $request->input('cpf_cnpj') ? preg_replace('/\D/', '', $request->input('cpf_cnpj')) : null;
        }
        if ($request->has('phone')) {
            $tenant->phone = $request->input('phone');
        }
        if ($request->has('course_badge_position')) {
            $tenant->course_badge_position = $request->input('course_badge_position');
        }

        $tenant->save();

        return response()->json([
            'message' => 'Dados do tenant atualizados com sucesso.',
            'data' => $this->formatTenant($tenant),
        ]);
    }

    private function formatTenant($tenant): array
    {
        return [
            'id' => $tenant->id,
            'name' => $tenant->name ?? $tenant->id,
            'email' => $tenant->email ?? null,
            'cpf_cnpj' => $tenant->cpf_cnpj ?? null,
            'phone' => $tenant->phone ?? null,
            'course_badge_position' => $tenant->course_badge_position ?? 'top-right',
            'ativo' => $tenant->ativo,
            'domain' => $tenant->domains->first()?->domain,
            'created_at' => $tenant->created_at,
        ];
    }
}
