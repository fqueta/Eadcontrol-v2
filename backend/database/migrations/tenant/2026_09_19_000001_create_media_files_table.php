<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_files', function (Blueprint $table) {
            $table->id();
            $table->string('user_id', 36)->nullable()->index();          // UUID do usuário que fez o upload
            $table->string('original_name')->nullable();                  // Nome original do arquivo
            $table->string('storage_path', 1000)->nullable();             // Key no R2 (ex: tenant/videos/uuid.mp4)
            $table->string('hls_path', 1000)->nullable();                 // Key do master.m3u8 no R2
            $table->string('public_url', 2000)->nullable();               // URL de streaming do arquivo original
            $table->string('hls_url', 2000)->nullable();                  // URL do manifesto HLS
            $table->string('thumbnail_url', 2000)->nullable();            // URL da thumbnail gerada
            $table->string('mime_type', 100)->default('video/mp4');
            $table->unsignedBigInteger('size_bytes')->default(0);         // Tamanho em bytes do arquivo original
            $table->unsignedInteger('duration_seconds')->nullable();       // Duração em segundos
            $table->enum('status', ['uploaded', 'processing', 'ready', 'failed'])->default('uploaded')->index();
            $table->unsignedBigInteger('linked_activity_id')->nullable()->index(); // FK lógica para posts.ID
            $table->boolean('allow_download')->default(false);             // Permite download controlado
            $table->unsignedInteger('download_count')->default(0);        // Contador de downloads
            $table->json('config')->nullable();                            // Metadados extras (estratégia HLS, etc.)
            $table->timestamps();

            // Index composto para listagens por usuário + status
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_files');
    }
};
