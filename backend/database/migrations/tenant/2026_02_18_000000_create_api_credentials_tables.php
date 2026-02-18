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
        Schema::create('api_credentials', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->boolean('active')->default(true);
            $table->json('config')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('api_credential_meta', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('api_credential_id');
            $table->string('key')->index();
            $table->longText('value')->nullable();
            $table->timestamps();

            $table->foreign('api_credential_id')
                  ->references('id')
                  ->on('api_credentials')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('api_credential_meta');
        Schema::dropIfExists('api_credentials');
    }
};
