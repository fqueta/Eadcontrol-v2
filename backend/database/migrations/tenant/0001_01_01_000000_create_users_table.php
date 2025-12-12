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
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('tipo_pessoa',['pf','pj']); //pf = pessoa fisica, pj = pessoa juridica
            $table->string('name');
            $table->string('razao')->nullable();
            // $table->string('avatar  ')->nullable();
            $table->string('cpf')->unique()->nullable();
            $table->string('cnpj')->nullable();
            $table->string('email')->unique()->nullable();
            $table->string('celular')->unique()->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password')->nullable();
            $table->enum('status',['actived','inactived','pre_registred']);
            $table->enum('genero',['ni','m','f']); //ni = não informado
            $table->enum('verificado',['n','s']);
            $table->integer('permission_id')->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->json('config')->nullable();
            $table->json('preferencias')->nullable();
            $table->text('foto_perfil')->nullable();
            $table->enum('ativo',['s','n']);
            $table->integer('autor')->nullable();
            $table->string('token','60')->nullable();
            $table->enum('excluido',['n','s']);
            $table->text('reg_excluido')->nullable();
            $table->enum('deletado',['n','s']);
            $table->text('reg_deletado')->nullable();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
