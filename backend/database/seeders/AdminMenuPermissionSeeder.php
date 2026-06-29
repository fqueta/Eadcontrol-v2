<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AdminMenuPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $adminPermissionId = 2;

        DB::table('menu_permission')->where('permission_id', $adminPermissionId)->delete();

        $permissions = [
            ['menu_id' => 1,  'parent_id' => null, 'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 3,  'parent_id' => 2,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 4,  'parent_id' => 2,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 6,  'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 7,  'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 8,  'parent_id' => 5,    'can_view' => false, 'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 9,  'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 10, 'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 11, 'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 12, 'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 13, 'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 14, 'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 15, 'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 16, 'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 17, 'parent_id' => 5,    'can_view' => false, 'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 18, 'parent_id' => 5,    'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 20, 'parent_id' => 19,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 21, 'parent_id' => 19,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 22, 'parent_id' => 19,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 23, 'parent_id' => 19,   'can_view' => false, 'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 25, 'parent_id' => 24,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 26, 'parent_id' => 24,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 27, 'parent_id' => 24,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 28, 'parent_id' => 24,   'can_view' => false, 'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 30, 'parent_id' => 29,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 31, 'parent_id' => 29,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 32, 'parent_id' => 29,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 33, 'parent_id' => 29,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 34, 'parent_id' => 29,   'can_view' => false, 'can_create' => false, 'can_edit' => false, 'can_delete' => false, 'can_upload' => false],
            ['menu_id' => 35, 'parent_id' => 29,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => true,  'can_upload' => true],
            ['menu_id' => 36, 'parent_id' => 29,   'can_view' => false, 'can_create' => false, 'can_edit' => false, 'can_delete' => false, 'can_upload' => false],
            ['menu_id' => 37, 'parent_id' => 29,   'can_view' => true,  'can_create' => true,  'can_edit' => true,  'can_delete' => false, 'can_upload' => false],
        ];

        $rows = array_map(function ($item) use ($adminPermissionId) {
            return [
                'menu_id'       => $item['menu_id'],
                'permission_id' => $adminPermissionId,
                'can_view'      => $item['can_view'],
                'can_create'    => $item['can_create'],
                'can_edit'      => $item['can_edit'],
                'can_delete'    => $item['can_delete'],
                'can_upload'    => $item['can_upload'],
                'created_at'    => now(),
                'updated_at'    => now(),
            ];
        }, $permissions);

        DB::table('menu_permission')->insert($rows);
    }
}
