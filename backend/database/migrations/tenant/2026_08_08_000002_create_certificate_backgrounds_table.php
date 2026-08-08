<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Create certificate backgrounds gallery table for tenant DB.
     * pt-BR: Galeria de imagens de fundo para certificados. Cada modelo de
     *        certificado seleciona uma dessas imagens como fundo (bgUrl).
     * en-US: Gallery of certificate background images. Each certificate model
     *        picks one of these images as its background (bgUrl).
     */
    public function up(): void
    {
        if (Schema::hasTable('certificate_backgrounds')) {
            return;
        }
        Schema::create('certificate_backgrounds', function (Blueprint $table) {
            $table->id();
            $table->string('name', 200)->default('Imagem de Fundo');
            $table->text('url');
            $table->enum('ativo', ['s', 'n'])->default('s');
            $table->timestamps();
        });
    }

    /**
     * Drop certificate backgrounds table.
     */
    public function down(): void
    {
        Schema::dropIfExists('certificate_backgrounds');
    }
};
