<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Middleware que verifica se o usuário autenticado é Master (permission_id = 1).
 * Usado para proteger as rotas SaaS de gerenciamento.
 */
class CheckSaasPermission
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Não autenticado.'], 401);
        }

        if ($user->permission_id != 1) {
            return response()->json([
                'message' => 'Acesso negado. Apenas o administrador master pode acessar o gerenciamento SaaS.',
            ], 403);
        }

        return $next($request);
    }
}
