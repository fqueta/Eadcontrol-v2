<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Instâncias de WhatsApp (Evolution GO) do tenant.
 * O isolamento entre clientes é feito pelo próprio banco do tenant;
 * o nome técnico (`instance_name`) é prefixado no servidor compartilhado.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('whatsapp_instances')) {
            return;
        }

        Schema::create('whatsapp_instances', function (Blueprint $table) {
            $table->id();
            $table->string('display_name', 120)->nullable();
            $table->string('instance_name', 160)->unique()
                ->comment('Nome técnico único no servidor Evolution GO');
            $table->string('instance_id', 100)->nullable()
                ->comment('UUID retornado pelo Evolution GO');
            $table->string('phone_number', 30)->nullable()
                ->comment('Número pareado (ex: 5511999999999)');
            $table->string('status', 30)->default('disconnected')
                ->comment('disconnected | connecting | connected');
            $table->string('provider', 30)->default('evolution-go');
            $table->text('api_key')->nullable()
                ->comment('Token exclusivo da instância no Evolution GO');
            $table->longText('qr_code')->nullable();
            $table->string('webhook_url', 500)->nullable();
            $table->json('settings')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamp('connected_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_instances');
    }
};
