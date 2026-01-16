<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('matriculas', function (Blueprint $table) {
            $table->index('id_cliente');
            $table->index('id_curso');
            $table->index('id_turma');
            $table->index('situacao_id');
            $table->index('stage_id');
            $table->index('funnel_id');
            $table->index('status');
            $table->index('data');
        });
    }

    public function down(): void
    {
        Schema::table('matriculas', function (Blueprint $table) {
            $table->dropIndex(['id_cliente']);
            $table->dropIndex(['id_curso']);
            $table->dropIndex(['id_turma']);
            $table->dropIndex(['situacao_id']);
            $table->dropIndex(['stage_id']);
            $table->dropIndex(['funnel_id']);
            $table->dropIndex(['status']);
            $table->dropIndex(['data']);
        });
    }
};

