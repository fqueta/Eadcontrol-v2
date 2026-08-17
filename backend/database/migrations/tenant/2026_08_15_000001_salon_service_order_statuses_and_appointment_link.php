<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * pt-BR: Adapta as ordens de serviço para o salão de beleza:
     *  - Status em linguagem de salão (agendado, em_atendimento, aguardando_pagamento, concluido, cancelado)
     *  - Vínculo bidirecional agendamento <-> ordem de serviço.
     */
    public function up(): void
    {
        // 1. Ampliar o ENUM temporariamente (valores novos + antigos) para permitir a migração dos dados
        DB::statement(
            "ALTER TABLE service_orders MODIFY COLUMN status ENUM('agendado','em_atendimento','aguardando_pagamento','concluido','cancelado','draft','pending','in_progress','completed','on_hold','approved') NOT NULL DEFAULT 'agendado'"
        );

        // 2. Mapear status existentes
        $map = [
            ['draft', 'agendado'],
            ['pending', 'agendado'],
            ['in_progress', 'em_atendimento'],
            ['completed', 'concluido'],
            ['cancelled', 'cancelado'],
            ['on_hold', 'aguardando_pagamento'],
            ['approved', 'aguardando_pagamento'],
        ];

        foreach ($map as [$from, $to]) {
            DB::statement("UPDATE service_orders SET status = ? WHERE status = ?", [$to, $from]);
        }

        // 3. Reduzir o ENUM apenas aos valores do salão
        DB::statement(
            "ALTER TABLE service_orders MODIFY COLUMN status ENUM('agendado','em_atendimento','aguardando_pagamento','concluido','cancelado') NOT NULL DEFAULT 'agendado'"
        );

        // 4. Vínculo agendamento <-> ordem de serviço
        Schema::table('service_orders', function (Blueprint $table) {
            $table->unsignedBigInteger('appointment_id')->nullable()->after('client_id')->index()->comment('FK: appointments.id (origem do agendamento)');
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->unsignedBigInteger('service_order_id')->nullable()->after('service_id')->index()->comment('FK: service_orders.id (OS gerada)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('service_order_id');
        });

        Schema::table('service_orders', function (Blueprint $table) {
            $table->dropColumn('appointment_id');
        });

        $map = [
            ['agendado', 'pending'],
            ['em_atendimento', 'in_progress'],
            ['aguardando_pagamento', 'approved'],
            ['concluido', 'completed'],
            ['cancelado', 'cancelled'],
        ];

        // Ampliar o ENUM temporariamente para aceitar os valores antigos
        DB::statement(
            "ALTER TABLE service_orders MODIFY COLUMN status ENUM('agendado','em_atendimento','aguardando_pagamento','concluido','cancelado','draft','pending','in_progress','completed','on_hold','approved') NOT NULL DEFAULT 'pending'"
        );

        foreach ($map as [$from, $to]) {
            DB::statement("UPDATE service_orders SET status = ? WHERE status = ?", [$to, $from]);
        }

        DB::statement(
            "ALTER TABLE service_orders MODIFY COLUMN status ENUM('draft','pending','in_progress','completed','cancelled','on_hold','approved') NOT NULL DEFAULT 'draft'"
        );
    }
};
