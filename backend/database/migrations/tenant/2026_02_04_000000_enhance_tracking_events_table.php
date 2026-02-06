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
        Schema::table('tracking_events', function (Blueprint $table) {
            $table->string('user_id')->nullable()->after('event_type');
            $table->nullableMorphs('resource'); // Adds resource_type and resource_id
            $table->json('metadata')->nullable()->after('resource_id');
            // We can't easily change enum values in existing migrations without raw SQL, 
            // but tracking code can just use generic strings if we didn't strictly bind it in DB 
            // OR we accept 'view' as the type and distinguish by resource_type.
            // valid existing types: 'view', 'whatsapp_contact'
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tracking_events', function (Blueprint $table) {
            $table->dropColumn(['user_id', 'metadata', 'resource_type', 'resource_id']);
        });
    }
};
