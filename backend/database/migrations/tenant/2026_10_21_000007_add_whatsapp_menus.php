<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Adiciona o grupo de atendimento WhatsApp ao menu dos tenants existentes.
 * Idempotente: pode rodar mais de uma vez sem duplicar itens.
 */
return new class extends Migration
{
    private const MENU_ITEMS = [
        ['title' => 'Chat WhatsApp', 'url' => '/whatsapp/atendimento', 'icon' => 'MessageSquare'],
        ['title' => 'Conexões WhatsApp', 'url' => '/whatsapp', 'icon' => 'Smartphone'],
        ['title' => 'Agentes de IA', 'url' => '/whatsapp/agentes', 'icon' => 'Bot'],
    ];

    public function up(): void
    {
        if (!DB::getSchemaBuilder()->hasTable('menus')) {
            return;
        }

        $parentId = DB::table('menus')
            ->whereNull('parent_id')
            ->where('title', 'Atendimento')
            ->value('id');

        if (!$parentId) {
            $parentId = DB::table('menus')->insertGetId([
                'title'      => 'Atendimento',
                'url'        => null,
                'icon'       => 'Headset',
                'items'      => null,
                'active'     => 'y',
                'order'      => (int) DB::table('menus')->whereNull('parent_id')->max('order') + 1,
                'parent_id'  => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $baseOrder = (int) DB::table('menus')->where('parent_id', $parentId)->max('order');

        foreach (self::MENU_ITEMS as $index => $item) {
            $exists = DB::table('menus')
                ->where('parent_id', $parentId)
                ->where('url', $item['url'])
                ->exists();

            if ($exists) {
                continue;
            }

            DB::table('menus')->insert([
                'title'      => $item['title'],
                'url'        => $item['url'],
                'icon'       => $item['icon'],
                'items'      => null,
                'active'     => 'y',
                'order'      => $baseOrder + $index + 1,
                'parent_id'  => $parentId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->grantAccess($parentId, self::MENU_ITEMS);
    }

    public function down(): void
    {
        if (!DB::getSchemaBuilder()->hasTable('menus')) {
            return;
        }

        $urls = array_column(self::MENU_ITEMS, 'url');
        $ids = DB::table('menus')->whereIn('url', $urls)->pluck('id')->all();

        if (!empty($ids)) {
            DB::table('menu_permission')->whereIn('menu_id', $ids)->delete();
            DB::table('menus')->whereIn('id', $ids)->delete();
        }
    }

    /**
     * Libera visualização para Dev (1), Master (2) e Administrador (3).
     * Os demais grupos (Gerente, Escritório, Instrutor, Cliente) podem ser
     * ajustados depois em Configurações > Perfis.
     */
    private function grantAccess(int $parentId, array $items): void
    {
        if (!DB::getSchemaBuilder()->hasTable('menu_permission')) {
            return;
        }

        $permissionIds = DB::table('permissions')->whereIn('id', [1, 2, 3])->pluck('id')->all();
        if (empty($permissionIds)) {
            return;
        }

        $menuIds = DB::table('menus')->where('parent_id', $parentId)
            ->whereIn('url', array_column($items, 'url'))
            ->pluck('id')
            ->all();

        // Garante que o grupo pai também esteja visível.
        $menuIds[] = $parentId;

        foreach ($menuIds as $menuId) {
            foreach ($permissionIds as $permissionId) {
                $exists = DB::table('menu_permission')
                    ->where('menu_id', $menuId)
                    ->where('permission_id', $permissionId)
                    ->exists();

                if ($exists) {
                    DB::table('menu_permission')
                        ->where('menu_id', $menuId)
                        ->where('permission_id', $permissionId)
                        ->update(['can_view' => true, 'updated_at' => now()]);
                    continue;
                }

                DB::table('menu_permission')->insert([
                    'menu_id'       => $menuId,
                    'permission_id' => $permissionId,
                    'can_view'      => true,
                    'can_create'    => true,
                    'can_edit'      => true,
                    'can_delete'    => true,
                    'can_upload'    => true,
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]);
            }
        }
    }
};
