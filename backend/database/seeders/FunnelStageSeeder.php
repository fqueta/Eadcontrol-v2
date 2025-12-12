<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Funnel;
use App\Models\Stage;
use App\Services\Qlib;

/**
 * Seeder para criar funnels e stages de exemplo
 */
class FunnelStageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Quando o tenant estiver no modo CRM Aero (Qlib::is_crm_aero()),
     * cadastra funis específicos:
     * - "Funil de leads" com settings.place = atendimento
     * - "Funil de Vendas" com settings.place = vendas
     * Caso contrário, cria os funis de exemplo padrão (Vendas, Manutenção, Suporte).
     */
    public function run(): void
    {
        // Branch condicional por tenant (CRM Aero)
        // if (Qlib::is_crm_aero()) {
        //     // Funil de leads (place = atendimento)
        //     $leadsFunnel = Funnel::create([
        //         'name' => 'Leads',
        //         'description' => 'Captação e atendimento de leads',
        //         'color' => '#06b6d4',
        //         'isActive' => true,
        //         'settings' => [
        //             'autoAdvance' => false,
        //             'requiresApproval' => false,
        //             'notificationEnabled' => true,
        //             'place' => 'atendimento',
        //         ],
        //     ]);

        //     /**
        //      * Estágios do funil de leads (CRM Aero):
        //      * Frio → Aquecimento → Morno → Quente → Quente+ → Matriculados
        //      */
        //     $leadsStages = [
        //         [
        //             'name' => 'Frio',
        //             'description' => 'Lead recém captado, baixo engajamento',
        //             'color' => '#60a5fa',
        //             'order' => 1,
        //             'settings' => [
        //                 'autoAdvanceAfterDays' => null,
        //                 'autoAdvance' => false,
        //                 'notifyOnStageChange' => false,
        //                 'requireApproval' => false,
        //                 'place' => 'atendimento',
        //             ],
        //         ],
        //         [
        //             'name' => 'Aquecimento',
        //             'description' => 'Nutrição e ativação do interesse',
        //             'color' => '#f59e0b',
        //             'order' => 2,
        //             'settings' => [
        //                 'autoAdvanceAfterDays' => 3,
        //                 'autoAdvance' => false,
        //                 'notifyOnStageChange' => false,
        //                 'requireApproval' => false,
        //                 'place' => 'atendimento',
        //             ],
        //         ],
        //         [
        //             'name' => 'Morno',
        //             'description' => 'Interesse moderado, qualificação em andamento',
        //             'color' => '#fbbf24',
        //             'order' => 3,
        //             'settings' => [
        //                 'autoAdvanceAfterDays' => 5,
        //                 'autoAdvance' => false,
        //                 'notifyOnStageChange' => false,
        //                 'requireApproval' => false,
        //                 'place' => 'atendimento',
        //             ],
        //         ],
        //         [
        //             'name' => 'Quente',
        //             'description' => 'Alta propensão à compra',
        //             'color' => '#ef4444',
        //             'order' => 4,
        //             'settings' => [
        //                 'autoAdvanceAfterDays' => 5,
        //                 'autoAdvance' => false,
        //                 'notifyOnStageChange' => false,
        //                 'requireApproval' => false,
        //                 'place' => 'atendimento',
        //             ],
        //         ],
        //         [
        //             'name' => 'Quente+',
        //             'description' => 'Momento ideal de fechamento',
        //             'color' => '#dc2626',
        //             'order' => 5,
        //             'settings' => [
        //                 'autoAdvanceAfterDays' => null,
        //                 'autoAdvance' => false,
        //                 'notifyOnStageChange' => false,
        //                 'requireApproval' => false,
        //                 'place' => 'atendimento',
        //             ],
        //         ],
        //         [
        //             'name' => 'Matriculados',
        //             'description' => 'Conversão efetivada / matriculados',
        //             'color' => '#10b981',
        //             'order' => 6,
        //             'settings' => [
        //                 'autoAdvanceAfterDays' => null,
        //                 'autoAdvance' => false,
        //                 'notifyOnStageChange' => false,
        //                 'requireApproval' => false,
        //                 'place' => 'atendimento',
        //             ],
        //         ],
        //     ];

        //     foreach ($leadsStages as $stageData) {
        //         Stage::create(array_merge($stageData, [
        //             'funnel_id' => $leadsFunnel->id,
        //             'isActive' => true,
        //         ]));
        //     }

        //     // Funil de Vendas (place = vendas)
        //     $salesFunnel = Funnel::create([
        //         'name' => 'Interessados',
        //         'description' => 'Processo comercial de vendas',
        //         'color' => '#10b981',
        //         'isActive' => true,
        //         'settings' => [
        //             'autoAdvance' => false,
        //             'requiresApproval' => true,
        //             'notificationEnabled' => true,
        //             'place' => 'vendas',
        //         ],
        //     ]);

        //     // Stages do funil de Vendas
        //     $salesStages = [
        //         [
        //             'name' => 'Lead',
        //             'description' => 'Cliente em potencial',
        //             'color' => '#6b7280',
        //             'order' => 1,
        //             'settings' => [
        //                 'autoAdvanceAfterDays' => null,
        //                 'autoAdvance' => true,
        //                 'notifyOnStageChange' => false,
        //                 'requireApproval' => false,
        //                 'place' => 'vendas',
        //             ],
        //         ],
        //         [
        //             'name' => 'Qualificação',
        //             'description' => 'Análise de necessidade/capacidade',
        //             'color' => '#3b82f6',
        //             'order' => 2,
        //             'settings' => [
        //                 'autoAdvanceAfterDays' => 3,
        //                 'requiresDocuments' => true,
        //                 'autoAdvance' => true,
        //                 'notifyOnStageChange' => false,
        //                 'requireApproval' => false,
        //                 'place' => 'vendas',
        //             ],
        //         ],
        //         [
        //             'name' => 'Proposta',
        //             'description' => 'Envio da proposta comercial',
        //             'color' => '#f59e0b',
        //             'order' => 3,
        //             'settings' => [
        //                 'autoAdvanceAfterDays' => 7,
        //                 'requiresDocuments' => true,
        //                 'autoAdvance' => true,
        //                 'notifyOnStageChange' => false,
        //                 'requireApproval' => false,
        //                 'place' => 'vendas',
        //             ],
        //         ],
        //         [
        //             'name' => 'Negociação',
        //             'description' => 'Discussão de termos e condições',
        //             'color' => '#ef4444',
        //             'order' => 4,
        //             'settings' => [
        //                 'autoAdvanceAfterDays' => 5,
        //                 'requiresDocuments' => false,
        //                 'place' => 'vendas',
        //             ],
        //         ],
        //         [
        //             'name' => 'Fechamento',
        //             'description' => 'Conclusão e início do serviço',
        //             'color' => '#10b981',
        //             'order' => 5,
        //             'settings' => [
        //                 'autoAdvanceAfterDays' => null,
        //                 'requiresDocuments' => true,
        //                 'place' => 'vendas',
        //             ],
        //         ],
        //     ];

        //     foreach ($salesStages as $stageData) {
        //         Stage::create(array_merge($stageData, [
        //             'funnel_id' => $salesFunnel->id,
        //             'isActive' => true,
        //         ]));
        //     }

        //     // Funil de Matriculado (place = atendimento)
        //     $enrolledFunnel = Funnel::create([
        //         'name' => 'Matriculado',
        //         'description' => 'Acompanhamento de alunos matriculados',
        //         'color' => '#14b8a6',
        //         'isActive' => true,
        //         'settings' => [
        //             'autoAdvance' => false,
        //             'requiresApproval' => false,
        //             'notificationEnabled' => true,
        //             'place' => 'vendas',
        //         ],
        //     ]);

        //     // Etapas do funil Matriculado
        //     $enrolledStages = [
        //         [
        //             'name' => 'Cursando',
        //             'description' => 'Aluno em curso ativo',
        //             'color' => '#3b82f6',
        //             'order' => 1,
        //             'settings' => [
        //                 'autoAdvanceAfterDays' => null,
        //                 'autoAdvance' => false,
        //                 'notifyOnStageChange' => false,
        //                 'requireApproval' => false,
        //                 'place' => 'atendimento',
        //             ],
        //         ],
        //         [
        //             'name' => 'Curso Concluido',
        //             'description' => 'Aluno concluiu o curso',
        //             'color' => '#10b981',
        //             'order' => 2,
        //             'settings' => [
        //                 'autoAdvanceAfterDays' => null,
        //                 'autoAdvance' => false,
        //                 'notifyOnStageChange' => true,
        //                 'requireApproval' => false,
        //                 'place' => 'atendimento',
        //             ],
        //         ],
        //         [
        //             'name' => 'Sequencia LTV',
        //             'description' => 'Ações de relacionamento e retenção (LTV)',
        //             'color' => '#f59e0b',
        //             'order' => 3,
        //             'settings' => [
        //                 'autoAdvanceAfterDays' => null,
        //                 'autoAdvance' => false,
        //                 'notifyOnStageChange' => false,
        //                 'requireApproval' => false,
        //                 'place' => 'atendimento',
        //             ],
        //         ],
        //         [
        //             'name' => 'Black List',
        //             'description' => 'Lista de bloqueio / inadimplência / restrições',
        //             'color' => '#ef4444',
        //             'order' => 4,
        //             'settings' => [
        //                 'autoAdvanceAfterDays' => null,
        //                 'autoAdvance' => false,
        //                 'notifyOnStageChange' => false,
        //                 'requireApproval' => false,
        //                 'place' => 'atendimento',
        //             ],
        //         ],
        //     ];

        //     foreach ($enrolledStages as $stageData) {
        //         Stage::create(array_merge($stageData, [
        //             'funnel_id' => $enrolledFunnel->id,
        //             'isActive' => true,
        //         ]));
        //     }

        //     $this->command->info('✅ Funnels (CRM Aero) criados com sucesso!');
        //     $this->command->info("🧲 Criados {$leadsFunnel->stages()->count()} stages para o Leads");
        //     $this->command->info("💼 Criados {$salesFunnel->stages()->count()} stages para o Interessados");
        //     $this->command->info("🎓 Criados {$enrolledFunnel->stages()->count()} stages para o Matriculado");
        //     return;
        // }
        //limpar primeiro os stages
        Stage::query()->delete();
        //limpar todos os funis primeiro
        Funnel::query()->delete();
        // Criar Funil de Vendas
        $salesFunnel = Funnel::create([
            'name' => 'Funil de Vendas',
            'description' => 'Funil principal para gerenciar o processo de vendas de serviços de manutenção de aeronaves',
            'color' => '#10b981',
            'isActive' => true,
            'settings' => [
                'autoAdvance' => false,
                'requiresApproval' => true,
                'notificationEnabled' => true
            ]
        ]);
        /**
         * {
          *      "autoAdvance": true,
          *      "notifyOnStageChange": false,
           *     "requireApproval": false,
           *     "place": "atendimento",
            *    "requiresApproval": false,
            *    "notificationEnabled": true
            *    }
         */
        // Criar stages para o Funil de Vendas
        $salesStages = [
            [
                'name' => 'Lead',
                'description' => 'Cliente em potencial identificado',
                'color' => '#6b7280',
                'order' => 1,
                'settings' => [
                    'autoAdvanceAfterDays' => null,
                    'requiresDocuments' => false,
                    'autoAdvance' => true,
                    'notifyOnStageChange' => false,
                    'requireApproval' => false,
                    'place' => 'atendimento',
                    'requiresApproval' => false,
                    'notificationEnabled' => true
                ]
            ],
            [
                'name' => 'Qualificação',
                'description' => 'Verificação da necessidade e capacidade do cliente',
                'color' => '#3b82f6',
                'order' => 2,
                'settings' => [
                    'autoAdvanceAfterDays' => 3,
                    'requiresDocuments' => true,
                    'autoAdvance' => true,
                    'notifyOnStageChange' => false,
                    'requireApproval' => false,
                    'place' => 'atendimento',
                    'requiresApproval' => false,
                    'notificationEnabled' => true
                ]

            ],
            [
                'name' => 'Proposta',
                'description' => 'Elaboração e envio da proposta comercial',
                'color' => '#f59e0b',
                'order' => 3,
                'settings' => [
                    'autoAdvanceAfterDays' => 7,
                    'requiresDocuments' => true,
                    'autoAdvance' => true,
                    'notifyOnStageChange' => false,
                    'requireApproval' => false,
                    'place' => 'atendimento',
                    'requiresApproval' => false,
                    'notificationEnabled' => true
                ]
            ],
            [
                'name' => 'Negociação',
                'description' => 'Discussão de termos e condições',
                'color' => '#ef4444',
                'order' => 4,
                'settings' => [
                    'autoAdvanceAfterDays' => 5,
                    'requiresDocuments' => false
                ]
            ],
            [
                'name' => 'Fechamento',
                'description' => 'Assinatura do contrato e início dos serviços',
                'color' => '#10b981',
                'order' => 5,
                'settings' => [
                    'autoAdvanceAfterDays' => null,
                    'requiresDocuments' => true
                ]
            ]
        ];

        foreach ($salesStages as $stageData) {
            Stage::create(array_merge($stageData, [
                'funnel_id' => $salesFunnel->id,
                'isActive' => true
            ]));
        }


        // Criar Funil de Suporte
        $supportFunnel = Funnel::create([
            'name' => 'Funil de Suporte',
            'description' => 'Processo de atendimento e resolução de solicitações de suporte',
            'color' => '#06b6d4',
            'isActive' => true,
            'settings' => [
                'autoAdvance' => false,
                'requiresApproval' => false,
                'notificationEnabled' => true
            ]
        ]);

        // Criar stages para o Funil de Suporte
        $supportStages = [
            [
                'name' => 'Aberto',
                'description' => 'Solicitação de suporte recebida',
                'color' => '#6b7280',
                'order' => 1,
                'settings' => [
                    'autoAdvanceAfterDays' => null,
                    'priority' => 'medium'
                ]
            ],
            [
                'name' => 'Em Análise',
                'description' => 'Equipe técnica analisando a solicitação',
                'color' => '#3b82f6',
                'order' => 2,
                'settings' => [
                    'autoAdvanceAfterDays' => 1,
                    'priority' => 'medium'
                ]
            ],
            [
                'name' => 'Em Andamento',
                'description' => 'Solução sendo implementada',
                'color' => '#f59e0b',
                'order' => 3,
                'settings' => [
                    'autoAdvanceAfterDays' => null,
                    'priority' => 'medium'
                ]
            ],
            [
                'name' => 'Aguardando Cliente',
                'description' => 'Aguardando resposta ou ação do cliente',
                'color' => '#ef4444',
                'order' => 4,
                'settings' => [
                    'autoAdvanceAfterDays' => 3,
                    'priority' => 'low'
                ]
            ],
            [
                'name' => 'Resolvido',
                'description' => 'Solicitação resolvida com sucesso',
                'color' => '#10b981',
                'order' => 5,
                'settings' => [
                    'autoAdvanceAfterDays' => null,
                    'priority' => 'low'
                ]
            ]
        ];

        foreach ($supportStages as $stageData) {
            Stage::create(array_merge($stageData, [
                'funnel_id' => $supportFunnel->id,
                'isActive' => true
            ]));
        }

        // Criar Funil de Matriculado (default)
        $enrolledFunnel = Funnel::create([
            'name' => 'Matriculado',
            'description' => 'Acompanhamento de alunos matriculados',
            'color' => '#14b8a6',
            'isActive' => true,
            'settings' => [
                'autoAdvance' => false,
                'requiresApproval' => false,
                'notificationEnabled' => true,
            ]
        ]);

        $enrolledStages = [
            [
                'name' => 'Cursando',
                'description' => 'Aluno em curso ativo',
                'color' => '#3b82f6',
                'order' => 1,
                'settings' => [
                    'autoAdvanceAfterDays' => null,
                    'requiresDocuments' => false,
                ]
            ],
            [
                'name' => 'Curso Concluido',
                'description' => 'Aluno concluiu o curso',
                'color' => '#10b981',
                'order' => 2,
                'settings' => [
                    'autoAdvanceAfterDays' => null,
                    'requiresDocuments' => false,
                ]
            ],
            [
                'name' => 'Sequencia LTV',
                'description' => 'Ações de relacionamento e retenção (LTV)',
                'color' => '#f59e0b',
                'order' => 3,
                'settings' => [
                    'autoAdvanceAfterDays' => null,
                    'requiresDocuments' => false,
                ]
            ],
            [
                'name' => 'Black List',
                'description' => 'Lista de bloqueio / inadimplência / restrições',
                'color' => '#ef4444',
                'order' => 4,
                'settings' => [
                    'autoAdvanceAfterDays' => null,
                    'requiresDocuments' => false,
                ]
            ],
        ];

        foreach ($enrolledStages as $stageData) {
            Stage::create(array_merge($stageData, [
                'funnel_id' => $enrolledFunnel->id,
                'isActive' => true
            ]));
        }

        $this->command->info('✅ Funnels e Stages criados com sucesso!');
        $this->command->info("📊 Criados {$salesFunnel->stages()->count()} stages para o Funil de Vendas");
        $this->command->info("🎧 Criados {$supportFunnel->stages()->count()} stages para o Funil de Suporte");
        $this->command->info("🎓 Criados {$enrolledFunnel->stages()->count()} stages para o Matriculado");
    }
}
