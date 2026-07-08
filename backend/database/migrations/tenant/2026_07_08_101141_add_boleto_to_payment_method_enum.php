<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE financial_accounts MODIFY COLUMN payment_method ENUM('cash', 'credit_card', 'debit_card', 'bank_transfer', 'pix', 'check', 'boleto', 'other') DEFAULT 'cash'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE financial_accounts MODIFY COLUMN payment_method ENUM('cash', 'credit_card', 'debit_card', 'bank_transfer', 'pix', 'check', 'other') DEFAULT 'cash'");
    }
};
