<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('service_orders', function (Blueprint $table) {
            $table->id();
            $table->text('doc_type')->nullable(); // tipo de documento pode ser os para ordem de serviço, orc para orçamentos, etc.
            $table->string('title'); // Título da ordem de serviço
            $table->text('description')->nullable(); // Descrição da ordem
            $table->unsignedBigInteger('object_id'); // ID do objeto (aeronave, equipamento, etc.)
            $table->string('object_type')->default('aircraft'); // Tipo do objeto (aircraft, equipment, etc.)
            $table->string('assigned_to')->nullable(); // UUID do usuário responsável
            $table->string('client_id')->nullable(); // UUID do cliente
            $table->enum('status', ['draft', 'pending', 'in_progress', 'completed', 'cancelled', 'on_hold', 'approved'])->default('draft'); // Status da ordem
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium'); // Prioridade
            $table->date('estimated_start_date')->nullable(); // Data estimada de início
            $table->date('estimated_end_date')->nullable(); // Data estimada de fim
            $table->date('actual_start_date')->nullable(); // Data real de início
            $table->date('actual_end_date')->nullable(); // Data real de fim
            $table->text('notes')->nullable(); // Notas públicas
            $table->text('internal_notes')->nullable(); // Notas internas
            $table->integer('stage_id')->default(0); // ID do estágio atual
            $table->integer('funnel_id')->default(0); // ID do funil atual
            $table->string('token')->nullable();
            $table->json('config')->nullable(); //Para registro de meta campos
            $table->decimal('total_amount', 10, 2)->default(0); // Valor total da ordem
            $table->enum('excluido',['n','s']);
            $table->text('reg_excluido')->nullable();
            $table->enum('deletado',['n','s']);
            $table->text('reg_deletado')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Índices para melhor performance
            $table->index(['object_id']);
            $table->index(['object_type']);
            $table->index(['object_id', 'object_type']);
            $table->index(['assigned_to']);
            $table->index(['client_id']);
            $table->index(['status']);
            $table->index(['priority']);
            $table->index(['estimated_start_date']);
            $table->index(['estimated_end_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('service_orders');
    }
};
