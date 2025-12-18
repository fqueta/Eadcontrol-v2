<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\MenuController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class AuthController extends Controller
{
    /**
     * Filtra menu pelo array de permissões do usuário
     */


    public function logout(Request $request)
    {
        // $request->user()->currentAccessToken()->delete();
        $user = $request->user();
        // $user = Auth::user();
        // dd($user);
        $user->tokens()->delete();
        return response()->json([
            'status'  => 200,
            'message' => 'Logout realizado com sucesso',
        ]);
    }


    /**
     * Realiza login e emite token para usuários ativos.
     *
     * Bloqueia o login quando o campo `ativo` do usuário for diferente de 's',
     * retornando erro 405 sem gerar token.
     */
    public function login(Request $request)
    {
        // Validate CAPTCHA first
        if (!$this->verifyCaptcha($request, 'login')) {
            return response()->json([
                'message' => 'Falha na verificação de segurança (CAPTCHA).',
                'errors' => ['captcha_token' => ['Invalid or low-score CAPTCHA token']],
            ], 422);
        }
        $credentials = $request->only('email', 'password');

        if (!Auth::attempt($credentials)) {
            return response()->json(['message' => 'Credenciais inválidas'], 401);
        }

        $user = Auth::user();
        // dd($user);
        // Impede login de usuário inativo (ativo != 's')
        if (($user->ativo ?? null) !== 's') {
            return response()->json(['error' => 'Usuário inativo'], 405);
        }

        // Carrega o grupo de permissões
        $pid = $user->permission_id;
        $group = DB::table('permissions')->where('id', $user->permission_id)->first();

        if (!$group) {
            return response()->json(['message' => 'Permissão não encontrada'], 403);
        }

        // Lista de permissões do grupo
        // $allowedPermissions = json_decode($group->id_menu, true) ?? [];
        // Menu base (estrutura completa)
        $menu = $this->getMenuStructure();

        // Filtra o menu conforme as permissões do grupo
        // $filteredMenu = $this->filterMenuByPermissions($menu, $allowedPermissions);
        $filteredMenu = (new MenuController)->getMenus($pid);
        $token = $user->createToken('developer')->plainTextToken;
        return response()->json([
            'user' => $user,
            // 'permissions' => $allowedPermissions,
            'token' => $token,
            'menu' => $filteredMenu,
            'redirect' => $group->redirect_login ?? '/home',
        ]);
    }

    /**
     * Estrutura completa do menu (igual a que você passou)
     */
    private function getMenuStructure(): array
    {
        return [
            [
                "title" => "Dashboard",
                "url" => "/",
                "icon" => "Home",
                "permission" => "dashboard.view",
            ],
            [
                "title" => "Clientes",
                "url" => "/clients",
                "icon" => "Users",
                "permission" => "clients.view",
            ],
            [
                "title" => "Objetos do Serviço",
                "url" => "/service-objects",
                "icon" => "Wrench",
                "permission" => "service-objects.view",
            ],
            [
                "title" => "Catálogo",
                "icon" => "Package",
                "permission" => "catalog.view",
                "items" => [
                    [
                        "title" => "Produtos",
                        "url" => "/products",
                        "permission" => "catalog.products.view",
                    ],
                    [
                        "title" => "Serviços",
                        "url" => "/services",
                        "permission" => "catalog.services.view",
                    ],
                    [
                        "title" => "Categorias",
                        "url" => "/categories",
                        "permission" => "catalog.categories.view",
                    ],
                ],
            ],
            [
                "title" => "Orçamentos",
                "url" => "/budgets",
                "icon" => "FileText",
                "permission" => "budgets.view",
            ],
            [
                "title" => "Ordens de Serviço",
                "url" => "/service-orders",
                "icon" => "ClipboardList",
                "permission" => "service-orders.view",
            ],
            [
                "title" => "Financeiro",
                "icon" => "DollarSign",
                "permission" => "finance.view",
                "items" => [
                    [
                        "title" => "Pagamentos",
                        "url" => "/payments",
                        "permission" => "finance.payments.view",
                    ],
                    [
                        "title" => "Fluxo de Caixa",
                        "url" => "/cash-flow",
                        "permission" => "finance.cash-flow.view",
                    ],
                    [
                        "title" => "Contas a Receber",
                        "url" => "/accounts-receivable",
                        "permission" => "finance.accounts-receivable.view",
                    ],
                    [
                        "title" => "Contas a Pagar",
                        "url" => "/accounts-payable",
                        "permission" => "finance.accounts-payable.view",
                    ],
                ],
            ],
            [
                "title" => "Relatórios",
                "icon" => "BarChart3",
                "permission" => "reports.view",
                "items" => [
                    [
                        "title" => "Faturamento",
                        "url" => "/reports/revenue",
                        "permission" => "reports.revenue.view",
                    ],
                    [
                        "title" => "OS por Período",
                        "url" => "/reports/service-orders",
                        "permission" => "reports.service-orders.view",
                    ],
                    [
                        "title" => "Produtos Mais Vendidos",
                        "url" => "/reports/top-products",
                        "permission" => "reports.top-products.view",
                    ],
                    [
                        "title" => "Análise Financeira",
                        "url" => "/reports/financial",
                        "permission" => "reports.financial.view",
                    ],
                ],
            ],
            [
                "title" => "Configurações",
                "icon" => "Settings",
                "permission" => "settings.view",
                "items" => [
                    [
                        "title" => "Usuários",
                        "url" => "/settings/users",
                        "permission" => "settings.users.view",
                    ],
                    [
                        "title" => "Perfis de Usuário",
                        "url" => "/settings/user-profiles",
                        "permission" => "settings.user-profiles.view",
                    ],
                    [
                        "title" => "Permissões",
                        "url" => "/settings/permissions",
                        "permission" => "settings.permissions.view",
                    ],
                    [
                        "title" => "Status de OS",
                        "url" => "/settings/os-statuses",
                        "permission" => "settings.os-statuses.view",
                    ],
                    [
                        "title" => "Formas de Pagamento",
                        "url" => "/settings/payment-methods",
                        "permission" => "settings.payment-methods.view",
                    ],
                    [
                        "title" => "Sistema",
                        "url" => "/settings/system",
                        "permission" => "settings.system.view",
                    ],
                ],
            ],
        ];
    }

    /**
     * Filtra o menu conforme permissões
     */
    private function filterMenuByPermissions(array $menu, array $allowedPermissions): array
    {
        $filtered = [];

        foreach ($menu as $item) {
            // Se o item principal tiver permissão
            if (in_array($item['permission'], $allowedPermissions)) {
                $newItem = $item;

                // Se tiver submenus, filtra também
                if (isset($item['items'])) {
                    $newItem['items'] = $this->filterMenuByPermissions($item['items'], $allowedPermissions);

                    // Se depois de filtrar não sobrar nada, remove o bloco
                    if (empty($newItem['items'])) {
                        unset($newItem['items']);
                    }
                }

                $filtered[] = $newItem;
            }
        }

        return $filtered;
    }

    /**
     * verifyCaptcha
     * pt-BR: Verifica o token do reCAPTCHA v3 junto ao Google, validando ação e score.
     * en-US: Verifies reCAPTCHA v3 token with Google, checking action and score.
     */
    private function verifyCaptcha(Request $request, string $expectedAction = 'login'): bool
    {
        $token = (string) $request->input('captcha_token', '');
        $action = (string) $request->input('captcha_action', $expectedAction);
        $secret = config('services.recaptcha.secret');
        $verifyUrl = config('services.recaptcha.verify_url');
        $minScore = (float) config('services.recaptcha.min_score', 0.5);

        if (!$secret || !$token) {
            return false;
        }

        $resp = Http::asForm()->post($verifyUrl, [
            'secret' => $secret,
            'response' => $token,
            'remoteip' => $request->ip(),
        ]);
        if (!$resp->ok()) {
            return false;
        }
        $data = $resp->json();
        $success = (bool) ($data['success'] ?? false);
        $score = (float) ($data['score'] ?? 0.0);
        $actionResp = (string) ($data['action'] ?? '');
        if (!$success) return false;
        if ($actionResp && $actionResp !== $expectedAction) return false;
        return $score >= $minScore;
    }
}
