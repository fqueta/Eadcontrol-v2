<?php

namespace App\Services;

use App\Models\Menu;
use App\Models\MenuPermission;
use App\Models\User;

class PermissionService
{
    /**
     * Verifica se um usuário (via grupos) tem permissão para ação em uma chave.
     */
    public function can(User $user, string $routeName, string $action = 'view'): bool
    {
        // pega todos os grupos que o usuário pertence
        $groupIds = isset($user['permission_id']) ? $user['permission_id'] : 0;

        // Master (grupo 1) sempre tem permissão total
        if ($groupIds == 1) {
            return true;
        }

        // Tratamento especial para rotas da biblioteca de mídia (file-storage)
        if (is_string($routeName) && str_starts_with($routeName, 'api.file-storage.')) {
            // Leva em conta especificamente os permission_id de 1 a 5
            if ($groupIds >= 1 && $groupIds <= 5) {
                // Permite listar/ver e fazer upload para os perfis autorizados (1 a 5)
                if ($action === 'view' || $action === 'create' || $action === 'upload') {
                    return true;
                }
                // Exclusão permitida apenas para Master (1) e Administrador (2)
                if ($action === 'delete') {
                    return $groupIds == 1 || $groupIds == 2;
                }
            }
            return false;
        }

        // Tratamento especial para as rotas de opções gerais (options/all)
        if ($routeName === 'api.options.all' || $routeName === 'api.options.all.get') {
            if ($groupIds >= 1 && $groupIds <= 5) {
                return true;
            }
            return false;
        }

        $campo = 'can_' . $action; // can_view, can_create, can_edit, can_delete, can_upload
        // se no seu caso for hasOne ou belongsTo, só trocar.
        $get_id_menu_by_url = $this->get_id_menu_by_url($routeName);
        // dd($get_id_menu_by_url,$routeName,$action,$get_id_menu_by_url);
        $perm = MenuPermission::where('permission_id', $groupIds)
                ->where('menu_id', $get_id_menu_by_url)
                //   ->where($campo,1)
                ->first();
        if (!$perm) {
            return false;
        }

        if(isset($perm[$campo]) && $perm[$campo]){
            return true;
        }else{
            return false;
        }
    }
    /**
     * metodo para loca
     */
    public function get_id_menu_by_url($rm){
        $url = $this->get_url_by_route($rm);
        $menu_exist = Menu::where('url',$url)->first();
        if($menu_exist){
            return $menu_exist->id;
        }else{
            return 0;
        }
        // return Menu::where('url',$url)->first()->id;
    }
    /**
     * Verifica se o usuário autenticado está ativo e se possui a permissão solicitada.
     *
     * Regras de atividade:
     * - Considera o usuário ativo se `status === 'actived'` OU `ativo === 's'`.
     * - Se o usuário não estiver ativo ou não autenticado, retorna false.
     *
     * @param string $permissao Tipo de permissão solicitada: 'view' | 'create' | 'edit' | 'delete' | 'upload'.
     * @return bool true se ativo e com permissão; false caso contrário.
     */
    public function isHasPermission($permissao = ''): bool
    {
        $user = request()->user();

        // Bloqueia quando não há usuário autenticado
        if (!$user) {
            return false;
        }

        // Verifica atividade por `status` ou `ativo`
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
                \Log::warning('Falha ao revogar token de usuário inativo', [
                    'user_id' => $user->id ?? null,
                    'error' => $e->getMessage(),
                ]);
            }
            return false;
        }

        // Verifica permissão para a rota atual
        $routeName = request()->route()->getName();
        if($this->get_url_by_route_exception($routeName)){
            return true;
        }
        $ret = $this->can($user, $routeName, $permissao);
        return $ret;
    }
    /**
     * Metodo de exeção de rotas para url, para que todos podem ter acesso
     */
    private function get_url_by_route_exception($name = '')
    {
        
        // dd($name);
        $map = [
            'api.situacoes-matricula.index' => true,
            'api.situacoes-matricula.show' => true,
            'api.situacoes-matricula.store' => true,
            'api.situacoes-matricula.update' => true,
            'api.situacoes-matricula.destroy' => true,
            'api.categories.show' => true,
            'api.categories.index' => true,
            'api.categories.store' => true,
            'api.categories.update' => true,
            'api.categories.destroy' => true,
            'api.financial.categories.index' => true,
            'api.financial.categories.store' => true,
            'api.financial.categories.update' => true,
            'api.financial.categories.destroy' => true,
        ];

        return $map[$name] ?? false;
    }
    private function get_url_by_route($name = '')
    {
        // Rotas de options: trash/restore vão para /options, CRUD/all vão para /settings/system
        if (in_array($name, [
            'api.options.restore', 'api.options.trash',
            'api.options.forceDelete',
        ])) {
            return '/options';
        }

        $map = [
            'api.permissions.'             => '/settings/permissions',
            'api.users.'                   => '/settings/users',
            'api.parcelamentos.'           => '/settings/table-installment',
            'api.file-storage.'            => '/settings/system',
            'api.situacoes-matricula.'     => '/school/enrollment-situation',
            'api.metrics.'                 => '/settings/metrics',
            'api.dashboard-metrics.'       => '/settings/metrics',
            'api.clients.'                 => '/clients',
            'api.options.'                 => '/settings/system',
            'api.pages.'                   => '/site/menus-site',
            'api.posts.'                   => '/posts',
            'api.aircraft.'                => '/aircraft',
            'api.aeronaves.'               => '/settings/aircrafts',
            'api.categories.'              => '/categories',
            'api.product-categories'       => '/categories',
            'api.service-categories'       => '/categories',
            'api.product-units.'           => '/admin/products',
            'api.products.'                => '/admin/products',
            'api.services.'                => '/services',
            'api.service-units.'           => '/services',
            'api.service-orders.'          => '/service-orders',
            'api.cursos.'                  => '/school/courses',
            'api.courses.'                 => '/school/courses',
            'api.turmas.'                  => '/school/classes',
            'api.classes.'                 => '/school/classes',
            'api.modules.'                 => '/school/modules',
            'api.activities.'              => '/school/activities',
            'api.matriculas.'              => '/school/enroll',
            'api.financial.categories.'    => '/admin/financial/categories',
            'api.financial.accounts-receivable.' => '/admin/financial',
            'api.financial.accounts-payable.'    => '/admin/financial',
            'api.financial.accounts-receivable.' => '/admin/financial',
        ];

        foreach ($map as $prefix => $url) {
            if (str_starts_with($name, $prefix)) {
                return $url;
            }
        }

        return '';
    }
}
