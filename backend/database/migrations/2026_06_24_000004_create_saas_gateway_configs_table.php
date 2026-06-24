<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql')->create('saas_gateway_configs', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 50)->unique()->default('asaas');
            $table->string('api_key')->nullable();
            $table->string('environment', 20)->default('sandbox');
            $table->string('webhook_secret')->nullable();
            $table->boolean('active')->default(false);
            $table->json('config')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('saas_gateway_configs');
    }
};
