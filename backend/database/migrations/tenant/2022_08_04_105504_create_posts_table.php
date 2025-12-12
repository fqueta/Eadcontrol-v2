<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePostsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->increments('ID',20);
            $table->string('post_author')->nullable();
            $table->longText('post_content')->nullable();
            $table->text('post_title')->nullable();
            $table->text('post_excerpt')->nullable();
            $table->string('post_status',20)->nullable();
            $table->string('comment_status',20)->nullable();
            $table->string('ping_status',20)->nullable();
            $table->string('post_password',255)->nullable();
            $table->string('post_name',200)->nullable();
            $table->text('to_ping')->nullable()->comment("para não aparecer nas pesquisas valor 'n' para não, 's' para sim"); ////para não aparecer nas pesquisas valor 'n' para não, 's' para sim
            $table->text('pinged')->nullable();
            $table->longText('post_content_filtered')->nullable();
            $table->bigInteger('post_parent')->nullable();
            $table->string('guid',255)->nullable();
            $table->integer('menu_order')->nullable();
            $table->double('post_value1',10,2)->nullable();
            $table->double('post_value2',10,2)->nullable();
            $table->string('post_type',20)->nullable();
            $table->string('post_mime_type',100)->nullable();
            $table->bigInteger('comment_count')->nullable();
            $table->json('config')->nullable();
            $table->timestamps();
            $table->string('token')->nullable();
            $table->enum('excluido',['n','s'])->default('n');
            $table->text('reg_excluido')->nullable();
            $table->enum('deletado',['n','s'])->default('n');
            $table->text('reg_deletado')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('posts');
    }
}
