<?php

namespace App\Http\Controllers;

use App\Models\MenuPermission;
use App\Models\Permission;
use App\Services\MenuService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class MenuController extends Controller
{
    // public function getMenus()
    // {
    //     $user = Auth::user();

    //     return response()->json([
    //         'menus' => $user->menusPermitidosFiltrados()
    //     ]);
    // }
    private $permission_id=null;
    public function getMenus($permission_id = null)
    {
        $ret = [];
        $menu = [];
        $allowedPermissions = false;
        if(!$permission_id){
            return $ret;
        }
        // $allowedPermissions = $this->allowedPermissions($permission_id);
        $menu = (new MenuService($permission_id))->getMenuStructure() ;//$this->getMenuStructure();
        return $this->filterMenuByPermissions($menu, $allowedPermissions);
    }
    public function getMenuPermissions($permission_id = null)
    {
        $ret = [];
        if(!$permission_id){
            return $ret;
        }
        $this->permission_id = $permission_id;
        $menu = (new MenuService($permission_id))->getMenuStructure();
        return $this->filterMenuByPermissions($menu, true);
    }
    public function allowedPermissions($permission_id = null)
    {
        $group = Permission::where('id', $permission_id)->first();
        if(isset($group['id_menu']) && !empty($group['id_menu'])){
            return $group['id_menu'];
        }else{
            return [];
        }
    }
    /**
     * Filtra o menu conforme permissões
     */
    private function filterMenuByPermissions(array $menu, bool $allowedPermissions): array
    {
        $filtered = [];
        foreach ($menu as $item) {
            // Se o item principal tiver permissão
            if($allowedPermissions && ($permission_id=$this->permission_id)){
                    $newItem = $item;
                    //Busca as permissões na tabela de menu_permissions e adiciona no $newItem
                    if(isset($item['id']) && isset($item['title']) && isset($item['url'])){
                        $dp = MenuPermission::where('menu_id', $item['id'])
                            ->where('permission_id', $permission_id)
                            ->first();
                        if($dp && isset($dp['can_view'])){
                            $newItem['can_view'] = $dp['can_view'];
                            $newItem['can_edit'] = $dp['can_edit'];
                            $newItem['can_create'] = $dp['can_create'];
                            $newItem['can_delete'] = $dp['can_delete'];
                            $newItem['can_upload'] = $dp['can_upload'];
                            $newItem['menu_id'] = $item['id'];
                        }
                    }else{
                        $newItem['can_view'] = false;
                    }
                    // Se tiver submenus, filtra também
                    if (isset($item['items'])) {
                        $newItem['items'] = $this->filterMenuByPermissions($item['items'], $allowedPermissions);

                        // Se depois de filtrar não sobrar nada, remove o bloco
                        if (empty($newItem['items'])) {
                            unset($newItem['items']);
                        }
                    }

                    $filtered[] = $newItem;

            }else{
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
                        "title" => "Métricas",
                        "url" => "/settings/metrics",
                        "permission" => "settings.metrics.view",
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
}
