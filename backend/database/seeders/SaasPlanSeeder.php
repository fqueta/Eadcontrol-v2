<?php

namespace Database\Seeders;

use App\Models\SaasPlan;
use Illuminate\Database\Seeder;

class SaasPlanSeeder extends Seeder
{
    /**
     * Seed planos padrão de assinatura SaaS.
     */
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Starter',
                'slug' => 'starter',
                'description' => 'Ideal para escolas pequenas que estão começando. Inclui funcionalidades essenciais.',
                'price_monthly' => 97.00,
                'price_yearly' => 970.00,
                'features' => [
                    'max_students' => 50,
                    'max_courses' => 5,
                    'max_storage_mb' => 2048,
                    'max_users' => 3,
                    'support' => 'email',
                    'custom_domain' => false,
                    'whatsapp_integration' => false,
                    'api_access' => false,
                ],
                'usage_pricing' => [
                    'extra_student' => 1.50,
                    'extra_course' => 10.00,
                ],
                'active' => true,
                'is_free' => false,
                'trial_days' => 14,
                'sort_order' => 1,
            ],
            [
                'name' => 'Profissional',
                'slug' => 'profissional',
                'description' => 'Para escolas em crescimento. Mais alunos, mais cursos e integrações avançadas.',
                'price_monthly' => 197.00,
                'price_yearly' => 1970.00,
                'features' => [
                    'max_students' => 200,
                    'max_courses' => 20,
                    'max_storage_mb' => 10240,
                    'max_users' => 10,
                    'support' => 'priority',
                    'custom_domain' => true,
                    'whatsapp_integration' => true,
                    'api_access' => false,
                ],
                'usage_pricing' => [
                    'extra_student' => 1.00,
                    'extra_course' => 8.00,
                ],
                'active' => true,
                'is_free' => false,
                'trial_days' => 14,
                'sort_order' => 2,
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'description' => 'Para grandes instituições. Sem limites, suporte premium e todas as funcionalidades.',
                'price_monthly' => 497.00,
                'price_yearly' => 4970.00,
                'features' => [
                    'max_students' => -1,  // Ilimitado
                    'max_courses' => -1,
                    'max_storage_mb' => 51200,
                    'max_users' => -1,
                    'support' => 'dedicated',
                    'custom_domain' => true,
                    'whatsapp_integration' => true,
                    'api_access' => true,
                ],
                'usage_pricing' => null,
                'active' => true,
                'is_free' => false,
                'trial_days' => 30,
                'sort_order' => 3,
            ],
        ];

        foreach ($plans as $plan) {
            SaasPlan::updateOrCreate(
                ['slug' => $plan['slug']],
                $plan
            );
        }
    }
}
