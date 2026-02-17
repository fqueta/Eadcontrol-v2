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
        $ret = $this->can($user, $routeName, $permissao);
        return $ret;
    }
    private function get_url_by_route($name=''){
        $url = '';
        // dd($name);
        if($name=='api.permissions.index' || $name == 'api.permissions.update' || $name == 'api.permissions.show' || $name == 'api.permissions.store' || $name == 'api.permissions.destroy'){
            $url = '/settings/permissions';
        }elseif($name=='api.users.index' || $name == 'api.users.trash' || $name == 'api.users.update' || $name == 'api.users.show' || $name == 'api.users.store' || $name == 'api.users.destroy'){
            $url = '/settings/users';
        }elseif($name=='api.parcelamentos.index' || $name == 'api.parcelamentos.update' || $name == 'api.parcelamentos.show' || $name == 'api.parcelamentos.store' || $name == 'api.parcelamentos.destroy'){
            $url = '/settings/table-installment';
        }elseif($name=='api.file-storage.index' || $name == 'api.file-storage.update' || $name == 'api.file-storage.show' || $name == 'api.file-storage.store' || $name == 'api.file-storage.destroy'){
            $url = '/settings/system';
        }elseif($name=='api.situacoes-matricula.index' || $name == 'api.situacoes-matricula.update' || $name == 'api.situacoes-matricula.show' || $name == 'api.situacoes-matricula.store' || $name == 'api.situacoes-matricula.destroy'){
            $url = '/school/enrollment-situation';
        }elseif($name=='api.metrics.index' || $name == 'api.metrics.update' || $name == 'api.metrics.show' || $name == 'api.metrics.store' || $name == 'api.metrics.destroy'){
            $url = '/settings/metrics';
        }elseif($name=='api.clients.index' || $name == 'api.clients.promote' || $name == 'api.clients.update' || $name == 'api.clients.show' || $name == 'api.clients.store' || $name == 'api.clients.destroy' || $name == 'api.clients.restore' || $name == 'api.clients.forceDelete' || $name == 'api.clients.attendances.store'){
            $url = '/clients';
        }elseif($name=='api.options.index' || $name == 'api.options.update' || $name == 'api.options.show' || $name == 'api.options.store' || $name == 'api.options.destroy' || $name == 'api.options.restore' || $name == 'api.options.forceDelete' || $name == 'api.options.trash'){
            $url = '/options';
        }elseif($name=='api.pages.index' || $name == 'api.pages.update' || $name == 'api.pages.show' || $name == 'api.pages.store' || $name == 'api.pages.destroy' || $name == 'api.pages.restore' || $name == 'api.pages.forceDelete' || $name == 'api.pages.trash'){
            $url = '/site/menus-site';
        }elseif($name=='api.posts.index' || $name == 'api.posts.update' || $name == 'api.posts.show' || $name == 'api.posts.store' || $name == 'api.posts.destroy' || $name == 'api.posts.restore' || $name == 'api.posts.forceDelete' || $name == 'api.posts.trash'){
            $url = '/posts';
        }elseif($name=='api.aircraft.index' || $name == 'api.aircraft.update' || $name == 'api.aircraft.show' || $name == 'api.aircraft.store' || $name == 'api.aircraft.destroy' || $name == 'api.aircraft.restore' || $name == 'api.aircraft.forceDelete' || $name == 'api.aircraft.trash'){
            $url = '/aircraft';
        }elseif($name=='api.aeronaves.index' || $name=='api.aeronaves.store' || $name == 'api.aeronaves.update' || $name == 'api.aeronaves.show' || $name == 'api.aeronaves.destroy' || $name == 'api.aeronaves.restore' || $name == 'api.aeronaves.forceDelete' || $name == 'api.aeronaves.trash'){
            $url = '/settings/aircrafts';
        }
        if($name=='api.options.index' || $name == 'api.options.update' || $name == 'api.options.show' || $name == 'api.options.store' || $name == 'api.options.destroy' || $name == 'api.options.all.get' || $name == 'api.options.all'){
            $url = '/settings/system';
        }
        if($name=='api.categories.index' || $name == 'api.categories.update' || $name == 'api.categories.show' || $name == 'api.categories.store' || $name == 'api.categories.destroy' || $name == 'api.categories.restore' || $name == 'api.categories.forceDelete' || $name == 'api.categories.trash' || $name == 'api.categories.tree'){
            $url = '/categories';
        }
        if($name=='api.product-categories'){
            $url = '/categories';
        }
        if($name=='api.service-categories'){
            $url = '/categories';
        }
        if($name=='api.product-units.index' || $name == 'api.product-units.update' || $name == 'api.product-units.show' || $name == 'api.product-units.store' || $name == 'api.product-units.destroy' || $name == 'api.product-units.restore' || $name == 'api.product-units.forceDelete' || $name == 'api.product-units.trash'){
            $url = '/products';
        }
        if($name=='api.products.index' || $name == 'api.products.update' || $name == 'api.products.show' || $name == 'api.products.store' || $name == 'api.products.destroy' || $name == 'api.products.restore' || $name == 'api.products.forceDelete' || $name == 'api.products.trash'){
            $url = '/products';
        }
        if($name=='api.services.index' || $name == 'api.services.update' || $name == 'api.services.show' || $name == 'api.services.store' || $name == 'api.services.destroy' || $name == 'api.services.restore' || $name == 'api.services.forceDelete' || $name == 'api.services.trash'){
            $url = '/services';
        }
        if($name=='api.service-units.index' || $name == 'api.service-units.update' || $name == 'api.service-units.show' || $name == 'api.service-units.store' || $name == 'api.service-units.destroy' || $name == 'api.service-units.restore' || $name == 'api.service-units.forceDelete' || $name == 'api.service-units.trash'){
            $url = '/services';
        }
        if($name=='api.service-orders.index' || $name == 'api.service-orders.update' || $name == 'api.service-orders.show' || $name == 'api.service-orders.store' || $name == 'api.service-orders.destroy' || $name == 'api.service-orders.restore' || $name == 'api.service-orders.forceDelete' || $name == 'api.service-orders.trash' || $name == 'api.service-orders.update-status'){
            $url = '/service-orders';
        }
        if($name=='api.dashboard-metrics.index' || $name == 'api.dashboard-metrics.update' || $name == 'api.dashboard-metrics.show' || $name == 'api.dashboard-metrics.store' || $name == 'api.dashboard-metrics.destroy' || $name == 'api.dashboard-metrics.import-aeroclube'){
            $url = '/settings/metrics';
        }
        if($name=='api.options.index' || $name == 'api.options.update' || $name == 'api.options.show' || $name == 'api.options.store' || $name == 'api.options.destroy' || $name == 'api.options.all'){
            $url = '/settings/system';
        }
        if(
            $name=='api.cursos.index' || $name == 'api.cursos.update' || $name == 'api.cursos.show' || $name == 'api.cursos.store' || $name == 'api.cursos.destroy' || $name == 'api.cursos.all' || $name=='api.courses.index' || $name == 'api.courses.update' || $name == 'api.courses.show' || $name == 'api.courses.store' || $name == 'api.courses.destroy' || $name == 'api.courses.all'
            ){
            $url = '/school/courses';
        }
        if($name=='api.turmas.index' || $name == 'api.turmas.update' || $name == 'api.turmas.show' || $name == 'api.turmas.store' || $name == 'api.turmas.destroy' || $name == 'api.turmas.all'){
            $url = '/school/classes';
        }
        if($name=='api.modules.index' || $name == 'api.modules.update' || $name == 'api.modules.show' || $name == 'api.modules.store' || $name == 'api.modules.destroy' || $name == 'api.modules.all'){
            $url = '/school/modules';
        }
        if($name=='api.activities.index' || $name == 'api.activities.update' || $name == 'api.activities.show' || $name == 'api.activities.store' || $name == 'api.activities.destroy' || $name == 'api.activities.all'){
            $url = '/school/activities';
        }
        if(
            $name=='api.matriculas.index' || $name == 'api.matriculas.update' || $name == 'api.matriculas.show' || $name == 'api.matriculas.store' || $name == 'api.matriculas.destroy' || $name == 'api.matriculas.all'
            ){
            $url = '/school/enroll';
        }
        /**
         * @params string 'api.financial.categories.index | api.financial.categories.update | api.financial.categories.show | api.financial.categories.store | api.financial.categories.destroy'
         */
        if($name=='api.financial.categories.index' || $name == 'api.financial.categories.update' || $name == 'api.financial.categories.show' || $name == 'api.financial.categories.store' || $name == 'api.financial.categories.destroy'){
            $url = '/financial/categories';
        }
        // Contas a receber
        if($name=='api.financial.accounts-receivable.index' || $name == 'api.financial.accounts-receivable.update' || $name == 'api.financial.accounts-receivable.show' || $name == 'api.financial.accounts-receivable.store' || $name == 'api.financial.accounts-receivable.destroy' || $name == 'api.financial.accounts-receivable.pay' || $name == 'api.financial.accounts-receivable.receive' || $name == 'api.financial.accounts-payable.pay'){
            // dd($name);
            $url = '/financial';
        }
        // Contas a pagar
        if($name=='api.financial.accounts-payable.index' || $name == 'api.financial.accounts-payable.update' || $name == 'api.financial.accounts-payable.show' || $name == 'api.financial.accounts-payable.store' || $name == 'api.financial.accounts-payable.destroy'){
            $url = '/financial';
        }
        return $url;
    }
}
