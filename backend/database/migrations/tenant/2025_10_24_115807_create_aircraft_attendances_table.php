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
        Schema::create('aircraft_attendances', function (Blueprint $table) {
            $table->id();
            
            // Campos obrigatórios
            $table->unsignedInteger('aircraft_id');
            $table->unsignedBigInteger('service_order_id');
            $table->string('title');
            $table->enum('status', ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']);
            $table->enum('priority', ['low', 'medium', 'high', 'urgent']);
            $table->timestamp('started_at');
            $table->uuid('client_id');
            $table->string('client_name');
            
            // Campos opcionais
            $table->text('description')->nullable();
            $table->unsignedBigInteger('current_funnel_id')->nullable();
            $table->string('current_funnel_name')->nullable();
            $table->unsignedBigInteger('current_stage_id')->nullable();
            $table->string('current_stage_name')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('estimated_completion')->nullable();
            $table->uuid('assigned_to')->nullable();
            $table->string('assigned_to_name')->nullable();
            $table->text('notes')->nullable();
            $table->text('internal_notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            
            // Campos calculados/resumos
            $table->integer('total_duration_minutes')->nullable();
            $table->integer('stages_count')->default(0);
            $table->integer('events_count')->default(0);
            $table->json('service_summary')->nullable();
            
            $table->timestamps();
            
            // Índices para performance
            $table->index(['aircraft_id', 'status']);
            $table->index(['service_order_id']);
            $table->index(['client_id']);
            $table->index(['status', 'priority']);
            $table->index(['assigned_to']);
            $table->index(['current_stage_id']);
            $table->index(['started_at']);
            
            // Chaves estrangeiras
            $table->foreign('aircraft_id')->references('ID')->on('posts')->onDelete('cascade');
            $table->foreign('service_order_id')->references('id')->on('service_orders')->onDelete('cascade');
            $table->foreign('client_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('assigned_to')->references('id')->on('users')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('current_stage_id')->references('id')->on('stages')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('aircraft_attendances');
    }
};
