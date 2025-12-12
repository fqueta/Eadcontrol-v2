<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\Qlib;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // User::factory()->create([
        //     'name' => 'Test User',
        //     'email' => 'test@example.com',
        // ]);
        if(Qlib::is_crm_aero()){
            $var_cal = [
                    UserSeeder::class,
                    // escolaridadeSeeder::class,
                    // estadocivilSeeder::class,
                    // ProfissaoSeeder::class,
                    MenuSeeder::class, //cadastra menus permissõs e menu_permissions
                    // PermissionSeeder::class,
                    // MenuPermissionSeeder::class,
                    DashboardMetricsSeeder::class,
                    CategorySeeder::class,
                    FinancialCategoriesSeeder::class,
                    OptionsTableSeeder::class,
                    ProductUnitsSeeder::class,
                    EnrollmentSituationsSeeder::class,
                    FunnelStageSeeder::class,
                    AircraftAttendanceSeeder::class,
                    AeronavesSeeder::class,
                    CursosSeeder::class,
                    TurmasSeeder::class,
                    // QoptionSeeder::class,
            ];

        }else{
            $var_cal = [
                    UserSeeder::class,
                    MenuSeeder::class, //cadastra menus permissõs e menu_permissions
                    DashboardMetricsSeeder::class,
                    CategorySeeder::class,
                    FinancialCategoriesSeeder::class,
                    OptionsTableSeeder::class,
                    ProductUnitsSeeder::class,
                    EnrollmentSituationsSeeder::class,
                    FunnelStageSeeder::class,
                    AircraftAttendanceSeeder::class,
                    AeronavesSeeder::class,
            ];

        }
        $this->call($var_cal);
    }
}
