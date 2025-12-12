<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveUser
{
    /**
     * Ensure authenticated user is active (status = 'actived' OR ativo = 's').
     * 
     * Garante que o usuário autenticado esteja ativo:
     * - `status` igual a 'actived' OU `ativo` igual a 's'.
     * Se inativo, revoga o(s) token(s) Sanctum para impedir novos acessos.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Usuário inativo'], 405);
        }

        $status = isset($user->status) ? strtolower((string) $user->status) : null;
        $ativo  = isset($user->ativo)  ? strtolower((string) $user->ativo)  : null;
        $isActive = ($status === 'actived') || ($ativo === 's');

        if (!$isActive) {
            // Revoga o token atual (Sanctum) para impedir novos acessos
            try {
                if (method_exists($user, 'currentAccessToken') && $user->currentAccessToken()) {
                    $user->currentAccessToken()->delete();
                } elseif (method_exists($user, 'tokens')) {
                    // Fallback: revoga todos os tokens caso o atual não esteja disponível
                    $user->tokens()->delete();
                }
            } catch (\Throwable $e) {
                \Log::warning('Falha ao revogar token de usuário inativo (middleware)', [
                    'user_id' => $user->id ?? null,
                    'error' => $e->getMessage(),
                ]);
            }

            return response()->json(['error' => 'Usuário inativo'], 405);
        }

        return $next($request);
    }
}