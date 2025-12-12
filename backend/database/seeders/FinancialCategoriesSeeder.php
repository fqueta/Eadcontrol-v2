<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Commands\Seed\SeederMakeCommand;
use Illuminate\Database\Seeder;
use App\Models\Category;
use App\Services\Qlib;
use Carbon\Carbon;
use App\Http\Controllers\Api\FinancialCategoryController;

class FinancialCategoriesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Vendas',
                'type' => 'income',
                'color' => '#10B981',
                'description' => 'Receitas de vendas de produtos e serviços',
                'isActive' => true,
            ],
            [
                'name' => 'Serviços',
                'type' => 'income',
                'color' => '#3B82F6',
                'description' => 'Receitas de prestação de serviços',
                'isActive' => true,
            ],
            [
                'name' => 'Consultoria',
                'type' => 'income',
                'color' => '#8B5CF6',
                'description' => 'Receitas de consultoria',
                'isActive' => true,
            ],
            [
                'name' => 'Fornecedores',
                'type' => 'expense',
                'color' => '#EF4444',
                'description' => 'Pagamentos a fornecedores',
                'isActive' => true,
            ],
            [
                'name' => 'Salários',
                'type' => 'expense',
                'color' => '#F59E0B',
                'description' => 'Folha de pagamento',
                'isActive' => true,
            ],
            [
                'name' => 'Aluguel',
                'type' => 'expense',
                'color' => '#6B7280',
                'description' => 'Aluguel de imóveis',
                'isActive' => true,
            ],
            [
                'name' => 'Utilities',
                'type' => 'expense',
                'color' => '#84CC16',
                'description' => 'Energia, água, internet',
                'isActive' => true,
            ],
        ];

        foreach ($categories as $categoryData) {
            // Verificar se a categoria já existe
            $existingCategory = Category::where('name', $categoryData['name'])
                ->where('entidade', 'financeiro')
                ->first();

            if (!$existingCategory) {
                // Mapear dados para as colunas disponíveis na tabela
                $mappedData = [
                    'name' => $categoryData['name'],
                    'description' => $categoryData['description'],
                    'active' => $categoryData['isActive'],
                    'parent_id' => null,
                    'entidade' => 'financeiro',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                
                // Criar a categoria usando a conexão tenant
                Category::create($mappedData);

                $this->command->info("Categoria financeira '{$categoryData['name']}' criada com sucesso.");
            } else {
                $this->command->info("Categoria financeira '{$categoryData['name']}' já existe.");
            }
        }

        $this->command->info('Seeder de categorias financeiras executado com sucesso!');
    }
}