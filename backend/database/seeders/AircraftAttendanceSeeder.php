<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\AircraftAttendance;
use App\Models\Aircraft;
use App\Models\ServiceOrder;
use App\Models\User;
use App\Enums\AttendanceStatus;
use Carbon\Carbon;

/**
 * Seeder para criar dados de exemplo de atendimentos de aeronaves
 */
class AircraftAttendanceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Buscar dados existentes para relacionamentos
        $aircraft = Aircraft::first();
        $serviceOrder = ServiceOrder::first();
        $users = User::limit(3)->get();

        if (!$aircraft || !$serviceOrder || $users->isEmpty()) {
            $this->command->warn('Não foi possível encontrar dados necessários (Aircraft, ServiceOrder ou Users) para criar os atendimentos de exemplo.');
            return;
        }

        $client = $users->first();
        $assignedTo = $users->count() > 1 ? $users->get(1) : $client;
        $creator = $users->count() > 2 ? $users->get(2) : $client;

        // Criar atendimentos de exemplo
        $attendances = [
            [
                'aircraft_id' => $aircraft->ID,
                'service_order_id' => $serviceOrder->id,
                'title' => 'Inspeção Pré-Voo Completa',
                'description' => 'Inspeção completa da aeronave antes do voo, incluindo verificação de sistemas, combustível e documentação.',
                'status' => AttendanceStatus::COMPLETED,
                'priority' => 'high',
                'started_at' => Carbon::now()->subDays(2),
                'completed_at' => Carbon::now()->subDays(2)->addHours(3),
                'estimated_completion' => Carbon::now()->subDays(2)->addHours(4),
                'client_id' => $client->id,
                'client_name' => $client->name,
                'assigned_to' => $assignedTo->id,
                'assigned_to_name' => $assignedTo->name,
                'notes' => 'Inspeção realizada conforme checklist padrão. Todos os sistemas operacionais.',
                'internal_notes' => 'Verificar novamente o sistema hidráulico na próxima inspeção.',
                'created_by' => $creator->id,
                'updated_by' => $assignedTo->id,
                'total_duration_minutes' => 180,
                'stages_count' => 5,
                'events_count' => 12,
                'service_summary' => [
                    'sistemas_verificados' => ['motor', 'hidraulico', 'eletrico', 'combustivel'],
                    'documentos_checados' => ['certificado_aeronavegabilidade', 'seguro', 'licenca_piloto'],
                    'observacoes' => 'Aeronave em perfeitas condições'
                ]
            ],
            [
                'aircraft_id' => $aircraft->ID,
                'service_order_id' => $serviceOrder->id,
                'title' => 'Manutenção Preventiva Motor',
                'description' => 'Manutenção preventiva do motor conforme manual do fabricante.',
                'status' => AttendanceStatus::IN_PROGRESS,
                'priority' => 'medium',
                'started_at' => Carbon::now()->subHours(4),
                'estimated_completion' => Carbon::now()->addHours(8),
                'client_id' => $client->id,
                'client_name' => $client->name,
                'assigned_to' => $assignedTo->id,
                'assigned_to_name' => $assignedTo->name,
                'notes' => 'Manutenção em andamento. Previsão de conclusão em 8 horas.',
                'internal_notes' => 'Aguardando chegada de peças de reposição.',
                'created_by' => $creator->id,
                'updated_by' => $creator->id,
                'total_duration_minutes' => 240,
                'stages_count' => 3,
                'events_count' => 8,
                'service_summary' => [
                    'etapas_concluidas' => ['desmontagem_parcial', 'limpeza_componentes'],
                    'etapas_pendentes' => ['substituicao_pecas', 'montagem', 'teste_funcionamento'],
                    'pecas_necessarias' => ['filtro_oleo', 'velas_ignicao']
                ]
            ],
            [
                'aircraft_id' => $aircraft->ID,
                'service_order_id' => $serviceOrder->id,
                'title' => 'Verificação Sistema Avionics',
                'description' => 'Verificação e calibração dos sistemas de aviônicos.',
                'status' => AttendanceStatus::PENDING,
                'priority' => 'low',
                'started_at' => Carbon::now()->addDays(1),
                'estimated_completion' => Carbon::now()->addDays(1)->addHours(6),
                'client_id' => $client->id,
                'client_name' => $client->name,
                'assigned_to' => $assignedTo->id,
                'assigned_to_name' => $assignedTo->name,
                'notes' => 'Agendado para amanhã. Cliente solicitou verificação completa dos aviônicos.',
                'internal_notes' => 'Verificar se temos equipamento de calibração disponível.',
                'created_by' => $creator->id,
                'updated_by' => $creator->id,
                'total_duration_minutes' => 0,
                'stages_count' => 0,
                'events_count' => 1,
                'service_summary' => [
                    'sistemas_verificar' => ['gps', 'radio', 'transponder', 'autopilot'],
                    'equipamentos_necessarios' => ['calibrador_gps', 'analisador_radio'],
                    'status' => 'agendado'
                ]
            ],
            [
                'aircraft_id' => $aircraft->ID,
                'service_order_id' => $serviceOrder->id,
                'title' => 'Reparo Emergencial Trem de Pouso',
                'description' => 'Reparo emergencial no sistema do trem de pouso após relatório de problema.',
                'status' => AttendanceStatus::IN_PROGRESS,
                'priority' => 'urgent',
                'started_at' => Carbon::now(),
                'estimated_completion' => Carbon::now()->addHours(2),
                'client_id' => $client->id,
                'client_name' => $client->name,
                'assigned_to' => $assignedTo->id,
                'assigned_to_name' => $assignedTo->name,
                'notes' => 'URGENTE: Problema reportado no trem de pouso. Aeronave em solo.',
                'internal_notes' => 'Prioridade máxima. Cancelar outros atendimentos se necessário.',
                'created_by' => $creator->id,
                'updated_by' => $creator->id,
                'total_duration_minutes' => 0,
                'stages_count' => 0,
                'events_count' => 2,
                'service_summary' => [
                    'problema_reportado' => 'trem_pouso_nao_recolhe',
                    'acao_imediata' => 'inspecao_visual_completa',
                    'status' => 'em_andamento_urgente'
                ]
            ],
            [
                'aircraft_id' => $aircraft->ID,
                'service_order_id' => $serviceOrder->id,
                'title' => 'Inspeção 100 Horas',
                'description' => 'Inspeção obrigatória de 100 horas de voo conforme regulamentação.',
                'status' => AttendanceStatus::ON_HOLD,
                'priority' => 'medium',
                'started_at' => Carbon::now()->subDays(1),
                'estimated_completion' => Carbon::now()->addDays(2),
                'client_id' => $client->id,
                'client_name' => $client->name,
                'assigned_to' => $assignedTo->id,
                'assigned_to_name' => $assignedTo->name,
                'notes' => 'Inspeção pausada aguardando liberação de hangar.',
                'internal_notes' => 'Hangar ocupado com reparo emergencial. Retomar assim que possível.',
                'created_by' => $creator->id,
                'updated_by' => $assignedTo->id,
                'total_duration_minutes' => 120,
                'stages_count' => 2,
                'events_count' => 5,
                'service_summary' => [
                    'etapas_concluidas' => ['documentacao', 'inspecao_externa'],
                    'etapas_pendentes' => ['inspecao_motor', 'inspecao_cabine', 'teste_sistemas'],
                    'motivo_pausa' => 'hangar_indisponivel'
                ]
            ]
        ];

        foreach ($attendances as $attendanceData) {
            AircraftAttendance::create($attendanceData);
        }

        $this->command->info('Criados ' . count($attendances) . ' atendimentos de aeronaves de exemplo.');
    }
}
