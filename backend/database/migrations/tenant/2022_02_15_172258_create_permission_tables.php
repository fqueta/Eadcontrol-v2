<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
// use Spatie\Permission\PermissionRegistrar;

class CreatePermissionTables extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('permissions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name');       // For MySQL 8.0 use string('name', 125);
            // $table->json('id_menu')->nullable();
            $table->string('redirect_login')->nullable();
            $table->json('config')->nullable();
            $table->longText('description')->nullable()->default('text');
            $table->string('guard_name')->nullable()->default('web'); // For MySQL 8.0 use string('guard_name', 125);
            $table->timestamps();
            $table->enum('active',['s','n']);
            $table->string('autor')->nullable();
            $table->string('token','60')->nullable();
            $table->enum('excluido',['n','s']);
            $table->text('reg_excluido')->nullable();
            $table->enum('deletado',['n','s']);
            $table->text('reg_deletado')->nullable();
            $table->unique(['name', 'guard_name']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // $tableNames = config('permission.table_names');

        // if (empty($tableNames)) {
        //     throw new \Exception('Error: config/permission.php not found and defaults could not be merged. Please publish the package configuration before proceeding, or drop the tables manually.');
        // }
        Schema::dropIfExists('permissions');
    }
}
